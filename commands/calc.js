// commands/calc.js
export default async function (sock, msg, args) {
  const from = msg.key.remoteJid

  if (args.length === 0) {
    await sock.sendMessage(from, { text: '❗ Utilisation : `.calc <expression>`\nExemple : `.calc (5 + 3) * 2`' }, { quoted: msg })
    return
  }

  const expression = args.join(' ')

  try {
    // Vérification de sécurité : uniquement chiffres et opérateurs mathématiques simples
    if (!/^[0-9+\-*/().%\s]+$/.test(expression)) {
      await sock.sendMessage(from, { text: '🚫 Expression invalide. Utilise uniquement des chiffres et opérateurs (+, -, *, /, %, (), .).' }, { quoted: msg })
      return
    }

    // Calcul sécurisé
    const result = Function(`"use strict"; return (${expression})`)()

    await sock.sendMessage(from, {
      text: `🧮 *Résultat du calcul :*\n\`\`\`${expression} = ${result}\`\`\``
    }, { quoted: msg })

  } catch (err) {
    await sock.sendMessage(from, {
      text: `⚠️ Erreur dans l'expression : ${err.message}`
    }, { quoted: msg })
  }
}
