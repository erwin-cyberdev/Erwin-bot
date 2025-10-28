// commands/roulette.js - Roulette russe
const games = new Map() // groupId -> { players, bullet, round }

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid

  if (!from.endsWith('@g.us')) {
    return sock.sendMessage(from, {
      text: '❌ Cette commande fonctionne uniquement dans les groupes!'
    }, { quoted: msg })
  }

  const action = args[0]?.toLowerCase()

  // Démarrer une nouvelle partie
  if (!action || action === 'start') {
    if (games.has(from)) {
      return sock.sendMessage(from, {
        text: '⚠️ Une partie est déjà en cours!\n\nUtilise .roulette stop pour l\'arrêter'
      }, { quoted: msg })
    }

    const bullet = Math.floor(Math.random() * 6) + 1 // Position du balle (1-6)
    games.set(from, {
      players: [],
      bullet,
      round: 0,
      chamber: 6
    })

    await sock.sendMessage(from, {
      text: `╭─────────────────────╮
│ 🔫 *ROULETTE RUSSE* │
╰─────────────────────╯

🎲 *Partie démarrée !*

Une balle est chargée dans l'un des 6 chambres du revolver...

💀 *Comment jouer :*
• Tape .roulette play pour tirer
• Chaque joueur tire à tour de rôle
• Si tu tombes sur la balle... 💥

⚠️ *Attention :* Le perdant sera kick du groupe!

━━━━━━━━━━━━━━━━━━━━
🎯 Tape .roulette play pour jouer
⛔ Tape .roulette stop pour annuler`
    })
  }

  // Jouer
  else if (action === 'play') {
    const game = games.get(from)
    if (!game) {
      return sock.sendMessage(from, {
        text: '❌ Aucune partie en cours.\n\nUtilise .roulette start pour démarrer'
      }, { quoted: msg })
    }

    // Vérifier si le joueur a déjà joué
    if (game.players.includes(sender)) {
      return sock.sendMessage(from, {
        text: '⚠️ Tu as déjà joué ce tour!'
      }, { quoted: msg })
    }

    game.round++
    game.players.push(sender)

    // Suspense
    await sock.sendMessage(from, {
      text: `🔫 @${sender.split('@')[0]} pointe le revolver...

⏳ *CLIC...*`,
      mentions: [sender]
    })

    await new Promise(res => setTimeout(res, 2000))

    // Vérifier si c'est la balle
    if (game.round === game.bullet) {
      // BANG! Le joueur a perdu
      await sock.sendMessage(from, {
        text: `💥 *BANG!*

☠️ @${sender.split('@')[0]} est touché!

🎲 La balle était dans la chambre #${game.bullet}
🏆 Survivants: ${game.round - 1}

━━━━━━━━━━━━━━━━━━━━
⚰️ RIP`,
        mentions: [sender]
      })

      // Kick le joueur (si le bot est admin)
      try {
        const metadata = await sock.groupMetadata(from)
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'
        const botParticipant = metadata.participants.find(p => p.id === botNumber)
        const isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin'

        if (isBotAdmin) {
          await sock.groupParticipantsUpdate(from, [sender], 'remove')
          await sock.sendMessage(from, {
            text: '👋 Bye bye!'
          })
        } else {
          await sock.sendMessage(from, {
            text: '⚠️ Je ne peux pas kick (pas admin)'
          })
        }
      } catch (e) {
        console.error('Erreur kick roulette:', e)
      }

      games.delete(from)
    } else {
      // Safe! Continue
      const remaining = game.chamber - game.round
      await sock.sendMessage(from, {
        text: `✅ *CLIC!*

😅 @${sender.split('@')[0]} est sauf... pour l'instant.

📊 *Statistiques :*
• Tours joués : ${game.round}/${game.chamber}
• Joueurs : ${game.players.length}
• Chances restantes : ${remaining}/6

━━━━━━━━━━━━━━━━━━━━
🎯 Qui est le prochain ?`,
        mentions: [sender]
      })

      // Si tous les tours sont passés sauf le dernier
      if (game.round === game.chamber) {
        await sock.sendMessage(from, {
          text: `🎉 *FIN DE PARTIE!*

✨ Tous les joueurs ont survécu!
La balle était dans la chambre #${game.bullet}

🏆 *Survivants :* ${game.players.length}
━━━━━━━━━━━━━━━━━━━━
Nouvelle partie ? .roulette start`
        })
        games.delete(from)
      }
    }
  }

  // Arrêter la partie
  else if (action === 'stop') {
    if (!games.has(from)) {
      return sock.sendMessage(from, {
        text: '❌ Aucune partie en cours'
      }, { quoted: msg })
    }

    games.delete(from)
    await sock.sendMessage(from, {
      text: '⛔ Partie annulée'
    })
  }

  else {
    await sock.sendMessage(from, {
      text: `╭─────────────────────╮
│ 🔫 *ROULETTE RUSSE* │
╰─────────────────────╯

📝 *Commandes :*
• .roulette start - Démarrer
• .roulette play - Jouer
• .roulette stop - Arrêter

━━━━━━━━━━━━━━━━━━━━
💀 Es-tu prêt à risquer ta vie ?`
    }, { quoted: msg })
  }
}
