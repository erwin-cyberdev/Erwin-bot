export default async function(sock, msg) {
  const from = msg.key.remoteJid;
  await sock.groupSettingUpdate(from, 'not_announcement');
  await sock.sendMessage(from, { text: '🔊 Groupe réactivé (tout le monde peut écrire).' });
}
