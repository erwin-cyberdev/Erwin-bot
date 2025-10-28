const jokes = [
  "Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant ? Parce que sinon ils tombent dans le bateau !",
  "Pourquoi les squelettes ne se battent jamais entre eux ? Ils n’ont pas le cran.",
  "Qu’est-ce qui est jaune et qui attend ? Jonathan.",
  "Pourquoi les canards sont toujours à l’heure ? Parce qu’ils sont dans le coin du coin !",
  "Comment appelle-t-on un chat qui a travaillé pour la police ? Un chat-pitre !",
  "Que dit une maman tomate à son bébé tomate en retard ? Ketchup !"
];

export default async function(sock, msg) {
  const from = msg.key.remoteJid
  const randomIndex = Math.floor(Math.random() * jokes.length)
  const joke = jokes[randomIndex]
  await sock.sendMessage(from, { text: `😂 ${joke}` }, { quoted: msg })
}
