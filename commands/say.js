// commands/say.js - Text-to-Speech (TTS)
// Alias: .voice
import gtts from 'gtts'
import fs from 'fs'
import path from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'

const tempDir = path.join(process.cwd(), 'temp')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  
  if (!args.length) {
    return sock.sendMessage(from, {
      text: `╭──────────────────────╮ 
             │ 🎤 *TEXT TO SPEECH*  │
             ╰──────────────────────╯

❌ *Usage :*
.say <texte>
.say <langue> <texte>
.say ai <texte> - Avec IA
.voice <texte> - Alias de .say

📝 *Exemples :*
• .say Bonjour tout le monde
• .say en Hello everyone
• .say es Hola amigos
• .say ai Raconte-moi une blague

🌍 *Langues disponibles :*
• fr - Français
• en - Anglais
• es - Espagnol
• de - Allemand
• it - Italien
• pt - Portugais
• ar - Arabe

━━━━━━━━━━━━━━━━━━━━
🎤 Convertit texte en vocal!`
    }, { quoted: msg })
  }

  try {
    await sock.sendMessage(from, {
      text: '🎤 Génération du message vocal...'
    }, { quoted: msg })

    // Vérifier si c'est avec IA
    const useAI = args[0]?.toLowerCase() === 'ai'
    let text = args.join(' ')
    let lang = 'fr'

    if (useAI) {
      // Utiliser l'IA pour générer du contenu
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        return sock.sendMessage(from, {
          text: '❌ GEMINI_API_KEY non configurée pour le mode IA.\n\nUtilise .say sans "ai" pour le mode normal.'
        }, { quoted: msg })
      }

      const prompt = args.slice(1).join(' ')
      if (!prompt) {
        return sock.sendMessage(from, {
          text: '❌ Spécifie un texte après "ai".\n\nExemple: .say ai Raconte une blague'
        }, { quoted: msg })
      }

      await sock.sendMessage(from, {
        text: '🤖 L\'IA génère le contenu...'
      }, { quoted: msg })

      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

      const result = await model.generateContent(prompt)
      text = result.response.text()

      if (!text || text.trim().length === 0) {
        throw new Error('L\'IA n\'a pas généré de texte')
      }

      // Limiter à 500 caractères pour TTS
      text = text.substring(0, 500)
    } else {
      // Vérifier si une langue est spécifiée
      const supportedLangs = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ar', 'ja', 'ko', 'zh', 'ru']
      if (supportedLangs.includes(args[0]?.toLowerCase())) {
        lang = args[0].toLowerCase()
        text = args.slice(1).join(' ')
      }
    }

    if (!text || text.trim().length === 0) {
      return sock.sendMessage(from, {
        text: '❌ Le texte est vide. Spécifie un texte à dire.'
      }, { quoted: msg })
    }

    // Limiter la longueur
    if (text.length > 500) {
      text = text.substring(0, 500)
      await sock.sendMessage(from, {
        text: '⚠️ Texte trop long, limité à 500 caractères.'
      })
    }

    // Générer l'audio avec gTTS
    const audioPath = path.join(tempDir, `tts_${Date.now()}.mp3`)
    const tts = new gtts(text, lang)

    await new Promise((resolve, reject) => {
      tts.save(audioPath, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    // Lire et envoyer l'audio
    const audioBuffer = fs.readFileSync(audioPath)

    await sock.sendMessage(from, {
      audio: audioBuffer,
      mimetype: 'audio/mp4',
      ptt: true
    }, { quoted: msg })

    const confirmMsg = useAI 
      ? `✅ *Message vocal généré avec IA !*\n\n🤖 Mode : Gemini AI\n📝 Texte : "${text}"\n🔊 Langue : ${lang}`
      : `✅ *Message vocal généré !*\n\n📝 Texte : "${text}"\n🔊 Langue : ${lang}`
    
    await sock.sendMessage(from, {
      text: confirmMsg
    }, { quoted: msg })

    // Nettoyer
    setTimeout(() => {
      try {
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
      } catch (e) {
        console.error('Erreur suppression TTS temp:', e)
      }
    }, 2000)

  } catch (err) {
    console.error('Erreur .say:', err)

    await sock.sendMessage(from, {
      text: `❌ *Impossible de générer le message vocal*

Raisons possibles:
• Bibliothèque gTTS non installée
• Problème de connexion
• Texte invalide ou langue non supportée
• Pour mode IA: GEMINI_API_KEY manquante

💡 *Solutions :*
• Installe gTTS: npm install gtts
• Vérifie ta connexion internet
• Utilise un texte plus court
• Configure GEMINI_API_KEY pour le mode IA

Erreur: ${err.message || 'Inconnue'}`
    }, { quoted: msg })
  }
}
