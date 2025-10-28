export default async function(sock, msg, args) {
  try {
    const from = msg.key.remoteJid
    const isGroup = from.endsWith('@g.us')

    if (!isGroup) {
      await sock.sendMessage(from, { text: '❌ Cette commande fonctionne uniquement dans un groupe.' }, { quoted: msg })
      return
    }

    const groupMetadata = await sock.groupMetadata(from)
    const participants = groupMetadata.participants

    if (!participants || participants.length === 0) {
      await sock.sendMessage(from, { text: '⚠️ Impossible de récupérer les membres du groupe.' }, { quoted: msg })
      return
    }

    const mentions = participants.map(p => `@${p.id.split('@')[0]}\n`).join(' ')
    await sock.sendMessage(from, { text: mentions, mentions: participants.map(p => p.id) }, { quoted: msg })
  } catch (err) {
    console.error('Erreur tagall:', err)
    await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Une erreur est survenue lors du tag de tous les membres.' }, { quoted: msg })
  }
}
