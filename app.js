const STORAGE_KEY = "subpilot-subscriptions";
const BUDGET_KEY = "subpilot-monthly-budget";
const CUSTOM_CATEGORIES_KEY = "subpilot-custom-categories";
const REMEMBERED_PROFILE_KEY = "subpilot-remembered-profile";
const CALENDAR_REMINDER_DAYS = [7, 3, 1];
const FIREBASE_SDK_VERSION = "12.7.0";
const MINIMUM_ACCOUNT_AGE = 13;
const FREQUENCY_STEPS = { weekly: 7, monthly: 1, quarterly: 3, yearly: 12 };
const CALENDAR_ALERT_HOUR = 8;
const CALENDAR_EVENT_DURATION_MINUTES = 15;

let deferredInstallPrompt = null;
let firebaseState = {
  ready: false,
  configured: false,
  user: null,
  profile: null,
  auth: null,
  db: null,
  modules: null,
  error: null,
};
let syncInProgress = false;
let pendingAuthMode = "signup";

const defaultCategories = [
  { name: "Streaming", icon: "TV", color: "#7c3aed" },
  { name: "Musique", icon: "AU", color: "#ec4899" },
  { name: "Logiciels", icon: "SW", color: "#2563eb" },
  { name: "Productivité", icon: "PR", color: "#14b8a6" },
  { name: "Sport", icon: "SP", color: "#f97316" },
  { name: "Jeux", icon: "GM", color: "#8b5cf6" },
  { name: "Maison", icon: "HM", color: "#0f766e" },
  { name: "Presse", icon: "NS", color: "#64748b" },
  { name: "Éducation", icon: "ED", color: "#0891b2" },
  { name: "Transport", icon: "TR", color: "#dc2626" },
  { name: "Santé", icon: "MD", color: "#16a34a" },
  { name: "Télécom", icon: "5G", color: "#0ea5e9" },
  { name: "Cloud", icon: "CL", color: "#6366f1" },
  { name: "IA", icon: "AI", color: "#9333ea" },
  { name: "Livraison", icon: "DL", color: "#ea580c" },
  { name: "Sécurité", icon: "SC", color: "#0f172a" },
  { name: "Finance", icon: "€", color: "#15803d" },
  { name: "Photo", icon: "PX", color: "#db2777" },
  { name: "Rencontre", icon: "♡", color: "#e11d48" },
  { name: "Autre", icon: "+", color: "#475569" },
];

let categories = [...defaultCategories, ...loadCustomCategories()];

const popularServices = [
  { name: "Netflix", price: 13.49, category: "Streaming", serviceIcon: "NF" },
  { name: "Spotify", price: 10.99, category: "Musique", serviceIcon: "SP" },
  { name: "Amazon Prime", price: 6.99, category: "Streaming", serviceIcon: "AP" },
  { name: "Disney+", price: 8.99, category: "Streaming", serviceIcon: "D+" },
  { name: "Canva Pro", price: 11.99, category: "Productivité", serviceIcon: "CV" },
  { name: "iCloud+", price: 2.99, category: "Cloud", serviceIcon: "iC" },
  { name: "Adobe", price: 19.99, category: "Logiciels", serviceIcon: "AD" },
  { name: "Salle de sport", price: 29.99, category: "Sport", serviceIcon: "GY" },
  { name: "Game Pass", price: 14.99, category: "Jeux", serviceIcon: "GP" },
  { name: "Notion", price: 9.5, category: "Productivité", serviceIcon: "NT" },
  { name: "ChatGPT", price: 22.99, category: "IA", serviceIcon: "AI" },
  { name: "YouTube Premium", price: 12.99, category: "Streaming", serviceIcon: "YT" },
];

const frequencyLabels = {
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  yearly: "Annuel",
};

const priorityLabels = {
  keep: "À garder",
  review: "À réévaluer",
  cancel: "À résilier",
};

const demoSubscriptions = [
  createSubscription({
    name: "Netflix",
    price: 13.49,
    frequency: "monthly",
    category: "Streaming",
    nextDate: getDateInDays(4),
    priority: "keep",
    note: "Utilisé plusieurs soirs par semaine.",
  }),
  createSubscription({
    name: "Salle de sport",
    price: 29.99,
    frequency: "monthly",
    category: "Sport",
    nextDate: getDateInDays(11),
    priority: "review",
    note: "Vérifier si la fréquentation reste suffisante.",
  }),
  createSubscription({
    name: "Stockage cloud",
    price: 99,
    frequency: "yearly",
    category: "Productivité",
    nextDate: getDateInDays(24),
    priority: "keep",
    note: "Sauvegardes téléphone et ordinateur.",
  }),
];

const form = document.querySelector("#subscriptionForm");
const resetButton = document.querySelector("#resetButton");
const submitButton = document.querySelector("#submitButton");
const searchInput = document.querySelector("#searchInput");
const emptyStateTemplate = document.querySelector("#emptyStateTemplate");
const installCard = document.querySelector("#installCard");
const installButton = document.querySelector("#installButton");
const installHelp = document.querySelector("#installHelp");
const budgetInput = document.querySelector("#budgetInput");
const saveBudgetButton = document.querySelector("#saveBudgetButton");
const simulationPrice = document.querySelector("#simulationPrice");
const simulationFrequency = document.querySelector("#simulationFrequency");
const categorySelect = document.querySelector("#category");
const serviceIconInput = document.querySelector("#serviceIcon");
const customCategoryPanel = document.querySelector("#customCategoryPanel");
const customCategoryNameInput = document.querySelector("#customCategoryName");
const customCategoryIconInput = document.querySelector("#customCategoryIcon");
const customCategoryColorInput = document.querySelector("#customCategoryColor");
const customIconButtons = document.querySelectorAll("[data-custom-icon]");
const mailImportConsent = document.querySelector("#mailImportConsent");
const mailImportStatus = document.querySelector("#mailImportStatus");
const signOutButton = document.querySelector("#signOutButton");
const syncNowButton = document.querySelector("#syncNowButton");
const accountStatus = document.querySelector("#accountStatus");
const authQuickProfile = document.querySelector("#authQuickProfile");
const authQuickAvatar = document.querySelector("#authQuickAvatar");
const authQuickName = document.querySelector("#authQuickName");
const authQuickEmail = document.querySelector("#authQuickEmail");
const quickLoginButton = document.querySelector("#quickLoginButton");
const profileAvatar = document.querySelector("#profileAvatar");
const profileName = document.querySelector("#profileName");
const profileEmail = document.querySelector("#profileEmail");
const profileFirstName = document.querySelector("#profileFirstName");
const profileLastName = document.querySelector("#profileLastName");
const profileGender = document.querySelector("#profileGender");
const profileBirthDate = document.querySelector("#profileBirthDate");
const profileProvider = document.querySelector("#profileProvider");
const profilePhotoStatus = document.querySelector("#profilePhotoStatus");
const avatarFileInput = document.querySelector("#avatarFileInput");
const avatarCameraInput = document.querySelector("#avatarCameraInput");
const avatarUploadButton = document.querySelector("#avatarUploadButton");
const avatarCameraButton = document.querySelector("#avatarCameraButton");
const authGate = document.querySelector("#authGate");
const appShell = document.querySelector("#appShell");
const authStatus = document.querySelector("#authStatus");
const signupForm = document.querySelector("#signupForm");
const loginForm = document.querySelector("#loginForm");
const authModeButtons = document.querySelectorAll("[data-auth-mode]");
const authGoogleButton = document.querySelector("#authGoogleButton");
const forgotPasswordButton = document.querySelector("#forgotPasswordButton");

const loadedSubscriptions = loadSubscriptions();
const normalizedSubscriptions = normalizeSubscriptions(loadedSubscriptions);
let subscriptions = normalizedSubscriptions.items;
let monthlyBudget = loadBudget();
let activeTab = "dashboard";

hydrateCategorySelect();
renderCategoryLegend();
renderPopularServices();
renderAccountStatus();
initializeFirebaseAuth();
if (normalizedSubscriptions.changed) saveSubscriptions();

form.addEventListener("submit", handleSubmit);
resetButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderSubscriptions);
saveBudgetButton.addEventListener("click", saveBudget);
simulationPrice.addEventListener("input", renderBudget);
simulationFrequency.addEventListener("change", renderBudget);
installButton.addEventListener("click", installApp);
categorySelect.addEventListener("change", handleCategoryChange);
serviceIconInput.addEventListener("input", () => normalizeIconInput(serviceIconInput));
customCategoryIconInput.addEventListener("input", () => normalizeIconInput(customCategoryIconInput));
customIconButtons.forEach((button) => {
  button.addEventListener("click", () => selectCustomIcon(button.dataset.customIcon));
});
mailImportConsent.addEventListener("change", updateMailImportStatus);
signOutButton.addEventListener("click", handleSignOut);
syncNowButton.addEventListener("click", handleSyncNow);
quickLoginButton.addEventListener("click", handleQuickLogin);
avatarUploadButton.addEventListener("click", () => avatarFileInput.click());
avatarCameraButton.addEventListener("click", () => avatarCameraInput.click());
avatarFileInput.addEventListener("change", handleAvatarSelection);
avatarCameraInput.addEventListener("change", handleAvatarSelection);
signupForm.addEventListener("submit", handleSignupSubmit);
loginForm.addEventListener("submit", handleLoginSubmit);
authGoogleButton.addEventListener("click", handleGoogleSignIn);
forgotPasswordButton.addEventListener("click", handlePasswordReset);
authModeButtons.forEach((button) => {
  button.addEventListener("click", () => switchAuthMode(button.dataset.authMode));
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

document.querySelectorAll("[data-tab-target]").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tabTarget));
});

setupInstallExperience();
registerServiceWorker();
resetForm();
render();

function setupInstallExperience() {
  if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
    installCard.hidden = true;
    return;
  }

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIos) {
    installButton.hidden = true;
    installHelp.textContent = "Sur iPhone, touchez Partager puis “Sur l’écran d’accueil” pour installer SubPilot.";
    return;
  }

  installButton.disabled = true;
  installHelp.textContent = "Quand votre navigateur le propose, le bouton Installer permettra d’ajouter SubPilot à votre écran d’accueil.";

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.disabled = false;
    installHelp.textContent = "SubPilot est prêt : installez-le pour le retrouver comme une vraie application.";
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installCard.hidden = true;
  });
}

async function installApp() {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.disabled = true;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !["http:", "https:"].includes(window.location.protocol)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      installHelp.textContent = "L'installation nécessite une ouverture via localhost ou HTTPS.";
    });
  });
}

function initializeFirebaseAuth() {
  loadFirebaseServices()
    .then((services) => {
      if (!services.configured) {
        firebaseState = { ...firebaseState, ready: true, configured: false, error: null };
        renderAccountStatus();
        return;
      }

      const app = services.appModule.initializeApp(services.config);
      const auth = services.authModule.getAuth(app);
      const db = services.firestoreModule.getFirestore(app);
      const provider = new services.authModule.GoogleAuthProvider();

      firebaseState = {
        ready: true,
        configured: true,
        user: null,
        profile: null,
        auth,
        db,
        modules: { ...services.authModule, ...services.firestoreModule, provider },
        error: null,
      };

      services.authModule.onAuthStateChanged(auth, handleFirebaseUserChange);
      renderAccountStatus();
    })
    .catch((error) => {
      firebaseState = { ...firebaseState, ready: true, configured: false, error };
      accountStatus.textContent = `Firebase n'a pas pu démarrer : ${getFriendlyFirebaseError(error)}.`;
      renderAccountStatus();
    });
}

function loadFirebaseServices() {
  return import("./firebase-config.js").then((configModule) => {
    const config = configModule.firebaseConfig || {};
    const configured = ["apiKey", "authDomain", "projectId", "appId"].every((key) => Boolean(config[key]));
    if (!configured) return { configured, config };

    return Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`),
    ]).then(([appModule, authModule, firestoreModule]) => ({ configured, config, appModule, authModule, firestoreModule }));
  });
}

function handleFirebaseUserChange(user) {
  firebaseState.user = user;

  if (!user) {
    firebaseState.profile = null;
    clearDisplayedAccountData();
    renderAccountStatus();
    return;
  }

  loadCloudData().catch((error) => {
    renderAccountStatus(getFriendlyFirebaseError(error));
  });
}

async function loadCloudData() {
  if (!firebaseState.configured || !firebaseState.user) return;

  setAccountStatus("Synchronisation du compte en cours…");
  setAuthStatus("Connexion réussie, chargement de vos données…");
  const profile = await loadUserProfile(firebaseState.user);
  firebaseState.profile = profile;
  rememberProfile(profile);
  renderProfile(profile);

  const { doc, getDoc } = firebaseState.modules;
  const reference = doc(firebaseState.db, "users", firebaseState.user.uid, "data", "app");
  const snapshot = await getDoc(reference);
  const cloudData = snapshot.exists() ? snapshot.data() : createEmptyAccountData();
  const localData = readLocalAppData();
  const hasLocalData = hasMeaningfulLocalData(localData);

  if (hasLocalData) {
    const shouldImport = window.confirm(
      "Des données locales ont été trouvées sur cet appareil. Voulez-vous les importer dans ce compte ?",
    );

    if (shouldImport) {
      applyAccountData(localData);
      await syncCloudData("Données locales importées dans votre compte.");
      return;
    }
  }

  applyAccountData(cloudData);
  renderAccountStatus(snapshot.exists() ? "Compte synchronisé avec le cloud." : "Compte connecté. Aucun abonnement cloud pour le moment.");
}

function readLocalAppData() {
  return {
    subscriptions: parseJson(localStorage.getItem(STORAGE_KEY), []).map((item) => createSubscription(item)),
    monthlyBudget: Number(localStorage.getItem(BUDGET_KEY)) || 120,
    customCategories: parseJson(localStorage.getItem(CUSTOM_CATEGORIES_KEY), []).map((category) => ({
      name: category.name,
      icon: normalizeIconText(category.icon, getServiceInitials(category.name)),
      color: normalizeColor(category.color),
      custom: true,
    })),
  };
}

function createEmptyAccountData() {
  return { subscriptions: [], monthlyBudget: 120, customCategories: [] };
}

function hasMeaningfulLocalData(data) {
  return Boolean(
    data.subscriptions.length ||
      data.customCategories.length ||
      localStorage.getItem(BUDGET_KEY),
  );
}

function applyAccountData(data) {
  subscriptions = (data.subscriptions || []).map((item) => createSubscription(item));
  monthlyBudget = Number(data.monthlyBudget) || 120;
  categories = [...defaultCategories, ...(data.customCategories || []).map((category) => ({
    name: category.name,
    icon: normalizeIconText(category.icon, getServiceInitials(category.name)),
    color: normalizeColor(category.color),
    custom: true,
  }))];
  hydrateCategorySelect();
  renderCategoryLegend();
  resetForm();
  render();
}

function clearDisplayedAccountData() {
  subscriptions = [];
  monthlyBudget = 120;
  categories = [...defaultCategories, ...loadCustomCategories()];
  hydrateCategorySelect();
  renderCategoryLegend();
  resetForm();
  render();
}

async function syncCloudData(successMessage = "Synchronisation terminée.") {
  if (!firebaseState.configured || !firebaseState.user || syncInProgress) return;

  syncInProgress = true;
  setAccountStatus("Synchronisation en cours…");
  const { doc, setDoc } = firebaseState.modules;
  const reference = doc(firebaseState.db, "users", firebaseState.user.uid, "data", "app");

  try {
    await setDoc(reference, {
      subscriptions,
      monthlyBudget,
      customCategories: categories.filter((category) => category.custom),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    renderAccountStatus(successMessage);
  } catch (error) {
    renderAccountStatus(getFriendlyFirebaseError(error));
  } finally {
    syncInProgress = false;
  }
}

function setAccountStatus(message) {
  accountStatus.textContent = message;
}

function setAuthStatus(message) {
  authStatus.textContent = message;
}

function normalizeSubscriptions(items) {
  let changed = false;
  const normalizedItems = items.map((item) => {
    const normalizedDate = normalizeNextDate(item.nextDate, item.frequency);
    if (normalizedDate !== item.nextDate) changed = true;
    return { ...item, nextDate: normalizedDate };
  });

  return { items: normalizedItems, changed };
}

function normalizeNextDate(dateValue, frequency = "monthly") {
  const today = getTodayDateOnly();
  const originalDate = parseDateOnly(dateValue);
  if (!originalDate || originalDate >= today) return dateValue;

  if (frequency === "weekly") {
    return formatDateOnly(advanceWeeklyDate(originalDate, today));
  }

  const monthsStep = FREQUENCY_STEPS[frequency] || FREQUENCY_STEPS.monthly;
  return formatDateOnly(advanceMonthlyDate(dateValue, monthsStep, today));
}

function advanceWeeklyDate(originalDate, today) {
  const nextDate = new Date(originalDate);
  while (nextDate < today) {
    nextDate.setDate(nextDate.getDate() + FREQUENCY_STEPS.weekly);
  }
  return nextDate;
}

function advanceMonthlyDate(dateValue, monthsStep, today) {
  let cycles = 1;
  let nextDate = addMonthsClamped(dateValue, monthsStep);

  while (nextDate < today) {
    cycles += 1;
    nextDate = addMonthsClamped(dateValue, monthsStep * cycles);
  }

  return nextDate;
}

function addMonthsClamped(dateValue, monthsToAdd) {
  const parts = parseDateParts(dateValue);
  if (!parts) return getTodayDateOnly();

  const targetMonthIndex = parts.month - 1 + monthsToAdd;
  const targetYear = parts.year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return new Date(targetYear, targetMonth, Math.min(parts.day, lastDay));
}

function getTodayDateOnly() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseDateOnly(dateValue) {
  const parts = parseDateParts(dateValue);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day);
}

function parseDateParts(dateValue) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue || "");
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatDateOnly(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
}

function createCalendarReminderEvents(subscription) {
  const amount = formatMoney(subscription.price, subscription.currency);
  const now = new Date();

  return CALENDAR_REMINDER_DAYS
    .map((daysBefore) => {
      const startDate = getCalendarDateTimeDaysBefore(subscription.nextDate, daysBefore);
      const label = daysBefore === 1 ? "demain" : `dans ${daysBefore} jours`;

      return {
        daysBefore,
        startDate,
        endDate: addMinutes(startDate, CALENDAR_EVENT_DURATION_MINUTES),
        title: `${subscription.name} se renouvelle ${label} - ${amount}`,
      };
    })
    .filter((event) => event.startDate > now);
}

function createCalendarFile(subscription, events) {
  const dtstamp = formatIcsUtcDateTime(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SubPilot//Subscription Calendar Reminders//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((event) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${createCalendarUid(subscription, event)}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatIcsLocalDateTime(event.startDate)}`,
      `DTEND:${formatIcsLocalDateTime(event.endDate)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(`Rappel SubPilot pour ${subscription.name}.`)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:PT0M",
      `DESCRIPTION:${escapeIcsText(event.title)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function downloadCalendarFile(subscriptionId) {
  const subscription = subscriptions.find((item) => item.id === subscriptionId);
  if (!subscription) return;

  const events = createCalendarReminderEvents(subscription);
  if (!events.length) {
    window.alert("Aucun événement J-7, J-3 ou J-1 à ajouter : les dates de rappel sont déjà passées.");
    return;
  }

  const calendarContent = createCalendarFile(subscription, events);
  const blob = new Blob([calendarContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugifyFileName(subscription.name)}-rappels-renouvellement.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function switchTab(tabName) {
  activeTab = tabName;

  document.querySelectorAll(".tab-button").forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const isActive = panel.dataset.panel === tabName;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleSubmit(event) {
  event.preventDefault();

  const editingId = document.querySelector("#subscriptionId").value;
  const selectedCategory = resolveSelectedCategory();
  if (!selectedCategory) return;

  const subscription = createSubscription({
    id: editingId || crypto.randomUUID(),
    name: document.querySelector("#name").value.trim(),
    price: Number(document.querySelector("#price").value),
    currency: document.querySelector("#currency").value,
    frequency: document.querySelector("#frequency").value,
    category: selectedCategory,
    serviceIcon: serviceIconInput.value.trim(),
    nextDate: normalizeNextDate(document.querySelector("#nextDate").value, document.querySelector("#frequency").value),
    priority: document.querySelector("#priority").value,
    note: document.querySelector("#note").value.trim(),
  });

  if (!subscription.name || Number.isNaN(subscription.price)) return;

  if (editingId) {
    subscriptions = subscriptions.map((item) => (item.id === editingId ? subscription : item));
  } else {
    subscriptions = [subscription, ...subscriptions];
  }

  saveSubscriptions();
  resetForm();
  render();
  switchTab(activeTab === "add" ? "dashboard" : activeTab);
}

function resetForm() {
  form.reset();
  document.querySelector("#subscriptionId").value = "";
  document.querySelector("#currency").value = "EUR";
  document.querySelector("#frequency").value = "monthly";
  categorySelect.value = "Streaming";
  serviceIconInput.value = "";
  customCategoryNameInput.value = "";
  customCategoryIconInput.value = "";
  customCategoryColorInput.value = "#4f46e5";
  updateCustomIconButtons();
  handleCategoryChange();
  document.querySelector("#priority").value = "keep";
  document.querySelector("#nextDate").value = getDateInDays(7);
  submitButton.textContent = "Ajouter l'abonnement";
}

function saveBudget() {
  monthlyBudget = Number(budgetInput.value) || 0;
  if (firebaseState.user) {
    syncCloudData();
  } else {
    localStorage.setItem(BUDGET_KEY, String(monthlyBudget));
  }
  renderInsights();
  renderBudget();
}

function loadSubscriptions() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return demoSubscriptions;

  try {
    return JSON.parse(stored).map((item) => createSubscription(item));
  } catch {
    return demoSubscriptions;
  }
}

function saveSubscriptions() {
  if (firebaseState.user) {
    syncCloudData();
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

function loadBudget() {
  return Number(localStorage.getItem(BUDGET_KEY)) || 120;
}
function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}


function render() {
  renderInsights();
  renderCompactList();
  renderBreakdown();
  renderSubscriptions();
  renderBudget();
}

function renderInsights() {
  const monthlyTotal = getMonthlyTotal();
  const nextSubscription = getSortedByDate()[0];
  const topCategory = getCategoryTotals()[0];
  const budgetUsage = monthlyBudget > 0 ? Math.round((monthlyTotal / monthlyBudget) * 100) : 0;

  document.querySelector("#monthlyTotal").textContent = formatMoney(monthlyTotal);
  document.querySelector("#yearlyTotal").textContent = formatMoney(monthlyTotal * 12);
  document.querySelector("#budgetUsageHero").textContent = monthlyBudget ? `${budgetUsage}%` : "-";
  document.querySelector("#nextPayment").textContent = nextSubscription
    ? `${getSubscriptionIcon(nextSubscription)} ${nextSubscription.name} · ${formatRelativeDate(nextSubscription.nextDate)}`
    : "Aucun";
  document.querySelector("#topCategory").textContent = topCategory ? `${topCategory.icon} ${topCategory.category}` : "-";
}

function renderCompactList() {
  const container = document.querySelector("#compactSubscriptionList");
  container.innerHTML = "";
  const items = getSortedByDate().slice(0, 6);

  if (!items.length) {
    container.append(emptyStateTemplate.content.cloneNode(true));
    return;
  }

  items.forEach((subscription) => {
    const card = document.createElement("article");
    card.className = "compact-subscription";
    card.innerHTML = `
      <span class="service-icon" style="--icon-color: ${getSubscriptionIconColor(subscription)}">${escapeHtml(getSubscriptionIcon(subscription))}</span>
      <div>
        <strong>${escapeHtml(subscription.name)}</strong>
        <small>${formatRelativeDate(subscription.nextDate)}</small>
      </div>
      <b>${formatMoney(subscription.price, subscription.currency)}</b>
    `;
    container.append(card);
  });
}

function renderBreakdown() {
  const container = document.querySelector("#categoryBreakdown");
  const totals = getCategoryTotals();
  const maxTotal = totals[0]?.total || 0;
  container.innerHTML = "";

  if (!totals.length) {
    container.append(emptyStateTemplate.content.cloneNode(true));
    return;
  }

  totals.forEach(({ category, total, icon, color }) => {
    const row = document.createElement("article");
    row.className = "category-row";
    row.innerHTML = `
      <header>
        <span><span class="mini-icon" style="--icon-color: ${color}">${escapeHtml(icon)}</span> ${category}</span>
        <strong>${formatMoney(total)} / mois</strong>
      </header>
      <div class="progress-track" aria-hidden="true">
        <div class="progress-bar" style="width: ${(total / maxTotal) * 100}%; background: ${color}"></div>
      </div>
    `;
    container.append(row);
  });
}

function renderSubscriptions() {
  const container = document.querySelector("#subscriptionList");
  const items = getFilteredSubscriptions();
  container.innerHTML = "";

  if (!items.length) {
    container.append(emptyStateTemplate.content.cloneNode(true));
    return;
  }

  items.forEach((subscription) => {
    const card = document.createElement("article");
    card.className = "subscription-card";
    card.innerHTML = `
      <header>
        <span class="service-icon large" style="--icon-color: ${getSubscriptionIconColor(subscription)}">${escapeHtml(getSubscriptionIcon(subscription))}</span>
        <div>
          <h3>${escapeHtml(subscription.name)}</h3>
          <div class="subscription-meta">
            <span>${escapeHtml(subscription.category)}</span>
            <span>•</span>
            <span>${frequencyLabels[subscription.frequency]}</span>
            <span>•</span>
            <span>Renouvellement le ${formatExactDate(subscription.nextDate)}</span>
          </div>
        </div>
        <span class="price-pill">${formatMoney(subscription.price, subscription.currency)}</span>
      </header>
      ${subscription.note ? `<p class="subscription-note">${escapeHtml(subscription.note)}</p>` : ""}
      <div class="card-actions">
        <span class="priority-pill ${subscription.priority}">${priorityLabels[subscription.priority]}</span>
        <button type="button" class="calendar-button" data-action="calendar" data-id="${subscription.id}">Ajouter au calendrier</button>
        <button type="button" class="edit-button" data-action="edit" data-id="${subscription.id}">Modifier</button>
        <button type="button" class="delete-button" data-action="delete" data-id="${subscription.id}">Supprimer</button>
      </div>
    `;
    container.append(card);
  });

  container.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      if (button.dataset.action === "calendar") downloadCalendarFile(id);
      if (button.dataset.action === "edit") editSubscription(id);
      if (button.dataset.action === "delete") deleteSubscription(id);
    });
  });
}

function renderBudget() {
  const monthlyTotal = getMonthlyTotal();
  const percent = monthlyBudget > 0 ? Math.min((monthlyTotal / monthlyBudget) * 100, 160) : 0;
  const truePercent = monthlyBudget > 0 ? Math.round((monthlyTotal / monthlyBudget) * 100) : 0;
  const remaining = monthlyBudget - monthlyTotal;
  const statusColor = truePercent > 100 ? "#e11d48" : truePercent > 80 ? "#f59e0b" : "#14b8a6";

  budgetInput.value = monthlyBudget || "";
  document.querySelector("#budgetDonut").style.setProperty("--value", `${percent}%`);
  document.querySelector("#budgetDonut").style.setProperty("--status-color", statusColor);
  document.querySelector("#budgetPercent").textContent = monthlyBudget ? `${truePercent}%` : "0%";
  document.querySelector("#budgetStatus").textContent = monthlyBudget
    ? remaining >= 0
      ? `${formatMoney(remaining)} disponibles`
      : `${formatMoney(Math.abs(remaining))} au-dessus du budget`
    : "Définissez votre budget";
  document.querySelector("#budgetText").textContent = monthlyBudget
    ? `${formatMoney(monthlyTotal)} consommés sur ${formatMoney(monthlyBudget)} chaque mois.`
    : "Ajoutez un plafond pour visualiser la place prise par vos abonnements.";

  renderSimulation(monthlyTotal);
}

function renderSimulation(monthlyTotal) {
  const result = document.querySelector("#simulationResult");
  const price = Number(simulationPrice.value) || 0;
  const frequency = simulationFrequency.value;
  const simulatedMonthly = toMonthlyPrice({ price, frequency });

  const donut = document.querySelector("#simulationDonut");
  const percentLabel = document.querySelector("#simulationPercent");
  const captionTitle = document.querySelector("#simulationCaptionTitle");
  const captionText = document.querySelector("#simulationCaptionText");

  if (!price) {
    donut.style.setProperty("--value", "0%");
    donut.style.setProperty("--status-color", "#14b8a6");
    percentLabel.textContent = "0%";
    captionTitle.textContent = "Impact estimé";
    captionText.textContent = "Le graphique montrera la part du budget après ajout théorique.";
    result.textContent = "Saisissez un prix pour voir son impact sur votre budget.";
    return;
  }

  const nextTotal = monthlyTotal + simulatedMonthly;
  const nextPercent = monthlyBudget > 0 ? Math.round((nextTotal / monthlyBudget) * 100) : 0;
  const displayPercent = monthlyBudget > 0 ? Math.min(nextPercent, 160) : 0;
  const simulationColor = nextPercent > 100 ? "#e11d48" : nextPercent > 85 ? "#f59e0b" : "#14b8a6";
  donut.style.setProperty("--value", `${displayPercent}%`);
  donut.style.setProperty("--status-color", simulationColor);
  percentLabel.textContent = monthlyBudget ? `${nextPercent}%` : "—";
  captionTitle.textContent = monthlyBudget ? "Budget après simulation" : "Définissez un budget";
  captionText.textContent = monthlyBudget
    ? `Avec cet abonnement, vos dépenses représenteraient ${nextPercent}% de votre budget.`
    : "Ajoutez un budget mensuel pour obtenir une lecture graphique complète.";
  const advice = monthlyBudget && nextPercent > 100
    ? "Attention : cet abonnement vous ferait dépasser votre budget."
    : monthlyBudget && nextPercent > 85
      ? "À réévaluer : il prend une place importante dans votre budget."
      : "Impact raisonnable : l'abonnement semble compatible avec votre budget.";

  result.innerHTML = `
    <strong>+${formatMoney(simulatedMonthly)} / mois</strong>
    <span>Total simulé : ${formatMoney(nextTotal)}${monthlyBudget ? ` · ${nextPercent}% du budget` : ""}</span>
    <p>${advice}</p>
  `;
}

function renderPopularServices() {
  const container = document.querySelector("#popularServices");
  container.innerHTML = "";

  popularServices.forEach((service) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "service-chip";
    button.innerHTML = `<span class="service-icon" style="--icon-color: ${getCategoryMeta(service.category).color}">${escapeHtml(service.serviceIcon)}</span><strong>${service.name}</strong><small>${formatMoney(service.price)}</small>`;
    button.addEventListener("click", () => prefillService(service));
    container.append(button);
  });
}

function prefillService(service) {
  resetForm();
  document.querySelector("#name").value = service.name;
  document.querySelector("#price").value = service.price;
  categorySelect.value = service.category;
  serviceIconInput.value = service.serviceIcon;
  handleCategoryChange();
  document.querySelector("#note").value = `Suggestion : ${service.name}`;
}

function editSubscription(id) {
  const subscription = subscriptions.find((item) => item.id === id);
  if (!subscription) return;

  document.querySelector("#subscriptionId").value = subscription.id;
  document.querySelector("#name").value = subscription.name;
  document.querySelector("#price").value = subscription.price;
  document.querySelector("#currency").value = subscription.currency;
  document.querySelector("#frequency").value = subscription.frequency;
  if (!categories.some((category) => category.name === subscription.category)) {
    addCustomCategory({ name: subscription.category, icon: getSubscriptionIcon(subscription), color: "#4f46e5" });
  }
  categorySelect.value = subscription.category;
  serviceIconInput.value = subscription.serviceIcon || "";
  handleCategoryChange();
  document.querySelector("#nextDate").value = subscription.nextDate;
  document.querySelector("#priority").value = subscription.priority;
  document.querySelector("#note").value = subscription.note;
  submitButton.textContent = "Enregistrer les changements";
  switchTab("add");
}

function deleteSubscription(id) {
  subscriptions = subscriptions.filter((item) => item.id !== id);
  saveSubscriptions();
  render();
}

function getFilteredSubscriptions() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return getSortedByDate();

  return getSortedByDate().filter((item) =>
    [item.name, item.category, item.priority, getSubscriptionIcon(item)].some((value) => value.toLowerCase().includes(query)),
  );
}

function getSortedByDate() {
  return [...subscriptions].sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime());
}

function getMonthlyTotal() {
  return subscriptions.reduce((total, item) => total + toMonthlyPrice(item), 0);
}

function getCategoryTotals() {
  const totals = subscriptions.reduce((accumulator, item) => {
    const meta = getCategoryMeta(item.category);
    accumulator[item.category] ||= { category: item.category, total: 0, icon: meta.icon, color: meta.color };
    accumulator[item.category].total += toMonthlyPrice(item);
    return accumulator;
  }, {});

  return Object.values(totals).sort((a, b) => b.total - a.total);
}

function hydrateCategorySelect() {
  const select = document.querySelector("#category");
  select.innerHTML = "";

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = `${category.icon} · ${category.name}`;
    select.append(option);
  });
}

function renderCategoryLegend() {
  const container = document.querySelector("#categoryLegend");
  container.innerHTML = "";

  categories.forEach((category) => {
    const badge = document.createElement("span");
    badge.className = "legend-badge";
    badge.innerHTML = `<span class="mini-icon" style="--icon-color: ${category.color}">${escapeHtml(category.icon)}</span>${escapeHtml(category.name)}`;
    container.append(badge);
  });
}

function handleCategoryChange() {
  customCategoryPanel.hidden = categorySelect.value !== "Autre";
}

function resolveSelectedCategory() {
  if (categorySelect.value !== "Autre") return categorySelect.value;

  const customName = customCategoryNameInput.value.trim();
  if (!customName) return "Autre";

  addCustomCategory({
    name: customName,
    icon: normalizeIconText(customCategoryIconInput.value, getServiceInitials(customName)),
    color: customCategoryColorInput.value || "#4f46e5",
  });

  return customName;
}

function addCustomCategory(category) {
  const normalizedCategory = {
    name: category.name.trim(),
    icon: normalizeIconText(category.icon, getServiceInitials(category.name)),
    color: normalizeColor(category.color),
    custom: true,
  };

  if (!normalizedCategory.name) return;

  const existingIndex = categories.findIndex((item) => item.name.toLowerCase() === normalizedCategory.name.toLowerCase());
  if (existingIndex >= 0) {
    categories[existingIndex] = { ...categories[existingIndex], ...normalizedCategory };
  } else {
    const otherIndex = categories.findIndex((item) => item.name === "Autre");
    categories.splice(Math.max(otherIndex, 0), 0, normalizedCategory);
  }

  saveCustomCategories();
  hydrateCategorySelect();
  categorySelect.value = normalizedCategory.name;
  renderCategoryLegend();
}

function loadCustomCategories() {
  try {
    return (JSON.parse(localStorage.getItem(CUSTOM_CATEGORIES_KEY)) || []).map((category) => ({
      name: category.name,
      icon: normalizeIconText(category.icon, getServiceInitials(category.name)),
      color: normalizeColor(category.color),
      custom: true,
    }));
  } catch {
    return [];
  }
}

function saveCustomCategories(shouldSync = true) {
  const customCategories = categories.filter((category) => category.custom);
  if (firebaseState.user) {
    if (shouldSync) syncCloudData();
    return;
  }

  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
}

function getSubscriptionIcon(subscription) {
  return normalizeIconText(subscription.serviceIcon, getServiceInitials(subscription.name));
}

function getSubscriptionIconColor(subscription) {
  return getCategoryMeta(subscription.category).color;
}

function getServiceInitials(value) {
  return String(value || "SubPilot")
    .replace(/[+]/g, " plus")
    .split(/\s+|[-_.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "SP";
}

function normalizeIconText(value, fallback = "SP") {
  const normalizedFallback = fallback === "" ? "" : String(fallback || "SP").trim().slice(0, 3).toUpperCase() || "SP";
  const cleaned = String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9€$+#♡]/g, "")
    .slice(0, 3);

  return cleaned || normalizedFallback;
}

function normalizeColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#4f46e5";
}

function selectCustomIcon(icon) {
  customCategoryIconInput.value = normalizeIconText(icon, getServiceInitials(customCategoryNameInput.value || "Autre"));
  updateCustomIconButtons();
}

function updateCustomIconButtons() {
  customIconButtons.forEach((button) => {
    button.classList.toggle("selected", normalizeIconText(button.dataset.customIcon) === normalizeIconText(customCategoryIconInput.value, ""));
  });
}

function normalizeIconInput(input) {
  const cursorPosition = input.selectionStart;
  input.value = normalizeIconText(input.value, "");
  input.setSelectionRange(Math.min(cursorPosition, input.value.length), Math.min(cursorPosition, input.value.length));
  if (input === customCategoryIconInput) updateCustomIconButtons();
}

function updateMailImportStatus() {
  if (!mailImportConsent.checked) {
    mailImportStatus.textContent = "Aucun e-mail n'est lu sans autorisation explicite. Vous pouvez continuer à ajouter vos abonnements à la main.";
    return;
  }

  mailImportStatus.textContent = firebaseState.user
    ? "Compte connecté : l'import e-mail pourra être ajouté ensuite via OAuth Gmail/Outlook avec permissions minimales."
    : "Connectez-vous d'abord : l'import e-mail devra ensuite passer par OAuth Gmail/Outlook avant de lire des messages.";
}

async function handleSignupSubmit(event) {
  event.preventDefault();
  await createFirebaseAccount(getSignupFormData(), authStatus);
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  await signInWithEmail(getLoginFormData(), authStatus);
}

async function createFirebaseAccount(formData, statusTarget) {
  if (!ensureFirebaseReady(false, statusTarget)) return;

  const validationError = validateSignupData(formData);
  if (validationError) {
    statusTarget.textContent = validationError;
    return;
  }

  const { createUserWithEmailAndPassword, updateProfile } = firebaseState.modules;
  statusTarget.textContent = "Création du compte…";
  try {
    const credential = await createUserWithEmailAndPassword(firebaseState.auth, formData.email, formData.password);
    const displayName = `${formData.firstName} ${formData.lastName}`.trim();
    if (displayName) await updateProfile(credential.user, { displayName });
    await saveUserProfile(credential.user, formData);
    clearPasswordFields();
    await syncCloudData("Compte créé et synchronisé.");
  } catch (error) {
    statusTarget.textContent = getFriendlyFirebaseError(error);
  }
}

async function signInWithEmail(formData, statusTarget) {
  if (!ensureFirebaseReady(false, statusTarget)) return;

  if (!isValidEmail(formData.email) || !formData.password) {
    statusTarget.textContent = "Saisissez un e-mail valide et votre mot de passe.";
    return;
  }

  const { signInWithEmailAndPassword } = firebaseState.modules;
  statusTarget.textContent = "Connexion…";
  try {
    await signInWithEmailAndPassword(firebaseState.auth, formData.email, formData.password);
    clearPasswordFields();
  } catch (error) {
    statusTarget.textContent = getFriendlyFirebaseError(error);
  }
}

async function handleGoogleSignIn() {
  const statusTarget = authGate.hidden ? accountStatus : authStatus;
  if (!ensureFirebaseReady(false, statusTarget)) return;

  const { signInWithPopup, provider } = firebaseState.modules;
  statusTarget.textContent = "Ouverture de Google…";
  try {
    const credential = await signInWithPopup(firebaseState.auth, provider);
    await saveGoogleProfile(credential.user);
  } catch (error) {
    statusTarget.textContent = getFriendlyFirebaseError(error);
  }
}

async function handlePasswordReset() {
  if (!ensureFirebaseReady(false, authStatus)) return;

  const email = document.querySelector("#loginEmail").value.trim() || document.querySelector("#authEmail").value.trim();
  if (!isValidEmail(email)) {
    authStatus.textContent = "Saisissez une adresse email valide pour réinitialiser le mot de passe.";
    return;
  }

  try {
    await firebaseState.modules.sendPasswordResetEmail(firebaseState.auth, email);
  } catch {
    // Firebase can reveal whether an account exists depending on project settings.
    // Keep the same message in every case to avoid account enumeration.
  }

  authStatus.textContent = "Un email de réinitialisation a été envoyé si ce compte existe.";
}

async function handleSignOut() {
  if (!firebaseState.auth || !firebaseState.modules) return;

  await firebaseState.modules.signOut(firebaseState.auth);
  clearDisplayedAccountData();
  renderAccountStatus("Déconnecté. Les données locales restent disponibles sur cet appareil.");
}

function handleSyncNow() {
  if (!ensureFirebaseReady(true, accountStatus)) return;
  syncCloudData("Synchronisation manuelle terminée.");
}

async function loadUserProfile(user) {
  const fallbackProfile = createProfileFromFirebaseUser(user);
  if (!firebaseState.configured || !user) return fallbackProfile;

  const { doc, getDoc, setDoc } = firebaseState.modules;
  const reference = doc(firebaseState.db, "users", user.uid, "profile", "details");
  const snapshot = await getDoc(reference);
  if (snapshot.exists()) return { ...fallbackProfile, ...snapshot.data(), uid: user.uid };

  await setDoc(reference, fallbackProfile, { merge: true });
  return fallbackProfile;
}

async function saveUserProfile(user, formData) {
  const { doc, setDoc } = firebaseState.modules;
  const profile = {
    uid: user.uid,
    firstName: formData.firstName,
    lastName: formData.lastName,
    displayName: `${formData.firstName} ${formData.lastName}`.trim(),
    gender: formData.gender || "",
    birthDate: formData.birthDate,
    email: user.email,
    provider: "password",
    photoURL: user.photoURL || "",
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(firebaseState.db, "users", user.uid, "profile", "details"), profile, { merge: true });
  firebaseState.profile = profile;
  rememberProfile(profile);
  renderProfile(profile);
  return profile;
}

async function saveGoogleProfile(user) {
  if (!user) return null;

  const { doc, setDoc } = firebaseState.modules;
  const fallbackProfile = createProfileFromFirebaseUser(user, "google");
  const currentProfile = await loadUserProfile(user);
  const profile = {
    ...fallbackProfile,
    gender: currentProfile.gender || "",
    birthDate: currentProfile.birthDate || "",
    avatarDataUrl: currentProfile.avatarDataUrl || "",
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(firebaseState.db, "users", user.uid, "profile", "details"), profile, { merge: true });
  firebaseState.profile = profile;
  rememberProfile(profile);
  renderProfile(profile);
  return profile;
}

function createProfileFromFirebaseUser(user, provider = getProviderLabelFromUser(user)) {
  const name = user.displayName || user.email?.split("@")[0] || "Utilisateur SubPilot";
  const [firstName = "", ...lastNameParts] = name.split(" ");
  return {
    uid: user.uid,
    firstName,
    lastName: lastNameParts.join(" "),
    displayName: name,
    gender: "",
    birthDate: "",
    email: user.email || "",
    provider,
    photoURL: user.photoURL || "",
    avatarDataUrl: "",
    updatedAt: new Date().toISOString(),
  };
}

function getProviderLabelFromUser(user) {
  return user?.providerData?.some((provider) => provider.providerId === "google.com") ? "google" : "password";
}

function rememberProfile(profile) {
  if (!profile) return;
  const safeProfile = {
    uid: profile.uid,
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    displayName: profile.displayName || `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
    email: profile.email || "",
    provider: profile.provider || "password",
    photoURL: profile.photoURL || "",
    avatarDataUrl: profile.avatarDataUrl || "",
  };
  localStorage.setItem(REMEMBERED_PROFILE_KEY, JSON.stringify(safeProfile));
}

function loadRememberedProfile() {
  return parseJson(localStorage.getItem(REMEMBERED_PROFILE_KEY), null);
}

function handleQuickLogin() {
  const rememberedProfile = loadRememberedProfile();
  switchAuthMode("login");
  if (rememberedProfile?.email) document.querySelector("#loginEmail").value = rememberedProfile.email;
  document.querySelector("#loginPassword").focus();
}

async function handleAvatarSelection(event) {
  const [file] = event.target.files || [];
  event.target.value = "";
  if (!file) return;
  if (!firebaseState.user) {
    profilePhotoStatus.textContent = "Connectez-vous pour modifier votre photo de profil.";
    return;
  }

  if (!file.type.startsWith("image/")) {
    profilePhotoStatus.textContent = "Choisissez une image valide pour votre photo de profil.";
    return;
  }

  profilePhotoStatus.textContent = "Préparation de la photo…";
  try {
    const avatarDataUrl = await createAvatarDataUrl(file);
    await updateProfileAvatar(avatarDataUrl);
    profilePhotoStatus.textContent = "Photo de profil mise à jour.";
  } catch (error) {
    profilePhotoStatus.textContent = `Impossible de mettre à jour la photo : ${getFriendlyFirebaseError(error)}.`;
  }
}

function createAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("error", () => reject(new Error("Lecture de l'image impossible.")));
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("error", () => reject(new Error("Image invalide.")));
      image.addEventListener("load", () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(320, image.width, image.height);
        const sourceX = (image.width - size) / 2;
        const sourceY = (image.height - size) / 2;
        canvas.width = 320;
        canvas.height = 320;
        const context = canvas.getContext("2d");
        context.drawImage(image, sourceX, sourceY, size, size, 0, 0, 320, 320);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      });
      image.src = reader.result;
    });
    reader.readAsDataURL(file);
  });
}

async function updateProfileAvatar(avatarDataUrl) {
  const { doc, setDoc } = firebaseState.modules;
  const profile = {
    ...(firebaseState.profile || createProfileFromFirebaseUser(firebaseState.user)),
    avatarDataUrl,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(firebaseState.db, "users", firebaseState.user.uid, "profile", "details"), {
    avatarDataUrl,
    updatedAt: profile.updatedAt,
  }, { merge: true });
  firebaseState.profile = profile;
  rememberProfile(profile);
  renderProfile(profile);
}

function renderProfile(profile) {
  const safeProfile = profile || createProfileFromFirebaseUser(firebaseState.user || { uid: "", email: "" });
  const displayName = safeProfile.displayName || `${safeProfile.firstName || ""} ${safeProfile.lastName || ""}`.trim() || "Profil SubPilot";
  profileName.textContent = displayName;
  profileEmail.textContent = safeProfile.email || "Adresse e-mail non disponible";
  profileFirstName.textContent = safeProfile.firstName || "-";
  profileLastName.textContent = safeProfile.lastName || "-";
  profileGender.textContent = safeProfile.gender || "Préfère ne pas répondre";
  profileBirthDate.textContent = safeProfile.birthDate ? formatExactDate(safeProfile.birthDate) : "-";
  profileProvider.textContent = safeProfile.provider === "google" ? "Google" : "E-mail et mot de passe";
  renderAvatar(profileAvatar, safeProfile, "SP");
}

function renderAuthQuickProfile() {
  const rememberedProfile = loadRememberedProfile();
  const shouldShowQuickProfile = Boolean(rememberedProfile && !firebaseState.user && firebaseState.configured);
  authQuickProfile.hidden = !shouldShowQuickProfile;
  if (!shouldShowQuickProfile) return;

  authQuickName.textContent = rememberedProfile.displayName || `${rememberedProfile.firstName || ""} ${rememberedProfile.lastName || ""}`.trim() || "Profil enregistré";
  authQuickEmail.textContent = rememberedProfile.email || "Connexion rapide";
  renderAvatar(authQuickAvatar, rememberedProfile, "SP");
}

function renderAvatar(element, profile, fallbackText) {
  const image = profile?.avatarDataUrl || profile?.photoURL || "";
  element.textContent = image ? "" : getProfileInitials(profile) || fallbackText;
  element.classList.toggle("has-image", Boolean(image));
  element.style.backgroundImage = image ? `url("${image}")` : "";
}

function getProfileInitials(profile) {
  const first = profile?.firstName?.trim()?.[0] || "";
  const last = profile?.lastName?.trim()?.[0] || "";
  const initials = `${first}${last}`.toUpperCase();
  if (initials) return initials;
  return (profile?.displayName || profile?.email || "SP").slice(0, 2).toUpperCase();
}

function getSignupFormData() {
  return {
    firstName: document.querySelector("#authFirstName").value.trim(),
    lastName: document.querySelector("#authLastName").value.trim(),
    gender: document.querySelector("#authGender").value,
    birthDate: document.querySelector("#authBirthDate").value,
    email: document.querySelector("#authEmail").value.trim(),
    password: document.querySelector("#authPassword").value,
    passwordConfirm: document.querySelector("#authPasswordConfirm").value,
  };
}

function getLoginFormData() {
  return {
    email: document.querySelector("#loginEmail").value.trim(),
    password: document.querySelector("#loginPassword").value,
  };
}

function validateSignupData(formData) {
  if (!formData.firstName || !formData.lastName || !formData.birthDate || !formData.email || !formData.password) {
    return "Complétez les champs obligatoires pour créer votre compte.";
  }

  if (!isValidEmail(formData.email)) return "Adresse email invalide.";
  if (formData.password !== formData.passwordConfirm) return "Les mots de passe ne correspondent pas.";
  if (!isAtLeastMinimumAge(formData.birthDate)) return "Vous devez avoir au moins 13 ans pour utiliser SubPilot.";
  return "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAtLeastMinimumAge(dateValue) {
  const birthDate = parseDateOnly(dateValue);
  if (!birthDate) return false;

  const minimumDate = new Date();
  minimumDate.setFullYear(minimumDate.getFullYear() - MINIMUM_ACCOUNT_AGE);
  minimumDate.setHours(0, 0, 0, 0);
  return birthDate <= minimumDate;
}

function getAdultFallbackBirthDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return formatDateOnly(date);
}

function clearPasswordFields() {
  ["#authPassword", "#authPasswordConfirm", "#loginPassword"].forEach((selector) => {
    const input = document.querySelector(selector);
    if (input) input.value = "";
  });
}

function switchAuthMode(mode) {
  pendingAuthMode = mode;
  authModeButtons.forEach((button) => {
    const isActive = button.dataset.authMode === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  document.querySelectorAll("[data-auth-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.authPanel !== mode;
  });
  authStatus.textContent = firebaseState.configured
    ? mode === "signup"
      ? "Créez votre compte sécurisé pour synchroniser SubPilot."
      : "Connectez-vous pour retrouver vos abonnements."
    : "Firebase n'est pas encore configuré.";
}

function ensureFirebaseReady(requireUser = false, statusTarget = accountStatus) {
  if (!firebaseState.ready) {
    statusTarget.textContent = "Firebase est encore en cours de chargement.";
    return false;
  }

  if (!firebaseState.configured) {
    statusTarget.textContent = "Firebase n'est pas configuré : remplissez firebase-config.js avec la configuration Web de votre projet Firebase.";
    return false;
  }

  if (requireUser && !firebaseState.user) {
    statusTarget.textContent = "Connectez-vous avant de synchroniser.";
    return false;
  }

  return true;
}

function renderAccountStatus(message) {
  const user = firebaseState.user;
  const profile = firebaseState.profile || (user ? createProfileFromFirebaseUser(user) : null);
  const firebaseProblem = firebaseState.error ? ` Erreur : ${getFriendlyFirebaseError(firebaseState.error)}` : "";
  const shouldShowAuth = !firebaseState.ready || (firebaseState.configured && !user);

  authGate.hidden = !shouldShowAuth;
  appShell.hidden = shouldShowAuth;
  authGoogleButton.disabled = !firebaseState.configured;
  signOutButton.hidden = !user;
  syncNowButton.hidden = !user;
  avatarUploadButton.disabled = !user;
  avatarCameraButton.disabled = !user;

  if (profile) renderProfile(profile);
  renderAuthQuickProfile();

  if (message) {
    accountStatus.textContent = message;
    authStatus.textContent = message;
  } else if (!firebaseState.ready) {
    accountStatus.textContent = "Chargement de Firebase…";
    authStatus.textContent = "Chargement de Firebase…";
  } else if (!firebaseState.configured) {
    accountStatus.textContent = `Firebase n'est pas encore configuré. Remplissez firebase-config.js, activez Email/Password et Google dans Firebase Authentication, puis publiez à nouveau.${firebaseProblem}`;
    authStatus.textContent = accountStatus.textContent;
  } else if (user) {
    accountStatus.textContent = `Connecté : ${profile?.displayName || user.displayName || user.email}. Vos données sont synchronisées dans votre espace cloud.`;
    authStatus.textContent = "Connexion réussie.";
  } else {
    accountStatus.textContent = "Connectez-vous pour accéder à SubPilot.";
    authStatus.textContent = pendingAuthMode === "signup"
      ? "Créez votre compte sécurisé pour synchroniser SubPilot."
      : "Connectez-vous pour retrouver vos abonnements.";
  }

  updateMailImportStatus();
}

function getFriendlyFirebaseError(error) {
  const code = error?.code || "";
  const messages = {
    "auth/email-already-in-use": "Cet e-mail possède déjà un compte. Utilisez Se connecter.",
    "auth/invalid-email": "Adresse e-mail invalide.",
    "auth/weak-password": "Mot de passe trop faible : utilisez au moins 6 caractères.",
    "auth/user-not-found": "Aucun compte trouvé pour cet e-mail.",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/invalid-credential": "Identifiants incorrects ou expirés.",
    "auth/popup-closed-by-user": "Fenêtre Google fermée avant la fin de la connexion.",
    "permission-denied": "Accès Firestore refusé : vérifiez les règles de sécurité.",
  };

  return messages[code] || error?.message || "Erreur inconnue";
}

function createSubscription(subscription) {
  const category = subscription.category || "Autre";
  const meta = getCategoryMeta(category);

  return {
    id: subscription.id || crypto.randomUUID(),
    name: subscription.name,
    price: Number(subscription.price),
    currency: subscription.currency || "EUR",
    frequency: subscription.frequency || "monthly",
    category,
    serviceIcon: normalizeIconText(subscription.serviceIcon || subscription.emoji, getServiceInitials(subscription.name)),
    nextDate: subscription.nextDate || getDateInDays(7),
    priority: subscription.priority || "keep",
    note: subscription.note || "",
  };
}

function getCategoryMeta(categoryName) {
  return categories.find((category) => category.name === categoryName) || categories.find((category) => category.name === "Autre") || categories.at(-1);
}

function toMonthlyPrice(subscription) {
  const multipliers = {
    weekly: 52 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    yearly: 1 / 12,
  };

  return subscription.price * multipliers[subscription.frequency];
}

function formatMoney(amount, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getCalendarDateTimeDaysBefore(dateValue, daysBefore) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day, CALENDAR_ALERT_HOUR, 0, 0);
  date.setDate(date.getDate() - daysBefore);
  return date;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

function formatIcsLocalDateTime(date) {
  const parts = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ].map((part) => String(part).padStart(2, "0"));

  return `${parts[0]}${parts[1]}${parts[2]}T${parts[3]}${parts[4]}${parts[5]}`;
}

function formatIcsUtcDateTime(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function createCalendarUid(subscription, event) {
  return `${subscription.id}-${event.daysBefore}-${formatIcsLocalDateTime(event.startDate)}@subpilot.local`;
}

function slugifyFileName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "abonnement";
}

function getDaysUntil(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86_400_000);
}

function formatExactDate(dateValue) {
  const date = parseDateOnly(dateValue);
  if (!date) return dateValue;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatRelativeDate(dateValue) {
  const days = getDaysUntil(dateValue);

  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  if (days > 1) return `dans ${days} jours`;
  if (days === -1) return "hier";
  return `il y a ${Math.abs(days)} jours`;
}

function getDateInDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#039;",
      '"': "&quot;",
    };
    return entities[character];
  });
}
