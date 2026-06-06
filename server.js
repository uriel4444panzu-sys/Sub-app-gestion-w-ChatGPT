const fs = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const webPush = require("web-push");

loadDotEnv();

const PORT = Number(process.env.PORT) || 3000;
const REMINDER_DAYS = [7, 3, 1];
const STORE_FILE = path.resolve(process.env.PUSH_STORE_FILE || "data/push-subscriptions.json");
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:subpilot@example.com";
const PUSH_ENABLED = Boolean(PUBLIC_KEY && PRIVATE_KEY);

if (PUSH_ENABLED) {
  webPush.setVapidDetails(VAPID_SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
} else {
  console.warn("Web Push désactivé : renseignez VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY dans .env.");
}

const app = express();
app.use(express.json({ limit: "128kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, pushEnabled: PUSH_ENABLED });
});

app.get("/api/vapid-public-key", (_request, response) => {
  response.json({ enabled: PUSH_ENABLED, publicKey: PUSH_ENABLED ? PUBLIC_KEY : null });
});

app.post("/api/push-subscriptions", async (request, response) => {
  if (!PUSH_ENABLED) {
    response.status(503).json({ ok: false, message: "Web Push n'est pas configuré côté serveur." });
    return;
  }

  const pushSubscription = request.body?.pushSubscription;
  if (!isValidPushSubscription(pushSubscription)) {
    response.status(400).json({ ok: false, message: "Abonnement push invalide." });
    return;
  }

  const store = await loadStore();
  const endpoint = pushSubscription.endpoint;
  const existingClient = store.clients.find((client) => client.endpoint === endpoint);
  const client = existingClient || { endpoint, reminderLog: {} };

  client.pushSubscription = pushSubscription;
  client.subscriptions = sanitizeSubscriptions(request.body?.subscriptions || []);
  client.userAgent = String(request.get("user-agent") || "").slice(0, 240);
  client.updatedAt = new Date().toISOString();

  if (!existingClient) store.clients.push(client);
  await saveStore(store);
  response.json({ ok: true, reminders: REMINDER_DAYS });
});

app.post("/api/push-test", async (request, response) => {
  if (!PUSH_ENABLED) {
    response.status(503).json({ ok: false, message: "Web Push n'est pas configuré côté serveur." });
    return;
  }

  const pushSubscription = request.body?.pushSubscription;
  if (!isValidPushSubscription(pushSubscription)) {
    response.status(400).json({ ok: false, message: "Abonnement push invalide." });
    return;
  }

  await sendPush(pushSubscription, {
    title: "Test SubPilot 🔔",
    body: "Les vraies notifications push Web Push + VAPID sont bien branchées.",
    tag: "subpilot-web-push-test",
    url: "./index.html",
  });
  response.json({ ok: true });
});

app.delete("/api/push-subscriptions", async (request, response) => {
  const endpoint = request.body?.endpoint;
  if (!endpoint) {
    response.status(400).json({ ok: false, message: "Endpoint manquant." });
    return;
  }

  const store = await loadStore();
  store.clients = store.clients.filter((client) => client.endpoint !== endpoint);
  await saveStore(store);
  response.json({ ok: true });
});

app.use("/data", (_request, response) => response.status(404).end());
app.use(express.static(process.cwd(), { dotfiles: "ignore" }));

app.listen(PORT, () => {
  console.log(`SubPilot disponible sur http://localhost:${PORT}`);
  console.log(PUSH_ENABLED ? "Web Push VAPID activé." : "Web Push VAPID désactivé tant que les clés ne sont pas configurées.");
});

setInterval(checkScheduledReminders, 60 * 60 * 1000);
checkScheduledReminders();

async function checkScheduledReminders() {
  if (!PUSH_ENABLED) return;

  const store = await loadStore();
  let changed = false;

  for (const client of store.clients) {
    for (const subscription of client.subscriptions || []) {
      const daysBefore = getDaysUntil(subscription.nextDate);
      if (!REMINDER_DAYS.includes(daysBefore)) continue;

      const logKey = `${subscription.id}:${subscription.nextDate}:J-${daysBefore}`;
      if (client.reminderLog?.[logKey]) continue;

      try {
        await sendPush(client.pushSubscription, buildReminderPayload(subscription, daysBefore, logKey));
        client.reminderLog ||= {};
        client.reminderLog[logKey] = new Date().toISOString();
        changed = true;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          client.expired = true;
          changed = true;
        } else {
          console.error("Erreur d'envoi Web Push", error);
        }
      }
    }
  }

  const activeClients = store.clients.filter((client) => !client.expired);
  if (activeClients.length !== store.clients.length) {
    store.clients = activeClients;
    changed = true;
  }

  if (changed) await saveStore(store);
}

function buildReminderPayload(subscription, daysBefore, tag) {
  return {
    title: `${subscription.emoji || "🔔"} ${subscription.name} se renouvelle bientôt`,
    body: `${formatMoney(subscription.price, subscription.currency)} · renouvellement dans ${daysBefore} jour${daysBefore > 1 ? "s" : ""}.`,
    tag,
    url: "./index.html",
  };
}

function sendPush(pushSubscription, payload) {
  return webPush.sendNotification(pushSubscription, JSON.stringify(payload));
}

function isValidPushSubscription(pushSubscription) {
  return Boolean(pushSubscription?.endpoint && pushSubscription?.keys?.p256dh && pushSubscription?.keys?.auth);
}

function sanitizeSubscriptions(subscriptions) {
  return subscriptions
    .filter((subscription) => subscription?.id && subscription?.name && subscription?.nextDate)
    .slice(0, 200)
    .map((subscription) => ({
      id: String(subscription.id).slice(0, 120),
      name: String(subscription.name).slice(0, 120),
      price: Number(subscription.price) || 0,
      currency: String(subscription.currency || "EUR").slice(0, 8),
      frequency: String(subscription.frequency || "monthly").slice(0, 24),
      category: String(subscription.category || "Autre").slice(0, 80),
      emoji: String(subscription.emoji || "🔔").slice(0, 12),
      nextDate: String(subscription.nextDate).slice(0, 10),
    }));
}

async function loadStore() {
  try {
    return JSON.parse(await fs.readFile(STORE_FILE, "utf8"));
  } catch {
    return { clients: [] };
  }
}

async function saveStore(store) {
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2));
}

function getDaysUntil(dateValue) {
  const target = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86_400_000);
}

function formatMoney(amount, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function loadDotEnv() {
  try {
    const envPath = path.resolve(".env");
    const content = require("node:fs").readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      process.env[key.trim()] ||= valueParts.join("=").trim().replace(/^['\"]|['\"]$/g, "");
    }
  } catch {
    // Le fichier .env est optionnel : les variables peuvent venir de l'hébergeur.
  }
}
