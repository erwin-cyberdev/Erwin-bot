import { DEFAULT_PREFIX, getPrefixForID, setPrefixForID } from './prefixStore.js'

const GLOBAL_ID = 'global'

export function getPrefix(chatId) {
  const target = chatId || GLOBAL_ID
  return getPrefixForID(target)
}

export function setPrefix(prefix, chatId) {
  const target = chatId || GLOBAL_ID
  if (typeof prefix !== 'string' || !prefix.trim().length) {
    throw new Error('Préfixe invalide')
  }
  const trimmed = prefix.trim()
  if (trimmed.length > 3) {
    throw new Error('Le préfixe doit contenir entre 1 et 3 caractères visibles')
  }
  setPrefixForID(target, trimmed)
  return trimmed
}

export function resetPrefix(chatId) {
  const target = chatId || GLOBAL_ID
  setPrefixForID(target, DEFAULT_PREFIX)
  return DEFAULT_PREFIX
}
