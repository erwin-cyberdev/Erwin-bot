// commands/ship.js - Calculer compatibilité amoureuse
export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

  if (mentioned.length < 2) {
    return sock.sendMessage(from, {
      text: `╭──────────────────────╮
             │ 💕 *LOVE SHIP* 💕    │
             ╰──────────────────────╯

❌ *Usage :*
.ship @personne1 @personne2

📝 *Exemples :*
• .ship @alice @bob
• Mentionne 2 personnes pour calculer leur compatibilité

━━━━━━━━━━━━━━━━━━━━
💘 Découvre leur pourcentage d'amour!`
    }, { quoted: msg })
  }

  const person1 = mentioned[0]
  const person2 = mentioned[1]

  // Calculer un pourcentage "aléatoire" mais cohérent basé sur les IDs
  const hash = (person1 + person2).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const percentage = (hash % 101) // 0-100

  // Messages selon le pourcentage
  let message, emoji
  if (percentage >= 90) {
    message = "💯 *COUPLE PARFAIT!* Match made in heaven! 🔥"
    emoji = "💑"
  } else if (percentage >= 75) {
    message = "😍 *Très forte compatibilité!* L'amour est dans l'air! ✨"
    emoji = "❤️"
  } else if (percentage >= 60) {
    message = "😊 *Bonne compatibilité!* Ça peut marcher! 💕"
    emoji = "💖"
  } else if (percentage >= 45) {
    message = "🤔 *Compatibilité moyenne.* Il faut travailler un peu! 💪"
    emoji = "💛"
  } else if (percentage >= 30) {
    message = "😅 *Faible compatibilité.* Ça va être compliqué... 🤷"
    emoji = "💔"
  } else {
    message = "😬 *Incompatibles!* Mieux vaut rester amis! 🙅"
    emoji = "❌"
  }

  // Générer un nom de couple
  const name1 = person1.split('@')[0]
  const name2 = person2.split('@')[0]
  const coupleName = name1.substring(0, Math.ceil(name1.length / 2)) + name2.substring(Math.floor(name2.length / 2))

  // Barre de progression
  const barLength = 10
  const filledBars = Math.round((percentage / 100) * barLength)
  const emptyBars = barLength - filledBars
  const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars)

  await sock.sendMessage(from, {
    text: `╭──────────────────────╮
           │ 💕 *LOVE CALCULATOR* 💕 │
           ╰──────────────────────╯

👤 @${name1}
${emoji}
👤 @${name2}

━━━━━━━━━━━━━━━━━━━━
💘 *Compatibilité :* ${percentage}%

[${progressBar}]

${message}

💑 *Nom de couple :* ${coupleName}

━━━━━━━━━━━━━━━━━━━━
${percentage >= 70 ? '🎉 Félicitations!' : percentage >= 40 ? '💪 Continuez vos efforts!' : '🤷 Pas de chance...'}`,
    mentions: [person1, person2]
  }, { quoted: msg })
}
