import { enqueueMessage } from './messageQueue.js'

/**
 * Envoi simplifié avec simulation de frappe gérée par la file d'attente.
 * Accepte le même contenu que `sock.sendMessage`.
 */
export async function sendWithTyping(sock, jid, content, options = {}) {
  if (!sock) throw new Error('sendWithTyping: socket manquant')
  if (!jid) throw new Error('sendWithTyping: jid manquant')
  return enqueueMessage(sock, jid, content, options)
}
