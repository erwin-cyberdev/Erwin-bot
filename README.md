# Erwin-Bot

Erwin-Bot est un bot WhatsApp multifonctions basé sur [Baileys](https://github.com/WhiskeySockets/Baileys). Il apporte modération, automatisation, outils communautaires et intégrations IA pour animer vos groupes en toute sécurité.

---

## ✨ Fonctionnalités clés
- **Modération** : anti-liens, anti-delete, bannissements, warns, mute/unmute.
- **Automatisation** : messages de bienvenue/d’au revoir (`{user}`, `{group}`), auto-ping configurable pour maintenir la session active.
- **Médias & IA** : génération de stickers, téléchargement YouTube/audio, `vision` IA, TTS avec `.say`, IA Gemini via `.ai`.
- **Outils communautaires** : sondages, trivia, quote, tagall, reminders personnalisés (suggestion).
- **Personnalisation** : préfixe par chat, menu dynamique, consentement explicite, `MANUEL_UTILISATION.md` pour référence.
- **Sécurité** : rate limiting, contrôle propriétaire/admin, consentement pour l’envoi WhatsApp Cloud.

---

## 📦 Installation

```bash
git clone https://github.com/<votre-compte>/Erwin-Bot.git
cd Erwin-Bot
npm install
cp .env.example .env
```

Configurez ensuite `.env` avec vos informations :
- `OWNER` : numéros propriétaires (séparés par `,`).
- `LOGIN_METHOD` : `qr`, `code` ou `ask`.
- Clés API (`GEMINI_API_KEY`, etc.) selon les options utilisées.

---

## 🚀 Première exécution

```bash
npm run start
```

1. Suivez les instructions pour lier votre WhatsApp (QR ou code à 8 chiffres).
2. Les fichiers de session sont créés dans `auth_info/` (ne pas supprimer).
3. Utilisez `.ping` pour vérifier que le bot répond.

---

## 🔧 Déploiement continu (PM2 recommandé)

```bash
sudo npm install -g pm2
pm2 start npm --name erwin-bot -- run start
pm2 save
pm2 startup systemd   # exécuter la commande affichée
```

- **Logs** : `pm2 logs erwin-bot`
- **Redémarrage** : `pm2 restart erwin-bot`
- **Mise à jour** : `git pull && npm install && pm2 restart erwin-bot`

---

## 📂 Arborescence principale

```
Erwin-Bot/
├─ commands/              # Commandes .js (ping, disclaimer, médias, modération…)
├─ handlers/              # Gestionnaires d’événements (welcome/goodbye, anti-delete…)
├─ utils/                 # Rate limiting, permissions, autoPing, message queue…
├─ data/                  # Config persistante (admins, autoping, filtres…)
├─ assets/                # Visuels (menu, logo)
├─ auth_info/             # Identifiants de session WhatsApp (crucial)
├─ MANUEL_UTILISATION.md  # Documentation détaillée des commandes
└─ index.js               # Point d’entrée / bootstrap Baileys
```

---

## 🧠 Commandes populaires

| Commande | Rôle | Description |
|----------|------|-------------|
| `.menu` | Tous | Affiche la liste dynamique des commandes, triées par rôle. |
| `.ping` | Tous | Vérifie la réactivité du bot. |
| `.disclaimer` | Tous | Affiche l’avertissement légal et les conditions d’utilisation. |
| `.setwelcome <message|off>` | Admin | Configure le message de bienvenue (`{user}`, `{group}`). |
| `.setgoodbye <message|off>` | Admin | Message de départ personnalisé avec mention automatique. |
| `.autoping on/off` | Owner | Active un ping périodique pour maintenir la session WhatsApp. |
| `.securitystats` | Owner | Indicateurs de sécurité et anti-abus. |
| `.say [lang|ai] <texte>` | Tous | Transforme le texte en audio (gTTS ou mode IA Gemini). |
| `.vision` | Tous | Analyse une image avec l’IA (réponse à une image). |

La liste complète est maintenue dans `MANUEL_UTILISATION.md`.

---

## ⚙️ Auto-ping (maintien de connexion)

- Configuration persistante dans `data/autoping.json`.
- Commande propriétaire `.autoping` :
  - `on/off`
  - `interval <minutes>` (5 à 240)
  - `target <jid>` (par défaut `status@broadcast`)
  - `status` pour l’état actuel

---

## 🔐 Sécurité & bonnes pratiques

- **Permissions** : propriétaires définis via `OWNER` et `utils/permissions.js`. Les commandes sensibles (`.autoping`, `.ban`, `.setadmin`) sont restreintes.
- **Rate limiting** : géré par `utils/rateLimiter.js`.
- **Consentement** : `utils/consent.js` vérifie l’opt-in avant envoi via WhatsApp Cloud.
- **Secrets** : ne pas versionner `.env` ; appliquer `chmod 600 .env`.

---

## 🛠 Maintenance

- Sauvegardez régulièrement `auth_info/`, `data/`, `.env`.
- Purgez `temp/` et `logs/` si la taille gonfle (téléchargements multiples).
- Surveillez l’espace disque et la charge CPU.
- Vérifiez périodiquement les dépendances (`npm outdated`).

---

## 🤝 Contribution

1. Fork du dépôt & création de branche (`feature/ma-fonction`).
2. Respecter le style existant (ESLint/Prettier si configurés).
3. Tester sur un environnement isolé (groupe sandbox).
4. Pull Request avec description claire + captures si fonctionnalités visuelles.

---

## ✅ Roadmap suggérée

- Ajout de commandes utilitaires supplémentaires (todo, reminders, FAQ).
- Intégration d’un système de rôles internes plus fin.
- Dashboard de monitoring (ex. Grafana/Prometheus) pour le serveur hébergeant.

---

## 🛡️ Disclaimer

Utilisez `.disclaimer` pour rappeler :
- Responsable légal = propriétaire du bot.
- Respect des CGU WhatsApp et lois locales.
- Ne pas spammer, harceler, ni stocker des données sans consentement.
- Risque de suspension de numéro en cas d’abus.

---

Made with ❤️ pour la communauté WhatsApp francophone.
