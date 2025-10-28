// commands/song.js
import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import yts from 'yt-search'
import ytdlp from 'yt-dlp-exec'

const TEMP_DIR = path.resolve('./tmp/song')
const MAX_AUDIO_BYTES = parseInt(process.env.MAX_AUDIO_BYTES || String(30 * 1024 * 1024), 10) // 30 MB par défaut

async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true })
  } catch {}
}

export default async function songCommand(sock, msg, args) {
  const from = msg.key.remoteJid
  const query = args.join(' ').trim()
  if (!query) {
    return sock.sendMessage(from, { text: '❗ *Usage:* .song <titre de la chanson>' }, { quoted: msg })
  }

  await ensureTempDir()

  try {
    const search = await yts(query)
    const video = search?.videos?.[0]
    if (!video) {
      return sock.sendMessage(from, { text: '🔍 Aucun résultat trouvé.' }, { quoted: msg })
    }

    const { title, url, timestamp, views, ago, author, thumbnail } = video
    const viewsFormatted = typeof views === 'number' ? views.toLocaleString('fr-FR') : views

    const infoText = `
╭─────────────────────╮
│  🎵 *SONG DOWNLOADER*  │
╰─────────────────────╯

🎶 *Titre :*
   ${title}

🎤 *Artiste/Chaîne :*
   ${author?.name || 'Inconnu'}

⏱️ *Durée :* ${timestamp}
👁️ *Vues :* ${viewsFormatted}
📅 *Publié :* ${ago}

🔗 *Lien :*
   ${url}

⏳ *Téléchargement en cours...*
━━━━━━━━━━━━━━━━━━━━
📥 Extraction audio MP3 via yt-dlp
⌛ Patiente quelques secondes...
    `.trim()

    try {
      if (thumbnail) {
        await sock.sendMessage(from, { image: { url: thumbnail }, caption: infoText }, { quoted: msg })
      } else {
        await sock.sendMessage(from, { text: infoText }, { quoted: msg })
      }
    } catch {
      await sock.sendMessage(from, { text: infoText }, { quoted: msg })
    }

    const tempId = randomUUID()
    const outputPath = path.join(TEMP_DIR, `${tempId}.m4a`)

    try {
      const result = await ytdlp(url, {
        output: outputPath,
        format: 'bestaudio/best',
        extractAudio: true,
        audioFormat: 'm4a',
        audioQuality: '0',
        quiet: true,
        noWarnings: true,
        noCallHome: true,
        addHeader: ['Referer: https://www.youtube.com/'],
        // Limiter la taille via --max-filesize si défini
        maxFilesize: `${Math.floor(MAX_AUDIO_BYTES / (1024 * 1024))}M`
      })

      if (result.stderr) {
        console.warn('yt-dlp stderr:', result.stderr)
      }

      const fileData = await fs.readFile(outputPath)
      if (!fileData || !fileData.length) {
        throw new Error('Fichier audio vide')
      }

      if (fileData.length > MAX_AUDIO_BYTES) {
        const sizeMB = (fileData.length / (1024 * 1024)).toFixed(2)
        await sock.sendMessage(from, { text: `🚫 Fichier trop volumineux (${sizeMB} MB). Limite: ${Math.round(MAX_AUDIO_BYTES/1024/1024)} MB.` }, { quoted: msg })
        return
      }

      const sizeInMB = (fileData.length / (1024 * 1024)).toFixed(2)

      await sock.sendMessage(from, {
        audio: fileData,
        mimetype: 'audio/mp4',
        fileName: `${title}.m4a`
      }, { quoted: msg })

      const successText = `
✅ *Téléchargement terminé !*

🎵 *Titre :* ${title}
💾 *Taille :* ${sizeInMB} MB
🎶 *Format :* M4A (yt-dlp)
━━━━━━━━━━━━━━━━━
🎵 Bonne écoute !
      `.trim()

      await sock.sendMessage(from, { text: successText }, { quoted: msg })

    } catch (downloadErr) {
      console.error('yt-dlp song error:', downloadErr)
      await sock.sendMessage(from, {
        text: '❗ Impossible de télécharger cette chanson. La vidéo est peut-être privée, restreinte ou indisponible.'
      }, { quoted: msg })
    } finally {
      try { await fs.rm(outputPath, { force: true }) } catch {}
    }

  } catch (err) {
    console.error('Erreur .song:', err)
    await sock.sendMessage(from, { text: '❗ Impossible de récupérer la chanson. Essaie un autre titre.' }, { quoted: msg })
  }
}
