// handlers/antiDeleteHandler.js
import { cacheMessage, getCachedMessage } from '../utils/messageCache.js'
import { getGroupSetting } from '../utils/groupSettings.js'

const MEDIA_TYPES = [
  'imageMessage',
  'videoMessage',
  'audioMessage',
  'documentMessage',
  'stickerMessage'
]

export function initAntiDelete(sock) {
  try {
    if (sock?.ev?.on) {
      sock.ev.on('messages.upsert', ({ messages }) => {
        for (const msg of messages || []) {
          cacheMessage(sock, msg)
        }
      })

      sock.ev.on('messages.update', (updates) => {
        for (const upd of updates || []) {
          const proto = upd?.protocolMessage
          if (proto?.type === 0 && proto?.key) {
            handleRevoke(sock, proto.key, proto.participant)
          }

          if (upd?.messageStubType === 8 || upd?.messageStubType === 'REVOKE' || upd?.isDeleted) {
            if (upd?.key) handleRevoke(sock, upd.key, upd.participant)
          }
        }
      })
    } else {
      console.warn('initAntiDelete: sock.ev introuvable, appels manuels requis.')
    }
  } catch (err) {
    console.error('initAntiDelete error:', err)
  }
}

export async function handleRevoke(sock, key, participant) {
  try {
    if (!key?.remoteJid || !key?.id) return
    const chatId = key.remoteJid
    const enabled = getGroupSetting(chatId, 'antidelete')
    if (!enabled) return

    const cached = getCachedMessage(chatId, key.id, true)
    if (!cached) {
      const who = participant || key.participant || 'inconnu'
      await sock.sendMessage(chatId, { text: `🗑️ Un message a été supprimé par ${who} mais son contenu n'était pas en cache.` })
      return
    }

    const author = cached.sender || 'inconnu'
    const time = new Date(cached.timestamp || Date.now()).toLocaleString('fr-FR')
    const content = cached.msg?.message || {}

    if (content.conversation || content.extendedTextMessage) {
      const text = content.conversation || content.extendedTextMessage?.text || content.extendedTextMessage?.caption || ''
      const header = `🚨 *Message supprimé*\n• Auteur: ${author}\n• Heure: ${time}`
      await sock.sendMessage(chatId, { text: `${header}\n\n${text}` })
      return
    }

    for (const type of MEDIA_TYPES) {
      if (content[type] && cached.media?.buffer) {
        const caption = `🚨 Message supprimé\n• Auteur: ${author}\n• Heure: ${time}`
        const payload = {}
        if (type === 'imageMessage') payload.image = cached.media.buffer
        if (type === 'videoMessage') payload.video = cached.media.buffer
        if (type === 'audioMessage') payload.audio = cached.media.buffer
        if (type === 'documentMessage') payload.document = cached.media.buffer
        if (type === 'stickerMessage') payload.sticker = cached.media.buffer
        payload.mimetype = cached.media.mime || content[type]?.mimetype
        payload.caption = ['imageMessage', 'videoMessage', 'documentMessage'].includes(type) ? caption : undefined
        await sock.sendMessage(chatId, payload)
        await sock.sendMessage(chatId, { text: caption })
        return
      }
    }

    const raw = JSON.stringify(content).slice(0, 1500)
    await sock.sendMessage(chatId, {
      text: `🚨 Message supprimé (type non supporté). Auteur: ${author}\n\nDonnées: ${raw}`
    })
  } catch (err) {
    console.error('handleRevoke error:', err)
  }
}
