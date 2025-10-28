# Manuel d'utilisation — Erwin-Bot

## Informations générales
- **Préfixe par défaut** : `.` (modifiable via la commande `.setprefix`).
- **Notation** : chaque commande se lance sous la forme `<préfixe><nom>`, par exemple `.ping`.
- **Mention des membres** : utilisez `@numero` pour signaler un membre (dans les groupes).
- **Rôles** :
  - **Utilisateur** : toute personne ayant accès au bot.
  - **Admin** : administrateur du groupe WhatsApp.
  - **Propriétaire** : propriétaire du bot (identifié dans la configuration interne).

## Commandes Utilisateurs
- **.advice** — Recevoir un conseil aléatoire.
- **.ai <prompt>** — Utiliser l’assistant IA Gemini avec un prompt.
- **.anime <titre>** — Chercher des informations sur un anime.
- **.animequiz** — Lancer un quiz sur les animes.
- **.animequote** — Afficher une citation d’anime.
- **.animeseason [année] [saison]** — Lister les animes d’une saison (par défaut saison en cours).
- **.birthday <JJ/MM> [nom]** — Afficher le compte à rebours avant une date spéciale.
- **.calc <expression>** — Résoudre une expression mathématique (ex : `.calc 5*(3+2)`).
- **.coin** — Lancer une pièce (pile ou face).
- **.crypto <symbole>** — Consulter le prix d’une cryptomonnaie (ex : `.crypto BTC`).
- **.define <mot>** — Afficher la définition d’un mot.
- **.dice** — Lancer un dé virtuel.
- **.extract** — Sauvegarder un média à lecture unique (répondre au média avec la commande).
- **.fact** — Découvrir un fait insolite.
- **.imagine <prompt>** — Générer une image via l’IA.
- **.info** — Afficher les informations du bot.
- **.joke** — Recevoir une blague aléatoire.
- **.lyrics <titre>** — Obtenir les paroles d’une chanson.
- **.manga <titre>** — Chercher des informations sur un manga.
- **.meme** — Envoyer un meme aléatoire.
- **.menu** — Afficher la liste complète des commandes.
- **.meteo <ville>** — Consulter la météo d’une ville.
- **.movie <titre>** — Afficher la fiche d’un film.
- **.perso <nom_du_template> [paramètres]** — Envoyer un message personnalisé préconfiguré.
- **.ping** — Tester la réactivité du bot.
- **.poll <question>|<choix1>|<choix2>...** — Créer un sondage interactif.
- **.pp <@membre|self>** — Récupérer une photo de profil.
- **.qrcode <texte|url>** — Générer un QR code.
- **.quote** — Afficher une citation inspirante.
- **.roulette** — Jouer à la roulette russe virtuelle.
- **.say <texte>** — Convertir du texte en audio.
- **.ship <nom1> <nom2>** — Estimer l’affinité entre deux membres.
- **.shorten <url>** — Raccourcir une URL.
- **.song <titre|lien YouTube>** — Télécharger une chanson depuis YouTube.
- **.sticker** — Créer un sticker (répondre à une image/vidéo ou fournir une pièce jointe).
- **.tictactoe <@adversaire>** — Jouer au morpion avec un membre.
- **.time <ville>** — Afficher l’heure locale d’une ville.
- **.translate <langue> | <texte>** — Traduire un texte vers une autre langue (ex : `.translate en | Bonjour`).
- **.trivia** — Participer à un quiz généraliste.
- **.vision** — Analyser une image avec l’IA (répondre à l’image).
- **.vote <question>** — Créer un vote rapide sous forme de boutons.
- **.wallpaper <mot-clé>** — Trouver un fond d’écran HD.
- **.yt <url>** — Télécharger une vidéo YouTube.

## Commandes Admin (réservées aux administrateurs du groupe)
- **.add <numéro>** — Ajouter un membre au groupe.
- **.antibot <on|off>** — Activer/désactiver la protection anti-bot.
- **.antidelete <on|off>** — Empêcher la suppression des messages.
- **.antilink <on|off>** — Bloquer automatiquement les liens.
- **.clear <nombre>** — Supprimer les derniers messages.
- **.filter <action> <mot|réponse>** — Gérer les filtres automatiques (`add`, `del`, `list`).
- **.kick <@membre>** — Expulser un membre du groupe.
- **.mute <@membre> <durée>** — Mettre un membre en mode muet.
- **.purge <@membre>** — Supprimer les messages d’un membre.
- **.setgoodbye <message|off>** — Configurer le message d’au revoir automatique.
- **.setwelcome <message|off>** — Configurer le message de bienvenue automatique.
- **.tagall [message]** — Mentionner tous les membres du groupe.
- **.unmute <@membre>** — Réactiver un membre mis en sourdine.
- **.unwarn <@membre>** — Retirer un avertissement.
- **.warn <@membre> [raison]** — Attribuer un avertissement.
- **.warns <@membre>** — Consulter les avertissements d’un membre.

## Commandes Propriétaire (réservées au propriétaire du bot)
- **.ban <@membre|numéro>** — Bannir un utilisateur de toutes les commandes.
- **.botstats** — Afficher les statistiques internes du bot.
- **.broadcast <message>** — Diffuser un message à tous les chats.
- **.listadmins** — Lister les administrateurs enregistrés du bot.
- **.listbanned** — Afficher les utilisateurs bannis.
- **.rmadmin <numéro>** — Retirer un administrateur du bot.
- **.securitystats** — Consulter les statistiques de sécurité.
- **.setadmin <numéro>** — Ajouter un administrateur au bot.
- **.setprefix <préfixe>** — Modifier le préfixe global des commandes.
- **.unban <@membre|numéro>** — Réhabiliter un utilisateur banni.

## Conseils d'utilisation
- **Permissions** : le bot vérifie automatiquement si l’utilisateur possède les droits requis. Les commandes refusées renvoient un message explicatif.
- **Réponses contextuelles** : certaines commandes doivent être envoyées en réponse à un message (ex : `.sticker`, `.extract`).
- **Limites** : certaines opérations (téléchargements, IA) peuvent prendre quelques secondes. Patientez avant de relancer la commande.
- **Sécurité** : les commandes sensibles (`.ban`, `.setprefix`, etc.) sont réservées au propriétaire défini dans la configuration (`permissions.js`).

Ce manuel peut être mis à jour si de nouvelles commandes sont ajoutées ou si les fonctionnalités évoluent.
