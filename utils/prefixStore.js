import fs from 'fs'
import path from 'path'

export const DEFAULT_PREFIX = '.'

const DATA_DIR = path.resolve('./data')
const FILE_PATH = path.join(DATA_DIR, 'prefixes.json')

let prefixes = {}

function ensureLoaded() {
  if (Object.keys(prefixes).length) return
  try {
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, 'utf8')
      prefixes = JSON.parse(raw)
    }
  } catch (err) {
    console.error('Erreur de lecture prefixes.json:', err)
    prefixes = {}
  }
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function savePrefixes() {
  try {
    ensureDir()
    fs.writeFileSync(FILE_PATH, JSON.stringify(prefixes, null, 2))
  } catch (err) {
    console.error('Erreur de sauvegarde prefixes.json:', err)
  }
}

export function getPrefixForID(id) {
  ensureLoaded()
  return prefixes[id] || DEFAULT_PREFIX
}

export function setPrefixForID(id, prefix) {
  ensureLoaded()
  prefixes[id] = prefix
  savePrefixes()
}
