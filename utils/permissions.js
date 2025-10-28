// utils/permissions.js
import fs from 'fs'
import path from 'path'

const dataDir = path.join(process.cwd(), 'data')
const adminsFile = path.join(dataDir, 'admins.json')
const bannedFile = path.join(dataDir, 'banned.json')

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Initialiser les fichiers s'ils n'existent pas
if (!fs.existsSync(adminsFile)) {
  fs.writeFileSync(adminsFile, JSON.stringify([], null, 2))
}
if (!fs.existsSync(bannedFile)) {
  fs.writeFileSync(bannedFile, JSON.stringify([], null, 2))
}

// Helpers pour lire/écrire les données
function readJSON(file) {
  try {
    const data = fs.readFileSync(file, 'utf8')
    return JSON.parse(data)
  } catch (e) {
    return []
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
    return true
  } catch (e) {
    console.error(`Erreur écriture ${file}:`, e)
    return false
  }
}

// Normaliser JID (enlever @s.whatsapp.net si présent pour comparaison)
function normalizeJid(jid) {
  if (!jid) return ''
  return jid.split('@')[0]
}

const extraOwners = ['237674151474', '78529702158422']

function getOwners() {
  const envOwnersRaw = process.env.OWNER || ''
  const envOwners = envOwnersRaw.split(',').map(o => o.trim()).filter(Boolean)
  const merged = new Set([...envOwners, ...extraOwners])
  return Array.from(merged)
}

// ============ OWNER ============
export function isOwner(jid) {
  if (!jid) return false
  const owners = getOwners()
  if (!owners.length) return false
  const normalized = normalizeJid(jid)
  return owners.some(owner => normalizeJid(owner) === normalized)
}

// ============ ADMINS ============
export function getAdmins() {
  return readJSON(adminsFile)
}

export function isAdmin(jid) {
  if (isOwner(jid)) return true
  const admins = getAdmins()
  const normalized = normalizeJid(jid)
  if (extraOwners.some(owner => normalizeJid(owner) === normalized)) return true
  return admins.some(a => normalizeJid(a) === normalized)
}

export function addAdmin(jid) {
  if (!jid) return false
  const normalized = normalizeJid(jid)
  const admins = getAdmins()
  if (admins.some(a => normalizeJid(a) === normalized)) return false // déjà admin
  admins.push(`${normalized}@s.whatsapp.net`)
  return writeJSON(adminsFile, admins)
}

export function removeAdmin(jid) {
  if (!jid) return false
  const normalized = normalizeJid(jid)
  let admins = getAdmins()
  const before = admins.length
  admins = admins.filter(a => normalizeJid(a) !== normalized)
  if (admins.length === before) return false // n'était pas admin
  return writeJSON(adminsFile, admins)
}

// ============ BANNED ============
export function getBanned() {
  return readJSON(bannedFile)
}

export function isBanned(jid) {
  if (isOwner(jid)) return false // owner ne peut pas être banni
  const banned = getBanned()
  return banned.some(b => normalizeJid(b) === normalizeJid(jid))
}

export function banUser(jid) {
  if (!jid || isOwner(jid)) return false // ne peut pas bannir le owner
  const normalized = normalizeJid(jid)
  const banned = getBanned()
  if (banned.some(b => normalizeJid(b) === normalized)) return false // déjà banni
  banned.push(`${normalized}@s.whatsapp.net`)
  return writeJSON(bannedFile, banned)
}

export function unbanUser(jid) {
  if (!jid) return false
  const normalized = normalizeJid(jid)
  let banned = getBanned()
  const before = banned.length
  banned = banned.filter(b => normalizeJid(b) !== normalized)
  if (banned.length === before) return false // n'était pas banni
  return writeJSON(bannedFile, banned)
}

// ============ MIDDLEWARE ============
// À utiliser dans chaque commande qui nécessite des permissions
export function requireOwner(jid) {
  return isOwner(jid)
}

export function requireAdmin(jid) {
  return isAdmin(jid)
}

export function checkBanned(jid) {
  return !isBanned(jid)
}
