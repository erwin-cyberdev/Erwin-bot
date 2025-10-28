// commands/birthday.js
export default async function (sock, msg, args) {
  const from = msg.key.remoteJid

  if (!args.length) {
    return await sock.sendMessage(from, {
      text: '🎂 *Compte à rebours anniversaire*\n\n*Usage :* `.birthday <JJ/MM>` ou `.birthday <JJ/MM/AAAA>`\n\n*Exemples :*\n• `.birthday 15/08`\n• `.birthday 25/12/2000`'
    }, { quoted: msg })
  }

  const input = args[0]
  const parts = input.split('/')

  if (parts.length < 2) {
    return await sock.sendMessage(from, {
      text: '❗ Format invalide. Utilise : `.birthday JJ/MM` ou `.birthday JJ/MM/AAAA`'
    }, { quoted: msg })
  }

  const day = parseInt(parts[0])
  const month = parseInt(parts[1]) - 1 // JS months are 0-indexed
  const yearOfBirth = parts[2] ? parseInt(parts[2]) : null

  if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 0 || month > 11) {
    return await sock.sendMessage(from, {
      text: '❗ Date invalide. Vérifie le format : JJ/MM'
    }, { quoted: msg })
  }

  try {
    const now = new Date()
    const currentYear = now.getFullYear()
    
    // Date d'anniversaire cette année
    let birthdayThisYear = new Date(currentYear, month, day)
    
    // Si l'anniversaire est passé cette année, prendre l'année prochaine
    if (birthdayThisYear < now) {
      birthdayThisYear = new Date(currentYear + 1, month, day)
    }

    // Calcul des jours restants
    const diffTime = birthdayThisYear - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Calcul de l'âge si année de naissance fournie
    let ageInfo = ''
    if (yearOfBirth) {
      const nextAge = birthdayThisYear.getFullYear() - yearOfBirth
      ageInfo = `\n🎈 *Âge à venir :* ${nextAge} ans`
    }

    // Emoji selon proximité
    let emoji = '🎂'
    if (diffDays === 0) emoji = '🎉'
    else if (diffDays <= 7) emoji = '🎊'
    else if (diffDays <= 30) emoji = '🎁'

    const monthNames = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ]

    const message = `
╭─────────────────────╮
│  ${emoji} *ANNIVERSAIRE*  │
╰─────────────────────╯

📅 *Date :* ${day} ${monthNames[month]} ${birthdayThisYear.getFullYear()}

⏳ *Compte à rebours :*
${diffDays === 0 ? '🎉 C\'EST AUJOURD\'HUI ! 🎉' : `${diffDays} jour${diffDays > 1 ? 's' : ''} restant${diffDays > 1 ? 's' : ''}`}${ageInfo}

${diffDays === 0 ? '🎊🎂🎁 JOYEUX ANNIVERSAIRE ! 🎁🎂🎊' : diffDays <= 7 ? '🎈 C\'est bientôt !' : '📆 À noter dans ton agenda'}

━━━━━━━━━━━━━━━━━━━━
🎂 Compte à rebours
    `.trim()

    await sock.sendMessage(from, { text: message }, { quoted: msg })

  } catch (err) {
    console.error('Erreur .birthday:', err)
    await sock.sendMessage(from, { text: '❗ Erreur lors du calcul. Vérifie la date.' }, { quoted: msg })
  }
}
