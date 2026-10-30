# Visuels promotionnels SubPilot

Jeu complet de visuels au design actuel (palette vert profond / vert citron, v55).
Tout est régénéré depuis l'application réelle : ce sont de vraies captures, pas des maquettes.

## Les 7 écrans

| # | Écran | Ce qu'il montre |
|---|---|---|
| 01 | Tableau de bord | Total du mois, annuel estimé, prochain paiement, répartition |
| 02 | Abonnements | La liste complète, les rappels automatiques, le bouton Résilier |
| 03 | Ajouter | L'e-mail collé, détecté, et le formulaire pré-rempli |
| 04 | Budget | Jauge de dépassement, répartition par catégorie, simulateur |
| 05 | Rappels | Les notifications avant chaque prélèvement |
| 06 | Mes données | Hébergement en France, contact, suppression du compte |
| 07 | Ordinateur | La mise en page bureau, pour montrer le multi-appareil |

Chaque écran existe en **thème clair** et **thème sombre**.

## Les 3 formats

| Dossier | Format | Usage |
|---|---|---|
| `captures/` | 1170 × 2532 (PNG) | Captures brutes, sans décor — à réutiliser librement |
| `posts/` | 1080 × 1350 (JPEG) | Publication dans le fil, format 4:5 |
| `stories/` | 1080 × 1920 (JPEG) | Stories et Reels |

Les visuels `posts/` et `stories/` sont prêts à publier : logo, accroche, sous-titre,
mockup de l'appareil et mention « gratuit · iPhone · Android · Windows · Mac ».

## Régénérer après un changement de design

Le script de capture vit dans le dossier de travail de la session Claude Code
(`promo/shoot.js` + `promo/compose.html`). Il lance l'application en local, prend
les captures dans les deux thèmes, puis compose les visuels. Demande simplement
une régénération : les écrans, les accroches et les formats sont décrits en haut
du script.

## À noter

Les fichiers `01-apercu.svg` à `04-resiliation.svg`, `index.html` et `video.html`
datent de la première identité (bleu indigo) et ne correspondent plus au design
actuel. À refaire ou à supprimer.
