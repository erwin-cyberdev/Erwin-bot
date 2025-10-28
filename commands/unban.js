// commands/unban.js - Owner only
import { isOwner, unbanUser } from '../utils/permissions.js'

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid

  // Vérifier que c'est le owner
  if (!isOwner(sender)) {
    return await sock.sendMessage(from, { 
      text: '⛔ Cette commande est réservée au propriétaire du bot.' 
    }, { quoted: msg })
  }

  // Récupérer la cible
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
  let target = mentioned[0]

  if (!target && args[0]) {
    let num = args[0].replace(/[^0-9]/g, '')
    if (num.length < 10) num = '237' + num
    target = `${num}@s.whatsapp.net`
  }

  if (!target) {
    return await sock.sendMessage(from, {
      text: '❗ Usage : `.unban @user` ou `.unban 674151474`'
    }, { quoted: msg })
  }

  // Débannir
  const success = unbanUser(target)
  if (success) {
    await sock.sendMessage(from, {
      text: `✅ @${target.split('@')[0]} a été débanni.\nIl peut maintenant utiliser le bot.`,
      mentions: [target]
    }, { quoted: msg })
  } else {
    await sock.sendMessage(from, {
      text: '⚠️ Cet utilisateur n\'est pas banni.'
    }, { quoted: msg })
  }
}
