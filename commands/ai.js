// ai.js - utilisation stable de Gemini 2.0
import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL_ID = 'gemini-2.5-flash'
const MAX_PROMPT = 4000
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504])
const MAX_RETRIES = 3
const BASE_WAIT_MS = 1000
const TIMEOUT_MS = 20000 // timeout pour chaque requête

function sanitizePrompt(text = '') {
  return String(text).replace(/\s+/g, ' ').trim()
}

function truncatePrompt(prompt) {
  if (!prompt) return ''
  if (prompt.length <= MAX_PROMPT) return prompt
  return `${prompt.slice(0, MAX_PROMPT - 100)}… (tronqué)`
}

function parseTextCandidatesFromResult(result) {
  // Plusieurs formes possibles selon versions / wrappers du SDK
  try {
    // direct text() (ancienne forme observée)
    const resp = result?.response || result
    if (!resp) return null

    if (typeof resp.text === 'function') {
      const t = resp.text()
      if (t) return String(t).trim()
    }

    // outputText (parfois)
    if (typeof resp.outputText === 'string' && resp.outputText.trim()) {
      return resp.outputText.trim()
    }

    // candidates -> content -> parts -> text
    const candidates = resp?.candidates || result?.candidates || resp?.output || resp?.outputs
    if (Array.isArray(candidates) && candidates.length) {
      const parts = candidates
        .flatMap(c => {
          const content = c?.content || c
          // content may contain 'parts' or 'text' directly
          if (Array.isArray(content?.parts)) {
            return content.parts.map(p => p?.text).filter(Boolean)
          }
          if (Array.isArray(c?.parts)) {
            return c.parts.map(p => p?.text).filter(Boolean)
          }
          if (typeof content === 'string') return [content]
          if (typeof c === 'string') return [c]
          return []
        })
        .filter(Boolean)
      if (parts.length) return parts.join('\n').trim()
    }

    // fallback common shapes
    if (typeof result?.output?.[0]?.content?.[0]?.text === 'string') {
      return result.output[0].content[0].text.trim()
    }

    if (typeof result?.text === 'string') return result.text.trim()
  } catch (e) {
    // ignore parse errors, return null below
  }

  return null
}

function wait(ms) {
  return new Promise(res => setTimeout(res, ms))
}

function withTimeout(promise, ms, onAbort) {
  let timer
  const wrapped = Promise.race([
    promise,
    new Promise((_, rej) => {
      timer = setTimeout(() => {
        if (typeof onAbort === 'function') onAbort()
        rej(new Error(`Timeout après ${ms} ms`))
      }, ms)
    })
  ])
  wrapped.finally(() => clearTimeout(timer))
  return wrapped
}

async function callGemini(model, prompt) {
  let attempt = 0
  let lastError = null

  while (attempt <= MAX_RETRIES) {
    try {
      // Préparer la requête (on essaye generateContent, sinon generateText)
      const call = async () => {
        if (typeof model.generateContent === 'function') {
          return await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.6,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 2048
            }
          })
        }

        // fallback : generateText (autres versions du SDK)
        if (typeof model.generateText === 'function') {
          return await model.generateText({
            model: MODEL_ID,
            prompt,
            temperature: 0.6,
            max_output_tokens: 2048
          })
        }

        // dernier recours : essayer une méthode générique
        if (typeof model.generate === 'function') {
          return await model.generate({ prompt, model: MODEL_ID })
        }

        throw new Error('Aucune méthode de génération disponible sur le modèle Gemini')
      }

      const result = await withTimeout(call(), TIMEOUT_MS)
      const text = parseTextCandidatesFromResult(result)
      if (text) return text

      // si texte vide, forcer erreur pour entrer en retry (ou finir)
      throw new Error('Réponse Gemini vide')
    } catch (err) {
      lastError = err
      const status = err?.status || err?.response?.status || err?.code

      // si status non retryable, sortir de la boucle
      if (!RETRYABLE_STATUS.has(status)) {
        // si timeout, on considère retryable
        if (!String(err.message || '').toLowerCase().includes('timeout') && attempt > 0 && !RETRYABLE_STATUS.has(status)) {
          break
        }
      }

      attempt += 1
      // backoff exponentiel avec jitter
      const backoff = Math.min(8000, BASE_WAIT_MS * Math.pow(2, attempt))
      const jitter = Math.floor(Math.random() * 500)
      const waitMs = backoff + jitter
      await wait(waitMs)
    }
  }

  throw lastError || new Error('Erreur inconnue Gemini')
}

export default async function aiCommand(sock, msg, args) {
  const from = msg.key.remoteJid
  const rawPrompt = sanitizePrompt(args.join(' '))

  if (!rawPrompt) {
    return sock.sendMessage(from, { text: '💡 Utilisation : `.ai <ta question ou ton texte>`' }, { quoted: msg })
  }

  if (!process.env.GEMINI_API_KEY) {
    return sock.sendMessage(from, {
      text: '⚠️ Clé `GEMINI_API_KEY` manquante. Ajoute-la dans `.env` puis redémarre le bot.'
    }, { quoted: msg })
  }

  // message d'attente (optionnel, tu peux remplacer par presence typing)
  try {
    await sock.sendMessage(from, { text: '🧠 Erwin-Bot réfléchit...' }, { quoted: msg })
  } catch (e) {
    // ignore send errors for the typing notice
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: MODEL_ID })

    const prompt = truncatePrompt(rawPrompt)

    const reply = await callGemini(model, prompt)

    if (!reply) {
      throw new Error('Réponse vide de Gemini')
    }

    // couper si trop long (WhatsApp a des limites)
    const MAX_WH_TEXT = 6500
    const safeReply = reply.length > MAX_WH_TEXT ? `${reply.slice(0, MAX_WH_TEXT - 200)}\n\n(↘️ réponse trop longue, tronquée)` : reply

    await sock.sendMessage(from, {
      text: `✨ *Réponse de Erwin-Bot :*\n\n${safeReply}`
    }, { quoted: msg })

  } catch (err) {
    console.error('Erreur Gemini :', err)
    const status = err?.status || err?.response?.status
    const reason = err?.response?.error?.message || err?.message || 'inconnue'

    let message
    if (status === 401 || status === 403) {
      message = '⚠️ Clé API invalide ou permissions insuffisantes.'
    } else if (status === 429) {
      message = '⚠️ Trop de requêtes vers Gemini. Réessaie dans quelques instants.'
    } else if (String(reason).toLowerCase().includes('timeout')) {
      message = '⌛ Le service a mis trop de temps à répondre. Réessaie.'
    } else if (status === 503) {
      message = '⚠️ Service Gemini momentanément indisponible. Réessaie plus tard.'
    } else {
      message = `❗ Erreur Gemini : ${String(reason).slice(0, 200)}`
    }

    try {
      await sock.sendMessage(from, { text: message }, { quoted: msg })
    } catch (sendErr) {
      console.error('Erreur envoi message d\'erreur :', sendErr)
    }
  }
}
