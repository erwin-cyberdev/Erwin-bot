// commands/fact.js
import axios from 'axios'

/**
 * Usage:
 *  .fact          -> obtient un fait en anglais (par défaut)
 *  .fact fr       -> obtient un fait en anglais puis tente de le traduire en français (fallback: en)
 */

const API_URL = 'https://uselessfacts.jsph.pl/random.json?language=en'
const TRANSLATE_URL = 'https://libretranslate.de/translate'

// petit cache pour éviter les doublons (LRU-like, FIFO)
const recentFacts = []
const RECENT_MAX = 50

// cooldown local par utilisateur (ms)
const userCooldown = new Map()
const LOCAL_COOLDOWN_MS = 3000

// fallback local facts (si l'API est indisponible)
const FALLBACK_FACTS = [
  "Honey never spoils. Archaeologists have found edible honey in ancient Egyptian tombs.",
  "Bananas are berries, botanically speaking.",
  "There are more possible iterations of a game of chess than atoms in the known universe.",
  "Octopuses have three hearts.",
  "A group of flamingos is called a 'flamboyance'."
]

// utilitaires
function now() { return Date.now() }
function inCooldown(user) {
  const last = userCooldown.get(user) || 0
  return now() - last < LOCAL_COOLDOWN_MS
}
function setCooldown(user) { userCooldown.set(user, now()) }

function addRecent(fact) {
  recentFacts.push(fact)
  if (recentFacts.length > RECENT_MAX) recentFacts.shift()
}
function isRecent(fact) {
  return recentFacts.includes(fact)
}

async function fetchWithRetries(url, opts = {}, attempts = 3, backoff = 300) {
  let lastErr = null
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await axios.get(url, { timeout: opts.timeout || 8000, headers: opts.headers || {} })
      return r
    } catch (e) {
      lastErr = e
      await new Promise(res => setTimeout(res, backoff * (i + 1)))
    }
  }
  throw lastErr
}

async function translateIfNeeded(text, target = 'fr') {
  try {
    const res = await axios.post(TRANSLATE_URL, {
      q: text,
      source: 'auto',
      target,
      format: 'text'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 9000
    })
    return res.data?.translatedText || null
  } catch (e) {
    // si la traduction échoue, on renvoie null pour utiliser le texte original
    return null
  }
}

export default async function factCommand(sock, msg, args) {
  const chatId = msg.key.remoteJid
  const quoted = msg
  const sender = msg.key.participant || chatId

  // anti-spam local
  if (inCooldown(sender)) {
    try { await sock.sendMessage(chatId, { text: '⏳ Calme un peu ! Réessaie dans quelques secondes.' }, { quoted }) } catch {}
    return
  }
  setCooldown(sender)

  const wantTranslateFR = Array.isArray(args) && args[0] && args[0].toLowerCase() === 'fr'

  // try to fetch from API with retries and avoid repeats
  try {
    let apiResp = await fetchWithRetries(API_URL, { timeout: 8000 }, 3, 300)
    let factText = (apiResp.data && (apiResp.data.text || apiResp.data.data || apiResp.data.fact)) ? (apiResp.data.text || apiResp.data.data || apiResp.data.fact) : null

    // if API returned unexpected shape or empty, fallback to local
    if (!factText || typeof factText !== 'string' || factText.trim().length === 0) {
      throw new Error('Empty fact from API')
    }

    // éviter les duplications : si répété, tenter re-fetch jusqu'à 3 fois
    let tries = 0
    while (isRecent(factText) && tries < 3) {
      tries++
      try {
        apiResp = await fetchWithRetries(API_URL, { timeout: 8000 }, 2, 200)
        factText = apiResp.data.text || apiResp.data.data || apiResp.data.fact || factText
      } catch (e) {
        break
      }
    }

    // si toujours récent ou null -> fallback local random
    if (!factText || isRecent(factText)) {
      factText = FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)]
    }

    // optionnel: traduction en FR
    let outText = factText
    if (wantTranslateFR) {
      const translated = await translateIfNeeded(factText, 'fr')
      if (translated) outText = translated
      // si traduction échoue, on garde le texte original (anglais)
    }

    addRecent(factText)
    await sock.sendMessage(chatId, { text: outText }, { quoted })
    return
  } catch (err) {
    console.error('fact command error:', err?.message || err)

    // fallback local fact if API totally fails
    try {
      const fallback = FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)]
      const out = wantTranslateFR ? (await translateIfNeeded(fallback, 'fr')) || fallback : fallback
      addRecent(fallback)
      await sock.sendMessage(chatId, { text: out }, { quoted })
      return
    } catch (e) {
      console.error('fact fallback error:', e?.message || e)
      try { await sock.sendMessage(chatId, { text: 'Désolé, impossible de récupérer un fait pour le moment.' }, { quoted }) } catch {}
    }
  }
}
