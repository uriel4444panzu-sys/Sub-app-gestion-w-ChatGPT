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
- Notifications de rappel à J-7, J-3 et J-1 avant les renouvellements, avec permission utilisateur et test de notification.

## Utilisation locale

Ouvrez directement `index.html` dans un navigateur, ou lancez un petit serveur local :

```bash
python3 -m http.server 8000
```

Puis ouvrez <http://localhost:8000> sur votre ordinateur ou votre mobile connecté au même réseau.



## Notifications de rappel

SubPilot peut demander l'autorisation d'envoyer des notifications depuis le tableau de bord. Une fois les rappels activés, l'application surveille les abonnements qui arrivent à échéance et envoie une alerte à J-7, J-3 puis J-1 pour éviter les mauvaises surprises.

Sur une application statique publiée avec GitHub Pages, il n'y a pas de serveur de push permanent : les rappels sont donc vérifiés quand l'application installée s'ouvre, reprend le focus ou quand le navigateur réveille la PWA. Le service worker contient aussi un gestionnaire `push` prêt pour brancher plus tard un backend de notifications Web Push si vous voulez des envois garantis même sans ouvrir l'application.

## Si vous voyez `codex/...`, `main` ou une page dupliquée

Cela signifie qu'une résolution de conflit GitHub a probablement gardé les deux versions d'un fichier. Il faut supprimer les blocs de conflit GitHub, garder la version la plus récente de l'application, puis relancer le déploiement. Le workflow GitHub Pages vérifie maintenant ces marqueurs avant publication pour éviter de redéployer une page cassée.

## Si l'application affiche tous les onglets sur une seule page

Après une mise à jour GitHub Pages, le navigateur peut garder une ancienne version en cache. Ouvrez l'application, rechargez la page, puis si nécessaire supprimez les données du site dans le navigateur avant de la réinstaller sur l'écran d'accueil. Le service worker utilise maintenant un cache versionné et recharge la page en priorité depuis le réseau pour limiter ce problème.

## Publier l'application avec GitHub Pages

Pour utiliser SubPilot facilement depuis un téléphone, le plus simple est de publier le dépôt avec GitHub Pages :

1. Créez une pull request avec ces fichiers puis fusionnez-la sur GitHub.
2. Dans GitHub, ouvrez le dépôt puis allez dans **Settings** > **Pages**.
3. Dans **Build and deployment**, choisissez **GitHub Actions** comme source.
4. Le workflow `.github/workflows/pages.yml` publiera automatiquement l'application après chaque push sur `main` ou `master`.
5. Une fois le déploiement terminé, GitHub affichera une URL du type `https://votre-compte.github.io/votre-repo/`.
6. Ouvrez cette URL sur votre téléphone, puis installez SubPilot depuis Chrome ou Safari.

## Installation sur téléphone

L'application est une PWA installable :

- **Android / Chrome** : ouvrez l'application, puis utilisez le bouton **Installer** ou le menu Chrome > **Ajouter à l'écran d'accueil**.
- **iPhone / Safari** : ouvrez l'application, touchez **Partager**, puis **Sur l'écran d'accueil**.

Une fois ajoutée, SubPilot s'ouvre comme une application classique depuis l'écran d'accueil et peut charger son interface même hors connexion grâce au service worker. Le projet évite les fichiers binaires afin que les pull requests et extractions restent lisibles.
