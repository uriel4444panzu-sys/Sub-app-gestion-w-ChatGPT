# SubPilot - Gestion d'abonnements

SubPilot est une application web mobile-first pour suivre ses abonnements et comprendre rapidement où part son budget récurrent.

## Fonctionnalités

- Navigation mobile par onglets : tableau de bord, abonnements, ajout et budget.
- Tableau de bord avec total mensuel, projection annuelle, prochain paiement, catégorie dominante et liste compacte des renouvellements.
- Ajout guidé avec suggestions de services populaires, modification et suppression d'abonnements.
- Gestion de plusieurs fréquences : hebdomadaire, mensuelle, trimestrielle et annuelle.
- Analyse par catégorie avec emojis explicites pour identifier les postes de dépense dominants.
- Budget mensuel configurable avec graphique de progression et simulateur d'abonnement théorique illustré par un graphique dédié.
- Bouton **Ajouter au calendrier** sur chaque abonnement pour télécharger un fichier `.ics` avec des événements distincts à J-7, J-3 et J-1.
- Priorités d'action : à garder, à réévaluer ou à résilier.
- Recherche par nom, catégorie ou priorité.
- Sauvegarde locale dans le navigateur avec `localStorage`.
- Installation sur téléphone comme une PWA, avec icône SVG texte uniquement, mode plein écran `standalone` et cache hors connexion.

## Utilisation locale

Ouvrez directement `index.html` dans un navigateur, ou lancez un petit serveur local :

```bash
python3 -m http.server 8000
```

Puis ouvrez <http://localhost:8000> sur votre ordinateur ou votre mobile connecté au même réseau.

## Ajouter les renouvellements au calendrier

SubPilot ne dépend plus d'un backend ni d'une configuration externe. Dans l'onglet **Abonnements**, chaque carte contient un bouton **Ajouter au calendrier**.

Ce bouton génère et télécharge un fichier `.ics` importable sur :

- iPhone / Apple Calendar ;
- Google Calendar ;
- Outlook ;
- Apple Calendar sur Mac.

Pour chaque abonnement, le fichier peut contenir jusqu'à 3 événements séparés si les dates ne sont pas déjà passées :

```text
J-7 à 08:00
J-3 à 08:00
J-1 à 08:00
```

Chaque événement dure 15 minutes, contient une alerte calendrier au moment de l'événement et utilise un titre clair. Exemple pour un renouvellement Netflix le 10/06/2026 :

```text
2026-06-03 08:00 → Netflix se renouvelle dans 7 jours - 13,49 €
2026-06-07 08:00 → Netflix se renouvelle dans 3 jours - 13,49 €
2026-06-09 08:00 → Netflix se renouvelle demain - 13,49 €
```

Importez ensuite le fichier `.ics` téléchargé dans l'application calendrier de votre choix.

## Si vous voyez `codex/...`, `main` ou une page dupliquée

Cela signifie qu'une résolution de conflit GitHub a probablement gardé les deux versions d'un fichier. Il faut supprimer les blocs de conflit GitHub, garder la version la plus récente de l'application, puis relancer le déploiement. Le workflow GitHub Pages vérifie maintenant ces marqueurs avant publication pour éviter de redéployer une page cassée.

## Si l'application affiche tous les onglets sur une seule page

Après une mise à jour GitHub Pages, le navigateur peut garder une ancienne version en cache. Ouvrez l'application, rechargez la page, puis si nécessaire supprimez les données du site dans le navigateur avant de la réinstaller sur l'écran d'accueil. Le service worker utilise un cache versionné et recharge la page en priorité depuis le réseau pour limiter ce problème.

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
