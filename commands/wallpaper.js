// commands/wallpaper.js
import axios from 'axios'

const FALLBACK_TOPICS = ['nature', 'galaxy', 'sunset', 'minimal', 'landscape', 'abstract', 'technology']

function pickTopic(rawQuery) {
  const query = rawQuery.trim()
  if (query) return query
  return FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)]
}

function formatCaption(photo, query) {
  const description = photo.description || photo.alt_description || 'Wallpaper HD'
  const photographer = photo.user?.name || 'Auteur inconnu'
  const location = photo.location?.name ? `📍 ${photo.location.name}\n\n` : ''
  const source = photo.links?.html ? `🔗 Source: ${photo.links.html}\n` : ''
  return `🖼️ *${description}*\n\n${location}📸 Photo par: ${photographer}\n${source}━━━━━━━━━━━━━━━\n🌟 Wallpaper HD — ${query}`
}

async function fetchWallpaper(accessKey, query) {
  const headers = { Authorization: `Client-ID ${accessKey}` }
  const params = {
    query,
    orientation: 'portrait',
    per_page: 12,
    content_filter: 'high'
  }

  const response = await axios.get('https://api.unsplash.com/search/photos', {
    headers,
    params,
    timeout: 10000,
    validateStatus: status => [200, 401, 403, 429].includes(status)
  })

  if (response.status === 429) {
    throw new Error('Limite Unsplash atteinte (429)')
  }
  if (response.status !== 200 || !Array.isArray(response.data?.results) || !response.data.results.length) {
    throw new Error('Aucun résultat trouvé')
  }

  const results = response.data.results
  return results[Math.floor(Math.random() * results.length)]
}

export default async function wallpaperCommand(sock, msg, args) {
  const from = msg.key.remoteJid
  const accessKey = process.env.UNSPLASH_ACCESS_KEY

  if (!accessKey) {
    return sock.sendMessage(from, {
      text: '⚠️ Clé API Unsplash manquante.\n\n💡 Obtiens une clé gratuite sur:\nhttps://unsplash.com/developers\n\nPuis ajoute dans `.env`:\nUNSPLASH_ACCESS_KEY=ta_clé'
    }, { quoted: msg })
  }

  const query = pickTopic(args.join(' '))

  await sock.sendMessage(from, { text: `⏳ Recherche de wallpaper HD pour "${query}"...` }, { quoted: msg })

  try {
    const photo = await fetchWallpaper(accessKey, query)
    const caption = formatCaption(photo, query)

    await sock.sendMessage(from, {
      image: { url: photo.urls?.regular || photo.urls?.full },
      caption
    }, { quoted: msg })

  } catch (err) {
    console.error('Erreur .wallpaper:', err)
    const message = err.message?.includes('429')
      ? '⚠️ Limite Unsplash atteinte. Réessaie dans quelques instants.'
      : '❗ Aucun wallpaper trouvé. Tente un autre mot-clé.'
    await sock.sendMessage(from, { text: message }, { quoted: msg })
  }
}
