// commands/quote.js
import axios from 'axios'
import { translate } from '@vitalets/google-translate-api'

export default async function (sock, msg) {
  const from = msg.key.remoteJid

  try {
    await sock.sendMessage(from, { text: '⏳ Génération d\'une citation inspirante...' }, { quoted: msg })

    // API gratuite de citations
    const res = await axios.get('https://zenquotes.io/api/random', { timeout: 8000 })
    
    if (!res.data || !res.data[0]) {
      throw new Error('Aucune citation disponible')
    }

    const quote = res.data[0].q
    const author = res.data[0].a

    // Traduire en français
    let translatedQuote = quote
    try {
      const translation = await translate(quote, { from: 'en', to: 'fr' })
      translatedQuote = translation.text
    } catch (e) {
      console.log('Traduction échouée, texte anglais conservé')
    }

    const message = `
╭─────────────────────╮
│  💭 *CITATION DU JOUR*  │
╰─────────────────────╯

✨ *Citation :*
"${translatedQuote}"

👤 *Auteur :*
   ${author}

━━━━━━━━━━━━━━━━━━━━
💫 Inspiration quotidienne
    `.trim()

    await sock.sendMessage(from, { text: message }, { quoted: msg })

  } catch (err) {
    console.error('Erreur .quote:', err)
    await sock.sendMessage(from, { text: '❗ Impossible de récupérer une citation.' }, { quoted: msg })
  }
}
