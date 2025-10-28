// commands/trivia.js
import axios from 'axios'
import { translate } from '@vitalets/google-translate-api'

export default async function (sock, msg) {
  const from = msg.key.remoteJid

  try {
    await sock.sendMessage(from, { text: '⏳ Chargement de la question...' }, { quoted: msg })

    const res = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple', { timeout: 8000 })

    if (!res.data || !res.data.results || !res.data.results[0]) {
      throw new Error('Question indisponible')
    }

    const trivia = res.data.results[0]
    const question = decodeHTML(trivia.question)
    const correctAnswer = decodeHTML(trivia.correct_answer)
    const incorrectAnswers = trivia.incorrect_answers.map(a => decodeHTML(a))
    
    // Mélanger les réponses
    const allAnswers = [...incorrectAnswers, correctAnswer].sort(() => Math.random() - 0.5)
    const correctIndex = allAnswers.indexOf(correctAnswer) + 1

    // Traduire en français
    let translatedQuestion = question
    let translatedAnswers = allAnswers
    try {
      const qTranslation = await translate(question, { from: 'en', to: 'fr' })
      translatedQuestion = qTranslation.text

      const promises = allAnswers.map(a => translate(a, { from: 'en', to: 'fr' }))
      const results = await Promise.all(promises)
      translatedAnswers = results.map(r => r.text)
    } catch (e) {
      console.log('Traduction échouée')
    }

    const answersList = translatedAnswers.map((a, i) => `${i + 1}. ${a}`).join('\n')

    const message = `
╭─────────────────────╮
│  🎯 *QUIZ TRIVIA*   │
╰─────────────────────╯

❓ *Question :*
${translatedQuestion}

📝 *Réponses :*
${answersList}

━━━━━━━━━━━━━━━━━━━━
⏱️ Réponse dans 30 secondes !
    `.trim()

    await sock.sendMessage(from, { text: message }, { quoted: msg })

    // Réponse après 30 secondes
    setTimeout(async () => {
      await sock.sendMessage(from, {
        text: `✅ *Réponse correcte :* ${correctIndex}. ${translatedAnswers[correctIndex - 1]}\n\n🎯 Bonne réponse ?`
      }, { quoted: msg })
    }, 30000)

  } catch (err) {
    console.error('Erreur .trivia:', err)
    await sock.sendMessage(from, { text: '❗ Impossible de charger une question.' }, { quoted: msg })
  }
}

function decodeHTML(html) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}
