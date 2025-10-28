// commands/animequiz.js - Quiz sur les animes
const activeQuizzes = new Map() // chatId -> { anime, correctAnswer, options, participants }

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid
  
  // Vérifier si réponse à un quiz
  if (activeQuizzes.has(from)) {
    const quiz = activeQuizzes.get(from)
    const userAnswer = args.join(' ').trim().toLowerCase()
    
    if (!userAnswer) return
    
    // Vérifier la réponse
    const isCorrect = userAnswer === quiz.correctAnswer.toLowerCase() ||
                     args[0] === quiz.correctIndex.toString()
    
    if (isCorrect) {
      if (!quiz.participants.has(sender)) {
        quiz.participants.add(sender)
        
        await sock.sendMessage(from, {
          text: `╭──────────────────────╮
                 │ ✅ *BONNE RÉPONSE!*  │
                 ╰──────────────────────╯

🎉 @${sender.split('@')[0]} a trouvé la bonne réponse!

✨ *Réponse:* ${quiz.correctAnswer}
🎬 *Anime:* ${quiz.animeTitle}

━━━━━━━━━━━━━━━━━━━━
🏆 Score: +10 points
👥 ${quiz.participants.size} participant(s)`,
          mentions: [sender]
        })
        
        // Supprimer le quiz après 5s
        setTimeout(() => {
          if (activeQuizzes.has(from)) {
            activeQuizzes.delete(from)
          }
        }, 5000)
      }
    }
    return
  }

  try {
    await sock.sendMessage(from, {
      text: '🎮 Génération d\'un quiz...'
    }, { quoted: msg })

    // Questions prédéfinies (en attendant une API)
    const quizzes = [
      {
        question: "Dans quel anime Eren Yeager est-il le personnage principal?",
        options: ["Attack on Titan", "Tokyo Ghoul", "Naruto", "One Piece"],
        correct: 0,
        animeTitle: "Attack on Titan"
      },
      {
        question: "Quel est le nom du Shinigami dans Death Note?",
        options: ["Light", "L", "Ryuk", "Rem"],
        correct: 2,
        animeTitle: "Death Note"
      },
      {
        question: "Combien de Dragon Balls existe-t-il?",
        options: ["5", "6", "7", "8"],
        correct: 2,
        animeTitle: "Dragon Ball"
      },
      {
        question: "Quel est le rêve de Monkey D. Luffy?",
        options: ["Devenir Hokage", "Devenir Roi des Pirates", "Protéger sa ville", "Trouver l'amour"],
        correct: 1,
        animeTitle: "One Piece"
      },
      {
        question: "Quel est le vrai nom de 'L' dans Death Note?",
        options: ["Lawliet", "Yagami", "Ryuzaki", "L Lawliet"],
        correct: 3,
        animeTitle: "Death Note"
      },
      {
        question: "Qui est le père de Gon dans Hunter x Hunter?",
        options: ["Ging Freecss", "Hisoka", "Kurapika", "Killua"],
        correct: 0,
        animeTitle: "Hunter x Hunter"
      },
      {
        question: "Quel est le nom du Titan d'Eren?",
        options: ["Titan Colossal", "Titan Cuirassé", "Titan Assaillant", "Titan Bestial"],
        correct: 2,
        animeTitle: "Attack on Titan"
      },
      {
        question: "Qui est le sensei de Naruto?",
        options: ["Jiraiya", "Kakashi", "Iruka", "Hiruzen"],
        correct: 1,
        animeTitle: "Naruto"
      },
      {
        question: "Quel anime a pour personnage principal Tanjiro Kamado?",
        options: ["Demon Slayer", "Fire Force", "Black Clover", "Jujutsu Kaisen"],
        correct: 0,
        animeTitle: "Demon Slayer"
      },
      {
        question: "Quel est le nom du carnet dans Death Note?",
        options: ["Death Book", "Death Note", "Shinigami Note", "Kill Book"],
        correct: 1,
        animeTitle: "Death Note"
      }
    ]

    const randomQuiz = quizzes[Math.floor(Math.random() * quizzes.length)]
    
    // Sauvegarder le quiz actif
    activeQuizzes.set(from, {
      correctAnswer: randomQuiz.options[randomQuiz.correct],
      correctIndex: randomQuiz.correct + 1,
      animeTitle: randomQuiz.animeTitle,
      participants: new Set()
    })

    let text = `╭──────────────────────╮
                │ 🎮 *ANIME QUIZ* 🎮   │
                ╰──────────────────────╯

❓ *Question:*
${randomQuiz.question}

📋 *Options:*\n`

    randomQuiz.options.forEach((option, index) => {
      text += `${index + 1}. ${option}\n`
    })

    text += `\n━━━━━━━━━━━━━━━━━━━━
💡 Réponds avec le numéro ou le nom!
⏱️ Tu as 30 secondes!

🏆 +10 points pour la bonne réponse`

    await sock.sendMessage(from, {
      text: text
    }, { quoted: msg })

    // Auto-réponse après 30s
    setTimeout(() => {
      if (activeQuizzes.has(from)) {
        const quiz = activeQuizzes.get(from)
        
        if (quiz.participants.size === 0) {
          sock.sendMessage(from, {
            text: `⏰ *Temps écoulé!*

❌ Personne n'a trouvé la réponse.

✅ *Bonne réponse:* ${quiz.correctAnswer}
🎬 *Anime:* ${quiz.animeTitle}

━━━━━━━━━━━━━━━━━━━━
🎮 Tape .animequiz pour un nouveau quiz!`
          })
        }
        
        activeQuizzes.delete(from)
      }
    }, 30000)

  } catch (err) {
    console.error('Erreur .animequiz:', err)
    
    await sock.sendMessage(from, {
      text: `❌ *Impossible de générer le quiz*

Erreur: ${err.message || 'Inconnue'}

💡 Réessaie dans quelques instants`
    }, { quoted: msg })
  }
}
