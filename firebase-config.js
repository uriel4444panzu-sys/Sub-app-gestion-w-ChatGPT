<<<<<<< HEAD
=======
// Configuration Firebase publique de SubPilot.
// 1. Créez un projet Firebase.
// 2. Activez Authentication > Email/Password et Google.
// 3. Activez Firestore.
// 4. Remplacez les valeurs ci-dessous par la configuration Web Firebase.
// Ces valeurs identifient le projet Firebase côté client ; ne placez jamais de clé serveur ici.
//
// IMPORTANT : tant que ces valeurs restent vides, SubPilot bascule
// automatiquement en « mode connexion locale ». Vous pouvez créer un compte
// et vous connecter immédiatement ; les données sont alors enregistrées sur
// l'appareil. Renseignez la configuration ci-dessous pour activer la
// synchronisation cloud entre plusieurs appareils.
export const firebaseConfig = {
  apiKey: "AIzaSyDHJToTW_c22GvBniopKdL6JVcQ_1qYl1E",
  authDomain: "subpilot-bd743.firebaseapp.com",
  projectId: "subpilot-bd743",
  messagingSenderId: "151154301775",
  appId: "1:151154301775:web:43656447524294aecd433a",
};
>>>>>>> 07a576d5452be59836e9bf5f2f82143c4fdfdc81

// Clé « Web Push certificate » (paire de clés VAPID) pour les notifications push.
// À générer dans la console Firebase :
//   Paramètres du projet > Cloud Messaging > Web configuration > Générer une paire de clés.
// Copiez ici la clé publique. Tant qu'elle reste vide, les notifications push
// sont simplement désactivées (le reste de l'app fonctionne normalement).
export const firebaseVapidKey = "BIKluutCg9oEWmpIVy7PuO_I4Xs3jJJJW78ugefknn34sY9qyusEtrVfr";
