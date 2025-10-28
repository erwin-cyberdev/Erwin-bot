import { sendWithTyping } from '../utils/sendWithTyping.js'

const DISCLAIMER_TEXT = `⚠️ *DISCLAIMER / AVERTISSEMENT*

Erwin-Bot est fourni "tel quel". Son propriétaire est responsable de son utilisation et du respect des conditions d'utilisation de WhatsApp ainsi que des lois locales.

• ✉️ Les conversations peuvent être stockées selon les commandes utilisées (ex. antidelete, extraction). Obtenez toujours le consentement explicite des membres.
• 🔐 Ne partagez jamais d'informations personnelles sensibles via le bot.
• 🤖 N'utilisez pas le bot pour spammer ou harceler.
• 🚫 En cas de violation des règles WhatsApp, votre numéro peut être suspendu.

En continuant à utiliser le bot, tu acceptes ces conditions.`

export default async function disclaimerCommand(sock, msg) {
  const from = msg.key.remoteJid

  if (typeof sendWithTyping === 'function') {
    await sendWithTyping(sock, from, { text: DISCLAIMER_TEXT }, { quoted: msg })
    return
  }

  await sock.sendMessage(from, { text: DISCLAIMER_TEXT }, { quoted: msg })
}
