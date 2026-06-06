const STORAGE_KEY = "subpilot-subscriptions";
const BUDGET_KEY = "subpilot-monthly-budget";

let deferredInstallPrompt = null;

const categories = [
  { name: "Streaming", emoji: "🎬", color: "#7c3aed" },
  { name: "Musique", emoji: "🎧", color: "#ec4899" },
  { name: "Logiciels", emoji: "💻", color: "#2563eb" },
  { name: "Productivité", emoji: "⚡", color: "#14b8a6" },
  { name: "Sport", emoji: "🏋️", color: "#f97316" },
  { name: "Jeux", emoji: "🎮", color: "#8b5cf6" },
  { name: "Maison", emoji: "🏠", color: "#0f766e" },
  { name: "Presse", emoji: "📰", color: "#64748b" },
  { name: "Éducation", emoji: "🎓", color: "#0891b2" },
  { name: "Transport", emoji: "🚇", color: "#dc2626" },
  { name: "Santé", emoji: "🩺", color: "#16a34a" },
  { name: "Autre", emoji: "✨", color: "#475569" },
];

const popularServices = [
  { name: "Netflix", price: 13.49, category: "Streaming", emoji: "🎬" },
  { name: "Spotify", price: 10.99, category: "Musique", emoji: "🎧" },
  { name: "Amazon Prime", price: 6.99, category: "Streaming", emoji: "📦" },
  { name: "Disney+", price: 8.99, category: "Streaming", emoji: "🏰" },
  { name: "Canva Pro", price: 11.99, category: "Productivité", emoji: "🎨" },
  { name: "iCloud+", price: 2.99, category: "Productivité", emoji: "☁️" },
  { name: "Adobe", price: 19.99, category: "Logiciels", emoji: "💻" },
  { name: "Salle de sport", price: 29.99, category: "Sport", emoji: "🏋️" },
  { name: "Game Pass", price: 14.99, category: "Jeux", emoji: "🎮" },
  { name: "Notion", price: 9.5, category: "Productivité", emoji: "🧠" },
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

let subscriptions = loadSubscriptions();
let monthlyBudget = loadBudget();
let activeTab = "dashboard";

hydrateCategorySelect();
renderCategoryLegend();
renderPopularServices();

form.addEventListener("submit", handleSubmit);
resetButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderSubscriptions);
saveBudgetButton.addEventListener("click", saveBudget);
simulationPrice.addEventListener("input", renderBudget);
simulationFrequency.addEventListener("change", renderBudget);
installButton.addEventListener("click", installApp);

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
  const subscription = createSubscription({
    id: editingId || crypto.randomUUID(),
    name: document.querySelector("#name").value.trim(),
    price: Number(document.querySelector("#price").value),
    currency: document.querySelector("#currency").value,
    frequency: document.querySelector("#frequency").value,
    category: document.querySelector("#category").value,
    nextDate: document.querySelector("#nextDate").value,
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
  document.querySelector("#category").value = "Streaming";
  document.querySelector("#priority").value = "keep";
  document.querySelector("#nextDate").value = getDateInDays(7);
  submitButton.textContent = "Ajouter l'abonnement";
}

function saveBudget() {
  monthlyBudget = Number(budgetInput.value) || 0;
  localStorage.setItem(BUDGET_KEY, String(monthlyBudget));
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

function loadBudget() {
  return Number(localStorage.getItem(BUDGET_KEY)) || 120;
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
    ? `${nextSubscription.emoji} ${nextSubscription.name} · ${formatRelativeDate(nextSubscription.nextDate)}`
    : "Aucun";
  document.querySelector("#topCategory").textContent = topCategory ? `${topCategory.emoji} ${topCategory.category}` : "-";
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
      <span class="emoji-bubble">${subscription.emoji}</span>
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

  totals.forEach(({ category, total, emoji, color }) => {
    const row = document.createElement("article");
    row.className = "category-row";
    row.innerHTML = `
      <header>
        <span>${emoji} ${category}</span>
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
        <span class="emoji-bubble large">${subscription.emoji}</span>
        <div>
          <h3>${escapeHtml(subscription.name)}</h3>
          <div class="subscription-meta">
            <span>${escapeHtml(subscription.category)}</span>
            <span>•</span>
            <span>${frequencyLabels[subscription.frequency]}</span>
            <span>•</span>
            <span>${formatRelativeDate(subscription.nextDate)}</span>
          </div>
        </div>
        <span class="price-pill">${formatMoney(subscription.price, subscription.currency)}</span>
      </header>
      ${subscription.note ? `<p class="subscription-note">${escapeHtml(subscription.note)}</p>` : ""}
      <div class="card-actions">
        <span class="priority-pill ${subscription.priority}">${priorityLabels[subscription.priority]}</span>
        <button type="button" class="edit-button" data-action="edit" data-id="${subscription.id}">Modifier</button>
        <button type="button" class="delete-button" data-action="delete" data-id="${subscription.id}">Supprimer</button>
      </div>
    `;
    container.append(card);
  });

  container.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
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
    button.innerHTML = `<span>${service.emoji}</span><strong>${service.name}</strong><small>${formatMoney(service.price)}</small>`;
    button.addEventListener("click", () => prefillService(service));
    container.append(button);
  });
}

function prefillService(service) {
  resetForm();
  document.querySelector("#name").value = service.name;
  document.querySelector("#price").value = service.price;
  document.querySelector("#category").value = service.category;
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
  document.querySelector("#category").value = subscription.category;
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
    [item.name, item.category, item.priority, item.emoji].some((value) => value.toLowerCase().includes(query)),
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
    accumulator[item.category] ||= { category: item.category, total: 0, emoji: meta.emoji, color: meta.color };
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
    option.textContent = `${category.emoji} ${category.name}`;
    select.append(option);
  });
}

function renderCategoryLegend() {
  const container = document.querySelector("#categoryLegend");
  container.innerHTML = "";

  categories.forEach((category) => {
    const badge = document.createElement("span");
    badge.className = "legend-badge";
    badge.innerHTML = `${category.emoji} ${category.name}`;
    container.append(badge);
  });
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
    emoji: subscription.emoji || meta.emoji,
    nextDate: subscription.nextDate || getDateInDays(7),
    priority: subscription.priority || "keep",
    note: subscription.note || "",
  };
}

function getCategoryMeta(categoryName) {
  return categories.find((category) => category.name === categoryName) || categories.at(-1);
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

function formatRelativeDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((date - today) / 86_400_000);

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
