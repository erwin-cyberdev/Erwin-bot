export default async function(sock, msg) {
  const from = msg.key.remoteJid
  const res = Math.random() < 0.5 ? 'Pile' : 'Face'
  await sock.sendMessage(from, { text: `🪙 ${res}` }, { quoted: msg })
}
