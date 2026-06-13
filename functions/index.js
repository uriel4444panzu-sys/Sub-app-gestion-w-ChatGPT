// Cloud Function planifiée : envoie des rappels push avant le renouvellement
// de chaque abonnement (J-7, J-3, J-1) à tous les appareils enregistrés.
//
// Déploiement (nécessite le plan Blaze) :
//   cd functions && npm install
//   firebase deploy --only functions
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();
const REMINDER_DAYS = [7, 3, 1];

exports.sendRenewalReminders = onSchedule(
  { schedule: "every day 08:00", timeZone: "Europe/Paris" },
  async () => {
    logger.info("sendRenewalReminders v2 — listDocuments");
    // `listDocuments()` renvoie aussi les documents « fantômes » (un compte
    // users/{uid} qui ne contient que des sous-collections data/messaging
    // n'apparaît PAS dans un simple collection("users").get()).
    const userRefs = await db.collection("users").listDocuments();
    logger.info(`Vérification des renouvellements pour ${userRefs.length} utilisateur(s).`);
    for (const userRef of userRefs) {
      try {
        await processUser(userRef.id);
      } catch (error) {
        logger.error(`Échec du traitement de ${userRef.id}`, error);
      }
    }
  },
);

async function processUser(uid) {
  const [appSnap, messagingSnap] = await Promise.all([
    db.doc(`users/${uid}/data/app`).get(),
    db.doc(`users/${uid}/messaging/web`).get(),
  ]);
  if (!appSnap.exists || !messagingSnap.exists) return;

  const subscriptions = appSnap.data().subscriptions || [];
  const tokens = messagingSnap.data().tokens || [];
  if (!tokens.length) return;

  for (const subscription of subscriptions) {
    const days = daysUntil(subscription.nextDate);
    if (!REMINDER_DAYS.includes(days)) continue;
    await sendReminder(uid, tokens, subscription, days);
  }
}

async function sendReminder(uid, tokens, subscription, days) {
  const message = {
    notification: {
      title: `${subscription.name} se renouvelle bientôt`,
      body: `${formatPrice(subscription.price, subscription.currency)} · renouvellement dans ${days} jour${days > 1 ? "s" : ""}.`,
    },
    webpush: {
      fcmOptions: { link: "./index.html" },
      notification: { icon: "./assets/icon.svg" },
    },
    tokens,
  };

  const response = await getMessaging().sendEachForMulticast(message);
  logger.info(`Rappel « ${subscription.name} » : ${response.successCount}/${tokens.length} envoyé(s) pour ${uid}.`);

  // Nettoyage des jetons invalides (appareils désinscrits) + journalisation du
  // motif d'échec pour diagnostiquer les non-réceptions.
  const staleTokens = [];
  response.responses.forEach((result, index) => {
    if (result.success) return;
    const code = result.error?.code || "";
    logger.warn(`Échec d'envoi (${subscription.name}) : code="${code}" message="${result.error?.message || ""}"`);
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-argument" ||
      code === "messaging/invalid-registration-token"
    ) {
      staleTokens.push(tokens[index]);
    }
  });

  if (staleTokens.length) {
    await db.doc(`users/${uid}/messaging/web`).set(
      { tokens: FieldValue.arrayRemove(...staleTokens) },
      { merge: true },
    );
  }
}

function daysUntil(dateValue) {
  const target = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(target.getTime())) return -1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86_400_000);
}

function formatPrice(amount, currency = "EUR") {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(Number(amount) || 0);
  } catch {
    return `${Number(amount) || 0} ${currency}`;
  }
}
