// commands/setwelcome.js - Admin only
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

  // Afficher usage / message actuel
  if (!message) {
    const settings = getGroupSettings(from) || {}
    const current = settings.welcome
    if (!current) {
      return await sock.sendMessage(from, {
        text: `❗ Usage : \`.setwelcome <message>\`

💡 *Variables disponibles :*
• {user} → mention du nouveau membre (sera remplacé par @pseudo)
• {group} → nom du groupe

📝 Exemple :
\`.setwelcome Bienvenue {user} dans {group} !\`

Pour désactiver :
\`.setwelcome off\``
      }, { quoted: msg })
    } else {
      return await sock.sendMessage(from, { text: `📋 *Message de bienvenue actuel :*\n\n${current}\n\n💡 Pour modifier : \`.setwelcome <nouveau message>\`\nPour désactiver : \`.setwelcome off\`` }, { quoted: msg })
    }
  }

  // Désactiver si "off"
  if (message.toLowerCase() === 'off') {
    updateGroupSetting(from, 'welcome', null)
    return await sock.sendMessage(from, { text: '✅ Message de bienvenue désactivé.' }, { quoted: msg })
  }

  // Stocker le template tel quel (conserver {user} et {group})
  updateGroupSetting(from, 'welcome', message)
  await sock.sendMessage(from, {
    text: `✅ *Message de bienvenue configuré :*\n\n${message}\n\n💡 Lors de l'arrivée, {user} sera mentionné automatiquement (@pseudo).`
  }, { quoted: msg })
}
