export default async function(sock, msg, args) {
  const from = msg.key.remoteJid;

  try {
    if (!args.length) {
      return await sock.sendMessage(from, {
        text: "❌ Usage : *.poll Question | Option1 | Option2 | Option3...*"
      }, { quoted: msg });
    }

    // Séparer question et options
    const [question, ...options] = args.join(" ").split("|").map(s => s.trim());

    if (!question || options.length < 2) {
      return await sock.sendMessage(from, {
        text: "⚠️ Il faut une question et au moins 2 options."
      }, { quoted: msg });
    }

    // Envoi du vrai sondage WhatsApp 🗳️
    await sock.sendMessage(from, {
      poll: {
        name: question,
        values: options,
        selectableCount: 1 // ← un seul vote autorisé par participant (tu peux changer à 3, etc)
      }
    });

  } catch (err) {
    console.error("Erreur .poll:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Erreur lors de la création du sondage : ${err.message}`
    }, { quoted: msg });
  }
}
