// commands/warns.js - Admin only
import { isAdmin } from '../utils/permissions.js'
import { getWarns, getGroupSettings } from '../utils/groupSettings.js'

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

  // Si @mention, afficher les warns de cette personne
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
  
  if (mentioned.length > 0) {
    const target = mentioned[0]
    const warnCount = getWarns(from, target)
    
    await sock.sendMessage(from, {
      text: `⚠️ *Avertissements*\n\n👤 @${target.split('@')[0]}\n🔢 Warns : ${warnCount}/3`,
      mentions: [target]
    }, { quoted: msg })
  } else {
    // Sinon, afficher tous les warns du groupe
    const settings = getGroupSettings(from)
    const warns = settings.warns || {}
    
    if (Object.keys(warns).length === 0) {
      return await sock.sendMessage(from, {
        text: '✅ Aucun avertissement dans ce groupe.'
      }, { quoted: msg })
    }

    let text = '⚠️ *Liste des avertissements*\n\n'
    let mentions = []
    
    for (const [jid, count] of Object.entries(warns)) {
      if (count > 0) {
        text += `• @${jid.split('@')[0]} : ${count}/3\n`
        mentions.push(jid)
      }
    }

    if (mentions.length === 0) {
      text = '✅ Aucun avertissement actif dans ce groupe.'
    }

    await sock.sendMessage(from, {
      text,
      mentions
    }, { quoted: msg })
  }
}
