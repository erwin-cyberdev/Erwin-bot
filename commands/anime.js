// commands/anime.js
import fetch from 'node-fetch';

const API_BASE = 'https://api.jikan.moe/v4';
const SYNOPSIS_CHUNK = 3200;
const MAX_CHUNKS = 5;
const TIMEOUT_MS = 12000;

// Fonction pour récupérer le JSON avec timeout et gestion d'erreurs
async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'ErwinBot-Anime/1.0',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`API Jikan a répondu ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// Découpe le synopsis en plusieurs parties pour éviter les messages trop longs
function formatSynopsis(synopsis = '') {
  if (!synopsis) return ['Pas de synopsis disponible.'];
  const chunks = [];
  let i = 0;
  while (i < synopsis.length && chunks.length < MAX_CHUNKS) {
    const end = Math.min(i + SYNOPSIS_CHUNK, synopsis.length);
    chunks.push(synopsis.slice(i, end).trim());
    i = end;
  }
  return chunks.filter(Boolean);
}

export default async function animeCommand(sock, msg, args) {
  const from = msg.key.remoteJid;
  const query = args.join(' ').trim();

  // Détermine l’URL à appeler
  const url = query
    ? `${API_BASE}/anime?q=${encodeURIComponent(query)}&limit=1&sfw=true`
    : `${API_BASE}/random/anime`;

  try {
    const data = await fetchJson(url);
    const anime = query ? data.data?.[0] : data.data;

    if (!anime) {
      return sock.sendMessage(from, { text: '😕 Aucun anime trouvé pour ta recherche.' }, { quoted: msg });
    }

    const title = anime.title_english || anime.title || anime.title_japanese || 'Titre inconnu';
    const score = anime.score ? `${anime.score}/10` : 'N/A';
    const status = anime.status || 'Inconnu';
    const type = anime.type || 'Inconnu';
    const episodes = Number.isFinite(anime.episodes) ? anime.episodes : '?';
    const date = anime.aired?.string || 'Date inconnue';
    const image = anime.images?.jpg?.large_image_url || anime.images?.webp?.large_image_url;
    const genres = Array.isArray(anime.genres) ? anime.genres.slice(0, 4).map(g => g.name) : [];
    const studios = Array.isArray(anime.studios) ? anime.studios.map(s => s.name) : [];

    const lines = [
      `🎬 *${title}*`,
      `📺 Type : ${type}`,
      `📆 Diffusion : ${date}`,
      `📡 Statut : ${status}`,
      `🎞️ Épisodes : ${episodes}`,
      `⭐ Score : ${score}`,
    ];
    if (genres.length) lines.push(`🏷️ Genres : ${genres.join(', ')}`);
    if (studios.length) lines.push(`🎬 Studio : ${studios.join(', ')}`);

    const caption = lines.join('\n');

    // Envoi de l’image + infos principales
    if (image) {
      await sock.sendMessage(from, { image: { url: image }, caption }, { quoted: msg });
    } else {
      await sock.sendMessage(from, { text: caption }, { quoted: msg });
    }

    // Découpage et envoi du synopsis
    const synopsisChunks = formatSynopsis(anime.synopsis);
    for (let i = 0; i < synopsisChunks.length; i++) {
      const header = synopsisChunks.length > 1
        ? `📝 *Synopsis (partie ${i + 1}/${synopsisChunks.length})*`
        : '📝 *Synopsis :*';
      await sock.sendMessage(from, { text: `${header}\n\n${synopsisChunks[i]}` }, { quoted: msg });
    }

    if (synopsisChunks.length === MAX_CHUNKS && anime.synopsis?.length > SYNOPSIS_CHUNK * MAX_CHUNKS) {
      await sock.sendMessage(from, { text: '⚠️ Synopsis tronqué (trop long).' }, { quoted: msg });
    }

  } catch (err) {
    console.error('Erreur .anime:', err);
    const reason = err?.message || 'Erreur inconnue.';
    await sock.sendMessage(from, {
      text: `❌ Impossible de récupérer les informations sur l'anime.\nMotif : ${reason}`
    }, { quoted: msg });
  }
}
