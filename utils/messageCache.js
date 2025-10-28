// utils/messageCache.js
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'

const CACHE = new Map()
const HISTORY = new Map()
const MAX_CACHE_AGE_MS = 24 * 3600 * 1000
const MAX_MEDIA_CACHE_MB = 8
const MAX_HISTORY_PER_CHAT = 500

function ensureChatMap(chatId) {
  if (!CACHE.has(chatId)) CACHE.set(chatId, new Map())
  return CACHE.get(chatId)
}

function pushHistory(chatId, msgId) {
  if (!chatId || !msgId) return
  const list = HISTORY.get(chatId) || []
  list.push(msgId)
  if (list.length > MAX_HISTORY_PER_CHAT) list.shift()
  HISTORY.set(chatId, list)
}

function removeFromHistory(chatId, msgId) {
  const list = HISTORY.get(chatId)
  if (!list) return
  const idx = list.indexOf(msgId)
  if (idx !== -1) list.splice(idx, 1)
  if (!list.length) HISTORY.delete(chatId)
}

function shouldDownloadMedia(media) {
  if (!media) return false
  const fileLen = media.fileLength || media.size || media.length || 0
  if (!fileLen) return true
  const sizeMB = Number(fileLen) / (1024 * 1024)
  return sizeMB <= MAX_MEDIA_CACHE_MB
}

export function cacheMessage(sock, message) {
  try {
    if (!message?.key?.id || !message.key.remoteJid) return
    const chatId = message.key.remoteJid
    const msgId = message.key.id

    const entry = {
      key: message.key,
      msg: message,
      message: message.message,
      sender: message.key.participant || message.key.remoteJid,
      timestamp: Date.now(),
      media: null
    }

    ensureChatMap(chatId).set(msgId, entry)
    pushHistory(chatId, msgId)

    const mediaContainer = message.message
    const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage']
    for (const type of mediaTypes) {
      const media = mediaContainer?.[type] || mediaContainer?.extendedTextMessage?.contextInfo?.quotedMessage?.[type]
      if (!media) continue
      if (!shouldDownloadMedia(media)) break

      if (typeof sock?.downloadMediaMessage === 'function') {
        sock.downloadMediaMessage(message).then(buffer => {
          try {
            if (!buffer || !Buffer.isBuffer(buffer)) return
            if (buffer.length / (1024 * 1024) > MAX_MEDIA_CACHE_MB) return
            const chatMap = ensureChatMap(chatId)
            const cached = chatMap.get(msgId)
            if (!cached) return
            cached.media = {
              buffer,
              mime: media.mimetype || media.mtype || 'application/octet-stream'
            }
            chatMap.set(msgId, cached)
          } catch {}
        }).catch(() => {})
      }
      break
    }

    pruneCache()
  } catch (err) {
    console.warn('cacheMessage error', err?.message)
  }
}

export function getCachedMessage(chatId, msgId, remove = true) {
  const chatMap = CACHE.get(chatId)
  if (!chatMap) return null
  const entry = chatMap.get(msgId) || null
  if (remove && entry) {
    chatMap.delete(msgId)
    removeFromHistory(chatId, msgId)
    if (chatMap.size === 0) CACHE.delete(chatId)
  }
  return entry
}

export function getRecentMessages(chatId, limit = 10) {
  const history = HISTORY.get(chatId)
  if (!history || !history.length) return []

  const chatMap = CACHE.get(chatId)
  if (!chatMap) return []

  const selected = []
  for (let i = history.length - 1; i >= 0 && selected.length < limit; i--) {
    const entry = chatMap.get(history[i])
    if (entry) selected.push(entry)
  }

  return selected.reverse()
}

export function pruneCache() {
  const now = Date.now()
  for (const [chatId, map] of CACHE.entries()) {
    for (const [msgId, entry] of map.entries()) {
      if (now - (entry.timestamp || 0) > MAX_CACHE_AGE_MS) {
        map.delete(msgId)
        removeFromHistory(chatId, msgId)
      }
    }
    if (map.size === 0) CACHE.delete(chatId)
  }
}

export function mediaToTempFile(media, prefix = 'antidelete') {
  if (!media?.buffer) return null
  try {
    const filename = path.join(tmpdir(), `${prefix}-${Date.now()}`)
    fs.writeFileSync(filename, media.buffer)
    return filename
  } catch {
    return null
  }
}

setInterval(pruneCache, 30 * 60 * 1000)
