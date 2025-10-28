// commands/imagine.js - Générer image avec IA
import axios from 'axios'

const POLLINATIONS_TIMEOUT = 90000
const FALLBACK_TIMEOUT = 60000
const MAX_PROMPT_LENGTH = 200

function sanitizePrompt(raw) {
  if (!raw) return ''
  const trimmed = raw.replace(/\s+/g, ' ').trim()
  return trimmed.slice(0, MAX_PROMPT_LENGTH)
}

async function fetchPollinationsImage(prompt) {
  const encodedPrompt = encodeURIComponent(prompt)
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`

  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: POLLINATIONS_TIMEOUT,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    },
    validateStatus: status => status === 200
  })

  return Buffer.from(response.data)
}

async function fetchHercaiImage(prompt) {
  const altApiUrl = `https://hercai.onrender.com/v3/text2image?prompt=${encodeURIComponent(prompt)}`
  const altResponse = await axios.get(altApiUrl, {
    timeout: FALLBACK_TIMEOUT,
    validateStatus: status => status === 200
  })

  const remoteUrl = altResponse.data?.url
  if (!remoteUrl) return null

  const imageResponse = await axios.get(remoteUrl, {
    responseType: 'arraybuffer',
    timeout: FALLBACK_TIMEOUT,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    },
    validateStatus: status => status === 200
  })

  return Buffer.from(imageResponse.data)
}

async function fetchCraiyonImage(prompt) {
  const finalResponse = await axios.post('https://api.craiyon.com/v3', { prompt }, {
    timeout: FALLBACK_TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
    validateStatus: status => status === 200
  })

  const base64Image = finalResponse.data?.images?.[0]
  if (!base64Image) return null
  return Buffer.from(base64Image, 'base64')
}

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const prompt = sanitizePrompt(args.join(' '))

  if (!prompt) {
    return sock.sendMessage(from, {
      text: `╭─────────────────────╮
             │ 🎨 *AI IMAGE GEN*   │ 
             ╰─────────────────────╯

❌ *Usage :*
.imagine <description>

📝 *Exemples :*
• .imagine un chat astronaute dans l'espace
• .imagine paysage montagneux au coucher du soleil
• .imagine robot futuriste, style cyberpunk
• .imagine portrait d'une femme élégante

━━━━━━━━━━━━━━━━━━━━
🎨 Génère des images avec l'IA!

💡 *Conseils :*
• Sois précis dans ta description
• Utilise des adjectifs (beau, coloré, etc.)
• Mentionne un style si souhaité
• Patience, ça prend 30-60s`
    }, { quoted: msg })
  }

  try {
    await sock.sendMessage(from, {
      text: `🎨 *Génération en cours...*

📝 Prompt: "${prompt}"

⏳ Cela peut prendre quelques secondes.
🤖 IA en train de dessiner...`
    }, { quoted: msg })

    const buffer = await fetchPollinationsImage(prompt)

    await sock.sendMessage(from, {
      image: buffer,
      caption: `╭─────────────────────╮
                │ 🎨 *IMAGE GÉNÉRÉE*  │
                ╰─────────────────────╯

📝 *Prompt :*
${prompt}

🤖 *Modèle :* Pollinations AI
📐 *Dimensions :* 1024x1024

━━━━━━━━━━━━━━━━━━━━
✨ Créé par l'IA!`
    }, { quoted: msg })

  } catch (err) {
    console.error('Erreur .imagine:', err)

    // Essayer une API alternative
    try {
      await sock.sendMessage(from, {
        text: '🔄 Tentative avec un autre modèle IA...'
      }, { quoted: msg })

      const altBuffer = await fetchHercaiImage(prompt)
      if (altBuffer) {
        await sock.sendMessage(from, {
          image: altBuffer,
          caption: `🎨 *Image générée*\n\n📝 ${prompt}\n\n✨ Créé par l'IA (Hercai)!`
        }, { quoted: msg })
        return
      }

    } catch (altErr) {
      console.error('Erreur API alternative:', altErr)
    }

    // Dernière tentative
    try {
      const finalBuffer = await fetchCraiyonImage(prompt)
      if (finalBuffer) {
        await sock.sendMessage(from, {
          image: finalBuffer,
          caption: `🎨 *Image générée*\n\n📝 ${prompt}\n\n✨ Créé par l'IA (Craiyon)!`
        }, { quoted: msg })
        return
      }

    } catch (finalErr) {
      console.error('Erreur dernière API:', finalErr)
    }

    await sock.sendMessage(from, {
      text: `❌ *Impossible de générer l'image*

Raisons possibles:
• Service IA surchargé
• Prompt trop complexe ou inapproprié
• Problème de connexion
• Timeout (prompt trop long)

💡 *Solutions :*
• Simplifie ta description
• Réessaie dans quelques instants
• Utilise un prompt plus court
• Évite les termes inappropriés

Erreur: ${err.message || 'Inconnue'}

🎨 Les services d'IA peuvent être lents aux heures de pointe.`
    }, { quoted: msg })
  }
}
