// commands/securitystats.js - Stats de sécurité (Owner only)
import { isOwner } from '../utils/permissions.js'
import { getSecurityStats, checkBotHealth } from '../utils/botSecurity.js'
import { getStats as getQueueStats } from '../utils/messageQueue.js'
import { getSpamStats } from '../utils/antiSpam.js'

export default async function (sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid

  // Vérifier owner
  if (!isOwner(sender)) {
    return await sock.sendMessage(from, {
      text: '⛔ Commande réservée au propriétaire.'
    }, { quoted: msg })
  }

  try {
    // Récupérer toutes les stats
    const securityStats = getSecurityStats()
    const queueStats = getQueueStats()
    const spamStats = getSpamStats()
    const health = checkBotHealth()

    // Statut de santé
    let healthEmoji = '✅'
    if (health.status === 'warning') healthEmoji = '⚠️'
    if (health.status === 'critical') healthEmoji = '🚨'

    const message = `
╭─────────────────────╮
│  🛡️ *SÉCURITÉ BOT*  │
╰─────────────────────╯

${healthEmoji} *Statut :* ${health.status.toUpperCase()}
${health.warnings.length > 0 ? `⚠️ *Alertes :*\n${health.warnings.map(w => `   • ${w}`).join('\n')}` : ''}

📊 *Requêtes :*
• Total : ${securityStats.security.totalRequests}
• Autorisées : ${securityStats.security.allowedRequests}
• Bloquées : ${securityStats.security.blockedRequests}
• Taux blocage : ${securityStats.blockRate}

📨 *File d'attente :*
• En file : ${queueStats.queueSize} messages
• Envoyés : ${queueStats.sent}
• Rejetés : ${queueStats.rejected}
• Taux horaire : ${queueStats.hourlyRate}/150
• Taux quotidien : ${queueStats.dailyRate}/1000

🚫 *Anti-spam :*
• Blacklistés : ${spamStats.blacklistedUsers}
• Avec warnings : ${spamStats.usersWithWarnings}
• Total warnings : ${spamStats.totalWarnings}
• Suspects : ${spamStats.suspiciousUsers}

━━━━━━━━━━━━━━━━━━━━
🔒 Système de sécurité actif
    `.trim()

    await sock.sendMessage(from, { text: message }, { quoted: msg })

  } catch (err) {
    console.error('Erreur securitystats:', err)
    await sock.sendMessage(from, {
      text: '❗ Erreur lors de la récupération des stats.'
    }, { quoted: msg })
  }
}
