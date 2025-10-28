// utils/rateLimiter.js

// Maps pour stocker les données des utilisateurs et groupes
const userCooldowns = new Map()
const userRates = new Map()
const groupTagCooldowns = new Map()
const joinedUsers = new Set()

// Vérifie si un utilisateur est en cooldown (RÉDUIT de 3s à 1s)
export function checkCooldown(userId, cooldownTime = 1000) {
  const now = Date.now()
  const last = userCooldowns.get(userId) || 0
  if (now - last < cooldownTime) return false
  userCooldowns.set(userId, now)
  return true
}

// Vérifie le taux de messages pour éviter le spam (LIMITÉ À 10 messages au lieu de 5)
export function checkUserRate(userId, maxMessages = 10, interval = 10000) {
  const now = Date.now()
  if (!userRates.has(userId)) userRates.set(userId, [])

  const timestamps = userRates.get(userId)

  // Nettoyage des timestamps dépassés
  while (timestamps.length && now - timestamps[0] > interval) {
    timestamps.shift()
  }

  timestamps.push(now)
  userRates.set(userId, timestamps)
  return timestamps.length <= maxMessages
}

// Vérifie le cooldown pour les mentions de groupe (@everyone) - RÉDUIT À 30s
export function checkGroupTagCooldown(groupId, cooldownTime = 30000) {
  const now = Date.now()
  const lastTag = groupTagCooldowns.get(groupId) || 0
  if (now - lastTag < cooldownTime) return false
  groupTagCooldowns.set(groupId, now)
  return true
}

// Combine cooldown + rate limit pour un utilisateur (VALEURS PAR DÉFAUT RÉDUITES)
export function canSend(userId, cooldownTime = 1000, maxMessages = 10, interval = 10000) {
  return checkCooldown(userId, cooldownTime) && checkUserRate(userId, maxMessages, interval)
}

// Enregistre l'envoi d'un message pour l'utilisateur
export function recordSend(userId) {
  const now = Date.now()
  if (!userRates.has(userId)) userRates.set(userId, [])
  userRates.get(userId).push(now)
  userCooldowns.set(userId, now)
}

// Enregistre qu’un utilisateur a rejoint
export function registerJoin(userId) {
  if (joinedUsers.has(userId)) return false
  joinedUsers.add(userId)
  return true
}

// Nettoyage manuel (optionnel)
export function clearUserData(userId) {
  userCooldowns.delete(userId)
  userRates.delete(userId)
  joinedUsers.delete(userId)
}

export function clearGroupData(groupId) {
  groupTagCooldowns.delete(groupId)
}

// Nettoyage automatique périodique (toutes les 10 minutes)
function autoCleanup() {
  const now = Date.now()
  const oneHourAgo = now - 3600000
  
  // Nettoyer les cooldowns expirés
  for (const [userId, timestamp] of userCooldowns.entries()) {
    if (now - timestamp > oneHourAgo) {
      userCooldowns.delete(userId)
    }
  }
  
  // Nettoyer les rates expirés
  for (const [userId, timestamps] of userRates.entries()) {
    const filtered = timestamps.filter(t => now - t < 60000)
    if (filtered.length === 0) {
      userRates.delete(userId)
    } else {
      userRates.set(userId, filtered)
    }
  }
  
  // Nettoyer les group tags expirés
  for (const [groupId, timestamp] of groupTagCooldowns.entries()) {
    if (now - timestamp > oneHourAgo) {
      groupTagCooldowns.delete(groupId)
    }
  }
}

// Lancer le nettoyage toutes les 10 minutes
setInterval(autoCleanup, 600000)
