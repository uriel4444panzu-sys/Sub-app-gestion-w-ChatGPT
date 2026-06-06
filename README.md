# SubPilot - Gestion d'abonnements

SubPilot est une application web mobile-first pour suivre ses abonnements et comprendre rapidement où part son budget récurrent.

## Fonctionnalités

- Navigation mobile par onglets : tableau de bord, abonnements, ajout et budget.
- Tableau de bord avec total mensuel, projection annuelle, prochain paiement, catégorie dominante et liste compacte des renouvellements.
- Ajout guidé avec suggestions de services populaires, modification et suppression d'abonnements.
- Gestion de plusieurs fréquences : hebdomadaire, mensuelle, trimestrielle et annuelle.
- Analyse par catégorie avec emojis explicites pour identifier les postes de dépense dominants.
- Budget mensuel configurable avec graphique de progression et simulateur d'abonnement théorique illustré par un graphique dédié.
- Bouton **Créer un rappel iPhone** sur chaque abonnement pour lancer un raccourci iOS avec une liste de rappels distincts à J-7, J-3 et J-1.
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

## Rappels iPhone avec l'app Raccourcis

SubPilot ne dépend plus d'un backend ni d'une configuration complexe. Dans l'onglet **Abonnements**, chaque carte contient un bouton **Créer un rappel iPhone**.

Ce bouton ouvre l'app **Raccourcis** avec une URL du type :

```text
shortcuts://run-shortcut?name=Ajouter%20abonnement%20rappel&input=text&text=...
```

Avant de l'utiliser, créez sur votre iPhone un raccourci nommé exactement :

```text
Ajouter abonnement rappel
```

Le raccourci reçoit un texte JSON avec une liste `rappels`. Chaque élément contient une date d'alerte ISO fiable et un titre prêt à utiliser :

```json
{
  "rappels": [
    {
      "dateAlerte": "2026-06-03T09:00:00",
      "titre": "Netflix se renouvelle dans 7 jours - 13,49 €"
    },
    {
      "dateAlerte": "2026-06-07T09:00:00",
      "titre": "Netflix se renouvelle dans 3 jours - 13,49 €"
    },
    {
      "dateAlerte": "2026-06-09T09:00:00",
      "titre": "Netflix se renouvelle demain - 13,49 €"
    }
  ]
}
```

Dans Raccourcis, ne créez pas un rappel avec toute l'**Entrée du raccourci** comme titre. Il faut convertir l'entrée en dictionnaire, récupérer la liste `rappels`, puis utiliser **Répéter avec chaque élément**. Dans la boucle, créez un rappel avec `titre` comme titre et `dateAlerte` comme date d'alerte. Cela crée bien 3 rappels iOS séparés quand J-7, J-3 et J-1 sont encore pertinents.

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
