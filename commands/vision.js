// commands/vision.js - Analyser image avec IA (Gemini Vision)
import { GoogleGenerativeAI } from '@google/generative-ai'
import { sendWithTyping } from '../utils/sendWithTyping.js' // facultatif : si tu as ce helper
const MODEL_ID = 'gemini-pro-vision'
const MAX_IMAGE_BYTES = 4 * 1024 * 1024 // 4 MB
const DOWNLOAD_TIMEOUT = 20000

// Extraire le texte de la réponse Gemini (variantes possibles)
function extractGeminiText(result) {
  const response = result?.response
  if (!response) return null

  // méthode commune
  if (typeof response.text === 'function') {
    try {
      const t = response.text()
      if (t) return t.trim()
    } catch {}
  }

  // candidats / parts
  const candidates = response?.candidates || result?.candidates
  const parts = candidates
    ?.flatMap(c => c?.content?.parts || c?.parts || [])
    ?.map(p => p?.text || (p?.image ? '[image]' : null))
    .filter(Boolean)
  if (parts?.length) return parts.join('\n').trim()

  // fallback structure
  try {
    const raw = JSON.stringify(result)
    return raw.slice(0, 2000)
  } catch {
    return null
  }
}

export default async function visionCommand(sock, msg, args) {
  const from = msg.key.remoteJid

  // Récupérer le message image (soit le message actuel, soit le quoted)
  const quotedInfo = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
  const imageMsg = msg.message?.imageMessage || quotedInfo?.imageMessage

  if (!imageMsg) {
    return sock.sendMessage(from, {
      text: `╭─────────────────────╮
│ 👁️ *AI VISION*      │
╰─────────────────────╯

❌ *Usage :*
Réponds à une image avec .vision [question optionnelle]

📝 Exemples :
• Réponds à une image + ".vision Que vois-tu ?"
• Réponds à une image + ".vision Décris cette image"

💡 Limite d'image : 4 MB (JPG/PNG/WEBP)`
    }, { quoted: msg })
  }

  // Construire la question
  const question = args && args.length ? args.join(' ').trim() : "Décris cette image en détail. Identifie les objets, personnes, lieux, couleurs et l'ambiance."

  // Indiquer que l'analyse démarre (utilise sendWithTyping si dispo)
  try {
    if (typeof sendWithTyping === 'function') {
      await sendWithTyping(sock, from, { text: '👁️ Analyse de l\'image en cours... L\'IA observe l\'image.' }, { quoted: msg })
    } else {
      await sock.sendMessage(from, { text: '👁️ Analyse de l\'image en cours...' }, { quoted: msg })
    }
  } catch (e) {
    // ignore — on continue même si l'indication échoue
    console.warn('info send failed', e?.message)
  }

  try {
    // Vérifier clé API
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return sock.sendMessage(from, {
        text: `❌ *GEMINI_API_KEY manquante*\nAjoute GEMINI_API_KEY=ta_cle_dans_.env et redémarre le bot.`
      }, { quoted: msg })
    }

    // Télécharger l'image (utiliser le message quoted si disponible)
    const mediaSource = msg.message?.extendedTextMessage?.contextInfo || msg
    const buffer = await sock.downloadMediaMessage(mediaSource, { timeout: DOWNLOAD_TIMEOUT }).catch(err => {
      throw new Error('Échec téléchargement de l\'image ou timeout')
    })

    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Impossible de récupérer le contenu de l\'image')
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
      return sock.sendMessage(from, {
        text: `❗ L'image est trop volumineuse (${(buffer.length / (1024 * 1024)).toFixed(2)} MB). Réduis-la à < 4 MB et réessaie.`
      }, { quoted: msg })
    }

    const mime = imageMsg.mimetype || 'image/jpeg'
    const base64Image = buffer.toString('base64')

    // Préparer client Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: MODEL_ID })

    // Construire la requête dans la forme la plus compatible possible
    const contents = [
      {
        role: 'user',
        parts: [
          { text: question },
          {
            image: {
              mimeType: mime,
              // inline data base64 (nommé data ici) — shape dépendra du SDK mais souvent accepté
              // on inclut base64 string ; le SDK/serveur convertira en bytes
              data: base64Image
            }
          }
        ]
      }
    ]

    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 800
      }
    })

    const description = extractGeminiText(result)

    if (!description) {
      throw new Error('Aucune description générée par le modèle')
    }

    const replyText = `╭─────────────────────╮
│ 👁️ *ANALYSE IA*     │
╰─────────────────────╯

${description}

━━━━━━━━━━━━━━━━━━━━
🤖 Analysé par Gemini Vision AI`

    // Envoyer le résultat (avec typing si dispo)
    if (typeof sendWithTyping === 'function') {
      await sendWithTyping(sock, from, { text: replyText }, { quoted: msg })
    } else {
      await sock.sendMessage(from, { text: replyText }, { quoted: msg })
    }

  } catch (err) {
    console.error('Erreur .vision:', err)

    // Messages d'erreur spécifiques et conseils utiles
    const msgLower = (err?.message || '').toLowerCase()
    if (msgLower.includes('api key') || msgLower.includes('gemini_api_key') || msgLower.includes('manquante')) {
      return sock.sendMessage(from, {
        text: `❌ *Clé API Gemini manquante ou invalide*\nAjoute GEMINI_API_KEY dans ton .env et vérifie sa validité.`
      }, { quoted: msg })
    }

    if (msgLower.includes('timeout') || msgLower.includes('téléchargement')) {
      return sock.sendMessage(from, {
        text: '⚠️ Problème réseau ou timeout lors du téléchargement de l\'image. Réessaie avec une connexion stable ou une image plus petite.'
      }, { quoted: msg })
    }

    if (msgLower.includes('format') || msgLower.includes('mime') || msgLower.includes('image')) {
      return sock.sendMessage(from, {
        text: '⚠️ Format d\'image non supporté ou image corrompue. Utilise JPG, PNG ou WEBP.'
      }, { quoted: msg })
    }

    // fallback message
    await sock.sendMessage(from, {
      text: `❌ Impossible d'analyser l'image.\nRaisons possibles:\n• Clé API manquante/invalide\n• Image trop volumineuse (>4MB)\n• Format non supporté\n• Problème temporaire du service\n\nErreur: ${err?.message || 'Inconnue'}`
    }, { quoted: msg })
  }
}
