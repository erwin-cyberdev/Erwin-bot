// commands/unwarn.js - Admin only
import { isAdmin } from '../utils/permissions.js'
import { removeWarn, getWarns } from '../utils/groupSettings.js'

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

  // Récupérer la cible
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
  const target = mentioned[0]

  if (!target) {
    return await sock.sendMessage(from, {
      text: '❗ Usage : `.unwarn @user`'
    }, { quoted: msg })
  }

  // Retirer un warn
  const warnCount = removeWarn(from, target)

  if (warnCount === 0 && getWarns(from, target) === 0) {
    await sock.sendMessage(from, {
      text: `⚠️ @${target.split('@')[0]} n'a aucun avertissement.`,
      mentions: [target]
    }, { quoted: msg })
  } else {
    await sock.sendMessage(from, {
      text: `✅ Un avertissement a été retiré à @${target.split('@')[0]}\n\n🔢 Warns actuels : ${warnCount}/3`,
      mentions: [target]
    }, { quoted: msg })
  }
}
