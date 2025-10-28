// commands/setadmin.js - Owner only
import { isOwner, addAdmin, isAdmin } from '../utils/permissions.js'

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
      text: '❗ Usage : `.setadmin @user` ou `.setadmin 674151474`\n\n💡 Cette commande donne les droits admin du bot (commandes admin), pas admin du groupe.'
    }, { quoted: msg })
  }

  // Vérifier si déjà admin
  if (isAdmin(target)) {
    return await sock.sendMessage(from, {
      text: '⚠️ Cet utilisateur est déjà admin du bot.'
    }, { quoted: msg })
  }

  // Promouvoir
  const success = addAdmin(target)
  if (success) {
    await sock.sendMessage(from, {
      text: `👑 @${target.split('@')[0]} est maintenant admin du bot.\nIl peut utiliser les commandes admin (.antilink, .antidelete, .warn, etc.)`,
      mentions: [target]
    }, { quoted: msg })
  } else {
    await sock.sendMessage(from, {
      text: '⚠️ Erreur lors de la promotion.'
    }, { quoted: msg })
  }
}
