// commands/setgoodbye.js - Admin only
import { isAdmin } from '../utils/permissions.js'
import { updateGroupSetting, getGroupSettings } from '../utils/groupSettings.js'

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid

  if (!from.endsWith('@g.us')) {
    return await sock.sendMessage(from, { text: '❗ Cette commande fonctionne uniquement dans un groupe.' }, { quoted: msg })
  }

  if (!isAdmin(sender)) {
    return await sock.sendMessage(from, {
      text: '⛔ Cette commande est réservée aux admins du bot.\n\n💡 Le owner peut te promouvoir avec `.setadmin`'
    }, { quoted: msg })
  }

  const message = args.join(' ').trim()

  if (!message) {
    const settings = getGroupSettings(from) || {}
    const current = settings.goodbye
    if (!current) {
      return await sock.sendMessage(from, {
        text: `❗ Usage : \`.setgoodbye <message>\`

💡 *Variables disponibles :*
• {user} → mention du membre qui part (sera remplacé par @pseudo)
• {group} → nom du groupe

📝 Exemple :
\`.setgoodbye Au revoir {user}, à bientôt dans {group} !\`

Pour désactiver :
\`.setgoodbye off\``
      }, { quoted: msg })
    } else {
      return await sock.sendMessage(from, { text: `📋 *Message d'au revoir actuel :*\n\n${current}\n\n💡 Pour modifier : \`.setgoodbye <nouveau message>\`\nPour désactiver : \`.setgoodbye off\`` }, { quoted: msg })
    }
  }

  if (message.toLowerCase() === 'off') {
    updateGroupSetting(from, 'goodbye', null)
    return await sock.sendMessage(from, { text: '✅ Message d\'au revoir désactivé.' }, { quoted: msg })
  }

  updateGroupSetting(from, 'goodbye', message)
  await sock.sendMessage(from, {
    text: `✅ *Message d'au revoir configuré :*\n\n${message}\n\n💡 Lors du départ, {user} sera mentionné automatiquement (@pseudo).`
  }, { quoted: msg })
}
