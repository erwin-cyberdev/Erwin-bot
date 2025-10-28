import { getCachedMessage, getRecentMessages } from '../utils/messageCache.js'

const MAX_DELETE = 50

function normalizeLimit(value) {
  const num = parseInt(value, 10)
  if (Number.isNaN(num) || num < 1) return 1
  return Math.min(num, MAX_DELETE)
}

function keyToDeletePayload(chatId, cachedEntry) {
  if (!cachedEntry?.msg?.key?.id) return null
  const payload = { ...cachedEntry.msg.key }
  payload.remoteJid = payload.remoteJid || chatId
  if (payload.remoteJid.endsWith('@g.us') && !payload.participant) {
    payload.participant = cachedEntry.sender || undefined
  }
  payload.fromMe = Boolean(payload.fromMe)
  return payload
}

function keyFromContext(chatId, contextInfo) {
  if (!contextInfo?.stanzaId) return null
  return {
    id: contextInfo.stanzaId,
    remoteJid: chatId,
    participant: contextInfo.participant,
    fromMe: false
  }
}

export default async function clearCommand(sock, msg, args) {
  const chatId = msg.key.remoteJid
  const limit = normalizeLimit(args[0])
  const quotedInfo = msg.message?.extendedTextMessage?.contextInfo
  const targets = new Map()

  if (!chatId) {
    return sock.sendMessage(msg.key.remoteJid, {
      text: '❌ Impossible d\'identifier cette conversation.'
    }, { quoted: msg })
  }

  try {
    if (chatId.endsWith('@g.us')) {
      const metadata = await sock.groupMetadata(chatId)
      const botId = sock?.user?.id?.split(':')[0]
      const botJid = botId ? `${botId}@s.whatsapp.net` : null
      const isAdmin = metadata?.participants?.some(p => p.id === botJid && p.admin)
      if (!isAdmin) {
        return sock.sendMessage(chatId, {
          text: '⚠️ Je dois être *admin du groupe* pour supprimer des messages.'
        }, { quoted: msg })
      }
    }

    if (quotedInfo?.stanzaId) {
      const quotedCached = getCachedMessage(chatId, quotedInfo.stanzaId, false)
      let payload = keyToDeletePayload(chatId, quotedCached)
      if (!payload) payload = keyFromContext(chatId, quotedInfo)
      if (payload?.id) targets.set(payload.id, payload)
    }

    const recent = getRecentMessages(chatId, limit + 10)
    for (let i = recent.length - 1; i >= 0 && targets.size < limit; i--) {
      const cached = recent[i]
      const payload = keyToDeletePayload(chatId, cached)
      if (!payload || payload.id === msg.key.id) continue
      targets.set(payload.id, payload)
    }

    if (!targets.size) {
      return sock.sendMessage(chatId, {
        text: 'ℹ️ Aucun message trouvé à supprimer (vérifie que le cache est actif et que je suis admin).'
      }, { quoted: msg })
    }

    let success = 0
    for (const payload of targets.values()) {
      try {
        await sock.sendMessage(chatId, { delete: payload })
        success++
        await new Promise(r => setTimeout(r, 200))
      } catch (err) {
        console.error('Suppression échouée pour', payload.id, err)
      }
    }

    await sock.sendMessage(chatId, {
      text: `🧹 ${success} message(s) supprimé(s).`
    }, { quoted: msg })

  } catch (err) {
    console.error('Erreur .clear:', err)
    await sock.sendMessage(chatId, {
      text: `⚠️ Erreur lors de .clear: ${err.message || err}`
    }, { quoted: msg })
  }
}
