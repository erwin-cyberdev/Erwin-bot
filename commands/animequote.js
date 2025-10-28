// commands/animequote.js - Citations d'anime aléatoires
import axios from 'axios'

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid

  try {
    await sock.sendMessage(from, {
      text: '💬 Recherche d\'une citation inspirante...'
    }, { quoted: msg })

    // API AnimeChan (citations d'anime gratuites)
    const response = await axios.get('https://animechan.xyz/api/random', {
      timeout: 10000
    })

    if (!response.data) {
      throw new Error('Pas de citation trouvée')
    }

    const { anime, character, quote } = response.data

    await sock.sendMessage(from, {
      text: `╭──────────────────────╮
             │ 💬 *ANIME QUOTE* 💬  │
             ╰──────────────────────╯

"${quote}"

━━━━━━━━━━━━━━━━━━━━
👤 *Personnage:* ${character}
🎬 *Anime:* ${anime}

━━━━━━━━━━━━━━━━━━━━
✨ Phrase inspirante du jour!
🔄 Tape .animequote pour une nouvelle`
    }, { quoted: msg })

  } catch (err) {
    console.error('Erreur .animequote:', err)
    
    // Essayer une API alternative
    try {
      // API alternative: citation statique en cas d'échec
      const quotes = [
        { quote: "Les gens meurent quand ils sont tués.", character: "Emiya Shirou", anime: "Fate/stay night" },
        { quote: "Je vais devenir le Roi des Pirates!", character: "Monkey D. Luffy", anime: "One Piece" },
        { quote: "Crois en toi-même. Pas en toi qui crois en moi. Pas en moi qui crois en toi. Crois en toi qui crois en toi-même!", character: "Kamina", anime: "Gurren Lagann" },
        { quote: "L'effort ne trahit jamais.", character: "Might Guy", anime: "Naruto" },
        { quote: "Si tu ne peux pas trouver une raison de te battre, alors tu ne devrais pas te battre.", character: "Akame", anime: "Akame ga Kill" },
        { quote: "Ce n'est pas parce que tu es correct que les autres sont dans l'erreur.", character: "Askeladd", anime: "Vinland Saga" },
        { quote: "Les morts ne peuvent pas revenir, mais nous pouvons protéger ceux qui sont encore en vie.", character: "Tanjiro Kamado", anime: "Demon Slayer" },
        { quote: "Dans ce monde, où que tu ailles, tu dois accepter qui tu es.", character: "Eren Yeager", anime: "Attack on Titan" }
      ]
      
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
      
      await sock.sendMessage(from, {
        text: `╭──────────────────────╮
               │ 💬 *ANIME QUOTE* 💬  │
               ╰──────────────────────╯

"${randomQuote.quote}"

━━━━━━━━━━━━━━━━━━━━
👤 *Personnage:* ${randomQuote.character}
🎬 *Anime:* ${randomQuote.anime}

━━━━━━━━━━━━━━━━━━━━
✨ Phrase inspirante du jour!`
      }, { quoted: msg })
      
    } catch (altErr) {
      await sock.sendMessage(from, {
        text: `❌ *Impossible de récupérer une citation*

Erreur: ${err.message || 'Inconnue'}

💡 Réessaie dans quelques instants`
      }, { quoted: msg })
    }
  }
}
