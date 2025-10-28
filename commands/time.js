// commands/time.js
import moment from 'moment-timezone'

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid
  const input = args.join(' ').trim().toLowerCase()
  const defaultTz = 'Africa/Douala'

  try {
    const allZones = moment.tz.names()

    // Dictionnaire rapide de correspondances manuelles (alias pays / villes)
    const aliases = {
      douala: 'Africa/Douala',
      cameroun: 'Africa/Douala',
      yaounde: 'Africa/Douala',
      paris: 'Europe/Paris',
      france: 'Europe/Paris',
      londres: 'Europe/London',
      london: 'Europe/London',
      usa: 'America/New_York',
      newyork: 'America/New_York',
      new_york: 'America/New_York',
      washington: 'America/New_York',
      losangeles: 'America/Los_Angeles',
      la: 'America/Los_Angeles',
      tokyo: 'Asia/Tokyo',
      japon: 'Asia/Tokyo',
      japan: 'Asia/Tokyo',
      beijing: 'Asia/Shanghai',
      chine: 'Asia/Shanghai',
      china: 'Asia/Shanghai',
      sydney: 'Australia/Sydney',
      australie: 'Australia/Sydney',
      canada: 'America/Toronto',
      toronto: 'America/Toronto',
      brazil: 'America/Sao_Paulo',
      brasilia: 'America/Sao_Paulo',
      saopaulo: 'America/Sao_Paulo',
      dubai: 'Asia/Dubai',
      nigeria: 'Africa/Lagos',
      lagos: 'Africa/Lagos',
      berlin: 'Europe/Berlin',
      allemagne: 'Europe/Berlin',
      india: 'Asia/Kolkata',
      inde: 'Asia/Kolkata',
      moscow: 'Europe/Moscow',
      russie: 'Europe/Moscow',
      russia: 'Europe/Moscow'
    }

    // 1️⃣ Détermination de la timezone
    let tz = defaultTz
    if (input) {
      if (aliases[input]) {
        tz = aliases[input]
      } else {
        // Recherche approximative sur toutes les zones
        const found = allZones.find(z => z.toLowerCase().includes(input))
        if (found) tz = found
        else {
          await sock.sendMessage(from, {
            text: `❗ Aucune timezone trouvée pour "${input}".\nUtilisation par défaut : ${defaultTz}`
          }, { quoted: msg })
        }
      }
    }

    // 2️⃣ Récupération de la date et heure locales
    const now = moment().tz(tz)
    const time = now.format('HH:mm:ss')
    const date = now.format('dddd, DD MMMM YYYY')

    // 3️⃣ Construction du message
    const reply = `🕒 *Heure locale*\n🌍 Fuseau : ${tz}\n📅 Date : ${date}\n⏰ Heure : ${time}`
    await sock.sendMessage(from, { text: reply }, { quoted: msg })

  } catch (err) {
    console.error('Erreur .time:', err)
    await sock.sendMessage(from, { text: '❗ Erreur lors de la récupération de l’heure.' }, { quoted: msg })
  }
}
