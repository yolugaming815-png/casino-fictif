# Todo et contexte actuel

Ce fichier garde les objectifs en cours et les idees importantes pour les prochaines conversations.

## Etat actuel

Le projet a beaucoup avance :

- Firebase Auth Google fonctionne.
- Les sauvegardes cloud fonctionnent.
- Inventaire avec doublons.
- Shop et caisses/coffres.
- Machine a pince avec fragments/cles.
- Amis, messages, trades et activite sociale.
- Classement avec profils publics.
- Jeux en ligne : duels et poker.
- Console admin par commandes.
- Skins blackjack images importees.

## Priorites actuelles

1. Stabiliser l'espace admin.
   - Verifier que seuls les admins voient l'onglet.
   - Garder les commandes utiles.
   - Ajouter si besoin une meilleure liste d'IDs utilisables pour skins/coffres/salons.

2. Ameliorer l'experience multijoueur.
   - Eviter tout besoin de refresh.
   - Afficher clairement l'etat de synchronisation.
   - Bloquer les actions impossibles.
   - Nettoyer les salons abandonnes.

3. Polir les visuels des skins.
   - Blackjack : verifier recadrage et affichage des cartes.
   - Shop : avant + dos pour les cartes.
   - Inventaire/caisses/profils : dos seul.
   - Jeux : utiliser le skin equipe et le meme style que le shop.

4. Continuer la machine a pince/coffres speciaux.
   - Rendre l'animation de pince plus naturelle.
   - Verifier probabilites : tentative 75 credits, cles completes rares, fragments rares, credits souvent inferieurs au cout.
   - Les coffres speciaux doivent utiliser la meme animation d'ouverture que les caisses normales.

5. Garder le mobile propre.
   - Plinko a des multiplicateurs mobiles differents.
   - Tester les grands panneaux sur telephone.
   - Eviter textes qui debordent dans les boutons/cartes.

## Idees pour l'admin

Commandes deja presentes :

- argent : add/remove/set/reset
- skins : add/remove/reset
- ressources speciales : key/fragments/chest add/remove
- prix : set price skin/case/chest
- moderation : ban/unban
- salons : delete/finish/reset room

Ameliorations possibles :

- `/list skins`
- `/list rooms`
- `/list players`
- `/give all chest nebula 1`
- `/clear trades pending`
- `/mute @joueur`
- `/rename @joueur NouveauNom`
- `/set case-cost plinkoBall 120` alias plus simple
- boutons admin rapides autour de la console.

## Risques connus

- `src/App.tsx` est tres gros. Les modifications longues peuvent facilement casser une accolade ou un rendu conditionnel.
- Les regles Firestore doivent etre coherentes avec le client.
- Les documents Firestore sont sensibles aux majuscules/minuscules, surtout les UID admin.
- Les images blackjack sont lourdes, le build affiche un warning de taille.
- Il existe des fichiers racine obsoletes qui ressemblent aux vrais fichiers.
- PowerShell peut bloquer `npm`; utiliser `npm.cmd`.
- OneDrive peut parfois generer des soucis Git temporaires.

## Checklist avant deploy

```powershell
npm.cmd run build
npm.cmd test
git status --short
```

Ensuite ne stage que les fichiers utiles. Exemple :

```powershell
git add src/App.tsx src/App.module.css src/firebaseClient.ts firestore.rules docs AGENTS.md
git commit -m "Met a jour le contexte projet"
git push
```

## Notes Firebase importantes

Publier `firestore.rules` manuellement si les regles changent.

Pour admin :

```text
admins/<uid exact>
enabled: true (boolean)
```

Le dernier UID admin discute etait :

```text
D558gcxDvLftqv16wLMfD5czFl22
```

Verifier la casse exacte depuis l'onglet Admin si besoin.
