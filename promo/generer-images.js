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
  "NO text, NO letters, NO words, square 1:1 framing.";

// Concepts (10 visuels distincts autour de la gestion d'abonnements).
const CONCEPTS = [
  "A neat 3D stack of floating rounded subscription cards hovering above a modern smartphone",
  "A cute 3D piggy bank surrounded by floating coins, symbolizing saving money on subscriptions",
  "A 3D calendar block with a glowing notification bell floating above it, reminder concept",
  "A pair of 3D scissors cutting a glowing subscription card in half, cancellation concept",
  "A floating 3D dashboard panel with a donut budget chart and small rising bar graphs",
  "An organized 3D wallet with neatly arranged colorful cards sliding out",
  "A 3D magnet attracting golden coins back toward it, money coming back concept",
  "A 3D shield hovering protectively over a small wallet and cards, control and security concept",
  "A 3D control panel with a joystick and dials, a pilot steering personal finances concept",
  "A 3D rocket made of stacked coins lifting off from a launch pad, growth and savings concept",
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
  console.log(`🎨 Génération de ${CONCEPTS.length} image(s) — ${SIZE}, qualité ${QUALITY}\n`);

  let ok = 0;
  for (let i = 0; i < CONCEPTS.length; i++) {
    const prompt = `${CONCEPTS[i]}. ${STYLE}`;
    process.stdout.write(`(${i + 1}/${CONCEPTS.length}) ${CONCEPTS[i].slice(0, 48)}… `);
    try {
      const file = await generateOne(prompt, i);
      ok++;
      console.log(`✅ ${path.basename(file)}`);
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 160)}`);
    }
  }

  console.log(`\n✨ Terminé : ${ok}/${CONCEPTS.length} image(s) dans ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
