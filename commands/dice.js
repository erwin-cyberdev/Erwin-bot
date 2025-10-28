export default async function(sock, msg) {
  const from = msg.key.remoteJid
  const n = Math.floor(Math.random()*6)+1
  await sock.sendMessage(from, { text: `🎲 Tu as obtenu : ${n}` }, { quoted: msg })
}
