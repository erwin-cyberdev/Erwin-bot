// commands/tictactoe.js - Morpion (Tic Tac Toe)
const games = new Map() // gameId -> { players, board, turn, started }

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

  // Démarrer une partie
  if (!mentioned && !args[0]) {
    const gameId = from
    if (games.has(gameId)) {
      return sock.sendMessage(from, {
        text: '⚠️ Une partie est déjà en cours dans ce chat!\n\nTermine-la ou tape .tictactoe stop'
      }, { quoted: msg })
    }

    return sock.sendMessage(from, {
      text: `╭──────────────────────╮   
             │ ⭕ *TIC TAC TOE* ❌  │
             ╰──────────────────────╯

📝 *Comment jouer :*
• .tictactoe @joueur - Défier quelqu'un
• .tictactoe <position> - Jouer (1-9)
• .tictactoe stop - Arrêter la partie

┏━━━┳━━━┳━━━┓
┃ 1 ┃ 2 ┃ 3 ┃
┣━━━╋━━━╋━━━┣
┃ 4 ┃ 5 ┃ 6 ┃
┣━━━╋━━━╋━━━┣
┃ 7 ┃ 8 ┃ 9 ┃
┗━━━┻━━━┻━━━┛

━━━━━━━━━━━━━━━━━━━━
🎯 Mentionne quelqu'un pour commencer!`
    }, { quoted: msg })
  }

  const gameId = from

  // Arrêter la partie
  if (args[0]?.toLowerCase() === 'stop') {
    if (!games.has(gameId)) {
      return sock.sendMessage(from, {
        text: '❌ Aucune partie en cours'
      }, { quoted: msg })
    }
    games.delete(gameId)
    return sock.sendMessage(from, {
      text: '⛔ Partie annulée'
    })
  }

  // Démarrer avec un adversaire
  if (mentioned) {
    if (mentioned === sender) {
      return sock.sendMessage(from, {
        text: '❌ Tu ne peux pas jouer contre toi-même!'
      }, { quoted: msg })
    }

    if (games.has(gameId)) {
      return sock.sendMessage(from, {
        text: '⚠️ Une partie est déjà en cours!'
      }, { quoted: msg })
    }

    games.set(gameId, {
      players: [sender, mentioned],
      board: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'],
      turn: 0,
      started: true
    })

    const board = games.get(gameId).board
    const boardDisplay = `
┏━━━┳━━━┳━━━┓
┃ ${board[0]} ┃ ${board[1]} ┃ ${board[2]} ┃
┣━━━╋━━━╋━━━┣
┃ ${board[3]} ┃ ${board[4]} ┃ ${board[5]} ┃
┣━━━╋━━━╋━━━┣
┃ ${board[6]} ┃ ${board[7]} ┃ ${board[8]} ┃
┗━━━┻━━━┻━━━┛`

    return sock.sendMessage(from, {
      text: `╭──────────────────────╮
             │ ⭕ *PARTIE DÉMARRÉE* ❌ │
             ╰──────────────────────╯

👥 *Joueurs :*
• ❌ @${sender.split('@')[0]}
• ⭕ @${mentioned.split('@')[0]}

${boardDisplay}

━━━━━━━━━━━━━━━━━━━━
🎯 Tour de @${sender.split('@')[0]} (❌)

📝 Tape .tictactoe <1-9> pour jouer`,
      mentions: [sender, mentioned]
    })
  }

  // Jouer un coup
  const position = parseInt(args[0])
  if (!position || position < 1 || position > 9) {
    return sock.sendMessage(from, {
      text: '❌ Position invalide! Utilise un nombre entre 1 et 9'
    }, { quoted: msg })
  }

  const game = games.get(gameId)
  if (!game) {
    return sock.sendMessage(from, {
      text: '❌ Aucune partie en cours. Démarre avec .tictactoe @joueur'
    }, { quoted: msg })
  }

  // Vérifier que c'est le bon joueur
  const currentPlayer = game.players[game.turn]
  if (sender !== currentPlayer) {
    return sock.sendMessage(from, {
      text: `⚠️ Ce n'est pas ton tour!\n\n🎯 C'est le tour de @${currentPlayer.split('@')[0]}`,
      mentions: [currentPlayer]
    }, { quoted: msg })
  }

  // Vérifier que la case est libre
  const index = position - 1
  if (game.board[index] === '❌' || game.board[index] === '⭕') {
    return sock.sendMessage(from, {
      text: '❌ Cette case est déjà occupée!'
    }, { quoted: msg })
  }

  // Placer le symbole
  game.board[index] = game.turn === 0 ? '❌' : '⭕'

  // Vérifier victoire
  if (checkWinner(game.board)) {
    const boardDisplay = `
┏━━━┳━━━┳━━━┓
┃ ${game.board[0]} ┃ ${game.board[1]} ┃ ${game.board[2]} ┃
┣━━━╋━━━╋━━━┣
┃ ${game.board[3]} ┃ ${game.board[4]} ┃ ${game.board[5]} ┃
┣━━━╋━━━╋━━━┣
┃ ${game.board[6]} ┃ ${game.board[7]} ┃ ${game.board[8]} ┃
┗━━━┻━━━┻━━━┛`

    await sock.sendMessage(from, {
      text: `╭──────────────────────╮
             │ 🏆 *VICTOIRE!* 🏆    │
             ╰──────────────────────╯

${boardDisplay}

🎉 @${currentPlayer.split('@')[0]} a gagné!

━━━━━━━━━━━━━━━━━━━━
✨ Bien joué!`,
      mentions: [currentPlayer]
    })

    games.delete(gameId)
    return
  }

  // Vérifier match nul
  if (!game.board.some(cell => cell !== '❌' && cell !== '⭕')) {
    const boardDisplay = `
┏━━━┳━━━┳━━━┓
┃ ${game.board[0]} ┃ ${game.board[1]} ┃ ${game.board[2]} ┃
┣━━━╋━━━╋━━━┣
┃ ${game.board[3]} ┃ ${game.board[4]} ┃ ${game.board[5]} ┃
┣━━━╋━━━╋━━━┣
┃ ${game.board[6]} ┃ ${game.board[7]} ┃ ${game.board[8]} ┃
┗━━━┻━━━┻━━━┛`

    await sock.sendMessage(from, {
      text: `╭──────────────────────╮
             │ 🤝 *MATCH NUL!* 🤝   │
             ╰──────────────────────╯

${boardDisplay}

━━━━━━━━━━━━━━━━━━━━
👏 Égalité!`
    })

    games.delete(gameId)
    return
  }

  // Changer de tour
  game.turn = game.turn === 0 ? 1 : 0
  const nextPlayer = game.players[game.turn]

  const boardDisplay = `
┏━━━┳━━━┳━━━┓
┃ ${game.board[0]} ┃ ${game.board[1]} ┃ ${game.board[2]} ┃
┣━━━╋━━━╋━━━┣
┃ ${game.board[3]} ┃ ${game.board[4]} ┃ ${game.board[5]} ┃
┣━━━╋━━━╋━━━┣
┃ ${game.board[6]} ┃ ${game.board[7]} ┃ ${game.board[8]} ┃
┗━━━┻━━━┻━━━┛`

  await sock.sendMessage(from, {
    text: `${boardDisplay}

━━━━━━━━━━━━━━━━━━━━
🎯 Tour de @${nextPlayer.split('@')[0]} (${game.turn === 0 ? '❌' : '⭕'})`,
    mentions: [nextPlayer]
  })
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Lignes
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colonnes
    [0, 4, 8], [2, 4, 6]  // Diagonales
  ]

  for (const [a, b, c] of lines) {
    if (board[a] === board[b] && board[b] === board[c] && 
        (board[a] === '❌' || board[a] === '⭕')) {
      return true
    }
  }
  return false
}
