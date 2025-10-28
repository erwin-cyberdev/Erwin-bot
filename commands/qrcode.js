// commands/qrcode.js
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid

  // Récupérer le numéro
  let number = args.join('').trim()

  if (!number) {
    return await sock.sendMessage(from, {
      text: '❗ Usage : `.qrcode <numéro>`\n\n💡 Exemples :\n• `.qrcode 237674151474`\n• `.qrcode +237674151474`\n• `.qrcode 674151474`\n\nGénère un QR code WhatsApp pour le numéro.'
    }, { quoted: msg })
  }

  // Nettoyer le numéro (enlever espaces, +, -, parenthèses, etc.)
  number = number.replace(/[^0-9]/g, '')

  // Si le numéro est trop court, ajouter le préfixe Cameroun par défaut
  if (number.length < 10) {
    number = '237' + number
  }

  // Valider la longueur du numéro
  if (number.length < 10 || number.length > 15) {
    return await sock.sendMessage(from, {
      text: '⚠️ Numéro invalide. Le numéro doit contenir entre 10 et 15 chiffres.\n\n💡 Exemples valides :\n• `237674151474` (Cameroun)\n• `33612345678` (France)\n• `1234567890` (USA)'
    }, { quoted: msg })
  }

  try {
    await sock.sendMessage(from, {
      text: '⏳ Génération du QR code en cours...'
    }, { quoted: msg })

    // Créer l'URL WhatsApp
    const whatsappUrl = `https://wa.me/${number}`

    // Générer le QR code en buffer
    const qrBuffer = await QRCode.toBuffer(whatsappUrl, {
      errorCorrectionLevel: 'H',
      type: 'png',
      quality: 0.95,
      margin: 1,
      width: 512,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Créer un dossier temporaire si nécessaire
    const tempDir = path.resolve('./temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Sauvegarder temporairement
    const tempPath = path.join(tempDir, `qr_${number}_${Date.now()}.png`)
    fs.writeFileSync(tempPath, qrBuffer)

    // Envoyer l'image
    await sock.sendMessage(from, {
      image: { url: tempPath },
      caption: `✅ *QR Code WhatsApp*\n\n📱 Numéro : +${number}\n🔗 Lien : ${whatsappUrl}\n\n💡 Scanne ce QR code pour ouvrir une conversation WhatsApp avec ce numéro.`
    }, { quoted: msg })

    // Nettoyer le fichier temporaire
    setTimeout(() => {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
      } catch (e) {
        console.error('Erreur suppression QR temp:', e)
      }
    }, 2000)

  } catch (err) {
    console.error('Erreur génération QR code:', err)
    await sock.sendMessage(from, {
      text: '❗ Erreur lors de la génération du QR code. Réessaie avec un numéro valide.'
    }, { quoted: msg })
  }
}
