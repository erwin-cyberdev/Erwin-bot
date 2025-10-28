// commands/vote.js - Sondage rapide
const polls = new Map() // messageId -> { question, voters }

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid

  if (!args.length) {
    return sock.sendMessage(from, {
      text: `╭─────────────────────╮
             │ 📊 *VOTE RAPIDE*    │
             ╰─────────────────────╯

❌ *Usage :*
.vote <question>

📝 *Exemples :*
• .vote On commande des pizzas ?
• .vote Film ce soir ?
• .vote Sortie samedi ?

━━━━━━━━━━━━━━━━━━━━
💡 Crée un vote oui/non avec réactions`
    }, { quoted: msg })
  }

  const question = args.join(' ')

  try {
    const voteMsg = await sock.sendMessage(from, {
      text: `╭─────────────────────╮
             │ 📊 *VOTE EN COURS*  │    
             ╰─────────────────────╯

❓ *Question :*
${question}

👥 *Votes :*
👍 Oui : 0
👎 Non : 0

━━━━━━━━━━━━━━━━━━━━
Réagis avec 👍 pour Oui ou 👎 pour Non

⏱️ Posté par @${sender.split('@')[0]}`,
      mentions: [sender]
    }, { quoted: msg })

    // Sauvegarder le sondage
    polls.set(voteMsg.key.id, {
      question,
      yesVotes: new Set(),
      noVotes: new Set(),
      creator: sender
    })

    // Auto-supprimer après 1 heure
    setTimeout(() => {
      if (polls.has(voteMsg.key.id)) {
        const poll = polls.get(voteMsg.key.id)
        const yesCount = poll.yesVotes.size
        const noCount = poll.noVotes.size
        const total = yesCount + noCount

        sock.sendMessage(from, {
          text: `╭─────────────────────╮
                 │ 📊 *VOTE TERMINÉ*   │
                 ╰─────────────────────╯

❓ *Question :*
${poll.question}

📊 *Résultats finaux :*
👍 Oui : ${yesCount} (${total > 0 ? Math.round((yesCount/total)*100) : 0}%)
👎 Non : ${noCount} (${total > 0 ? Math.round((noCount/total)*100) : 0}%)

━━━━━━━━━━━━━━━━━━━━
Total : ${total} vote(s)

${yesCount > noCount ? '✅ Majorité pour OUI!' : noCount > yesCount ? '❌ Majorité pour NON!' : '🤝 Égalité!'}`,
          mentions: [poll.creator]
        })

        polls.delete(voteMsg.key.id)
      }
    }, 3600000) // 1 heure

  } catch (err) {
    console.error('Erreur .vote:', err)
    await sock.sendMessage(from, {
      text: `❌ Impossible de créer le vote.\n\nErreur: ${err.message}`
    }, { quoted: msg })
  }
}

// Fonction pour gérer les réactions (à appeler depuis index.js)
export async function handleVoteReaction(sock, reaction) {
  const messageId = reaction.key.id
  const reactor = reaction.key.participant || reaction.key.remoteJid
  const emoji = reaction.reaction?.text

  if (!polls.has(messageId)) return

  const poll = polls.get(messageId)

  if (emoji === '👍') {
    poll.yesVotes.add(reactor)
    poll.noVotes.delete(reactor)
  } else if (emoji === '👎') {
    poll.noVotes.add(reactor)
    poll.yesVotes.delete(reactor)
  }

  // Mettre à jour le message
  const yesCount = poll.yesVotes.size
  const noCount = poll.noVotes.size
  const total = yesCount + noCount

  try {
    await sock.sendMessage(reaction.key.remoteJid, {
      text: `╭─────────────────────╮
             │ 📊 *VOTE EN COURS*  │
             ╰─────────────────────╯

❓ *Question :*
${poll.question}

👥 *Votes :*
👍 Oui : ${yesCount} (${total > 0 ? Math.round((yesCount/total)*100) : 0}%)
👎 Non : ${noCount} (${total > 0 ? Math.round((noCount/total)*100) : 0}%)

━━━━━━━━━━━━━━━━━━━━
Total : ${total} vote(s)

Réagis avec 👍 pour Oui ou 👎 pour Non`,
      edit: reaction.key
    })
  } catch (e) {
    // Si l'édition échoue, pas grave
    console.error('Erreur édition vote:', e)
  }
}
