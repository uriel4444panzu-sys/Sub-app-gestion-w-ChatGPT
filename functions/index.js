// Cloud Function planifiée : envoie des rappels push avant le renouvellement
// de chaque abonnement (J-7, J-3, J-1) à tous les appareils enregistrés.
//
// Déploiement (nécessite le plan Blaze) :
//   cd functions && npm install
//   firebase deploy --only functions
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();
const REMINDER_DAYS = [7, 3, 1];

// Relance « retour testeur » : X jours après la création du compte, on invite
// l'utilisateur (une seule fois) à remplir le formulaire de retour.
const FEEDBACK_FORM_URL = "https://forms.gle/vZqEUfvrUgtBseyS7";
const FEEDBACK_DELAY_DAYS = 14;

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

exports.sendFeedbackRequests = onSchedule(
  { schedule: "every day 09:00", timeZone: "Europe/Paris" },
  async () => {
    logger.info("sendFeedbackRequests — relance retour testeur (J+" + FEEDBACK_DELAY_DAYS + ")");
    const userRefs = await db.collection("users").listDocuments();
    logger.info(`Vérification des retours pour ${userRefs.length} utilisateur(s).`);
    for (const userRef of userRefs) {
      try {
        await processFeedback(userRef.id);
      } catch (error) {
        logger.error(`Échec de la relance retour pour ${userRef.id}`, error);
      }
    }
  },
);

async function processFeedback(uid) {
  const [messagingSnap, feedbackSnap] = await Promise.all([
    db.doc(`users/${uid}/messaging/web`).get(),
    db.doc(`users/${uid}/data/feedback`).get(),
  ]);

  // Déjà demandé (in-app ou push) : on n'insiste pas.
  if (feedbackSnap.exists && feedbackSnap.data().requested === true) return;

  const tokens = messagingSnap.exists ? messagingSnap.data().tokens || [] : [];
  if (!tokens.length) return; // pas de push possible sans appareil enregistré

  // Âge du compte via la date de création Firebase Auth.
  let creationTime;
  try {
    const record = await getAuth().getUser(uid);
    creationTime = record.metadata && record.metadata.creationTime;
  } catch (error) {
    return; // compte introuvable / supprimé
  }
  if (!creationTime) return;
  const ageDays = daysSince(creationTime);
  if (ageDays < FEEDBACK_DELAY_DAYS) return;

  await sendFeedbackPush(uid, tokens);
  await db.doc(`users/${uid}/data/feedback`).set(
    { requested: true, channel: "push", requestedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

async function sendFeedbackPush(uid, tokens) {
  const message = {
    notification: {
      title: "Ton avis compte 💬",
      body: "Ça fait 2 semaines que tu utilises SubPilot 🙌 Donne ton avis en 2 min, merci !",
    },
    webpush: {
      fcmOptions: { link: FEEDBACK_FORM_URL },
      notification: { icon: "./assets/icon.svg" },
    },
    tokens,
  };

  const response = await getMessaging().sendEachForMulticast(message);
  logger.info(`Relance retour : ${response.successCount}/${tokens.length} envoyée(s) pour ${uid}.`);

  const staleTokens = [];
  response.responses.forEach((result, index) => {
    if (result.success) return;
    const code = result.error?.code || "";
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

function daysSince(dateValue) {
  const created = new Date(dateValue);
  if (Number.isNaN(created.getTime())) return -1;
  return Math.floor((Date.now() - created.getTime()) / 86_400_000);
}

function formatPrice(amount, currency = "EUR") {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(Number(amount) || 0);
  } catch {
    return `${Number(amount) || 0} ${currency}`;
  }
}
