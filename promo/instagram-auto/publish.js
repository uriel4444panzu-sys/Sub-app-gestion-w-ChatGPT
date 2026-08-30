/**
 * Publication automatique sur Instagram via l'API Graph officielle (Meta).
 *
 * - Lit le calendrier (calendar.json) et publie les posts « dus » (date <= aujourd'hui)
 *   pas encore publiés (suivi dans published.json).
 * - Types supportés : "feed" (image carrée/portrait), "story" (9:16), "reel" (vidéo).
 * - Les images/vidéos doivent être accessibles par une URL PUBLIQUE : on utilise
 *   GitHub Pages (PAGES_BASE) + le chemin du fichier dans le repo.
 *
 * Variables d'environnement requises (secrets GitHub) :
 *   IG_USER_ID        -> l'ID du compte Instagram Business (numérique)
 *   IG_ACCESS_TOKEN   -> jeton d'accès longue durée
 * Optionnelles :
 *   PAGES_BASE        -> base publique des fichiers (défaut : GitHub Pages du repo)
 *   ONLY_ID           -> ne publier QUE ce post (déclenchement manuel ciblé)
 *   DRY_RUN=1         -> simule sans rien publier (test)
 */

const fs = require("fs");
const path = require("path");

const GRAPH = "https://graph.facebook.com/v21.0";
const DIR = __dirname;
const PAGES_BASE =
  process.env.PAGES_BASE || "https://uriel4444panzu-sys.github.io/Sub-app-gestion-w-ChatGPT/";
const IG_USER_ID = process.env.IG_USER_ID;
const TOKEN = process.env.IG_ACCESS_TOKEN;
const ONLY_ID = process.env.ONLY_ID || "";
const DRY_RUN = process.env.DRY_RUN === "1";

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
  } catch {
    return fallback;
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function publicUrl(relPath) {
  return PAGES_BASE.replace(/\/?$/, "/") + relPath.replace(/^\/+/, "");
}

async function api(pathPart, params) {
  const url = `${GRAPH}/${pathPart}`;
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const res = await fetch(url, { method: "POST", body });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Graph API: ${JSON.stringify(data.error || data)}`);
  }
  return data;
}

async function publishOne(post) {
  const caption = post.caption || "";
  const container = { caption };

  if (post.type === "story") {
    container.media_type = "STORIES";
    container.image_url = publicUrl(post.image);
  } else if (post.type === "reel") {
    container.media_type = "REELS";
    container.video_url = publicUrl(post.video);
  } else {
    // feed (image simple)
    container.image_url = publicUrl(post.image);
  }

  console.log(`→ ${post.id} (${post.type}) : ${container.image_url || container.video_url}`);
  if (DRY_RUN) {
    console.log("  DRY_RUN : container non créé.");
    return "dry-run";
  }

  const created = await api(`${IG_USER_ID}/media`, container);
  const creationId = created.id;

  // Les Reels/vidéos ont besoin d'un court temps de traitement avant publication.
  if (post.type === "reel") await waitReady(creationId);

  const published = await api(`${IG_USER_ID}/media_publish`, { creation_id: creationId });
  console.log(`  ✅ publié (media id ${published.id})`);
  return published.id;
}

async function waitReady(creationId) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(
      `${GRAPH}/${creationId}?fields=status_code&access_token=${TOKEN}`,
    );
    const data = await res.json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error("Traitement média en erreur.");
    await new Promise((r) => setTimeout(r, 6000));
  }
  throw new Error("Média toujours pas prêt après ~2 min.");
}

async function main() {
  if (!IG_USER_ID || !TOKEN) {
    console.error("❌ IG_USER_ID et IG_ACCESS_TOKEN sont requis (secrets GitHub).");
    process.exit(1);
  }

  const calendar = readJson("calendar.json", []);
  const publishedLog = readJson("published.json", {});
  const today = todayISO();

  let due = calendar.filter((p) => !publishedLog[p.id]);
  due = ONLY_ID ? due.filter((p) => p.id === ONLY_ID) : due.filter((p) => p.date <= today);

  if (!due.length) {
    console.log(ONLY_ID ? `Aucun post « ${ONLY_ID} » à publier.` : "Aucun post dû aujourd'hui.");
    return;
  }

  for (const post of due) {
    try {
      const mediaId = await publishOne(post);
      if (!DRY_RUN) {
        publishedLog[post.id] = { at: new Date().toISOString(), mediaId };
      }
    } catch (error) {
      console.error(`❌ ${post.id} : ${error.message}`);
    }
  }

  if (!DRY_RUN) {
    fs.writeFileSync(path.join(DIR, "published.json"), JSON.stringify(publishedLog, null, 2) + "\n");
  }
  console.log("Terminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
