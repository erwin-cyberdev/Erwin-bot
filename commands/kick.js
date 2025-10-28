// commands/kick.js
export default async function (sock, msg, args = []) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant // sender JID in groups
  const text = (args || []).map(a => String(a)).join(' ').trim().toLowerCase()

  // helper robust pour extraire id / admin depuis la metadata
  const getId = (p) => p.id || p.jid || p.participant || (typeof p === 'string' ? p : null)
  const isAdminFlag = (p) => {
    // différentes formes possibles selon version de baileys
    return Boolean(p?.isAdmin || p?.admin === 'admin' || p?.admin === 'superadmin' || p?.isSuperAdmin)
  }

  // Vérifications initiales
  if (!msg.key.remoteJid?.endsWith('@g.us')) {
    return sock.sendMessage(from, { text: '❗ Cette commande doit être utilisée dans un groupe.' }, { quoted: msg })
  }

  // Récupérer metadata du groupe (pour obtenir la liste des participants & rôles)
  let metadata
  try {
    metadata = await sock.groupMetadata(from)
  } catch (e) {
    console.error('groupMetadata error:', e)
    return sock.sendMessage(from, { text: '❗ Impossible de récupérer les infos du groupe.' }, { quoted: msg })
  }

  // vérifier que l'expéditeur est admin
  const meId = (sock.user && (sock.user.id || sock.user.jid)) || null
  const participants = metadata.participants || []
  const senderObj = participants.find(p => getId(p) === sender)
  if (!senderObj || !isAdminFlag(senderObj)) {
    return sock.sendMessage(from, { text: '❌ Seuls les admins peuvent utiliser cette commande.' }, { quoted: msg })
  }

  // Si l'argument "all" est donné -> kick all non-admins
  if (text === 'all' || text === 'tout' || text === 'tous') {
    // Construire la liste des membres à exclure (non-admins)
    const toKick = participants
      .map(p => ({ id: getId(p), admin: isAdminFlag(p) }))
      .filter(p => p.id && !p.admin && p.id !== meId) // ne pas kicker le bot lui-même
      .map(p => p.id)

    if (!toKick.length) {
      return sock.sendMessage(from, { text: 'ℹ️ Aucun membre non-admin à expulser.' }, { quoted: msg })
    }

    // Confirmer l'action à l'admin avant d'exécuter (optionnel)
    try {
      await sock.sendMessage(from, { text: `⚠️ Expulsion de ${toKick.length} membre(s) non-admin en cours...` }, { quoted: msg })
      // Exécuter la suppression par lots
      // groupParticipantsUpdate peut accepter plusieurs JID dans un tableau
      await sock.groupParticipantsUpdate(from, toKick, 'remove')
      return sock.sendMessage(from, { text: `✅ ${toKick.length} membre(s) expulsé(s).` }, { quoted: msg })
    } catch (e) {
      console.error('kick all error:', e)
      return sock.sendMessage(from, { text: '❗ Impossible d\'expulser certains membres (permissions insuffisantes ou erreur WhatsApp).' }, { quoted: msg })
    }
  }

  // Sinon, comportement classique : on s'attend à des mentions
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
  if (!mentioned.length) {
    return sock.sendMessage(from, { text: '❗ Mentionne l\'utilisateur à expulser ou utilise ".kick all".' }, { quoted: msg })
  }

  // Protection : ne pas essayer de kicker les admins (évite erreurs forbidden)
  const safeToKick = []
  for (const m of mentioned) {
    const part = participants.find(p => getId(p) === m)
    const admin = part ? isAdminFlag(part) : false
    if (m === meId) continue // ne pas kicker le bot
    if (admin) {
      // skip admin and notify
      await sock.sendMessage(from, { text: `⚠️ Impossible d'expulser ${m.split('@')[0]} — c'est un admin.` }, { quoted: msg })
      continue
    }
    safeToKick.push(m)
  }

  if (!safeToKick.length) {
    return sock.sendMessage(from, { text: 'ℹ️ Aucun utilisateur expulsable dans la sélection.' }, { quoted: msg })
  }

  try {
    await sock.groupParticipantsUpdate(from, safeToKick, 'remove')
    return sock.sendMessage(from, { text: '🚫 Utilisateur(s) expulsé(s).' }, { quoted: msg })
  } catch (e) {
    console.error('kick error:', e)
    return sock.sendMessage(from, { text: '❗ Erreur lors de l\'expulsion. Vérifie mes permissions (le bot doit être admin).' }, { quoted: msg })
  }
}
