// commands/pp.js
import axios from 'axios'

export default async function (sock, msg) {
  const chat = msg.key.remoteJid
  const ctx = msg.message?.extendedTextMessage?.contextInfo || {}
  const sender = msg.key.participant || chat

  // cible : mentionnée > réponse > auteur
  const target =
    ctx.mentionedJid?.[0] ||
    ctx.participant ||
    sender

  try {
    // Récupération de la photo de profil
    const url = await sock.profilePictureUrl(target, 'image').catch(() => null)

    if (!url) {
      return sock.sendMessage(
        chat,
        { text: '🚫 Aucune photo de profil publique trouvée pour cet utilisateur.' },
        { quoted: msg }
      )
    }

    // Télécharger l’image et l’envoyer
    const { data } = await axios.get(url, { responseType: 'arraybuffer' })
    await sock.sendMessage(
      chat,
      {
        image: Buffer.from(data),
        caption: `📸 *Photo de profil de* @${target.split('@')[0]}`,
        mentions: [target],
      },
      { quoted: msg }
    )
  } catch (err) {
    console.error('Erreur .pp:', err)
    await sock.sendMessage(
      chat,
      { text: '❗ Impossible de récupérer la photo de profil (compte privé ou erreur).' },
      { quoted: msg }
    )
  }
}
