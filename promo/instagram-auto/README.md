# 🤖 Publication automatique Instagram — SubPilot

Publie sur Instagram via l'**API Graph officielle** de Meta, depuis une **GitHub Action**.
Toi, tu prépares le calendrier et tu cliques sur « Publier » (validation). Le reste est automatique.

## Comment ça marche
- `calendar.json` : la liste des posts (date, type, image, légende).
- `feed/` et `stories/` : les images (servies publiquement via **GitHub Pages**).
- `publish.js` : le script qui publie les posts dus.
- `.github/workflows/instagram-publish.yml` : le bouton « Publier » (Actions).
- `published.json` : le journal (mis à jour tout seul) pour ne jamais publier 2× le même post.

---

## ✅ Configuration initiale (à faire UNE fois, ~30 min)

### 1. Passer le compte Instagram en « Pro » + le relier à une Page Facebook
- Sur l'app Instagram : **Paramètres → Type de compte → Passer en compte professionnel** (Business).
- Crée (ou utilise) une **Page Facebook**, puis relie-la à ton compte Instagram :
  Page Facebook → **Paramètres → Comptes liés → Instagram**.

### 2. Créer une app Meta
- Va sur **developers.facebook.com** → *Mes apps* → **Créer une app** → type **« Entreprise »**.
- Dans l'app, ajoute le produit **« Instagram Graph API »** (ou « Instagram »).

### 3. Récupérer l'ID du compte + un jeton longue durée
Le plus simple, sans coder, via l'**Explorateur d'API Graph** (developers.facebook.com/tools/explorer) :
1. Sélectionne ton app en haut à droite.
2. **Generate Access Token** → connecte-toi et **autorise ces permissions** :
   `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`,
   `business_management`.
3. Récupère l'**ID Instagram** : dans la barre de requête, tape
   `me/accounts?fields=instagram_business_account,name` → **GET**.
   Note l'`instagram_business_account.id` (un nombre) → c'est ton **IG_USER_ID**.
4. Transforme le jeton en **longue durée** (60 jours). Dans l'explorateur, requête GET :
   `oauth/access_token?grant_type=fb_exchange_token&client_id=TON_APP_ID&client_secret=TON_APP_SECRET&fb_exchange_token=LE_JETON_COURT`
   → le champ `access_token` renvoyé est ton **IG_ACCESS_TOKEN** (longue durée).
   *(App ID et App Secret sont dans Paramètres → Général de ton app Meta.)*

### 4. Ajouter les secrets sur GitHub
Sur le repo GitHub → **Settings → Secrets and variables → Actions → New repository secret** :
- `IG_USER_ID` = l'ID du point 3.3
- `IG_ACCESS_TOKEN` = le jeton du point 3.4

> 🔒 Ne mets JAMAIS ces valeurs dans le code : uniquement dans les secrets GitHub.

---

## 🚀 Publier

1. Sur GitHub → onglet **Actions** → **« Publier sur Instagram »** → **Run workflow**.
2. Options :
   - **only_id** vide → publie tous les posts dont la date est passée/aujourd'hui.
   - **only_id** = l'`id` d'un post → publie **uniquement** celui-là (validation à l'unité).
   - **dry_run = true** → simule, ne publie rien (pour tester la config sans risque).
3. Fais **d'abord un `dry_run = true`** pour vérifier que tout est branché. ✅

## 📅 Ajouter / modifier des posts
Édite `calendar.json`. Un post :
```json
{
  "id": "identifiant-unique",
  "date": "2026-09-20",
  "type": "feed",          // "feed" | "story" | "reel"
  "image": "promo/instagram-auto/feed/mon-image.jpg",
  "caption": "Ma légende + #hashtags"
}
```
- Les images doivent être **commitées** dans le repo (elles deviennent publiques via Pages).
- Formats : **JPEG**. Feed = carré (1080×1080) ou portrait 4:5 ; Story = 9:16 ; Reel = `"video": "..."` (MP4).

## 🔁 Passer en 100 % automatique (optionnel)
Dans `.github/workflows/instagram-publish.yml`, **décommente** le bloc `schedule` → la Action
publiera chaque jour le post du jour, sans clic.

---

## ⚠️ À savoir (limites Meta)
- Le **jeton expire tous les 60 jours** → régénère-le (point 3.4) et mets à jour le secret `IG_ACCESS_TOKEN`.
- **25 publications / 24 h** maximum via l'API.
- Images **JPEG** uniquement, ≤ 8 Mo ; feed entre 4:5 et 1.91:1.
- Les **Stories** publiées par l'API n'ont pas de sticker « lien » cliquable automatique (le lien se met en bio).
