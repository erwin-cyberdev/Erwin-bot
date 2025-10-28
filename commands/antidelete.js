// commands/antidelete.js
import { isAdmin } from '../utils/permissions.js'
import { toggleGroupSetting } from '../utils/groupSettings.js'
import { sendWithTyping } from '../utils/sendWithTyping.js'

export default async function antideleteCommand(sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid

  if (!from.endsWith('@g.us')) {
    return sock.sendMessage(from, { text: '❗ Cette commande fonctionne uniquement dans un groupe.' }, { quoted: msg })
  }

  if (!isAdmin(sender)) {
    return sock.sendMessage(from, {
      text: '⛔ Cette commande est réservée aux admins du bot.\n\n💡 Le owner peut te promouvoir avec `.setadmin`'
    }, { quoted: msg })
  }

  const newValue = toggleGroupSetting(from, 'antidelete')
  const text = newValue
    ? '🗑️ *Antidelete activé* ✅\n\nLes messages supprimés seront renvoyés dans le groupe avec le contenu et l\'auteur.'
    : '🗑️ *Antidelete désactivé* ❌\n\nLes messages supprimés ne seront plus renvoyés.'

  if (typeof sendWithTyping === 'function') {
    return sendWithTyping(sock, from, { text }, { quoted: msg })
  }

  return sock.sendMessage(from, { text }, { quoted: msg })
}
