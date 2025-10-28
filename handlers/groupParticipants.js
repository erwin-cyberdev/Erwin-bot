// handlers/groupParticipants.js
// Écoute les événements d'arrivée/départ et envoie welcome/goodbye en mentionnant correctement
import { getGroupSettings } from '../utils/groupSettings.js'

/**
 * Initialise l'écoute des participants de groupe
 * Appelle initGroupParticipants(sock) après avoir initialisé `sock`
 */
export function initGroupParticipants(sock) {
  if (!sock || !sock.ev || typeof sock.ev.on !== 'function') {
    console.warn('initGroupParticipants: impossible d\'attacher les events (sock.ev manquant)')
    return
  }

  sock.ev.on('group-participants.update', async (update) => {
    try {
      const groupId = update.id // ex: 12345-678@g.us
      const participants = update.participants || [] // liste de jids
      const action = update.action // 'add' | 'remove' | 'promote' | 'demote'

      // On ne s'intéresse qu'aux ajouts et suppressions
      if (!['add', 'remove'].includes(action)) return

      // Récupérer settings du groupe
      const settings = getGroupSettings(groupId) || {}
      const template = action === 'add' ? settings.welcome : settings.goodbye
      const defaultWelcome = '👋 Bienvenue {user} dans {group} !'
      const defaultGoodbye = '👋 Au revoir {user} — à bientôt !'

      const meta = await (async () => {
        try {
          return await sock.groupMetadata(groupId)
        } catch {
          return null
        }
      })()

      const groupName = meta?.subject || groupId

      // Pour chaque participant, envoyer un message (mention individuelle)
      for (const participant of participants) {
        // participant: ex '2376...@s.whatsapp.net'
        const jid = participant
        // tenter de récupérer un nom lisible
        let name = jid.split('@')[0]
        try {
          // préfèrence: contact store (Baileys expose sock.contacts)
          if (sock.contacts && sock.contacts[jid] && sock.contacts[jid].notify) {
            name = sock.contacts[jid].notify
          } else if (meta?.participants) {
            const p = meta.participants.find(x => x.id === jid)
            if (p && (p.notify || p.jid || p.id)) {
              name = p.notify || p.id || name
            }
          } else {
            // fallback: requête getName si disponible
            if (typeof sock.getName === 'function') {
              try { name = await sock.getName(jid) } catch {}
            }
          }
        } catch (e) {
          // ignore
        }

        const rawTemplate = template || (action === 'add' ? defaultWelcome : defaultGoodbye)

        // Remplacer placeholders
        const text = rawTemplate
          .replace(/{user}/gi, `@${name}`)
          .replace(/{group}/gi, groupName)

        // Envoi avec mentions pour que WhatsApp affiche la vraie mention
        try {
          await sock.sendMessage(groupId, {
            text,
            mentions: [jid]
          })
        } catch (e) {
          console.error('Erreur envoi welcome/goodbye pour', jid, e)
        }
      }

    } catch (err) {
      console.error('group-participants.update handler erreur:', err)
    }
  })
}
