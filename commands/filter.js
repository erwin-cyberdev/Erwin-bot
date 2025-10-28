// commands/filter.js - Filtrer mots interdits
import fs from 'fs'
import path from 'path'
import { isOwner, isAdmin } from '../utils/permissions.js'

const filterFile = path.join(process.cwd(), 'data', 'filters.json')

// Charger les filtres
function loadFilters() {
  try {
    if (!fs.existsSync(filterFile)) {
      const dataDir = path.dirname(filterFile)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      fs.writeFileSync(filterFile, JSON.stringify({ global: [], groups: {} }))
      return { global: [], groups: {} }
    }
    return JSON.parse(fs.readFileSync(filterFile, 'utf8'))
  } catch (err) {
    console.error('Erreur chargement filtres:', err)
    return { global: [], groups: {} }
  }
}

// Sauvegarder les filtres
function saveFilters(filters) {
  try {
    fs.writeFileSync(filterFile, JSON.stringify(filters, null, 2))
  } catch (err) {
    console.error('Erreur sauvegarde filtres:', err)
  }
}

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid
  const action = args[0]?.toLowerCase()

  // Vérifier permissions
  const isGroupAdmin = await checkGroupAdmin(sock, from, sender)
  const isBotOwner = isOwner(sender)

  if (!isGroupAdmin && !isBotOwner) {
    return sock.sendMessage(from, {
      text: '❌ Cette commande est réservée aux admins du groupe!'
    }, { quoted: msg })
  }

  if (!action) {
    return sock.sendMessage(from, {
      text: `╭─────────────────────╮
             │ 🚫 *WORD FILTER*    │
             ╰─────────────────────╯

📝 *Commandes :*
• .filter add <mot> - Ajouter un mot interdit
• .filter remove <mot> - Retirer un mot
• .filter list - Liste des mots filtrés
• .filter clear - Supprimer tous les filtres

⚠️ Les messages contenant ces mots seront supprimés automatiquement.

━━━━━━━━━━━━━━━━━━━━
🔒 Réservé aux admins du groupe`
    }, { quoted: msg })
  }

  const filters = loadFilters()
  const groupFilters = filters.groups[from] || []

  // Ajouter un mot
  if (action === 'add') {
    const word = args.slice(1).join(' ').trim().toLowerCase()
    
    if (!word) {
      return sock.sendMessage(from, {
        text: '❌ Spécifie un mot à filtrer.\n\nExemple: .filter add badword'
      }, { quoted: msg })
    }

    if (groupFilters.includes(word)) {
      return sock.sendMessage(from, {
        text: `⚠️ Le mot "${word}" est déjà dans la liste des filtres.`
      }, { quoted: msg })
    }

    groupFilters.push(word)
    filters.groups[from] = groupFilters
    saveFilters(filters)

    await sock.sendMessage(from, {
      text: `✅ Mot ajouté aux filtres!

🚫 Mot : "${word}"
📊 Total filtres : ${groupFilters.length}

Les messages contenant ce mot seront supprimés automatiquement.`
    }, { quoted: msg })
  }

  // Retirer un mot
  else if (action === 'remove' || action === 'delete') {
    const word = args.slice(1).join(' ').trim().toLowerCase()
    
    if (!word) {
      return sock.sendMessage(from, {
        text: '❌ Spécifie un mot à retirer.\n\nExemple: .filter remove badword'
      }, { quoted: msg })
    }

    const index = groupFilters.indexOf(word)
    if (index === -1) {
      return sock.sendMessage(from, {
        text: `⚠️ Le mot "${word}" n'est pas dans la liste des filtres.`
      }, { quoted: msg })
    }

    groupFilters.splice(index, 1)
    filters.groups[from] = groupFilters
    saveFilters(filters)

    await sock.sendMessage(from, {
      text: `✅ Mot retiré des filtres!

🚫 Mot : "${word}"
📊 Total filtres : ${groupFilters.length}`
    }, { quoted: msg })
  }

  // Lister les mots
  else if (action === 'list') {
    if (groupFilters.length === 0) {
      return sock.sendMessage(from, {
        text: '📋 Aucun mot filtré dans ce groupe.\n\nUtilise .filter add <mot> pour en ajouter.'
      }, { quoted: msg })
    }

    const list = groupFilters.map((word, i) => `${i + 1}. ${word}`).join('\n')

    await sock.sendMessage(from, {
      text: `╭─────────────────────╮
             │ 🚫 *MOTS FILTRÉS*   │
             ╰─────────────────────╯

📋 *Liste (${groupFilters.length}) :*
${list}

━━━━━━━━━━━━━━━━━━━━
Les messages avec ces mots sont supprimés automatiquement.`
    }, { quoted: msg })
  }

  // Tout supprimer
  else if (action === 'clear') {
    if (groupFilters.length === 0) {
      return sock.sendMessage(from, {
        text: '📋 Aucun mot filtré à supprimer.'
      }, { quoted: msg })
    }

    filters.groups[from] = []
    saveFilters(filters)

    await sock.sendMessage(from, {
      text: `✅ Tous les filtres ont été supprimés!

🗑️ ${groupFilters.length} mot(s) retiré(s)`
    }, { quoted: msg })
  }

  else {
    await sock.sendMessage(from, {
      text: '❌ Action invalide. Utilise: add, remove, list ou clear'
    }, { quoted: msg })
  }
}

// Fonction pour vérifier si un message contient un mot filtré
export function checkFilteredWords(text, groupId) {
  try {
    const filters = loadFilters()
    const groupFilters = filters.groups[groupId] || []
    
    if (groupFilters.length === 0) return null

    const lowerText = text.toLowerCase()
    
    for (const word of groupFilters) {
      if (lowerText.includes(word)) {
        return word
      }
    }
    
    return null
  } catch (err) {
    console.error('Erreur vérification filtres:', err)
    return null
  }
}

async function checkGroupAdmin(sock, groupId, userId) {
  try {
    if (!groupId.endsWith('@g.us')) return false
    
    const metadata = await sock.groupMetadata(groupId)
    const participant = metadata.participants.find(p => p.id === userId)
    return participant?.admin === 'admin' || participant?.admin === 'superadmin'
  } catch {
    return false
  }
}
