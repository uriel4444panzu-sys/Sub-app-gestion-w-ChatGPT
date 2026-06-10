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
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
};
