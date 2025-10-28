// commands/setprefix.js
import { setPrefixForID, getPrefixForID } from '../utils/prefixStore.js'

export default async function setprefixCommand(sock, msg, args) {
  const chatId = msg.key.remoteJid
  const newPrefix = args[0]

  if (!newPrefix) {
    const current = getPrefixForID(chatId)
    return sock.sendMessage(chatId, {
      text: `⚙️ Préfixe actuel : *${current || '.'}*\n\nPour le modifier : \n\`.setprefix <nouveauPréfixe>\``
    }, { quoted: msg })
  }

  if (newPrefix.length > 3) {
    return sock.sendMessage(chatId, {
      text: '❌ Le préfixe ne doit pas dépasser 3 caractères.'
    }, { quoted: msg })
  }

  try {
    setPrefixForID(chatId, newPrefix)
    await sock.sendMessage(chatId, {
      text: `✅ Préfixe changé avec succès !\n\n🆕 Nouveau préfixe : *${newPrefix}*`
    }, { quoted: msg })
  } catch (err) {
    console.error('Erreur .setprefix:', err)
    await sock.sendMessage(chatId, {
      text: `⚠️ Erreur lors du changement de préfixe : ${err.message}`
    }, { quoted: msg })
  }
}
