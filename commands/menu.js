import fs from 'fs'
import path from 'path'

const COMMAND_METADATA = {
  add: { category: 'admin', description: 'Ajouter un membre au groupe via son numéro.' },
  advice: { category: 'user', description: 'Recevoir un conseil aléatoire.' },
  ai: { category: 'user', description: 'Utiliser l’assistant IA Gemini.' },
  anime: { category: 'user', description: 'Chercher des informations sur un anime.' },
  animequiz: { category: 'user', description: 'Lancer un quiz thématique sur les animes.' },
  animequote: { category: 'user', description: 'Afficher une citation d’anime.' },
  animeseason: { category: 'user', description: 'Lister les animes de la saison en cours.' },
  antibot: { category: 'admin', description: 'Activer ou désactiver la protection anti-bot.' },
  antidelete: { category: 'admin', description: 'Empêcher la suppression des messages dans le groupe.' },
  antilink: { category: 'admin', description: 'Bloquer automatiquement les liens partagés.' },
  ban: { category: 'owner', description: 'Bannir un utilisateur de toutes les commandes du bot.' },
  birthday: { category: 'user', description: 'Calculer le compte à rebours avant une date.' },
  botstats: { category: 'owner', description: 'Afficher les statistiques internes du bot.' },
  broadcast: { category: 'owner', description: 'Diffuser un message à tous les chats.' },
  calc: { category: 'user', description: 'Résoudre une expression mathématique.' },
  clear: { category: 'admin', description: 'Supprimer les derniers messages du chat.' },
  coin: { category: 'user', description: 'Lancer une pièce pile ou face.' },
  crypto: { category: 'user', description: 'Consulter le prix d’une cryptomonnaie.' },
  define: { category: 'user', description: 'Afficher la définition d’un mot.' },
  demote: { category: 'admin', description: 'Retirer un membre de la liste des admins du groupe.' },
  dice: { category: 'user', description: 'Lancer un dé virtuel.' },
  extract: { category: 'user', description: 'Sauvegarder un média à lecture unique.' },
  fact: { category: 'user', description: 'Découvrir un fait insolite.' },
  filter: { category: 'admin', description: 'Gérer les filtres automatiques du groupe.' },
  imagine: { category: 'user', description: 'Générer une image via l’IA.' },
  info: { category: 'user', description: 'Afficher les informations du bot.' },
  joke: { category: 'user', description: 'Recevoir une blague aléatoire.' },
  kick: { category: 'admin', description: 'Expulser un membre du groupe.' },
  listadmins: { category: 'owner', description: 'Lister les administrateurs du bot.' },
  listbanned: { category: 'owner', description: 'Afficher les utilisateurs bannis du bot.' },
  lyrics: { category: 'user', description: 'Obtenir les paroles d’une chanson.' },
  manga: { category: 'user', description: 'Chercher des informations sur un manga.' },
  meme: { category: 'user', description: 'Envoyer un meme aléatoire.' },
  menu: { category: 'user', description: 'Afficher la liste complète des commandes.' },
  meteo: { category: 'user', description: 'Consulter la météo d’une ville.' },
  movie: { category: 'user', description: 'Afficher la fiche d’un film.' },
  mute: { category: 'admin', description: 'Mettre un membre en mode muet.' },
  perso: { category: 'user', description: 'Envoyer un message personnalisé préconfiguré.' },
  ping: { category: 'user', description: 'Tester la réactivité du bot.' },
  poll: { category: 'user', description: 'Créer un sondage interactif.' },
  pp: { category: 'user', description: 'Récupérer une photo de profil.' },
  promote: { category: 'admin', description: 'Promouvoir un membre en admin du groupe.' },
  purge: { category: 'admin', description: 'Supprimer les messages d’un membre spécifique.' },
  qrcode: { category: 'user', description: 'Générer un QR code.' },
  quote: { category: 'user', description: 'Afficher une citation inspirante.' },
  rmadmin: { category: 'owner', description: 'Retirer un administrateur du bot.' },
  roulette: { category: 'user', description: 'Jouer à la roulette russe virtuelle.' },
  say: { category: 'user', description: 'Convertir du texte en audio.' },
  securitystats: { category: 'owner', description: 'Consulter les statistiques de sécurité.' },
  setadmin: { category: 'owner', description: 'Ajouter un administrateur au bot.' },
  setgoodbye: { category: 'admin', description: 'Configurer le message d’au revoir automatique.' },
  setprefix: { category: 'owner', description: 'Modifier le préfixe des commandes pour ce chat.' },
  setwelcome: { category: 'admin', description: 'Configurer le message de bienvenue automatique.' },
  ship: { category: 'user', description: 'Estimer l’affinité entre deux membres.' },
  shorten: { category: 'user', description: 'Raccourcir une URL.' },
  song: { category: 'user', description: 'Télécharger une chanson depuis YouTube.' },
  sticker: { category: 'user', description: 'Créer un sticker à partir d’un média.' },
  tagall: { category: 'admin', description: 'Mentionner tous les membres du groupe.' },
  tictactoe: { category: 'user', description: 'Jouer au morpion avec le bot.' },
  time: { category: 'user', description: 'Afficher l’heure d’une ville.' },
  translate: { category: 'user', description: 'Traduire un texte dans une autre langue.' },
  trivia: { category: 'user', description: 'Participer à un quiz généraliste.' },
  unban: { category: 'owner', description: 'Réhabiliter un utilisateur banni.' },
  unmute: { category: 'admin', description: 'Réactiver un membre mis en sourdine.' },
  unwarn: { category: 'admin', description: 'Retirer un avertissement d’un membre.' },
  vision: { category: 'user', description: 'Analyser une image avec l’IA.' },
  vote: { category: 'user', description: 'Créer un vote rapide dans le groupe.' },
  wallpaper: { category: 'user', description: 'Trouver un fond d’écran HD.' },
  warn: { category: 'admin', description: 'Attribuer un avertissement à un membre.' },
  warns: { category: 'admin', description: 'Consulter les avertissements d’un membre.' },
  yt: { category: 'user', description: 'Télécharger une vidéo YouTube.' }
}

const SECTION_LABELS = {
  user: 'UTILISATEURS',
  admin: 'ADMINISTRATEURS',
  owner: 'PROPRIÉTAIRE'
}

export default async function (sock, msg) {
  const from = msg.key.remoteJid

  const commandsDir = path.resolve('./commands')
  let commandFiles = []

  try {
    commandFiles = fs
      .readdirSync(commandsDir)
      .filter(name => name.endsWith('.js'))
      .map(name => name.replace(/\.js$/, ''))
      .filter(name => name.length > 0)
      .sort((a, b) => a.localeCompare(b))
  } catch (err) {
    console.warn('Impossible de lister les commandes:', err?.message || err)
  }

  const categorized = {
    user: [],
    admin: [],
    owner: []
  }

  for (const name of commandFiles) {
    const metadata = COMMAND_METADATA[name] || { category: 'user', description: 'Description à venir.' }
    const category = categorized[metadata.category] ? metadata.category : 'user'
    categorized[category].push({ name, description: metadata.description })
  }

  const totalCommands = commandFiles.length
  const imagePath = path.resolve('./assets/erwinbot.png')

  const lines = [
    '╭────────────────────────────╮',
    '│        ERWIN-BOT MENU       │',
    '╰────────────────────────────╯',
    `Commandes disponibles : ${totalCommands}`,
    ''
  ]

  for (const sectionKey of ['user', 'admin', 'owner']) {
    const section = categorized[sectionKey]
    if (!section.length) continue
    lines.push(`[${SECTION_LABELS[sectionKey]}]`)
    section.forEach(({ name, description }) => {
      lines.push(`- ➤ \`.${name}\` — ${description}`)
    })
    lines.push('')
  }

  const menuText = lines.join('\n')

  try {
    if (fs.existsSync(imagePath)) {
      const imgBuffer = fs.readFileSync(imagePath)
      await sock.sendMessage(
        from,
        { image: imgBuffer, caption: menuText },
        { quoted: msg }
      )
    } else {
      await sock.sendMessage(from, { text: menuText }, { quoted: msg })
    }
  } catch (err) {
    console.error('Erreur lors de l’envoi du menu:', err)
    await sock.sendMessage(from, { text: '❌ Impossible d’afficher le menu.' }, { quoted: msg })
  }
}
