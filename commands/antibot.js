// commands/antibot.js - Admin only
import { isAdmin } from '../utils/permissions.js'
import { toggleGroupSetting } from '../utils/groupSettings.js'

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid

  // Vérifier que c'est un groupe
  if (!from.endsWith('@g.us')) {
    return await sock.sendMessage(from, {
      text: '❗ Cette commande fonctionne uniquement dans un groupe.'
    }, { quoted: msg })
  }

  // Vérifier que c'est un admin du bot
  if (!isAdmin(sender)) {
    return await sock.sendMessage(from, {
      text: '⛔ Cette commande est réservée aux admins du bot.'
    }, { quoted: msg })
  }

  // Toggle le paramètre
  const newValue = toggleGroupSetting(from, 'antibot')

  if (newValue) {
    await sock.sendMessage(from, {
      text: '🤖 *Antibot activé* ✅\n\nLes bots ajoutés par des non-admins seront automatiquement expulsés.'
    }, { quoted: msg })
  } else {
    await sock.sendMessage(from, {
      text: '🤖 *Antibot désactivé* ❌\n\nLes bots peuvent maintenant être ajoutés librement.'
    }, { quoted: msg })
  }
}
