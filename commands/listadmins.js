// commands/listadmins.js - Owner only
import { isOwner, getAdmins } from '../utils/permissions.js'

export default async function (sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid

  // Vérifier que c'est le owner
  if (!isOwner(sender)) {
    return await sock.sendMessage(from, { 
      text: '⛔ Cette commande est réservée au propriétaire du bot.' 
    }, { quoted: msg })
  }

  const admins = getAdmins()
  const owner = process.env.OWNER || 'Non défini'

  let text = '👑 *Liste des admins du bot*\n\n'
  text += `🔰 Owner : @${owner}\n\n`

  if (admins.length === 0) {
    text += '📋 Aucun admin (seulement le owner).'
  } else {
    text += `📋 Admins (${admins.length}) :\n`
    admins.forEach((admin, i) => {
      text += `${i + 1}. @${admin.split('@')[0]}\n`
    })
  }

  text += '\n💡 Utilise `.setadmin @user` pour promouvoir un admin.'

  const mentions = [`${owner}@s.whatsapp.net`, ...admins]

  await sock.sendMessage(from, {
    text,
    mentions
  }, { quoted: msg })
}
