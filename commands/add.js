// commands/add.js
export default async function(sock, msg, args) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid

  try {
    // --- Vérifier si c’est un groupe ---
    const metadata = await sock.groupMetadata(from)
    if (!metadata) return await sock.sendMessage(from, { text: '❌ Cette commande ne fonctionne que dans un groupe.' })

    // --- Vérifier si expéditeur admin ---
    const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    const isAdmin = admins.some(a => a.id === sender)
    if (!isAdmin) return await sock.sendMessage(from, { text: '⚠️ Seuls les admins peuvent ajouter des membres.' })

    // --- Vérifier qu’au moins un numéro est fourni ---
    if (!args.length) {
      return await sock.sendMessage(from, { text: '📞 *Usage:* .add <numéro1> <numéro2> ...' })
    }

    const results = []
    for (let raw of args) {
      let number = raw.replace(/[^0-9]/g, '')
      if (number.length <= 9) number = '237' + number
      const jid = `${number}@s.whatsapp.net`

      // --- Déjà dans le groupe ? ---
      if (metadata.participants.some(p => p.id === jid)) {
        results.push(`ℹ️ ${raw} est déjà dans le groupe`)
        continue
      }

      // --- Essayer d’ajouter ---
      try {
        await sock.groupParticipantsUpdate(from, [jid], 'add')
        results.push(`✅ ${raw} ajouté avec succès`)
      } catch (err) {
        // gérer toutes les erreurs possibles
        if (err.status === 400 || err.message.includes('bad-request')) {
          results.push(`❌ Impossible d’ajouter ${raw} (numéro invalide ou compte WhatsApp inexistant)`)
        } else if (err.message.includes('403')) {
          results.push(`🚫 Impossible d’ajouter ${raw} (bot doit être admin)`)
        } else if (err.message.includes('409')) {
          results.push(`ℹ️ ${raw} est déjà dans le groupe`)
        } else {
          console.error('Erreur add:', err)
          results.push(`❌ Erreur inconnue pour ${raw}`)
        }
      }
    }

    // --- Retour résultat ---
    await sock.sendMessage(from, { text: results.join('\n') })

  } catch (err) {
    console.error('Erreur .add globale:', err)
    await sock.sendMessage(from, { text: '❌ Une erreur est survenue lors de l’ajout des membres.' })
  }
}
