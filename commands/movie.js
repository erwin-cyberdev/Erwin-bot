// commands/movie.js
import axios from 'axios'

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const apiKey = process.env.OMDB_API_KEY

  if (!apiKey) {
    return await sock.sendMessage(from, {
      text: '⚠️ Clé API OMDB manquante.\n\n💡 Obtiens une clé gratuite sur:\nhttps://www.omdbapi.com/apikey.aspx\n\nPuis ajoute dans .env:\nOMDB_API_KEY=ta_clé'
    }, { quoted: msg })
  }

  if (!args.length) {
    return await sock.sendMessage(from, {
      text: '🎬 *Infos Film*\n\n*Usage :* `.movie <titre>`\n\n*Exemple :*\n• `.movie Avatar`'
    }, { quoted: msg })
  }

  const title = args.join(' ')

  try {
    await sock.sendMessage(from, { text: '⏳ Recherche du film...' }, { quoted: msg })

    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${apiKey}`
    const res = await axios.get(url, { timeout: 8000 })

    if (!res.data || res.data.Response === 'False') {
      throw new Error('Film introuvable')
    }

    const { Title, Year, Rated, Runtime, Genre, Director, Actors, Plot, imdbRating, Poster } = res.data

    const message = `
╭─────────────────────╮
│  🎬 *INFO FILM*  │
╰─────────────────────╯

🎥 *Titre :* ${Title}
📅 *Année :* ${Year}
⏱️ *Durée :* ${Runtime}
🏷️ *Genre :* ${Genre}
🔞 *Classification :* ${Rated}

🎬 *Réalisateur :*
${Director}

🎭 *Acteurs :*
${Actors}

📝 *Synopsis :*
${Plot}

⭐ *Note IMDB :* ${imdbRating}/10

━━━━━━━━━━━━━━━━━━━━
🎬 Informations complètes
    `.trim()

    if (Poster && Poster !== 'N/A') {
      await sock.sendMessage(from, {
        image: { url: Poster },
        caption: message
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, { text: message }, { quoted: msg })
    }

  } catch (err) {
    console.error('Erreur .movie:', err)
    await sock.sendMessage(from, { text: '❗ Film introuvable. Vérifie l\'orthographe du titre.' }, { quoted: msg })
  }
}
