// commands/shorten.js - Raccourcir URL
import axios from 'axios'

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const url = args.join(' ').trim()

  if (!url) {
    return sock.sendMessage(from, {
      text: `╭──────────────────────╮
             │ 🔗 *URL SHORTENER*   │
             ╰──────────────────────╯

❌ *Usage :*
.shorten <url>

📝 *Exemples :*
• .shorten https://www.example.com/very/long/url
• .shorten https://youtube.com/watch?v=...

━━━━━━━━━━━━━━━━━━━━
💡 Raccourcis tes liens longs!`
    }, { quoted: msg })
  }

  // Vérifier que c'est une URL valide
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return sock.sendMessage(from, {
      text: '❌ URL invalide. L\'URL doit commencer par http:// ou https://'
    }, { quoted: msg })
  }

  try {
    await sock.sendMessage(from, {
      text: '🔗 Raccourcissement de l\'URL...'
    }, { quoted: msg })

    // API 1: TinyURL (gratuite et fiable)
    const tinyUrlApi = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
    
    const response = await axios.get(tinyUrlApi, {
      timeout: 10000
    })

    const shortUrl = response.data

    if (shortUrl && shortUrl.startsWith('http')) {
      const originalLength = url.length
      const shortLength = shortUrl.length
      const savedChars = originalLength - shortLength

      await sock.sendMessage(from, {
        text: `╭──────────────────────╮
               │ 🔗 *URL RACCOURCIE*  │
               ╰──────────────────────╯

🌐 *URL originale :*
${url.length > 80 ? url.substring(0, 80) + '...' : url}

✂️ *URL raccourcie :*
${shortUrl}

📊 *Statistiques :*
• Longueur originale : ${originalLength} caractères
• Longueur raccourcie : ${shortLength} caractères
• Caractères économisés : ${savedChars}
• Réduction : ${Math.round((savedChars / originalLength) * 100)}%

━━━━━━━━━━━━━━━━━━━━
✅ Lien prêt à partager!`
      }, { quoted: msg })
    } else {
      throw new Error('Réponse invalide')
    }

  } catch (err) {
    console.error('Erreur .shorten:', err)

    // Essayer une API alternative
    try {
      await sock.sendMessage(from, {
        text: '🔄 Tentative avec une méthode alternative...'
      }, { quoted: msg })

      // API 2: is.gd
      const isgdApi = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`
      
      const altResponse = await axios.get(isgdApi, {
        timeout: 10000
      })

      const shortUrl = altResponse.data

      if (shortUrl && shortUrl.startsWith('http')) {
        await sock.sendMessage(from, {
          text: `╭──────────────────────╮
                 │ 🔗 *URL RACCOURCIE*  │
                 ╰──────────────────────╯

✂️ *Lien raccourci :*
${shortUrl}

━━━━━━━━━━━━━━━━━━━━
✅ Prêt à partager!`
        }, { quoted: msg })
        return
      }

    } catch (altErr) {
      console.error('Erreur API alternative:', altErr)
    }

    // Dernière tentative avec une autre API
    try {
      // API 3: V.gd
      const vgdApi = `https://v.gd/create.php?format=simple&url=${encodeURIComponent(url)}`
      
      const finalResponse = await axios.get(vgdApi, {
        timeout: 10000
      })

      const shortUrl = finalResponse.data

      if (shortUrl && shortUrl.startsWith('http')) {
        await sock.sendMessage(from, {
          text: `╭──────────────────────╮
                 │ 🔗 *URL RACCOURCIE*  │
                 ╰──────────────────────╯

✂️ *Lien raccourci :*
${shortUrl}

━━━━━━━━━━━━━━━━━━━━
✅ Prêt à partager!`
        }, { quoted: msg })
        return
      }

    } catch (finalErr) {
      console.error('Erreur dernière API:', finalErr)
    }

    await sock.sendMessage(from, {
      text: `❌ *Impossible de raccourcir l'URL*

Raisons possibles:
• URL invalide ou trop longue
• Service de raccourcissement indisponible
• Problème de connexion
• L'URL est déjà un lien court

💡 *Solutions :*
• Vérifie que l'URL est correcte
• Réessaie dans quelques instants
• Utilise une URL complète (avec http://)

Erreur: ${err.message || 'Inconnue'}`
    }, { quoted: msg })
  }
}
