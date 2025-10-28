// commands/listbanned.js - Owner only
import { isOwner, getBanned } from '../utils/permissions.js'

export default async function (sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid

  // Vérifier que c'est le owner
  if (!isOwner(sender)) {
    return await sock.sendMessage(from, { 
      text: '⛔ Cette commande est réservée au propriétaire du bot.' 
    }, { quoted: msg })
  }

  const banned = getBanned()

  if (!Array.isArray(banned) || banned.length === 0) {
    return await sock.sendMessage(from, {
      text: '🚫 *Liste des bannis*\n\n✅ Aucun utilisateur n\'est actuellement banni.'
    }, { quoted: msg })
  }

  const normalized = banned.map((user) => {
    const id = typeof user === 'string' ? user.split('@')[0] : ''
    return id ? `${id}@s.whatsapp.net` : user
  })

  const lines = banned.map((user, idx) => {
    const id = typeof user === 'string' ? user.split('@')[0] : `utilisateur_${idx + 1}`
    return `${idx + 1}. @${id}`
  })

  const message = `
╭─────────────────────╮
│  🚫 *UTILISATEURS BANNIS*  │
╰─────────────────────╯

📋 Total : ${banned.length}

${lines.join('\n')}

━━━━━━━━━━━━━━━━━━━━
💡 Utilise \`.unban @user\` pour débannir.
  `.trim()

  await sock.sendMessage(from, {
    text: message,
    mentions: normalized
  }, { quoted: msg })
}
