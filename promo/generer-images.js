/**
 * Génère des images promotionnelles pour le compte Instagram de SubPilot.
 *
 * - Utilise l'API Images d'OpenAI (modèle gpt-image-1).
 * - Aucune dépendance à installer : utilise fetch, natif dans Node 18+.
 * - Les images sont enregistrées dans promo/instagram/ (dossier ignoré par Git).
 *
 * UTILISATION (depuis la racine du projet) :
 *   1. Mets ta clé API dans la variable d'environnement OPENAI_API_KEY,
 *      OU crée un fichier .env à la racine contenant :  OPENAI_API_KEY=sk-...
 *   2. Lance :  node promo/generer-images.js
 *
 * ⚠️ Ne partage jamais ta clé et ne la mets jamais dans un fichier versionné.
 *    (.env est déjà ignoré par Git.)
 */

const fs = require("fs");
const path = require("path");

// --------------------------------------------------------------------------
// Réglages — modifie librement
// --------------------------------------------------------------------------
const MODEL = "gpt-image-1";
const SIZE = "1024x1024"; // carré Instagram (1:1)
const QUALITY = "high"; // "low" | "medium" | "high" — baisse pour réduire le coût
const OUTPUT_DIR = path.join(__dirname, "instagram");

// Style commun appliqué à chaque image, aux couleurs de SubPilot.
const STYLE =
  "3D render, glossy clay/plastic material, soft studio lighting, subtle reflections, " +
  "brand palette indigo #4f46e5 and teal #14b8a6 with soft pink #ec4899 accents, " +
  "smooth gradient background, centered composition, minimalist, generous negative space, " +
  "modern fintech aesthetic, ultra clean, high detail, octane render, product photography style, " +
  "square 1:1 framing.";

// Consigne pour le texte 3D, dans la même matière que la scène.
function texte3D(accroche) {
  return (
    `Include a bold 3D inflated glossy text that reads exactly "${accroche}" ` +
    "in French, made of the same clay/plastic material as the scene, matching the brand " +
    "colors, large and perfectly legible, correctly spelled with correct French accents, " +
    "placed in the empty space without covering the main object."
  );
}

// 10 visuels : scène (en anglais pour le moteur) + accroche 3D (en français).
const VISUELS = [
  { scene: "A neat 3D stack of floating rounded subscription cards hovering above a modern smartphone", texte: "Tous tes abos ici" },
  { scene: "A cute 3D piggy bank surrounded by floating coins, symbolizing saving money on subscriptions", texte: "Économise" },
  { scene: "A 3D calendar block with a glowing notification bell floating above it, reminder concept", texte: "Prévenu à temps" },
  { scene: "A pair of 3D scissors cutting a glowing subscription card in half, cancellation concept", texte: "Résilie en 1 clic" },
  { scene: "A floating 3D dashboard panel with a donut budget chart and small rising bar graphs", texte: "Ton budget en vue" },
  { scene: "An organized 3D wallet with neatly arranged colorful cards sliding out", texte: "Reprends le contrôle" },
  { scene: "A 3D magnet attracting golden coins back toward it, money coming back concept", texte: "Récupère ton argent" },
  { scene: "A 3D shield hovering protectively over a small wallet and cards, control and security concept", texte: "Zéro abo oublié" },
  { scene: "A 3D control panel with a joystick and dials, a pilot steering personal finances concept", texte: "Pilote tes dépenses" },
  { scene: "A 3D rocket made of stacked coins lifting off from a launch pad, growth and savings concept", texte: "Reprends la main" },
];

// --------------------------------------------------------------------------
// Chargement simple d'un fichier .env (si présent) — aucun package requis
// --------------------------------------------------------------------------
function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function generateOne(prompt, index) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, prompt, size: SIZE, quality: QUALITY, n: 1 }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`HTTP ${response.status} — ${detail}`);
  }

  const data = await response.json();
  const b64 = data.data && data.data[0] && data.data[0].b64_json;
  if (!b64) throw new Error("Réponse inattendue de l'API (pas d'image).");

  const file = path.join(OUTPUT_DIR, `subpilot-${String(index + 1).padStart(2, "0")}.png`);
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
  return file;
}

async function main() {
  loadDotEnv();

  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "❌ Clé manquante. Définis OPENAI_API_KEY (variable d'environnement) " +
        "ou crée un fichier .env avec : OPENAI_API_KEY=sk-..."
    );
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`🎨 Génération de ${VISUELS.length} image(s) — ${SIZE}, qualité ${QUALITY}\n`);

  let ok = 0;
  for (let i = 0; i < VISUELS.length; i++) {
    const { scene, texte } = VISUELS[i];
    const prompt = `${scene}. ${texte3D(texte)} ${STYLE}`;
    process.stdout.write(`(${i + 1}/${VISUELS.length}) « ${texte} »… `);
    try {
      const file = await generateOne(prompt, i);
      ok++;
      console.log(`✅ ${path.basename(file)}`);
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 160)}`);
    }
  }

  console.log(`\n✨ Terminé : ${ok}/${VISUELS.length} image(s) dans ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
