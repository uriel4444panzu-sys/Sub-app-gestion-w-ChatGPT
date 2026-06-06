const STORAGE_KEY = "subpilot-subscriptions";

let deferredInstallPrompt = null;

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
  {
    id: crypto.randomUUID(),
    name: "Netflix",
    price: 13.49,
    currency: "EUR",
    frequency: "monthly",
    category: "Streaming",
    nextDate: getDateInDays(4),
    priority: "keep",
    note: "Utilisé plusieurs soirs par semaine.",
  },
  {
    id: crypto.randomUUID(),
    name: "Salle de sport",
    price: 29.99,
    currency: "EUR",
    frequency: "monthly",
    category: "Sport",
    nextDate: getDateInDays(11),
    priority: "review",
    note: "Vérifier si la fréquentation reste suffisante.",
  },
  {
    id: crypto.randomUUID(),
    name: "Stockage cloud",
    price: 99,
    currency: "EUR",
    frequency: "yearly",
    category: "Productivité",
    nextDate: getDateInDays(24),
    priority: "keep",
    note: "Sauvegardes téléphone et ordinateur.",
  },
];

const form = document.querySelector("#subscriptionForm");
const resetButton = document.querySelector("#resetButton");
const submitButton = document.querySelector("#submitButton");
const searchInput = document.querySelector("#searchInput");
const emptyStateTemplate = document.querySelector("#emptyStateTemplate");
const installCard = document.querySelector("#installCard");
const installButton = document.querySelector("#installButton");
const installHelp = document.querySelector("#installHelp");

let subscriptions = loadSubscriptions();

form.addEventListener("submit", handleSubmit);
resetButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", render);
installButton.addEventListener("click", installApp);

setupInstallExperience();
registerServiceWorker();

document.querySelector("#nextDate").value = getDateInDays(7);
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
  if (!deferredInstallPrompt) {
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.disabled = true;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !["http:", "https:"].includes(window.location.protocol)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      installHelp.textContent = "L'installation nécessite une ouverture via localhost ou HTTPS.";
    });
  });
}

function handleSubmit(event) {
  event.preventDefault();

  const editingId = document.querySelector("#subscriptionId").value;
  const subscription = {
    id: editingId || crypto.randomUUID(),
    name: document.querySelector("#name").value.trim(),
    price: Number(document.querySelector("#price").value),
    currency: document.querySelector("#currency").value,
    frequency: document.querySelector("#frequency").value,
    category: document.querySelector("#category").value,
    nextDate: document.querySelector("#nextDate").value,
    priority: document.querySelector("#priority").value,
    note: document.querySelector("#note").value.trim(),
  };

  if (!subscription.name || Number.isNaN(subscription.price)) {
    return;
  }

  if (editingId) {
    subscriptions = subscriptions.map((item) => (item.id === editingId ? subscription : item));
  } else {
    subscriptions = [subscription, ...subscriptions];
  }

  saveSubscriptions();
  resetForm();
  render();
}

function resetForm() {
  form.reset();
  document.querySelector("#subscriptionId").value = "";
  document.querySelector("#nextDate").value = getDateInDays(7);
  submitButton.textContent = "Ajouter l'abonnement";
}

function loadSubscriptions() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return demoSubscriptions;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return demoSubscriptions;
  }
}

function saveSubscriptions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

function render() {
  const filteredSubscriptions = getFilteredSubscriptions();
  renderInsights();
  renderBreakdown();
  renderSubscriptions(filteredSubscriptions);
}

function renderInsights() {
  const monthlyTotal = subscriptions.reduce((total, item) => total + toMonthlyPrice(item), 0);
  const nextSubscription = [...subscriptions].sort(
    (a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime(),
  )[0];
  const topCategory = getCategoryTotals()[0];

  document.querySelector("#monthlyTotal").textContent = formatMoney(monthlyTotal);
  document.querySelector("#yearlyTotal").textContent = `${formatMoney(monthlyTotal * 12)} / an`;
  document.querySelector("#activeCount").textContent = subscriptions.length;
  document.querySelector("#nextPayment").textContent = nextSubscription
    ? `${nextSubscription.name} · ${formatRelativeDate(nextSubscription.nextDate)}`
    : "Aucun";
  document.querySelector("#topCategory").textContent = topCategory ? topCategory.category : "-";
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

  totals.forEach(({ category, total }) => {
    const row = document.createElement("article");
    row.className = "category-row";
    row.innerHTML = `
      <header>
        <span>${category}</span>
        <strong>${formatMoney(total)} / mois</strong>
      </header>
      <div class="progress-track" aria-hidden="true">
        <div class="progress-bar" style="width: ${(total / maxTotal) * 100}%"></div>
      </div>
    `;
    container.append(row);
  });
}

function renderSubscriptions(items) {
  const container = document.querySelector("#subscriptionList");
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
        <div>
          <h3>${escapeHtml(subscription.name)}</h3>
          <div class="subscription-meta">
            <span>${escapeHtml(subscription.category)}</span>
            <span>•</span>
            <span>${frequencyLabels[subscription.frequency]}</span>
            <span>•</span>
            <span>Prochain paiement ${formatRelativeDate(subscription.nextDate)}</span>
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
      if (button.dataset.action === "edit") {
        editSubscription(id);
      } else {
        deleteSubscription(id);
      }
    });
  });
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
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteSubscription(id) {
  subscriptions = subscriptions.filter((item) => item.id !== id);
  saveSubscriptions();
  render();
}

function getFilteredSubscriptions() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return subscriptions;

  return subscriptions.filter((item) =>
    [item.name, item.category, item.priority].some((value) => value.toLowerCase().includes(query)),
  );
}

function getCategoryTotals() {
  const totals = subscriptions.reduce((accumulator, item) => {
    accumulator[item.category] = (accumulator[item.category] || 0) + toMonthlyPrice(item);
    return accumulator;
  }, {});

  return Object.entries(totals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
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
