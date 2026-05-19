# Conventions du projet

## Langue et communication

- Repondre a Yoann en francais.
- Garder un ton simple et pratique.
- Eviter les explications trop techniques quand une instruction concrete suffit.
- Donner les commandes PowerShell avec `npm.cmd` si elles utilisent npm.

## Code

- TypeScript + React.
- Preferer modifier les vrais fichiers dans `src/`.
- Ne pas modifier les anciens fichiers racine `App.tsx`, `App.module.css`, `firebaseClient.ts` sauf demande explicite.
- Garder les changements scopes et verifier le build.
- Pour la logique testable, mettre les calculs dans `src/*Logic.ts` plutot que tout mettre dans `App.tsx`.
- Ajouter/adapter les tests quand une regle de jeu change.

## UI

- L'application est un jeu, donc l'interface peut etre visuelle et ludique, mais elle doit rester lisible sur mobile.
- Les elements repetes peuvent utiliser des cartes, mais eviter d'empiler trop de cartes dans des cartes.
- Les skins doivent etre coherents entre shop, inventaire, profils et jeu.
- Les textes doivent rester courts et lisibles sur mobile.
- Les onglets avec actions sociales affichent des badges quand il y a du nouveau.
- L'onglet Admin est visible seulement si `isAdmin === true`.

## Firebase

- Les variables Firebase existent dans `.env.local` et/ou Vercel.
- Le code contient aussi une config par defaut dans `src/firebaseClient.ts`.
- Apres modification de `firestore.rules`, rappeler que les regles doivent etre publiees dans Firebase Console.
- Ne jamais permettre a un utilisateur de se donner les droits admin depuis l'app.
- Pour verifier admin :
  - collection `admins`
  - document `uid exact`
  - champ `enabled`
  - type `boolean`
  - valeur `true`

## Firestore

Collections principales :

- `players`
- `leaderboard`
- `friendRequests`
- `privateMessages`
- `skinTrades`
- `onlineRooms`
- `admins`
- `adminSettings`
- `adminLogs`

Les operations multijoueur doivent fonctionner en temps reel via listeners.

## Git

Yoann pousse souvent depuis PowerShell. Lui donner des commandes simples.

Avant de proposer un commit, verifier `git status --short` pour ne pas inclure les fichiers temporaires.

Ne pas ajouter :

- `card-recadrage-check.png`
- `src/assets/blackjack/_crop-check.png`
- `src/assets/blackjack/_crop-check-2.png`
- fichiers de logs temporaires sauf demande explicite.

## Commandes

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run dev
npm.cmd run preview
```

Si PowerShell bloque `npm`, utiliser `npm.cmd`.

Si Git dit `fatal: not a git repository`, l'utilisateur n'est probablement pas dans :

```powershell
C:\Users\yoann\OneDrive\Documents\New project
```

Commande utile :

```powershell
cd "C:\Users\yoann\OneDrive\Documents\New project"
```

## Regles metier importantes

- Credits virtuels uniquement.
- Pas de monetisation reelle.
- Pas de remboursement automatique des doublons de skins.
- Les skins equipes ne doivent pas creer de nouveaux exemplaires au refresh.
- La pause/jeu responsable doit rester disponible.
- Le reset de credits joueur ne doit pas etre visible pour les joueurs normaux.
- Les messages prives doivent rester limites aux amis.
- Les trades peuvent rester ouverts a tous les joueurs, meme non amis.
- Les salons en ligne inactifs doivent etre nettoyes.
- Les joueurs bannis ne doivent pas pouvoir charger leur sauvegarde normalement.

## Verification

Avant une reponse finale apres changement :

1. Lancer `npm.cmd run build`.
2. Lancer `npm.cmd test` si la logique a change.
3. Mentionner les fichiers modifies.
4. Donner les commandes Git exactes si Yoann doit deployer.
