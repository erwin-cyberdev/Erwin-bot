// commands/botstats.js - Owner only
import { isOwner, getAdmins, getBanned } from '../utils/permissions.js'
import os from 'os'

export default async function (sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid

  // Vérifier que c'est le owner
  if (!isOwner(sender)) {
    return await sock.sendMessage(from, { 
      text: '⛔ Cette commande est réservée au propriétaire du bot.' 
    }, { quoted: msg })
  }

  try {
    // Récupérer les groupes
    const groups = await sock.groupFetchAllParticipating()
    const groupList = Object.values(groups)
    const totalGroups = groupList.length

    // Compter les participants totaux
    let totalParticipants = 0
    groupList.forEach(group => {
      totalParticipants += group.participants?.length || 0
    })

    // Stats système
    const admins = getAdmins()
    const banned = getBanned()
    const uptime = process.uptime()
    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    const mins = Math.floor((uptime % 3600) / 60)

    // Mémoire
    const mem = process.memoryUsage()
    const rss = (mem.rss / 1024 / 1024).toFixed(2)
    const heapUsed = (mem.heapUsed / 1024 / 1024).toFixed(2)

    const text = `
📊 *STATISTIQUES DU BOT*
━━━━━━━━━━━━━━━━━━━━

👥 *Utilisateurs*
• Admins bot : ${admins.length}
• Utilisateurs bannis : ${banned.length}

🏘️ *Groupes*
• Nombre de groupes : ${totalGroups}
• Participants totaux : ${totalParticipants}

⚙️ *Système*
• Uptime : ${days}j ${hours}h ${mins}m
• Plateforme : ${os.platform()}
• Mémoire RSS : ${rss} MB
• Heap utilisé : ${heapUsed} MB
• CPU : ${os.cpus()[0].model}
• Cores : ${os.cpus().length}

🤖 *Bot*
• Version Node : ${process.version}
• Owner : ${process.env.OWNER || 'Non défini'}
• Nom : ${process.env.BOT_NAME || 'Erwin-Bot'}

━━━━━━━━━━━━━━━━━━━━
`.trim()

    await sock.sendMessage(from, { text }, { quoted: msg })

  } catch (err) {
    console.error('Erreur botstats:', err)
    await sock.sendMessage(from, {
      text: '❗ Erreur lors de la récupération des statistiques.'
    }, { quoted: msg })
  }
}
