# SubPilot - Gestion d'abonnements

SubPilot est une application web mobile-first pour suivre ses abonnements et comprendre rapidement où part son budget récurrent.

## Fonctionnalités

- Navigation mobile par onglets : tableau de bord, abonnements, ajout et budget.
- Tableau de bord avec total mensuel, projection annuelle, prochain paiement, catégorie dominante et liste compacte des renouvellements.
- Ajout guidé avec suggestions de services populaires, icônes de services générées sans logo de marque, modification et suppression d'abonnements, avec date exacte de renouvellement visible dans la liste complète.
- Gestion de plusieurs fréquences : hebdomadaire, mensuelle, trimestrielle et annuelle, avec mise à jour automatique des dates de prélèvement dépassées.
- Analyse par catégorie avec icônes visuelles personnalisables pour identifier les postes de dépense dominants.
- Budget mensuel configurable avec graphique de progression et simulateur d'abonnement théorique illustré par un graphique dédié.
- Bouton **Ajouter au calendrier** sur chaque abonnement pour télécharger un fichier `.ics` avec des événements distincts à J-7, J-3 et J-1.
- Priorités d'action : à garder, à réévaluer ou à résilier.
- Recherche par nom, catégorie ou priorité.
- Page d’inscription/connexion au lancement avec création de compte, connexion e-mail/mot de passe, Google, mot de passe oublié et synchronisation Firebase.
- Onglet **Compte** dédié au profil connecté : informations personnelles consultables et modifiables, photo de profil depuis la galerie ou l’appareil photo, synchronisation manuelle et déconnexion.
- Connexion rapide : SubPilot mémorise le dernier profil utilisé sur l’appareil pour afficher une carte avec photo, nom et bouton **Connexion** sans mélanger les données entre comptes.
- Sauvegarde locale dans le navigateur avec `localStorage`, et synchronisation cloud Firebase quand `firebase-config.js` est configuré.
- Installation sur téléphone comme une PWA, avec icône SVG texte uniquement, mode plein écran `standalone` et cache hors connexion.

## Utilisation locale

Ouvrez directement `index.html` dans un navigateur, ou lancez un petit serveur local :

```bash
python3 -m http.server 8000
```

Puis ouvrez <http://localhost:8000> sur votre ordinateur ou votre mobile connecté au même réseau.

## Comptes, Google et import e-mail

SubPilot peut désormais utiliser de vrais comptes avec **Firebase Authentication** et synchroniser les données dans **Cloud Firestore**. Tant que `firebase-config.js` n'est pas rempli, l'application reste en mode local uniquement.

Des comptes individuels sont pertinents pour :

- retrouver ses abonnements sur plusieurs appareils ;
- sauvegarder ses données si le téléphone est changé ;
- isoler strictement les données de chaque utilisateur ;
- autoriser plus tard un import e-mail via OAuth Gmail/Outlook avec consentement explicite.

### Page d’inscription et migration des anciennes données

Quand Firebase est configuré, SubPilot affiche d’abord une page d’accueil/authentification. L’utilisateur doit créer un compte ou se connecter avant d’accéder à l’application.

Le formulaire d’inscription demande : prénom, nom, sexe optionnel, date de naissance, e-mail, mot de passe et confirmation. SubPilot bloque l’inscription si l’utilisateur a moins de 13 ans ou si les mots de passe ne correspondent pas. Le mot de passe n’est jamais écrit en clair dans Firestore : il est géré par Firebase Authentication.

Après connexion, l’onglet **Compte** n’affiche plus de formulaire secondaire : il sert de tableau de bord personnel avec prénom, nom, sexe, date de naissance, e-mail, méthode de connexion et photo de profil. Pour les comptes Google, SubPilot récupère le nom, l’e-mail et la photo fournis par Google quand ils sont disponibles ; l’utilisateur peut ensuite compléter ou corriger les champs manquants directement depuis cet onglet.

Les profils sont enregistrés dans Firestore sous :

```text
users/<uid>/profile/details
```

Si des données locales existent sur l’appareil au moment de la connexion, SubPilot demande si l’utilisateur veut les importer dans le compte. En cas de refus, les données locales restent intactes et les données du compte connecté sont chargées séparément. Le dernier profil utilisé est aussi mémorisé localement dans `subpilot-remembered-profile` uniquement pour faciliter la reconnexion sur cet appareil ; aucun mot de passe n’est stocké.

Le lien **Mot de passe oublié ?** utilise Firebase Auth pour envoyer un e-mail de réinitialisation et affiche toujours le message générique :

```text
Un email de réinitialisation a été envoyé si ce compte existe.
```

### Configuration Firebase

1. Créez un projet Firebase.
2. Ajoutez une application Web dans la console Firebase.
3. Copiez la configuration Web dans `firebase-config.js`.
4. Activez **Authentication > Sign-in method > Email/Password**.
5. Activez **Authentication > Sign-in method > Google** et ajoutez le domaine GitHub Pages dans les domaines autorisés.
6. Activez **Firestore Database**.
7. Publiez à nouveau l'application.

Les données utilisateur sont stockées dans Firestore sous :

```text
users/<uid>/data/app
```

Exemple de règles Firestore minimales pour isoler chaque espace utilisateur :

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Le scrapping e-mail ne doit jamais lire une boîte mail sans autorisation. La bonne approche est un accès OAuth limité, révocable, et traité côté serveur sécurisé.

### Compte admin

Un compte admin n'est pas indispensable pour la première version si l'application ne propose que des espaces personnels. Il deviendra utile quand il faudra gérer du support utilisateur, modérer des intégrations, consulter des métriques anonymisées, gérer des signalements ou piloter des offres payantes.

## Catégories et icônes

SubPilot propose davantage de catégories par défaut et permet de créer une catégorie personnalisée depuis le choix **Autre** : nom, sigle visuel court et couleur. L’utilisateur n’a pas besoin d’ouvrir un clavier emoji : il choisit une icône dans un petit sélecteur cohérent avec l’identité visuelle, ou saisit un sigle de 1 à 3 caractères.

Pour éviter les risques liés aux marques et droits d'auteur, l'application utilise actuellement des icônes générées sous forme d'initiales/sigles stylisés plutôt que des emojis ou des logos officiels. Les vrais logos pourront être ajoutés plus tard seulement si l'application utilise une source autorisée ou les logos fournis explicitement par l'utilisateur/service.

## Ajouter les renouvellements au calendrier

SubPilot ne dépend plus d'un backend ni d'une configuration externe. Dans l'onglet **Abonnements**, chaque carte contient un bouton **Ajouter au calendrier**. Dans l'application, le panneau reste volontairement simple : il explique seulement que l'utilisateur peut ajouter des rappels de renouvellement dans son calendrier.

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

## Mise à jour automatique des prochaines dates

Quand l'application s'ouvre ou qu'un abonnement est ajouté/modifié, SubPilot vérifie la date du prochain prélèvement. Si elle est déjà passée, elle avance automatiquement la date selon la fréquence :

- hebdomadaire : prochaine occurrence de 7 jours en 7 jours ;
- mensuelle : prochain mois pertinent ;
- trimestrielle : prochain trimestre pertinent ;
- annuelle : prochaine année pertinente.

Exemple : un abonnement mensuel prévu le 10/05/2026 affichera automatiquement l'occurrence suivante si cette date est dépassée.

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
