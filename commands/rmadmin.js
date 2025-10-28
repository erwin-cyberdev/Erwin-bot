// commands/rmadmin.js - Owner only
import { isOwner, removeAdmin, isAdmin } from '../utils/permissions.js'

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
      text: '❗ Usage : `.rmadmin @user` ou `.rmadmin 674151474`'
    }, { quoted: msg })
  }

  // Vérifier que c'est pas le owner
  if (isOwner(target)) {
    return await sock.sendMessage(from, {
      text: '⚠️ Tu ne peux pas retirer tes propres droits owner !'
    }, { quoted: msg })
  }

  // Vérifier si admin
  if (!isAdmin(target)) {
    return await sock.sendMessage(from, {
      text: '⚠️ Cet utilisateur n\'est pas admin du bot.'
    }, { quoted: msg })
  }

  // Rétrograder
  const success = removeAdmin(target)
  if (success) {
    await sock.sendMessage(from, {
      text: `👎 @${target.split('@')[0]} n'est plus admin du bot.`,
      mentions: [target]
    }, { quoted: msg })
  } else {
    await sock.sendMessage(from, {
      text: '⚠️ Erreur lors de la rétrogradation.'
    }, { quoted: msg })
  }
}
