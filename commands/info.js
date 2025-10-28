// commands/info.js
import fs from 'fs'
import path from 'path'
import os from 'os'

function humanizeBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

function humanizeSeconds(sec) {
  sec = Math.floor(sec)
  const days = Math.floor(sec / 86400)
  sec -= days * 86400
  const hrs = Math.floor(sec / 3600)
  sec -= hrs * 3600
  const mins = Math.floor(sec / 60)
  sec -= mins * 60
  const parts = []
  if (days) parts.push(`${days}j`)
  if (hrs) parts.push(`${hrs}h`)
  if (mins) parts.push(`${mins}m`)
  if (sec) parts.push(`${sec}s`)
  return parts.length ? parts.join(' ') : '0s'
}

export default async function (sock, msg) {
  const from = msg.key.remoteJid
  try {
    const cwd = process.cwd()
    // package.json
    const pkgPath = path.resolve(cwd, 'package.json')
    const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : {}
    const name = process.env.BOT_NAME || pkg.name || 'Erwin-Bot'
    const version = pkg.version || process.env.BOT_VERSION || '?.?.?'
    const owner = process.env.OWNER || (pkg.author && (typeof pkg.author === 'string' ? pkg.author : pkg.author.name)) || 'Owner'

    // system & process info
    const nodeVer = process.version
    const platform = `${os.type()} ${os.arch()}`
    const cpuModel = (os.cpus() && os.cpus()[0] && os.cpus()[0].model) ? os.cpus()[0].model : 'Unknown CPU'
    const cpuCount = os.cpus() ? os.cpus().length : 'N/A'
    const sysUptime = humanizeSeconds(os.uptime())
    const procUptime = humanizeSeconds(process.uptime())

    const mem = process.memoryUsage()
    const rss = humanizeBytes(mem.rss)
    const heapUsed = humanizeBytes(mem.heapUsed)
    const heapTotal = humanizeBytes(mem.heapTotal)

    // commands count (best effort)
    let commandsCount = 'N/A'
    try {
      const cmdDir = path.resolve(cwd, 'commands')
      if (fs.existsSync(cmdDir)) {
        const files = fs.readdirSync(cmdDir).filter(f => f.endsWith('.js') || f.endsWith('.cjs') || f.endsWith('.mjs'))
        commandsCount = files.length
      }
    } catch (e) {
      commandsCount = 'N/A'
    }

    // repo / homepage info
    const repo = pkg.repository && (typeof pkg.repository === 'string' ? pkg.repository : (pkg.repository.url || '')) || pkg.homepage || process.env.BOT_REPO || ''
    const repoLine = repo ? `🔗 Repo: ${repo.replace(/^git\+/, '')}` : ''

    // social media links
    const github = process.env.CREATOR_GITHUB || ''
    const linkedin = process.env.CREATOR_LINKEDIN || ''
    const instagram = process.env.CREATOR_INSTAGRAM || ''
    const whatsapp = process.env.CREATOR_WHATSAPP || ''
    
    const socialLinks = []
    if (github) socialLinks.push(`   • GitHub: ${github}`)
    if (linkedin) socialLinks.push(`   • LinkedIn: ${linkedin}`)
    if (instagram) socialLinks.push(`   • Instagram: ${instagram}`)
    if (whatsapp) socialLinks.push(`   • WhatsApp: ${whatsapp}`)
    const socialSection = socialLinks.length ? `\n🔗 Réseaux du créateur :\n${socialLinks.join('\n')}` : ''

    // build a stylish box
    const title = `🤖 ${name} — v${version}`
    const separator = '────────────────────────────'
    let body = [
      `*${title}*`,
      `${separator}`,
      `👤 Créateur : ${owner}`,
      `🧰 Node.js : ${nodeVer}`,
      `🖥️ Système : ${platform}`,
      `⚙️ CPU : ${cpuModel} (${cpuCount} cores)`,
      `⏱️ Uptime (système) : ${sysUptime}`,
      `⏱️ Uptime (process) : ${procUptime}`,
      `📦 Cmds disponibles : ${commandsCount}`,
      `🧠 Mémoire RSS : ${rss} — Heap: ${heapUsed} / ${heapTotal}`,
    ].join('\n')

    if (repoLine) body += `\n${repoLine}`
    if (socialSection) body += socialSection

    body += `\n${separator}\n• Besoin d'aide ? Tape .menu`

    // try to send a logo if exists
    const possibleLogos = [
      path.join(cwd, 'assets', 'logo.png'),
      path.join(cwd, 'assets', 'logo.jpg'),
      path.join(cwd, 'logo.png'),
      path.join(cwd, 'logo.jpg')
    ]

    const logoPath = possibleLogos.find(p => fs.existsSync(p))
    if (logoPath) {
      try {
        const imgBuffer = fs.readFileSync(logoPath)
        await sock.sendMessage(from, { image: imgBuffer, caption: body }, { quoted: msg })
        return
      } catch (e) {
        // fallback to text if image send fails
        console.error('info.js: failed to send logo image, fallback to text:', e?.message || e)
      }
    }

    // send plain text with styling
    await sock.sendMessage(from, { text: body }, { quoted: msg })
  } catch (err) {
    console.error('info.js error:', err)
    try {
      await sock.sendMessage(from, { text: '❌ Impossible d\'afficher les infos pour le moment.' }, { quoted: msg })
    } catch {}
  }
}
