// commands/yt.js
import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import yts from 'yt-search'
import ytdlp from 'yt-dlp-exec'
import { sendText, sendVideo } from '../utils/messageQueue.js'

const TEMP_DIR = path.resolve('./tmp/video')
const MAX_MEDIA_BYTES = parseInt(process.env.MAX_MEDIA_BYTES || String(50 * 1024 * 1024), 10) // 50 MB default

function isYouTubeUrl(s = '') {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(s)
}

async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true })
  } catch {}
}

export default async function ytCommand(sock, msg, args = []) {
  const from = msg.key.remoteJid
  const query = (args || []).join(' ').trim()
  if (!query) return sendText(sock, from, '❗ Usage: .yt <lien ou recherche>', { quoted: msg })

  await ensureTempDir()

  let url = query
  let videoInfo = null

  try {
    if (!isYouTubeUrl(query)) {
      const r = await yts(query)
      const v = r?.videos?.[0]
      if (!v) return sendText(sock, from, '🔍 Aucune vidéo trouvée.', { quoted: msg })
      url = v.url
      videoInfo = v
    } else {
      try {
        const parsed = await yts({ videoId: new URL(url).searchParams.get('v') })
        videoInfo = parsed?.videos?.[0] || null
      } catch {}
    }

    const { title, timestamp, views, ago, author, thumbnail } = videoInfo || {}
    const viewsFormatted = typeof views === 'number' ? views.toLocaleString('fr-FR') : views

    const infoText = `
╭─────────────────────────╮
│  🎬 *VIDEO DOWNLOADER*  │
╰─────────────────────────╯

🎬 *Titre :*
   ${title || 'YouTube Video'}

🎥 *Chaîne :*
   ${author?.name || 'Inconnue'}

⏱️ *Durée :* ${timestamp || 'N/A'}
👁️ *Vues :* ${viewsFormatted || 'N/A'}
📅 *Publié :* ${ago || 'N/A'}

🔗 *Lien :*
   ${url}

⏳ *Téléchargement en cours...*
━━━━━━━━━━━━━━━━━━━━
📥 Extraction vidéo via yt-dlp
⌛ Patiente quelques secondes...
    `.trim()

    if (thumbnail) {
      try {
        await sock.sendMessage(from, { image: { url: thumbnail }, caption: infoText }, { quoted: msg })
      } catch {
        await sendText(sock, from, infoText, { quoted: msg })
      }
    } else {
      await sendText(sock, from, infoText, { quoted: msg })
    }

    const tempId = randomUUID()
    const outputPath = path.join(TEMP_DIR, `${tempId}.mp4`)

    try {
      const result = await ytdlp(url, {
        output: outputPath,
        format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        mergeOutputFormat: 'mp4',
        quiet: true,
        noWarnings: true,
        noCallHome: true,
        addHeader: ['Referer: https://www.youtube.com/'],
        maxFilesize: `${Math.floor(MAX_MEDIA_BYTES / (1024 * 1024))}M`
      })

      if (result.stderr) {
        console.warn('yt-dlp stderr:', result.stderr)
      }

      const fileData = await fs.readFile(outputPath)
      if (!fileData?.length) throw new Error('Fichier vidéo vide')

      if (fileData.length > MAX_MEDIA_BYTES) {
        const sizeMB = (fileData.length / (1024 * 1024)).toFixed(2)
        await sendText(sock, from, `🚫 Fichier trop volumineux (${sizeMB} MB). Limite: ${Math.round(MAX_MEDIA_BYTES/1024/1024)} MB.`, { quoted: msg })
        return
      }

      const sizeInMB = (fileData.length / (1024 * 1024)).toFixed(2)

      await sendVideo(sock, from, fileData, `🎬 *${title || 'YouTube Video'}*\n🔗 ${url}`, { quoted: msg })

      const successText = `
✅ *Téléchargement terminé !*

🎬 *Titre :* ${title || 'YouTube Video'}
💾 *Taille :* ${sizeInMB} MB
🎬 *Format :* MP4 (yt-dlp)
━━━━━━━━━━━━━━━━━
🎬 Bon visionnage !
      `.trim()

      await sendText(sock, from, successText, { quoted: msg })

    } catch (downloadErr) {
      console.error('yt-dlp video error:', downloadErr)
      await sendText(sock, from, '❗ Impossible de télécharger cette vidéo. Elle est peut-être privée ou restreinte.', { quoted: msg })
    } finally {
      try { await fs.rm(outputPath, { force: true }) } catch {}
    }

  } catch (err) {
    console.error('yt command error:', err)
    try { await sendText(sock, from, '❗ Erreur YouTube.', { quoted: msg }) } catch {}
  }
}
