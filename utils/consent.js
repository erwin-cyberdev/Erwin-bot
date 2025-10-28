// consent.js
import fs from 'fs';
import path from 'path';

// Chemin du fichier JSON pour stocker les consentements
const DATA_FILE = path.resolve('./data/consent.json');

// Charger les consentements depuis le fichier au démarrage
let optedInUsers = new Set();
try {
    if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        if (Array.isArray(data)) optedInUsers = new Set(data);
    }
} catch (err) {
    console.error('Erreur lors du chargement des consentements :', err);
}

// Fonction pour sauvegarder les consentements
function saveConsent() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(Array.from(optedInUsers), null, 2));
    } catch (err) {
        console.error('Erreur lors de la sauvegarde des consentements :', err);
    }
}

/**
 * Vérifie si un numéro a donné son consentement
 * @param {string} userId 
 * @returns {boolean}
 */
export function isOptedIn(userId) {
    return optedInUsers.has(userId);
}

/**
 * Ajoute un numéro à la liste des consentements
 * @param {string} userId 
 */
export function optIn(userId) {
    optedInUsers.add(userId);
    saveConsent();
}

/**
 * Retire un numéro de la liste des consentements
 * @param {string} userId 
 */
export function optOut(userId) {
    optedInUsers.delete(userId);
    saveConsent();
}

/**
 * Liste tous les numéros ayant donné leur consentement
 * @returns {string[]}
 */
export function listOptedInUsers() {
    return Array.from(optedInUsers);
}

/**
 * Supprime tous les consentements (reset)
 */
export function resetConsent() {
    optedInUsers.clear();
    saveConsent();
}
