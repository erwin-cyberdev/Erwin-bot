// utils/messageQueue.js - File d'attente intelligente pour éviter le ban
const queue = []
let isProcessing = false

// Configuration
const CONFIG = {
  minDelay: 1500,        // Délai minimum entre messages (1.5s)
  maxDelay: 3200,        // Délai maximum entre messages (3.2s)
  maxQueueSize: 200,
  burstLimit: 5,
  burstCooldown: 3500,
  dailyLimit: 2000,
  hourlyLimit: 250,

  // Présence
  presenceRefreshInterval: 2000, // ms — fréquence d'envoi du presence pour garder les '...'
}

// Statistiques & comportement humain
const HUMAN_BEHAVIOR = {
  typingMin: 2200,
  typingMax: 4200,
  postMin: 700,
  postMax: 1500,
  perCharMs: 30,    // ms par caractère (impacte la latence pour messages longs)
  maxExtraTyping: 3000 // max extra ajouté par la longueur du message
}

const stats = {
  sent: 0,
  queued: 0,
  rejected: 0,
  lastReset: Date.now(),
  hourlyCounts: [],
  dailyCount: 0
}

/** Utilitaires **/
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min))
}

/** Délai aléatoire de base */
function getRandomDelay() {
  const base = CONFIG.minDelay + Math.random() * (CONFIG.maxDelay - CONFIG.minDelay)
  const variation = base * 0.2 * (Math.random() - 0.5) // ±10%
  return Math.floor(base + variation)
}

/** Détecte le type de présence à envoyer selon le contenu */
function detectPresenceType(content) {
  if (!content) return 'composing'
  // audio / ptt => recording
  if (content.audio || content.ptt) return 'recording'
  // sticker / image / video => composing (on affiche quand même '...')
  if (content.video || content.image || content.sticker || content.document) return 'composing'
  // texte
  if (content.text || typeof content === 'string') return 'composing'
  return 'composing'
}

/**
 * Vérifie les limites quotidiennes et horaires
 */
function checkLimits() {
  const now = Date.now()
  const hourAgo = now - 3600000

  // Reset compteur quotidien
  if (now - stats.lastReset > 86400000) {
    stats.dailyCount = 0
    stats.lastReset = now
  }

  // Nettoyer compteurs horaires
  stats.hourlyCounts = stats.hourlyCounts.filter(t => t > hourAgo)

  // Vérifier limites
  if (stats.dailyCount >= CONFIG.dailyLimit) {
    console.warn('⚠️ Limite quotidienne atteinte')
    return false
  }

  if (stats.hourlyCounts.length >= CONFIG.hourlyLimit) {
    console.warn('⚠️ Limite horaire atteinte')
    return false
  }

  return true
}

/**
 * Simule comportement humain :
 * - envoie presenceSubscribe (si possible)
 * - envoie presence 'composing' / 'recording' périodiquement pour garder les "..."
 * - attend typingDelay + postDelay
 * - ne fait pas le 'available' ici (on le fera après envoi)
 */
async function simulateHumanBehavior(sock, jid, content) {
  // best-effort presenceSubscribe (certaines versions/contexts n'en ont pas besoin)
  try { if (typeof sock.presenceSubscribe === 'function') await sock.presenceSubscribe(jid) } catch (e) {}

  const presenceType = detectPresenceType(content)

  // Base typing delay + bonus proportionnel à la longueur du texte (pour paraître naturel)
  let typingDelay = randomBetween(HUMAN_BEHAVIOR.typingMin, HUMAN_BEHAVIOR.typingMax)

  // Calcul extra selon longueur si texte présent
  const textLen = (content && content.text) ? String(content.text).length : 0
  if (textLen > 0) {
    const extra = Math.min(HUMAN_BEHAVIOR.maxExtraTyping, textLen * HUMAN_BEHAVIOR.perCharMs)
    typingDelay += extra
  }

  // Commencer à "écrire"
  try { await sock.sendPresenceUpdate(presenceType, jid) } catch (e) {}

  // Rafraîchir la présence toutes les X ms pour maintenir les trois points
  const interval = CONFIG.presenceRefreshInterval || 2000
  let elapsed = 0
  while (elapsed < typingDelay) {
    const step = Math.min(interval, typingDelay - elapsed)
    await sleep(step)
    elapsed += step
    try { await sock.sendPresenceUpdate(presenceType, jid) } catch (e) {}
  }

  // Petite pause finale avant d'envoyer (post-typing)
  const postDelay = randomBetween(HUMAN_BEHAVIOR.postMin, HUMAN_BEHAVIOR.postMax)
  await sleep(postDelay)
}

/**
 * Ajoute un message à la file d'attente
 */
export function enqueueMessage(sock, jid, content, options = {}) {
  return new Promise((resolve, reject) => {
    // Vérifier taille de la file
    if (queue.length >= CONFIG.maxQueueSize) {
      stats.rejected++
      console.warn('⚠️ File d\'attente pleine, message rejeté')
      reject(new Error('Queue full'))
      return
    }

    // Vérifier limites
    if (!checkLimits()) {
      stats.rejected++
      reject(new Error('Rate limit exceeded'))
      return
    }

    // Ajouter à la file
    queue.push({
      sock,
      jid,
      content,
      options,
      resolve,
      reject,
      timestamp: Date.now()
    })

    stats.queued++

    // Démarrer traitement si pas déjà en cours
    if (!isProcessing) {
      // Ne pas await ici pour laisser la promesse retourner au caller
      processQueue().catch(err => {
        console.error('processQueue error:', err)
      })
    }
  })
}

/**
 * Traite la file d'attente
 */
async function processQueue() {
  if (isProcessing) return
  isProcessing = true

  while (queue.length > 0) {
    const task = queue.shift()
    // décrémentation queued — gardons un suivi propre
    stats.queued = Math.max(0, stats.queued - 1)

    const deletionTarget = task.content?.delete
    if (deletionTarget) {
      const userId = task.sock?.user?.id
      const selfDelete = deletionTarget.fromMe === true
        || (userId && (deletionTarget.participant === userId || deletionTarget.remoteJid === userId))

      if (selfDelete) {
        task.resolve({ skipped: true, reason: 'self-delete-blocked' })
        continue
      }
    }

    try {
      // Calcul du temps déjà attendu en file
      const waitedTime = Date.now() - task.timestamp

      // Délai de base (pour espacer les envois)
      let delay = getRandomDelay()

      // Si le message a déjà attendu > 1s, réduire le délai pour améliorer réactivité
      if (waitedTime > 1000) {
        delay = Math.max(Math.floor(CONFIG.minDelay / 2), delay - waitedTime)
      }

      // Ajouter latence proportionnelle à la longueur du message (si texte)
      const textLen = (task.content && task.content.text) ? String(task.content.text).length : 0
      if (textLen > 0) {
        delay += Math.min(HUMAN_BEHAVIOR.maxExtraTyping, textLen * HUMAN_BEHAVIOR.perCharMs / 2) // plus léger ici
      }

      await sleep(delay)

      // Vérifier à nouveau les limites
      if (!checkLimits()) {
        task.reject(new Error('Rate limit exceeded during send'))
        continue
      }

      // Simuler comportement humain (affiche les "...")
      await simulateHumanBehavior(task.sock, task.jid, task.content)

      // Envoyer le message (utilise __originalSendMessage si défini)
      const sendFn = task.sock.__originalSendMessage
        ? task.sock.__originalSendMessage
        : (typeof task.sock.sendMessage === 'function' ? task.sock.sendMessage.bind(task.sock) : null)

      if (!sendFn) {
        throw new Error('Aucune fonction send disponible sur sock')
      }

      // Envoi réel
      const result = await sendFn(task.jid, task.content, task.options)

      // Après envoi, arrêter la présence (available) pour enlever les "..."
      try { await task.sock.sendPresenceUpdate('available', task.jid) } catch (e) {}

      // Mettre à jour stats
      stats.sent++
      stats.dailyCount++
      stats.hourlyCounts.push(Date.now())

      task.resolve(result)

      // Log pour monitoring (moins fréquent)
      if (stats.sent % 100 === 0) {
        console.log(`📊 Messages envoyés: ${stats.sent}, En file: ${queue.length}`)
      }

    } catch (err) {
      console.error('❌ Erreur envoi message:', err)

      // Essayer d'envoyer un "available" pour nettoyer la UI
      try { await task.sock.sendPresenceUpdate('available', task.jid) } catch (e) {}

      task.reject(err)
    }

    // Pause plus longue après rafale
    if (stats.sent > 0 && stats.sent % CONFIG.burstLimit === 0) {
      await sleep(CONFIG.burstCooldown)
    }
  }

  isProcessing = false
}

/**
 * Envoie un message texte avec file d'attente
 */
export async function sendText(sock, jid, text, options = {}) {
  return enqueueMessage(sock, jid, { text }, options)
}

/**
 * Envoie une image avec file d'attente
 * image: buffer / stream / { url: ... } selon Baileys usage
 */
export async function sendImage(sock, jid, image, caption = '', options = {}) {
  const content = { image, caption }
  return enqueueMessage(sock, jid, content, options)
}

/**
 * Envoie un audio avec file d'attente
 */
export async function sendAudio(sock, jid, audio, options = {}) {
  const content = { audio, mimetype: options.mimetype || 'audio/ogg; codecs=opus' }
  return enqueueMessage(sock, jid, content, options)
}

/**
 * Envoie une vidéo avec file d'attente
 */
export async function sendVideo(sock, jid, video, caption = '', options = {}) {
  const content = { video, caption }
  return enqueueMessage(sock, jid, content, options)
}

/**
 * Obtenir les statistiques
 */
export function getStats() {
  return {
    ...stats,
    queueSize: queue.length,
    isProcessing,
    hourlyRate: stats.hourlyCounts.length,
    dailyRate: stats.dailyCount
  }
}

/**
 * Réinitialiser les statistiques
 */
export function resetStats() {
  stats.sent = 0
  stats.queued = 0
  stats.rejected = 0
  stats.lastReset = Date.now()
  stats.hourlyCounts = []
  stats.dailyCount = 0
}

/**
 * Vider la file d'attente (urgence)
 */
export function clearQueue() {
  const cleared = queue.length
  queue.length = 0
  console.log(`🗑️ File vidée: ${cleared} messages supprimés`)
  return cleared
}

/**
 * Configuration personnalisée
 */
export function setConfig(newConfig) {
  Object.assign(CONFIG, newConfig)
  console.log('⚙️ Configuration mise à jour:', CONFIG)
}

export function attachSendWrapper(sock) {
  if (!sock || typeof sock.sendMessage !== 'function') return sock
  if (!sock.__originalSendMessage) {
    sock.__originalSendMessage = sock.sendMessage.bind(sock)
    sock.sendMessage = (jid, content, options = {}) => enqueueMessage(sock, jid, content, options)
  }
  return sock
}
