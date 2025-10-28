// commands/meme.js
import axios from 'axios'

export default async function (sock, msg) {
  const from = msg.key.remoteJid

  try {
    await sock.sendMessage(from, { text: '⏳ Génération d\'un meme...' }, { quoted: msg })

    const res = await axios.get('https://meme-api.com/gimme', { timeout: 8000 })

    if (!res.data || !res.data.url) {
      throw new Error('Meme indisponible')
    }

    const { title, url, author, subreddit, ups } = res.data

    await sock.sendMessage(from, {
      image: { url },
      caption: `😂 *${title}*\n\n👤 Par: u/${author}\n📱 r/${subreddit}\n⬆️ ${ups} upvotes\n\n━━━━━━━━━━━━━━━\n🤣 Meme du jour`
    }, { quoted: msg })

  } catch (err) {
    console.error('Erreur .meme:', err)
    await sock.sendMessage(from, { text: '❗ Impossible de charger un meme.' }, { quoted: msg })
  }
}
