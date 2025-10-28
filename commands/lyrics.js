// commands/lyrics.js
import axios from 'axios'

const TIMEOUT = 10000
const CHUNK_SIZE = 1500
const MAX_CHUNKS = 8

function chunkText(text, size = CHUNK_SIZE) {
  const chunks = []
  let i = 0
  while (i < text.length) {
    let end = Math.min(i + size, text.length)
    const nl = text.lastIndexOf('\n', end)
    const sp = text.lastIndexOf(' ', end)
    const cut = Math.max(nl, sp)
    if (cut > i) end = cut
    chunks.push(text.slice(i, end).trim())
    i = end
  }
  return chunks.filter(Boolean)
}

// API lyrics.ovh
async function fetchLyricsOvh(artist, title) {
  if (!artist || !title) return null
  try {
    const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { timeout: TIMEOUT })
    if (res?.data?.lyrics) return res.data.lyrics
  } catch {}
  return null
}

// API some-random-api.ml
async function fetchLyricsRandom(titleQuery) {
  if (!titleQuery) return null
  try {
    const res = await axios.get(`https://some-random-api.ml/lyrics?title=${encodeURIComponent(titleQuery)}`, { timeout: TIMEOUT })
    if (res?.data?.lyrics) return res.data.lyrics
  } catch {}
  return null
}

// API Lyrist
async function fetchLyricsLyrist(query) {
  if (!query) return null
  try {
    const res = await axios.get(`https://lyrist.vercel.app/api/lyrics?q=${encodeURIComponent(query)}`, { timeout: TIMEOUT })
    if (res?.data?.lyrics) return { lyrics: res.data.lyrics, title: res.data.title, artist: res.data.artist }
  } catch {}
  return null
}

async function tryCandidates(candidates = []) {
  for (const c of candidates) {
    const { artist, title, combined } = c
    if (artist && title) {
      const l1 = await fetchLyricsOvh(artist, title)
      if (l1) return { lyrics: l1, meta: { title, artist }, source: 'lyrics.ovh' }
    }
    if (combined) {
      const l2 = await fetchLyricsRandom(combined)
      if (l2) return { lyrics: l2, meta: { query: combined }, source: 'some-random-api.ml' }
      const l3 = await fetchLyricsLyrist(combined)
      if (l3) return { lyrics: l3.lyrics, meta: { title: l3.title, artist: l3.artist }, source: 'Lyrist' }
    }
    if (title) {
      const l4 = await fetchLyricsRandom(title)
      if (l4) return { lyrics: l4, meta: { title }, source: 'some-random-api.ml' }
      const l5 = await fetchLyricsLyrist(title)
      if (l5) return { lyrics: l5.lyrics, meta: { title: l5.title, artist: l5.artist }, source: 'Lyrist' }
    }
  }
  return null
}

export default async function lyricsCommand(sock, msg, args) {
  const from = msg.key.remoteJid
  const raw = (args || []).join(' ').trim()
  if (!raw) return sock.sendMessage(from, { text: '❗ Usage: .lyrics <titre - artiste>' }, { quoted: msg })

  // Générer les candidats : title-artist, artist-title, variations
  const candidates = []
  if (raw.includes(' - ')) {
    const [a, b] = raw.split(' - ').map(s => s.trim())
    candidates.push({ title: a, artist: b, combined: `${a} - ${b}` })
    candidates.push({ artist: a, title: b, combined: `${b} - ${a}` })
  } else if (raw.includes('-')) {
    const parts = raw.split('-').map(s => s.trim())
    if (parts.length >= 2) {
      const last = parts.pop()
      const first = parts.join(' - ')
      candidates.push({ title: first, artist: last, combined: `${first} - ${last}` })
      candidates.push({ artist: first, title: last, combined: `${last} - ${first}` })
    } else candidates.push({ title: raw, combined: raw })
  } else {
    candidates.push({ title: raw, combined: raw })
  }

  // Ajout de fallback : dernière partie comme artiste possible
  const words = raw.split(' ').filter(Boolean)
  if (words.length > 1) {
    candidates.push({ title: words.slice(0, -1).join(' '), artist: words.slice(-1)[0], combined: `${words.slice(0, -1).join(' ')} - ${words.slice(-1)[0]}` })
    candidates.push({ title: raw, combined: raw })
  }

  try {
    await sock.sendMessage(from, { text: `⏳ Recherche paroles pour : ${raw}` }, { quoted: msg })
    const result = await tryCandidates(candidates)

    if (!result) return sock.sendMessage(from, { text: '❌ Paroles introuvables. Essaie : .lyrics <titre - artiste>' }, { quoted: msg })

    const lyrics = result.lyrics.trim()
    const metaTitle = result.meta?.title || result.meta?.query || raw
    const metaArtist = result.meta?.artist ? ` - ${result.meta.artist}` : ''
    const sourceLabel = result.source ? `\n\n🔗 Source : ${result.source}` : ''
    const fullText = `🎶 Paroles (${metaTitle}${metaArtist})${sourceLabel}\n\n${lyrics}`
    const chunks = chunkText(fullText)

    for (const c of chunks.slice(0, MAX_CHUNKS)) await sock.sendMessage(from, { text: c }, { quoted: msg })
    if (chunks.length > MAX_CHUNKS) await sock.sendMessage(from, { text: '⚠️ Paroles tronquées (trop longues pour WhatsApp).' }, { quoted: msg })

  } catch (e) {
    console.error('Erreur .lyrics', e)
    try { await sock.sendMessage(from, { text: '❌ Erreur lors de la récupération des paroles.' }, { quoted: msg }) } catch {}
  }
}
