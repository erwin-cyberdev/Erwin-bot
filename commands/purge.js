// commands/purge.js - Supprimer messages en masse
import { isOwner, isAdmin } from '../utils/permissions.js'

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid

  // Vérifier permissions (admin groupe ou owner bot)
  const isGroupAdmin = await checkGroupAdmin(sock, from, sender)
  const isBotOwner = isOwner(sender)

  if (!isGroupAdmin && !isBotOwner) {
    return sock.sendMessage(from, {
      text: '❌ Cette commande est réservée aux admins du groupe!'
    }, { quoted: msg })
  }

  const count = parseInt(args[0])

  if (!count || count < 1 || count > 100) {
    return sock.sendMessage(from, {
      text: `╭─────────────────────╮
             │ 🗑️ *PURGE MESSAGES* │
             ╰─────────────────────╯

❌ *Usage :*
.purge <nombre>

📝 *Exemples :*
• .purge 10 - Supprimer les 10 derniers messages
• .purge 50 - Supprimer les 50 derniers messages

⚠️ *Limites :*
• Minimum : 1 message
• Maximum : 100 messages
• Seuls les messages récents peuvent être supprimés

━━━━━━━━━━━━━━━━━━━━
🔒 Réservé aux admins du groupe`
    }, { quoted: msg })
  }

  try {
    await sock.sendMessage(from, {
      text: `🗑️ Suppression de ${count} message(s)...\n\n⏳ Patiente...`
    }, { quoted: msg })

    // Note: WhatsApp ne permet pas de récupérer l'historique des messages
    // Cette commande est donc limitée et ne fonctionne que pour les messages
    // que le bot a en cache

    await sock.sendMessage(from, {
      text: `⚠️ *Fonctionnalité limitée*

WhatsApp ne permet pas de supprimer les messages en masse via l'API.

💡 *Alternative :*
Le bot peut seulement supprimer:
• Ses propres messages
• Les messages qu'il reçoit en temps réel

🔧 *Pour supprimer des messages :*
1. Utilise la fonction native WhatsApp
2. Sélectionne les messages
3. Supprime-les manuellement

━━━━━━━━━━━━━━━━━━━━
Cette limitation vient de WhatsApp, pas du bot.`
    }, { quoted: msg })

  } catch (err) {
    console.error('Erreur .purge:', err)
    await sock.sendMessage(from, {
      text: `❌ Impossible de purger les messages.\n\nErreur: ${err.message}`
    }, { quoted: msg })
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
