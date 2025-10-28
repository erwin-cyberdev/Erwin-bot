// commands/advice.js
import axios from 'axios'
import { translate } from '@vitalets/google-translate-api'

export default async function (sock, msg) {
  const from = msg.key.remoteJid

  try {
    await sock.sendMessage(from, { text: '⏳ Génération d\'un conseil...' }, { quoted: msg })

    const res = await axios.get('https://api.adviceslip.com/advice', { timeout: 8000 })

    if (!res.data || !res.data.slip) {
      throw new Error('Conseil indisponible')
    }

    const advice = res.data.slip.advice

    // Traduire en français
    let translatedAdvice = advice
    try {
      const translation = await translate(advice, { from: 'en', to: 'fr' })
      translatedAdvice = translation.text
    } catch (e) {
      console.log('Traduction échouée')
    }

    const message = `
╭────────────────────────╮
│  💡 *CONSEIL DU JOUR*  │
╰────────────────────────╯

✨ *Conseil :*
"${translatedAdvice}"

━━━━━━━━━━━━━━━━━━━━
💡 Sagesse quotidienne
    `.trim()

    await sock.sendMessage(from, { text: message }, { quoted: msg })

  } catch (err) {
    console.error('Erreur .advice:', err)
    await sock.sendMessage(from, { text: '❗ Impossible de récupérer un conseil.' }, { quoted: msg })
  }
}
