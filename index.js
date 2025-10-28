// index.js — Erwin-Bot : version stable améliorée
import dotenv from 'dotenv'
dotenv.config()

import makeWASocket, {
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import fs from 'fs'
import path from 'path'
import https from 'https'
import chalk from 'chalk'
import figlet from 'figlet'
import P from 'pino'
import readline from 'readline'
import { pathToFileURL } from 'url'

// --- utils sécurisés ---
import { canSend, recordSend } from './utils/rateLimiter.js'
import { isBanned } from './utils/permissions.js'
import { getGroupSettings } from './utils/groupSettings.js'
import { canUserExecuteCommand, startHealthMonitoring, secureMessageSend } from './utils/botSecurity.js'
import { getPrefix } from './utils/prefixManager.js'
import { sendText, attachSendWrapper } from './utils/messageQueue.js'
import { initAntiDelete, handleRevoke } from './handlers/antiDeleteHandler.js'
import { initAutoPing } from './utils/autoPing.js'

// --- constantes & chemins ---
const __dirname = process.cwd()
const authDir = path.join(__dirname, 'auth_info')
const cmdDir = path.join(__dirname, 'commands')
const LOGIN_METHOD = (process.env.LOGIN_METHOD || 'ask').toLowerCase()
const loginModeFile = path.join(authDir, '.login_mode')
function readSavedLoginMode() {
  try {
    if (fs.existsSync(loginModeFile)) {
      const value = fs.readFileSync(loginModeFile, 'utf8').trim().toLowerCase()
      if (value === 'qr' || value === 'code') return value
    }
  } catch {}
  return null
}
function persistLoginMode(mode) {
  try {
    if (mode === 'qr' || mode === 'code') {
      if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })
      fs.writeFileSync(loginModeFile, mode)
    }
  } catch {}
}
let chosenLoginMode = readSavedLoginMode() || LOGIN_METHOD

// --- helpers ---
const sleep = (ms) => new Promise(res => setTimeout(res, ms))
const rand = (n) => Math.floor(Math.random() * n)
function promptInput(q) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(q, ans => { rl.close(); resolve(ans) })
  })
}

// --- Cache pour groupMetadata (optimisation) ---
const metadataCache = new Map()
const METADATA_TTL = 60000 // 1 minute
async function getGroupMetadataCached(sock, groupJid) {
  const now = Date.now()
  const cached = metadataCache.get(groupJid)
  
  if (cached && now - cached.timestamp < METADATA_TTL) {
    return cached.data
  }
  
  const metadata = await sock.groupMetadata(groupJid)
  metadataCache.set(groupJid, { data: metadata, timestamp: now })
  return metadata
}

// Nettoyage automatique du cache toutes les 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [jid, cache] of metadataCache.entries()) {
    if (now - cache.timestamp > METADATA_TTL * 2) {
      metadataCache.delete(jid)
    }
  }
}, 300000)
async function chooseLoginMode() {
  console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
  console.log(chalk.yellow('🔐 Méthode de connexion WhatsApp'))
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
  console.log(chalk.gray('1. qr   - Connexion par QR Code (rapide)'))
  console.log(chalk.gray('2. code - Connexion par code à 8 chiffres'))
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
  
  const ans = (await promptInput('Choisis ta méthode (qr/code) [qr]: ')).trim().toLowerCase()
  
  if (ans === 'code') {
    console.log(chalk.green('✅ Méthode sélectionnée: CODE DE LIAISON'))
    return 'code'
  } else {
    console.log(chalk.green('✅ Méthode sélectionnée: QR CODE'))
    return 'qr'
  }
}

// --- header console ---
function header() {
  console.clear()
  console.log(chalk.cyan(figlet.textSync('Erwin-Bot', { horizontalLayout: 'full' })))
  console.log(chalk.gray('by ') + chalk.magenta('FUDJING Manuel Erwin'))
  console.log(chalk.gray('────────────────────────────────────────────────────'))
}

// --- vérification réseau ---
function checkNetworkTimeout(url = 'https://web.whatsapp.com', timeout = 3000) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      res.resume()
      resolve({ ok: true, statusCode: res.statusCode })
    })
    req.on('error', (err) => resolve({ ok: false, err: err.message }))
    req.setTimeout(timeout, () => {
      req.destroy()
      resolve({ ok: false, err: 'timeout' })
    })
  })
}

// --- loader de commandes dynamiques ---
async function loadCommands() {
  const map = new Map()
  if (!fs.existsSync(cmdDir)) fs.mkdirSync(cmdDir, { recursive: true })
  const files = fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'))

  console.log(chalk.cyan(`🔍 Chargement des commandes (${files.length})...`))

  for (const f of files) {
    try {
      const mod = await import(pathToFileURL(path.join(cmdDir, f)).href)
      const def = mod?.default
      if (def) {
        const cmdName = f.replace('.js', '').toLowerCase()
        map.set(cmdName, def)
        console.log(chalk.green(`✅ Commande chargée: .${cmdName}`))
      } else {
        console.log(chalk.yellow(`⚠️ ${f} ne contient pas de "export default" valide`))
      }
    } catch (err) {
      console.error(chalk.red(`❌ Erreur lors du chargement de ${f}:`), err.message)
    }
  }

  return map
}

// --- reply helper ---
function reply(sock, remoteJid, msg, text) {
  return sendText(sock, remoteJid, text, { quoted: msg })
}

// --- fonction principale ---
async function start() {
  header()
  const net = await checkNetworkTimeout()
  if (!net.ok) console.log(chalk.red('⚠️ Vérification réseau échouée :'), net.err)
  else console.log(chalk.green(`🌐 Réseau OK (HTTP ${net.statusCode})`))

  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

  let version
  try {
    const fetched = await fetchLatestBaileysVersion()
    version = fetched.version
    console.log(chalk.gray('ℹ️ Protocol version:'), version)
  } catch {
    console.log(chalk.yellow('⚠️ Impossible de récupérer la version — valeur par défaut utilisée.'))
  }

  const commands = await loadCommands()
  const { state, saveCreds } = await useMultiFileAuthState(authDir)
  const logger = P({ level: 'info' })
  let reconnectAttempts = 0
  let creating = false

  async function createSocket() {
    if (creating) return
    creating = true

    const delay = reconnectAttempts === 0 ? 0 : Math.min(1000 * 2 ** reconnectAttempts, 60000) + rand(500)
    if (delay > 0) {
      console.log(chalk.yellow(`⏱ tentative de reconnexion #${reconnectAttempts} dans ${delay}ms`))
      await sleep(delay)
    }

    try {
      // Decide login mode BEFORE creating socket to avoid missing early QR events
      let loginMode = chosenLoginMode
      const isRegistered = !!state?.creds?.registered
      if (!isRegistered) {
        if (loginMode === 'ask' || (loginMode !== 'qr' && loginMode !== 'code')) {
          loginMode = await chooseLoginMode()
        }
        chosenLoginMode = loginMode
      } else if (loginMode !== 'qr') {
        loginMode = 'qr'
        chosenLoginMode = loginMode
      }

      if (chosenLoginMode !== loginMode) {
        chosenLoginMode = loginMode
      }

      if (chosenLoginMode === 'qr' || chosenLoginMode === 'code') {
        persistLoginMode(chosenLoginMode)
      }

      const sock = makeWASocket({
        logger,
        printQRInTerminal: false,
        auth: state,
        version,
        browser: ['Erwin-Bot', 'Chrome', '121.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,  // Keep-alive optimisé à 25s
        markOnlineOnConnect: true,
        syncFullHistory: false,
        getMessage: async (key) => {
          // Optimisation: récupération rapide des messages
          return { conversation: '' }
        },
        shouldIgnoreJid: (jid) => {
          // Ignorer les statuts pour réduire la charge
          return jid === 'status@broadcast'
        }
      })

      attachSendWrapper(sock)
      initAntiDelete(sock)
      initAutoPing(sock)

      sock.ev.on('creds.update', saveCreds)

      // Timer pour QR code
      let qrTimeout = null
      let qrCount = 0
      const MAX_QR_ATTEMPTS = 5

      sock.ev.on('connection.update', async (upd) => {
        const { connection, lastDisconnect, qr } = upd
        
        // Gestion améliorée du QR code
        if (qr && loginMode !== 'code') {
          qrCount++
          
          // Nettoyer l'ancien timeout
          if (qrTimeout) clearTimeout(qrTimeout)
          
          console.log(chalk.cyan('\n' + '═'.repeat(60)))
          console.log(chalk.green.bold(`\n📱 QR CODE WHATSAPP (${qrCount}/${MAX_QR_ATTEMPTS})`))
          console.log(chalk.cyan('═'.repeat(60) + '\n'))
          
          // Afficher le QR code en GRAND pour être bien visible
          qrcode.generate(qr, { small: false })
          
          console.log(chalk.cyan('\n' + '═'.repeat(60)))
          console.log(chalk.yellow.bold('\n📝 INSTRUCTIONS:'))
          console.log(chalk.gray('   1️⃣  Ouvre WhatsApp sur ton téléphone'))
          console.log(chalk.gray('   2️⃣  Va dans: Paramètres (⋮) > Appareils liés'))
          console.log(chalk.gray('   3️⃣  Appuie sur "Lier un appareil"'))
          console.log(chalk.gray('   4️⃣  Pointe ton téléphone vers ce QR code'))
          console.log(chalk.gray('   5️⃣  Le bot se connectera automatiquement\n'))
          
          console.log(chalk.yellow('⏰ Ce QR code expire dans 60 secondes'))
          console.log(chalk.gray('   Un nouveau sera généré automatiquement si besoin\n'))
          console.log(chalk.cyan('═'.repeat(60) + '\n'))
          
          // Timer d'expiration du QR (60s)
          qrTimeout = setTimeout(() => {
            if (!state.creds.registered) {
              console.log(chalk.yellow('\n⏱️  QR code expiré. Génération d\'un nouveau...'))
              if (qrCount >= MAX_QR_ATTEMPTS) {
                console.log(chalk.red('\n❌ Nombre maximum de tentatives atteint.'))
                console.log(chalk.yellow('💡 Conseils:'))
                console.log(chalk.gray('   • Vérifie ta connexion internet'))
                console.log(chalk.gray('   • Relance le bot et essaie avec le code de liaison'))
                console.log(chalk.gray('   • Assure-toi que WhatsApp fonctionne sur ton téléphone\n'))
              }
            }
          }, 60000)
        }
        if (connection === 'open') {
          reconnectAttempts = 0
          qrCount = 0  // Reset compteur QR
          if (qrTimeout) clearTimeout(qrTimeout)  // Nettoyer timeout
          
          console.log(chalk.green('\n' + '═'.repeat(60)))
          console.log(chalk.green.bold('✅ CONNEXION RÉUSSIE!'))
          console.log(chalk.green('═'.repeat(60)))
          console.log(chalk.cyan(`\n📱 Bot connecté à WhatsApp`))
          console.log(chalk.gray(`🤖 Numéro: ${sock.user?.id?.split(':')[0] || 'inconnu'}`))
          console.log(chalk.gray(`👤 Nom: ${sock.user?.name || 'Erwin-Bot'}`))
          
          // Démarrer le monitoring de sécurité
          console.log(chalk.blue('\n🛡️ Démarrage du système de sécurité anti-ban...'))
          startHealthMonitoring(60000) // Monitoring toutes les minutes
          console.log(chalk.green('✅ Protections anti-ban activées (mode souple)'))
          console.log(chalk.green('\n' + '═'.repeat(60) + '\n'))
          console.log(chalk.yellow('📬 En attente de messages...\n'))
        }
        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode
          console.log(chalk.red(`❌ Connexion fermée (${statusCode || 'Unknown'})`))
          if (statusCode === 401) {
            fs.rmSync(authDir, { recursive: true, force: true })
            fs.mkdirSync(authDir, { recursive: true })
            reconnectAttempts = 0
            creating = false
            chosenLoginMode = readSavedLoginMode() || LOGIN_METHOD
            await start()
            return
          }
          reconnectAttempts++
          creating = false
          chosenLoginMode = readSavedLoginMode() || chosenLoginMode || LOGIN_METHOD
          await createSocket()
        }
      })

      // Système de code de liaison amélioré
      if (!state.creds.registered && loginMode === 'code') {
        let continueLoop = true
        while (continueLoop && !state.creds.registered) {
          console.log(chalk.cyan('\n' + '═'.repeat(60)))
          console.log(chalk.yellow.bold('🔗 CONNEXION PAR CODE DE LIAISON'))
          console.log(chalk.cyan('═'.repeat(60) + '\n'))
          
          const entered = (await promptInput(chalk.yellow('📱 Entre ton numéro WhatsApp\n') + chalk.gray('   Format: international sans "+"\n   Exemple: 237674151474 ou 33612345678\n\n   Numéro: '))).trim()
          let target = entered || ''
          target = target.replace(/^\+/, '').replace(/\D/g, '')

          // Validation améliorée du numéro
          if (!target || target.length < 8 || target.length > 15) {
            console.log(chalk.red("\n❌ Numéro invalide!"))
            console.log(chalk.yellow('\n💡 Format attendu:'))
            console.log(chalk.gray('   • Sans le signe "+"'))
            console.log(chalk.gray('   • Format international complet'))
            console.log(chalk.gray('   • Exemples: 237674151474 (Cameroun), 33612345678 (France)\n'))
          } else {
            let lastErr = null
            const MAX_ATTEMPTS = 5  // Plus de tentatives
            
            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
              try {
                console.log(chalk.cyan(`\n🔄 Génération du code pour +${target}...`))
                console.log(chalk.gray(`   Tentative ${attempt}/${MAX_ATTEMPTS}\n`))
                
                // Attendre que la socket soit prête
                await sleep(1200)
                
                const code = await sock.requestPairingCode(target)

                // Affichage amélioré du code
                console.log(chalk.green('\n' + '╔' + '═'.repeat(38) + '╗'))
                console.log(chalk.green('║' + ' '.repeat(38) + '║'))
                console.log(chalk.green('║   🔑  CODE DE LIAISON WHATSAPP      ║'))
                console.log(chalk.green('║' + ' '.repeat(38) + '║'))
                console.log(chalk.green('╠' + '═'.repeat(38) + '╣'))
                console.log(chalk.green('║' + ' '.repeat(38) + '║'))
                console.log(chalk.green('║') + chalk.cyan.bold(`       >>> ${code} <<<       `) + chalk.green('║'))
                console.log(chalk.green('║' + ' '.repeat(38) + '║'))
                console.log(chalk.green('╚' + '═'.repeat(38) + '╝\n'))
                
                console.log(chalk.yellow.bold('📱 MARCHE À SUIVRE:\n'))
                console.log(chalk.gray('   1️⃣  Ouvre WhatsApp sur ton téléphone'))
                console.log(chalk.gray('   2️⃣  Va dans: Menu (⋮) > Paramètres'))
                console.log(chalk.gray('   3️⃣  Sélectionne: "Appareils liés"'))
                console.log(chalk.gray('   4️⃣  Appuie sur: "Lier un appareil"'))
                console.log(chalk.gray('   5️⃣  Choisis: "Lier avec numéro de téléphone"'))
                console.log(chalk.cyan.bold(`   6️⃣  Entre ce code: ${code}\n`))
                
                console.log(chalk.yellow('⏰ Code valide pendant 60 secondes'))
                console.log(chalk.gray('   Le bot se connectera dès validation\n'))
                console.log(chalk.cyan('═'.repeat(60) + '\n'))
                
                lastErr = null
                break
              } catch (e) {
                lastErr = e
                console.log(chalk.red(`\n❌ Échec de génération du code (tentative ${attempt})`))
                console.log(chalk.red(`Erreur: ${e?.message || e}`))
                if (attempt < 3) {
                  console.log(chalk.yellow('⏳ Nouvelle tentative dans 2s...'))
                  await sleep(2000)
                }
              }
            }
            if (lastErr) {
              console.log(chalk.red('\n❌ ÉCHEC DE GÉNÉRATION DU CODE\n'))
              console.log(chalk.yellow('💡 SOLUTIONS POSSIBLES:\n'))
              console.log(chalk.gray('   1️⃣  Vérifie que le numéro est correct'))
              console.log(chalk.gray('       • Format: international sans "+"'))
              console.log(chalk.gray('       • Exemple: 237674151474\n'))
              console.log(chalk.gray('   2️⃣  Vérifie ta connexion internet'))
              console.log(chalk.gray('       • Le bot doit être en ligne'))
              console.log(chalk.gray('       • Ping google.com pour tester\n'))
              console.log(chalk.gray('   3️⃣  Essaie avec le QR code à la place'))
              console.log(chalk.gray('       • Relance le bot'))
              console.log(chalk.gray('       • Choisis "qr" au lieu de "code"\n'))
              console.log(chalk.gray('   4️⃣  Vérifie que WhatsApp fonctionne'))
              console.log(chalk.gray('       • Ouvre WhatsApp sur ton téléphone'))
              console.log(chalk.gray('       • Assure-toi d\'avoir du réseau\n'))
              console.log(chalk.gray('   5️⃣  Redémarre le bot et réessaie\n'))

              console.log(chalk.yellow('🔁 Bascule automatique vers la méthode QR.'))
              chosenLoginMode = 'qr'
              persistLoginMode('qr')
              continueLoop = false
            }
          }

          // Proposer de générer un autre code tant que non enregistré
          if (!state.creds.registered && chosenLoginMode !== 'qr') {
            console.log(chalk.cyan('\n' + '─'.repeat(60)))
            const again = (await promptInput(chalk.yellow('🔄 Générer un nouveau code ? (o/N): '))).trim().toLowerCase()
            continueLoop = (again === 'o' || again === 'oui' || again === 'y' || again === 'yes')
            if (!continueLoop) {
              console.log(chalk.yellow('\n💡 Astuce: Relance le bot et choisis "qr" pour essayer la connexion par QR code\n'))
            }
          }
        }
      }

      // --- gestion des messages ---
      sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages?.[0]
        if (!msg || !msg.message) return

        const from = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const prefix = getPrefix(from)
        
        // Antilink : vérifier si le groupe a antilink activé
        if (from.endsWith('@g.us')) {
          const settings = getGroupSettings(from)
          if (settings.antilink && text) {
            const hasLink = /(https?:\/\/|www\.|wa\.me\/|whatsapp\.com\/)/i.test(text)
            if (hasLink) {
              try {
                // Vérifier si l'expéditeur est admin du groupe (avec cache)
                const metadata = await getGroupMetadataCached(sock, from)
                const participant = metadata.participants.find(p => p.id === sender)
                const isGroupAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin'
                
                if (!isGroupAdmin) {
                  await sock.sendMessage(from, { delete: msg.key })
                  await sendText(sock, from, `🚫 @${sender.split('@')[0]}, les liens sont interdits dans ce groupe.`, { mentions: [sender] })
                  return
                }
              } catch (e) {
                console.error('Erreur antilink:', e)
              }
            }
          }
        }
        
        if (!text.startsWith(prefix)) return

        const [cmdRaw, ...args] = text.slice(prefix.length).split(/\s+/)
        const cmd = cmdRaw.toLowerCase()

        const commandFunc = commands.get(cmd)
        if (!commandFunc) {
          await sendText(sock, from, '❌ Commande inconnue. Tape .menu pour voir la liste.', { quoted: msg })
          return
        }

        // vérif ban
        if (isBanned(sender)) {
          await sendText(sock, from, '⛔ Tu es banni du bot.', { quoted: msg })
          return
        }

        const isMediaCommand = ['sticker', 'yt', 'song', 'vision', 'wallpaper', 'movie'].includes(cmd)
        const canExecute = canUserExecuteCommand(sender, cmd, isMediaCommand)
        if (!canExecute.allowed) {
          await sendText(sock, from, canExecute.reason || '⏳ Commande limitée, réessaie plus tard.', { quoted: msg })
          return
        }

        try {
          await commandFunc(sock, msg, args)
        } catch (err) {
          console.error(`Erreur commande ${cmd}:`, err)
          await reply(sock, from, msg, `⚠️ Erreur: ${err.message}`)
        }
      })

      // --- antidelete : écoute des messages supprimés ---
      sock.ev.on('messages.delete', async (deletion) => {
        try {
          const { keys } = deletion
          if (!keys || !keys.length) return

          for (const key of keys) {
            await handleRevoke(sock, key, key?.participant)
          }
        } catch (e) {
          console.error('Erreur antidelete:', e)
        }
      })

      // --- welcome/goodbye : écoute des participants ---
      sock.ev.on('group-participants.update', async (update) => {
        try {
          const { id, participants, action } = update
          const settings = getGroupSettings(id)

          // Welcome
          if (action === 'add' && settings.welcome) {
            const groupMetadata = await getGroupMetadataCached(sock, id)
            const groupName = groupMetadata.subject || 'ce groupe'

            for (const participant of participants) {
              let text = settings.welcome
              text = text.replace(/{user}/g, `@${participant.split('@')[0]}`)
              text = text.replace(/{group}/g, groupName)

              await secureMessageSend(sock, id, {
                text: `👋 ${text}`,
                mentions: [participant]
              })
            }
          }

          // Goodbye
          if (action === 'remove' && settings.goodbye) {
            const groupMetadata = await getGroupMetadataCached(sock, id)
            const groupName = groupMetadata.subject || 'ce groupe'

            for (const participant of participants) {
              let text = settings.goodbye
              text = text.replace(/{user}/g, `@${participant.split('@')[0]}`)
              text = text.replace(/{group}/g, groupName)

              await secureMessageSend(sock, id, {
                text: `👋 ${text}`,
                mentions: [participant]
              })
            }
          }

          // Antibot
          if (action === 'add' && settings.antibot) {
            const groupMetadata = await getGroupMetadataCached(sock, id)
            
            for (const participant of participants) {
              // Vérifier si c'est un bot (JID commence par un préfixe spécifique)
              // Baileys et autres bots ont souvent des JIDs qui ne sont pas des numéros purs
              const isLikelyBot = !participant.startsWith('1') && !participant.startsWith('2') && 
                                  !participant.startsWith('3') && !participant.startsWith('4') &&
                                  !participant.startsWith('5') && !participant.startsWith('6') &&
                                  !participant.startsWith('7') && !participant.startsWith('8') &&
                                  !participant.startsWith('9')
              
              if (isLikelyBot) {
                try {
                  await sock.groupParticipantsUpdate(id, [participant], 'remove')
                  await secureMessageSend(sock, id, {
                    text: `🤖 Bot détecté et expulsé : @${participant.split('@')[0]}\n\n💡 Antibot est activé dans ce groupe.`,
                    mentions: [participant]
                  })
                } catch (e) {
                  console.error('Erreur antibot expulsion:', e)
                }
              }
            }
          }
        } catch (e) {
          console.error('Erreur group-participants.update:', e)
        }
      })

      creating = false
      reconnectAttempts = 0
      return sock
    } catch (err) {
      creating = false
      reconnectAttempts++
      console.error('createSocket error', err?.message || err)
      const wait = Math.min(1000 * (2 ** reconnectAttempts), 60000) + rand(500)
      console.log(chalk.yellow(`⏱ Nouvelle tentative dans ${wait}ms`))
      await sleep(wait)
      return createSocket()
    }
  }

  try { await createSocket() } 
  catch (e) { console.error('Erreur createSocket', e) }

  process.on('uncaughtException', (err) => console.error('uncaughtException', err))
  process.on('unhandledRejection', (err) => console.error('unhandledRejection', err))
}

start().catch(err => console.error('start() failed', err))