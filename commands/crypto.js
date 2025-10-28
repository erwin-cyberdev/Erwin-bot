// commands/crypto.js
import axios from 'axios'

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid

  if (!args.length) {
    return await sock.sendMessage(from, {
      text: '💰 *Crypto*\n\n*Usage :* `.crypto <coin>`\n\n*Exemples :*\n• `.crypto bitcoin`\n• `.crypto ethereum`\n• `.crypto bnb`'
    }, { quoted: msg })
  }

  const coin = args[0].toLowerCase()

  try {
    await sock.sendMessage(from, { text: '⏳ Récupération des prix...' }, { quoted: msg })

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd,eur&include_24hr_change=true&include_market_cap=true`
    const res = await axios.get(url, { timeout: 8000 })

    if (!res.data || !res.data[coin]) {
      throw new Error('Crypto introuvable')
    }

    const data = res.data[coin]
    const priceUSD = data.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const priceEUR = data.eur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const change24h = data.usd_24h_change?.toFixed(2) || '0.00'
    const emoji = parseFloat(change24h) >= 0 ? '📈' : '📉'
    const marketCap = (data.usd_market_cap / 1e9).toFixed(2)

    const message = `
╭─────────────────────╮
│  💰 *CRYPTO PRICE*  │
╰─────────────────────╯

🪙 *Coin :* ${coin.charAt(0).toUpperCase() + coin.slice(1)}

💵 *Prix USD :* $${priceUSD}
💶 *Prix EUR :* €${priceEUR}

${emoji} *Variation 24h :* ${change24h}%
📊 *Market Cap :* $${marketCap}B

━━━━━━━━━━━━━━━━━━━━
💰 Prix en temps réel
    `.trim()

    await sock.sendMessage(from, { text: message }, { quoted: msg })

  } catch (err) {
    console.error('Erreur .crypto:', err)
    if (err.message === 'Crypto introuvable') {
      await sock.sendMessage(from, { text: `❗ Crypto "${coin}" introuvable. Essaie bitcoin, ethereum, bnb, etc.` }, { quoted: msg })
    } else {
      await sock.sendMessage(from, { text: '❗ Impossible de récupérer les prix.' }, { quoted: msg })
    }
  }
}
