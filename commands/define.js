// commands/define.js
import axios from 'axios'

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries'
const LANGUAGES = ['fr', 'en'] // Recherche d'abord en français, puis anglais
const MAX_DEFINITIONS = 3
const MAX_SENSES = 2

// Cherche le mot dans plusieurs langues
async function fetchEntry(word) {
  for (const lang of LANGUAGES) {
    try {
      const res = await axios.get(`${API_BASE}/${lang}/${encodeURIComponent(word)}`, {
        timeout: 10000,
        headers: { 'User-Agent': 'ErwinBot-Dictionary/1.0' },
        validateStatus: status => [200, 404].includes(status)
      })

      if (res.status === 200 && Array.isArray(res.data) && res.data[0]) {
        return { entry: res.data[0], language: lang }
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') throw new Error('Délai dépassé pour la requête dictionnaire.')
      if (err.response?.status && ![404].includes(err.response.status)) {
        throw new Error(`Dictionnaire indisponible (HTTP ${err.response.status})`)
      }
    }
  }
  return { entry: null, language: null }
}

// Construire la réponse formatée
function buildResponse(word, entry, language) {
  const phonetic = entry.phonetic || entry.phonetics?.find?.(p => p?.text)?.text || null
  const meanings = Array.isArray(entry.meanings) ? entry.meanings.slice(0, MAX_DEFINITIONS) : []

  const definitionLines = []
  const synonymsSet = new Set()

  for (const meaning of meanings) {
    const part = meaning.partOfSpeech || 'sens'
    const defs = Array.isArray(meaning.definitions) ? meaning.definitions.slice(0, MAX_SENSES) : []

    for (const def of defs) {
      if (!def?.definition) continue
      if (Array.isArray(def.synonyms)) def.synonyms.slice(0, 5).forEach(s => synonymsSet.add(s))
      let line = `• *[${part}]* ${def.definition}`
      if (def.example) line += `\n   💡 _"${def.example}"_`
      definitionLines.push(line)
    }
  }

  if (!definitionLines.length) return null

  const synonyms = Array.from(synonymsSet).slice(0, 10)
  const blocks = [`📖 *Mot :* ${word}`]
  if (phonetic) blocks.push(`🔊 *Prononciation :* ${phonetic}`)
  blocks.push(`🔤 *Définitions :*\n${definitionLines.join('\n')}`)
  if (synonyms.length) blocks.push(`🔁 *Synonymes :* ${synonyms.join(', ')}`)
  if (language === 'en') blocks.push('ℹ️ Définition disponible uniquement en anglais pour ce mot.')

  return `
╭─────────────────────╮
│  📚 *DICTIONNAIRE*  │
╰─────────────────────╯

${blocks.join('\n\n')}

━━━━━━━━━━━━━━━━━━━━
📚 Source: dictionaryapi.dev
  `.trim()
}

export default async function defineCommand(sock, msg, args) {
  const from = msg.key.remoteJid

  if (!args.length) {
    return sock.sendMessage(from, {
      text: '📚 *Dictionnaire*\n\n*Usage :* `.define <mot>`\n\n*Exemples :*\n• `.define amour`\n• `.define love`'
    }, { quoted: msg })
  }

  const word = args.join(' ').trim()
  if (!word) {
    return sock.sendMessage(from, { text: '❗ Merci de préciser un mot à rechercher.' }, { quoted: msg })
  }

  await sock.sendMessage(from, { text: '⏳ Recherche dans le dictionnaire...' }, { quoted: msg })

  try {
    const { entry, language } = await fetchEntry(word)

    if (!entry) {
      return sock.sendMessage(from, { text: `❗ Aucune définition trouvée pour "${word}".` }, { quoted: msg })
    }

    const message = buildResponse(word, entry, language)
    if (!message) {
      return sock.sendMessage(from, { text: `❗ Aucune définition exploitable pour "${word}".` }, { quoted: msg })
    }

    await sock.sendMessage(from, { text: message }, { quoted: msg })

  } catch (err) {
    console.error('Erreur .define:', err)
    await sock.sendMessage(from, {
      text: `❗ Erreur lors de la recherche dans le dictionnaire.\nMotif : ${err?.message || 'Inconnue'}`
    }, { quoted: msg })
  }
}
