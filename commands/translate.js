import axios from "axios";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash"; // ✅ modèle mis à jour

if (!GEMINI_API_KEY) {
  console.warn("⚠️ Clé GEMINI_API_KEY manquante dans ton fichier .env");
}

/**
 * Fonction pour traduire du texte via l'API Gemini 2.5 Pro
 * @param {string} text - Le texte à traduire
 * @param {string} targetLang - La langue cible (ex: "fr", "en", "es")
 */
async function translateText(text, targetLang) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `Traduire le texte suivant en ${targetLang} :\n\n"${text}"`
          }
        ]
      }
    ]
  };

  try {
    const res = await axios.post(url, body, {
      headers: { "Content-Type": "application/json" }
    });

    const output =
      res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!output) throw new Error("Réponse invalide reçue de Gemini");

    return output;
  } catch (err) {
    console.error("❌ Erreur Gemini API:", err.message);
    throw new Error("Impossible de traduire le texte avec Gemini 2.5 Pro");
  }
}

export default async function (sock, msg, args) {
  const from = msg.key.remoteJid;

  if (args.length < 2) {
    return await sock.sendMessage(
      from,
      {
        text: "❌ *Usage:* .translate <langue_cible> <texte à traduire>\n\nExemple : `.translate en Bonjour tout le monde`"
      },
      { quoted: msg }
    );
  }

  const targetLang = args[0].toLowerCase();
  const textToTranslate = args.slice(1).join(" ");

  try {
    const translated = await translateText(textToTranslate, targetLang);
    const responseText = `🌐 *Traduction (${targetLang})*\n\n${translated}`;
    await sock.sendMessage(from, { text: responseText }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(
      from,
      { text: `⚠️ Erreur lors de la traduction : ${err.message}` },
      { quoted: msg }
    );
  }
}
