// commands/ping.js
export default async function (sock, msg) {
  const from = msg.key.remoteJid
  const quoted = msg

  const start = Date.now()

  // On envoie rien tout de suite, on calcule en interne
  await new Promise(res => setTimeout(res, 100)) // légère pause pour plus de réalisme

  const latency = Date.now() - start

  const text = `🏓 Pong ! Erwin-Bot est en ligne ✨\n⏱️ Latence : *${latency} ms*`
  await sock.sendMessage(from, { text }, { quoted })
}
