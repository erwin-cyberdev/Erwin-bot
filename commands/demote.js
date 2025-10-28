export default async function(sock, msg) {
  const from = msg.key.remoteJid;
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (!mentioned.length) return sock.sendMessage(from, { text: '❗ Mentionne l\'utilisateur.' });

  await sock.groupParticipantsUpdate(from, mentioned, 'demote');
  await sock.sendMessage(from, { text: '✅ Utilisateur dégradé.' });
}
