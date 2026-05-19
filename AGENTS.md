# Casino fictif - Memoire Codex

Ce fichier sert de contexte persistant pour les prochaines conversations Codex. Lis-le avant de modifier le projet.

## Objectif du projet

Application React/Vite d'un casino fictif avec credits virtuels uniquement. Le jeu contient des mini-jeux solo, des salons en ligne, des comptes Google via Firebase, une sauvegarde cloud, un inventaire de skins, des caisses/coffres, des amis, messages, trades, classement et une console admin.

Le ton attendu avec Yoann est simple, direct et non technique quand c'est possible. Il prefere qu'on fasse les changements dans le projet et qu'on lui donne ensuite les commandes Git faciles a copier.

## Architecture rapide

- `src/main.tsx` monte l'application React.
- `src/App.tsx` contient la majorite de l'interface, des etats React et des liaisons entre jeux, Firebase, boutique, inventaire et salons en ligne.
- `src/App.module.css` contient presque tout le style visuel.
- `src/firebaseClient.ts` contient Firebase Auth, Firestore, sauvegardes, leaderboard, amis, messages, trades, salons en ligne, poker/duels et commandes admin.
- `src/*Logic.ts` contient la logique testable des jeux et systemes.
- `src/*Logic.test.ts` contient les tests Node natifs.
- `firestore.rules` contient les regles de securite Firebase a publier manuellement dans Firebase Console.
- `src/assets/blackjack/` contient les images de cartes blackjack utilisees dans le shop, l'inventaire et le jeu.
- `scripts/make-standalone.mjs` genere `dist/standalone.html` apres le build.

Important : des anciens fichiers existent a la racine (`App.tsx`, `App.module.css`, `firebaseClient.ts`). Les vrais fichiers actifs sont dans `src/`. Ne modifie les fichiers racine que si l'utilisateur le demande explicitement.

## Commandes utiles

Sous PowerShell, utiliser `npm.cmd` pour eviter les blocages de scripts :

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run dev
npm.cmd run preview
```

Scripts disponibles :

- `npm.cmd run dev` : serveur Vite local.
- `npm.cmd run build` : TypeScript + build Vite + generation `dist/standalone.html`.
- `npm.cmd test` : tests de logique.
- `npm.cmd run preview` : preview locale sur `127.0.0.1:4173`.

Quand Yoann doit pousser :

```powershell
git add <fichiers>
git commit -m "Message clair"
git push
```

Ne pas ajouter les fichiers temporaires de verification :

- `card-recadrage-check.png`
- `src/assets/blackjack/_crop-check.png`
- `src/assets/blackjack/_crop-check-2.png`

## Structure du projet

```text
.
+-- AGENTS.md
+-- docs/
|   +-- architecture.md
|   +-- conventions.md
|   +-- todo.md
+-- firestore.rules
+-- package.json
+-- scripts/
|   +-- make-standalone.mjs
|   +-- serve-dist.mjs
|   +-- start-dev.ps1
|   +-- start-preview.cmd
+-- src/
|   +-- App.tsx
|   +-- App.module.css
|   +-- firebaseClient.ts
|   +-- main.tsx
|   +-- index.css
|   +-- assets/blackjack/
|   +-- gameLogic.ts
|   +-- blackjackLogic.ts
|   +-- plinkoLogic.ts
|   +-- rouletteLogic.ts
|   +-- rocketLogic.ts
|   +-- caseLogic.ts
|   +-- shopLogic.ts
|   +-- pokerLogic.ts
|   +-- *.test.ts
+-- vite.config.js
```

## Fonctionnalites actuelles

- Auth Google Firebase.
- Sauvegarde cloud des credits, inventaire, skins equipes, ressources speciales.
- Leaderboard avec profil joueur public.
- Systeme d'amis, demandes, messages prives entre amis.
- Trades de skins/credits entre joueurs, sans obligation d'etre amis.
- Activite sociale avec badges.
- Jeux solo : machine a sous, blackjack, plinko, roulette, rocket games.
- Jeux en ligne : duels en 3 manches, salons, invitations, poker en ligne avec table, pot, mises, gagnants, nouvelle main et nettoyage des salons inactifs.
- Cases opening avec animation, doublons conserves, inventaire comptant les exemplaires.
- Coffres speciaux achetables, cles/fragments, machine a pince.
- Shop avec prix par rarete et overrides admin.
- Console admin par commandes.

## Systeme admin

Un utilisateur est admin uniquement si Firestore contient :

```text
collection: admins
document: <uid Firebase Auth exact>
field: enabled
type: boolean
value: true
```

Exemple vu pendant le debug :

```text
admins/D558gcxDvLftqv16wLMfD5czFl22
enabled = true
```

Attention : Firebase est sensible aux majuscules/minuscules. `Fl22` et `FL22` ne sont pas le meme ID.

Les admins sont lus via `watchAdminStatus` dans `src/firebaseClient.ts`. L'onglet Admin ne doit etre visible que si `isAdmin === true`. Les joueurs non admin ne doivent pas voir cet onglet.

Commandes admin existantes :

```text
/help
/add money 500 @Lucas
/remove money 100 @Daniel
/set money 1000 @Yoann_H92
/reset money @all
/add skin cards-aqua @Lucas
/remove skin cards-aqua @Lucas
/reset skins @Lucas
/add key nebula 1 @Lucas
/add fragments orbital 3 @Lucas
/add chest royal 1 @Lucas
/remove key nebula 1 @Lucas
/remove fragments orbital 3 @Lucas
/remove chest royal 1 @Lucas
/set price skin cards-aqua 500
/set price case plinkoBall 150
/set price chest nebula 1200
/ban @Lucas
/unban @Lucas
/delete room ROOM_ID
/finish room ROOM_ID
/reset room ROOM_ID
```

Les regles admin doivent aussi etre publiees dans Firebase Console > Cloud Firestore > Regles. Pousser sur GitHub/Vercel ne publie pas automatiquement `firestore.rules`.

## Regles importantes

- Le site est un casino fictif : credits virtuels uniquement, pas d'argent reel.
- Garder le bouton de jeu responsable/pause.
- Ne pas remettre de bouton reset qui remet les credits a zero.
- Les doublons de skins sont volontaires : ne pas rembourser automatiquement les caisses.
- Les skins equipes ne doivent pas se dupliquer au refresh.
- Les affichages shop, inventaire, profils et jeux doivent utiliser les memes visuels de skins.
- Les cartes blackjack doivent afficher les deux faces dans le shop, mais seulement le dos dans l'inventaire et les caisses.
- Les jeux multijoueur doivent se mettre a jour en temps reel avec Firestore `onSnapshot`, pas demander aux joueurs de refresh.
- Les salons en attente/inactifs doivent etre nettoyes pour eviter d'accumuler des documents.
- Pour mobile, Plinko a des multiplicateurs differents afin d'eviter trop de gains extremes.
- Quand une modification touche la logique, ajouter ou adapter les tests dans `src/*Logic.test.ts`.

## Fichiers critiques

- `src/App.tsx` : tres gros fichier central. Modifier avec prudence et verifier le build.
- `src/firebaseClient.ts` : toutes les operations Firestore. Bien respecter les regles de securite.
- `firestore.rules` : doit rester coherent avec les lectures/ecritures du client.
- `src/shopLogic.ts` : source des skins, categories, prix et items.
- `src/caseLogic.ts` : definitions des caisses/coffres et tirages.
- `src/plinkoLogic.ts` : multiplicateurs desktop/mobile.
- `src/pokerLogic.ts` : evaluation des mains poker.
- `src/assets/blackjack/` : images lourdes, attention aux noms importes dans `App.tsx`.

## Verification avant de finir

Toujours faire au minimum :

```powershell
npm.cmd run build
```

Si la logique de jeu/Firebase autour des donnees change, faire aussi :

```powershell
npm.cmd test
```

Apres changement visuel important, lancer le serveur local et verifier dans le navigateur si possible.

## Documentation liee

- `docs/architecture.md` : architecture detaillee.
- `docs/conventions.md` : conventions de code, UI, Firebase et Git.
- `docs/todo.md` : objectifs actuels, risques et prochaines etapes.
