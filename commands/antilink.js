// commands/antilink.js - Admin only
import { isAdmin } from '../utils/permissions.js'
import { toggleGroupSetting, getGroupSettings } from '../utils/groupSettings.js'

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
      text: '⛔ Cette commande est réservée aux admins du bot.\n\n💡 Le owner peut te promouvoir avec `.setadmin`'
    }, { quoted: msg })
  }

  // Toggle le paramètre
  const newValue = toggleGroupSetting(from, 'antilink')

  if (newValue) {
    await sock.sendMessage(from, {
      text: '🔗 *Antilink activé* ✅\n\nLes liens envoyés par les membres (non-admins du groupe) seront automatiquement supprimés.'
    }, { quoted: msg })
  } else {
    await sock.sendMessage(from, {
      text: '🔗 *Antilink désactivé* ❌\n\nLes liens sont maintenant autorisés.'
    }, { quoted: msg })
  }
}
