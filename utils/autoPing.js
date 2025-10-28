import fs from 'fs'
import path from 'path'

const CONFIG_PATH = path.resolve('./data/autoping.json')
const DEFAULT_CONFIG = {
  enabled: false,
  intervalMinutes: 25,
  targetJid: 'status@broadcast'
}

let timer = null
let currentConfig = { ...DEFAULT_CONFIG }

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
      const data = JSON.parse(raw)
      currentConfig = { ...DEFAULT_CONFIG, ...data }
    } else {
      saveConfig()
    }
  } catch (err) {
    console.error('autoPing: lecture config échouée', err)
    currentConfig = { ...DEFAULT_CONFIG }
  }
}

function saveConfig() {
  try {
    const dir = path.dirname(CONFIG_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2))
  } catch (err) {
    console.error('autoPing: sauvegarde config échouée', err)
  }
}

export function getAutoPingConfig() {
  return { ...currentConfig }
}

export function setAutoPingConfig(partial) {
  currentConfig = { ...currentConfig, ...partial }
  saveConfig()
  return getAutoPingConfig()
}

async function sendPing(sock) {
  try {
    const target = currentConfig.targetJid || DEFAULT_CONFIG.targetJid
    await sock.sendPresenceUpdate('available')
    if (target === 'status@broadcast') {
      await sock.sendMessage(sock?.user?.id || '', { text: '🤖 autoping heartbeat' })
    } else {
      await sock.sendMessage(target, { text: '🤖 autoping' })
    }
  } catch (err) {
    console.error('autoPing: envoi ping échoué', err)
  }
}

function cancelTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function schedule(sock) {
  cancelTimer()
  if (!currentConfig.enabled) return
  const minutes = Number(currentConfig.intervalMinutes) || DEFAULT_CONFIG.intervalMinutes
  const ms = Math.max(1, minutes) * 60 * 1000
  timer = setInterval(() => sendPing(sock), ms)
}

export function initAutoPing(sock) {
  loadConfig()
  schedule(sock)
}

export function cancelAutoPing() {
  cancelTimer()
}

export function restartAutoPing(sock) {
  schedule(sock)
}
