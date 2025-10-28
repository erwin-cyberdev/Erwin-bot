import { getAutoPingConfig, setAutoPingConfig, restartAutoPing } from '../utils/autoPing.js'
import { sendWithTyping } from '../utils/sendWithTyping.js'
import { isOwner } from '../utils/permissions.js'

const MIN_INTERVAL = 5
const MAX_INTERVAL = 240

export default async function autopingCommand(sock, msg, args) {
  const chatId = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid

  if (!isOwner(sender)) {
    await sock.sendMessage(chatId, {
      text: '⛔ Cette commande est réservée au propriétaire du bot.'
    }, { quoted: msg })
    return
  }

  if (!args.length) {
    const config = getAutoPingConfig()
    const status = config.enabled ? '✅ *activé*' : '❌ *désactivé*'
    const target = config.targetJid || 'status@broadcast'
    const interval = config.intervalMinutes
    const text = `⚙️ *AutoPing* — maintien de connexion

• État : ${status}
• Intervalle : *${interval} min*
• Cible : \`${target}\`

Commandes disponibles :
• \`.autoping on|off\`
• \`.autoping interval <minutes>\` (entre ${MIN_INTERVAL} et ${MAX_INTERVAL})
• \`.autoping target <jid>\`
• \`.autoping status\``
    if (typeof sendWithTyping === 'function') {
      await sendWithTyping(sock, chatId, { text }, { quoted: msg })
    } else {
      await sock.sendMessage(chatId, { text }, { quoted: msg })
    }
    return
  }

  const sub = args[0].toLowerCase()

  try {
    if (sub === 'status') {
      return autopingCommand(sock, msg, [])
    }

    if (sub === 'on' || sub === 'off') {
      const enabled = sub === 'on'
      setAutoPingConfig({ enabled })
      restartAutoPing(sock)
      const reply = enabled
        ? '✅ AutoPing activé. Le bot enverra un ping périodique.'
        : '🛑 AutoPing désactivé.'
      await sock.sendMessage(chatId, { text: reply }, { quoted: msg })
      return
    }

    if (sub === 'interval') {
      const value = parseInt(args[1], 10)
      if (Number.isNaN(value) || value < MIN_INTERVAL || value > MAX_INTERVAL) {
        await sock.sendMessage(chatId, {
          text: `❌ Intervalle invalide. Choisis une valeur entre ${MIN_INTERVAL} et ${MAX_INTERVAL} minutes.`
        }, { quoted: msg })
        return
      }
      setAutoPingConfig({ intervalMinutes: value })
      restartAutoPing(sock)
      await sock.sendMessage(chatId, {
        text: `⏱️ Intervalle AutoPing mis à jour : *${value} minutes*.`
      }, { quoted: msg })
      return
    }

    if (sub === 'target') {
      const target = args[1]
      if (!target || !target.includes('@')) {
        await sock.sendMessage(chatId, {
          text: '❌ Cible invalide. Fournis un JID tel que `status@broadcast` ou un chat spécifique.'
        }, { quoted: msg })
        return
      }
      setAutoPingConfig({ targetJid: target })
      restartAutoPing(sock)
      await sock.sendMessage(chatId, {
        text: `🎯 Cible AutoPing mise à jour : \`${target}\`.`
      }, { quoted: msg })
      return
    }

    await sock.sendMessage(chatId, {
      text: '❌ Option inconnue. Utilise `.autoping`, `.autoping on`, `.autoping off`, `.autoping interval <minutes>`, `.autoping target <jid>` ou `.autoping status`.'
    }, { quoted: msg })

  } catch (err) {
    console.error('Erreur .autoping:', err)
    await sock.sendMessage(chatId, {
      text: `⚠️ Erreur lors de la mise à jour AutoPing : ${err.message}`
    }, { quoted: msg })
  }
}
