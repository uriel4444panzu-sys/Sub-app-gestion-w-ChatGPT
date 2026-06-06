# SubPilot - Gestion d'abonnements

SubPilot est une application web mobile-first pour suivre ses abonnements et comprendre rapidement où part son budget récurrent.

## Fonctionnalités

- Navigation mobile par onglets : tableau de bord, abonnements, ajout et budget.
- Tableau de bord avec total mensuel, projection annuelle, prochain paiement, catégorie dominante, liste compacte des renouvellements et rappels de notification.
- Ajout guidé avec suggestions de services populaires, modification et suppression d'abonnements.
- Gestion de plusieurs fréquences : hebdomadaire, mensuelle, trimestrielle et annuelle.
- Analyse par catégorie avec emojis explicites pour identifier les postes de dépense dominants.
- Budget mensuel configurable avec graphique de progression et simulateur d'abonnement théorique illustré par un graphique dédié.
- Priorités d'action : à garder, à réévaluer ou à résilier.
- Recherche par nom, catégorie ou priorité.
- Sauvegarde locale dans le navigateur avec `localStorage`.
- Installation sur téléphone comme une PWA, avec icône SVG texte uniquement, mode plein écran `standalone` et cache hors connexion.
- Notifications Web Push à J-7, J-3 et J-1 avant les renouvellements avec backend Node.js, clés VAPID, permission utilisateur et test de notification.

## Utilisation locale

Pour tester seulement l'interface sans backend push, vous pouvez lancer un petit serveur statique :

```bash
python3 -m http.server 8000
```

Puis ouvrez <http://localhost:8000> sur votre ordinateur ou votre mobile connecté au même réseau.

Pour tester les vraies notifications Web Push avec VAPID, utilisez le backend Node.js :

```bash
npm install
npm run vapid:generate
cp .env.example .env
# Collez les clés VAPID générées dans .env, puis :
npm start
```

L'application sera servie par défaut sur <http://localhost:3000>. Sur téléphone, ouvrez l'URL HTTPS de votre hébergeur backend, installez la PWA, puis activez les rappels depuis le tableau de bord.



## Notifications Web Push avec VAPID

SubPilot contient maintenant un backend Node.js (`server.js`) qui expose les routes nécessaires aux notifications Web Push :

- `GET /api/vapid-public-key` : donne à l'application la clé publique VAPID.
- `POST /api/push-subscriptions` : enregistre l'abonnement push du téléphone et une copie minimale des abonnements à surveiller.
- `POST /api/push-test` : envoie une notification de test depuis le serveur.

Une fois les rappels activés, le backend vérifie toutes les heures les renouvellements à venir et envoie une notification à J-7, J-3 puis J-1. Les notifications déjà envoyées sont mémorisées dans `data/push-subscriptions.json` pour éviter les doublons.

> Important : GitHub Pages peut continuer à héberger l'interface statique, mais il ne peut pas exécuter `server.js`. Pour des notifications push garanties quand l'app est fermée, déployez aussi le backend sur un hébergeur Node.js comme Render, Railway, Fly.io, un VPS ou tout autre service capable de garder le serveur actif en HTTPS.

## Si vous voyez `codex/...`, `main` ou une page dupliquée

Cela signifie qu'une résolution de conflit GitHub a probablement gardé les deux versions d'un fichier. Il faut supprimer les blocs de conflit GitHub, garder la version la plus récente de l'application, puis relancer le déploiement. Le workflow GitHub Pages vérifie maintenant ces marqueurs avant publication pour éviter de redéployer une page cassée.

## Si l'application affiche tous les onglets sur une seule page

Après une mise à jour GitHub Pages, le navigateur peut garder une ancienne version en cache. Ouvrez l'application, rechargez la page, puis si nécessaire supprimez les données du site dans le navigateur avant de la réinstaller sur l'écran d'accueil. Le service worker utilise maintenant un cache versionné et recharge la page en priorité depuis le réseau pour limiter ce problème.

## Publier l'application avec GitHub Pages

Pour utiliser SubPilot facilement depuis un téléphone sans backend, le plus simple est de publier le dépôt avec GitHub Pages :

1. Créez une pull request avec ces fichiers puis fusionnez-la sur GitHub.
2. Dans GitHub, ouvrez le dépôt puis allez dans **Settings** > **Pages**.
3. Dans **Build and deployment**, choisissez **GitHub Actions** comme source.
4. Le workflow `.github/workflows/pages.yml` publiera automatiquement l'application après chaque push sur `main` ou `master`.
5. Une fois le déploiement terminé, GitHub affichera une URL du type `https://votre-compte.github.io/votre-repo/`.
6. Ouvrez cette URL sur votre téléphone, puis installez SubPilot depuis Chrome ou Safari.

Pour les vraies notifications Web Push, utilisez plutôt l'URL HTTPS du backend Node.js ou configurez un hébergement qui sert à la fois l'application et les routes `/api/*`.

## Installation sur téléphone

L'application est une PWA installable :

- **Android / Chrome** : ouvrez l'application, puis utilisez le bouton **Installer** ou le menu Chrome > **Ajouter à l'écran d'accueil**.
- **iPhone / Safari** : ouvrez l'application, touchez **Partager**, puis **Sur l'écran d'accueil**.

Une fois ajoutée, SubPilot s'ouvre comme une application classique depuis l'écran d'accueil et peut charger son interface même hors connexion grâce au service worker. Le projet évite les fichiers binaires afin que les pull requests et extractions restent lisibles.
