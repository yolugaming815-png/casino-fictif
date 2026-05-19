# Architecture du projet

Ce document decrit comment le projet est organise pour permettre a une nouvelle conversation Codex de reprendre rapidement.

## Vue d'ensemble

Le projet est une application React + Vite + TypeScript. Elle est essentiellement front-end, avec Firebase pour l'authentification Google, Firestore pour les sauvegardes et les donnees multijoueur, et Vercel/GitHub pour le deploiement.

Le coeur de l'app est dans `src/App.tsx`. Les fichiers `src/*Logic.ts` isolent les calculs testables : gains, tirages, mains de poker, plinko, roulette, rocket game, boutique et caisses.

## Flux principal

1. `src/main.tsx` rend `<App />`.
2. `src/App.tsx` initialise les etats de jeu, charge les donnees Firebase et affiche les sections.
3. `src/firebaseClient.ts` fournit les fonctions de lecture/ecriture Firestore.
4. Les jeux utilisent les modules `src/*Logic.ts`.
5. Le style vient de `src/App.module.css` et `src/index.css`.

## Donnees locales et cloud

La sauvegarde cloud est dans Firestore, principalement dans :

- `players/{uid}` : sauvegarde privee du joueur.
- `leaderboard/{uid}` : profil public, score, inventaire public, skins equipes.
- `friendRequests/{id}` : demandes d'amis.
- `privateMessages/{id}` : messages prives entre amis.
- `skinTrades/{id}` : offres d'echange.
- `onlineRooms/{id}` : duels et tables poker.
- `duelHistory/{id}` et documents associes : historique/statistiques de duel.
- `admins/{uid}` : droits admin.
- `adminSettings/shopOverrides` : prix modifies par admin.
- `adminLogs/{id}` : journal de commandes admin.

Les regles correspondantes sont dans `firestore.rules`.

## Sections UI

`MainSection` dans `src/App.tsx` controle les onglets principaux :

- `games` : jeux solo.
- `online` : jeux en ligne.
- `cases` : caisses, coffres speciaux, fragments/cles.
- `shop` : achat de skins/coffres.
- `inventory` : inventaire avec doublons.
- `friends` : demandes et liste d'amis.
- `trades` : echanges.
- `messages` : messages prives.
- `activity` : activite sociale.
- `admin` : console admin, visible seulement aux admins.

## Jeux solo

- Machine a sous : `src/gameLogic.ts`
- Blackjack : `src/blackjackLogic.ts`
- Plinko : `src/plinkoLogic.ts`
- Roulette : `src/rouletteLogic.ts`
- Rocket Games : `src/rocketLogic.ts`

Les composants UI de ces jeux sont dans `src/App.tsx`.

## Cases, boutique et inventaire

- Les skins sont definis dans `src/shopLogic.ts`.
- Les caisses normales et coffres speciaux sont dans `src/caseLogic.ts`.
- Les doublons sont volontaires et doivent rester visibles dans l'inventaire.
- Les prix par defaut suivent la rarete : commun 200, rare 400, epique 700, legendaire 1000.
- Les prix peuvent etre modifies par l'admin via `adminSettings/shopOverrides`.

## Multijoueur

Les salons en ligne utilisent `onlineRooms`.

Duels :

- 2 joueurs.
- 3 manches.
- Score par joueur.
- Gagnant + historique + stats victoire/defaite.
- Invitations privees possibles.

Poker :

- Salle avec joueurs.
- Pot, mise actuelle, contributions.
- Phases poker.
- Cartes communes, mains, joueurs couches.
- Showdown avec gagnants et partage possible.
- Bouton nouvelle main sans recréer le salon.
- Nettoyage des salons en attente ou inactifs.

Les mises a jour doivent rester temps reel via `onSnapshot`, pas via refresh manuel.

## Admin

`watchAdminStatus` observe `admins/{uid}`. Si `enabled === true`, `isAdmin` passe a `true` et l'onglet Admin s'affiche.

La console admin execute les commandes avec `executeAdminCommand`.

Les operations admin modifient :

- `players`
- `leaderboard`
- `onlineRooms`
- `adminSettings/shopOverrides`
- `adminLogs`

Les admins ne doivent pas pouvoir etre crees depuis le client. Le document `admins/{uid}` est cree manuellement dans Firebase Console.

## Assets

Les images blackjack sont dans `src/assets/blackjack/`.

Regle visuelle actuelle :

- Shop blackjack : afficher avant + dos.
- Inventaire/caisses/profil : afficher seulement le dos.
- Jeu blackjack : les cartes face visible utilisent l'image face du skin equipe.

Les assets sont lourds, donc Vite affiche un avertissement de taille au build. Ce n'est pas bloquant.

## Build

`npm.cmd run build` lance :

1. TypeScript.
2. Vite production build.
3. `scripts/make-standalone.mjs` pour generer `dist/standalone.html`.

Le warning de chunk > 500 kB est attendu a cause des assets cartes.
