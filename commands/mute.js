export default async function(sock, msg) {
  const from = msg.key.remoteJid;
  await sock.groupSettingUpdate(from, 'announcement');
  await sock.sendMessage(from, { text: '🔇 Groupe mis en mode muet (seuls les admins peuvent écrire).' });
}
