# AeroEnglish

Application web (style Duolingo) pour apprendre l'anglais technique de l'ingénieur maintenance :
structures composites, aéronautique, naval, automobile et industrialisation.

## Lancer l'application

```bash
python -m http.server 5180
```

Puis ouvrir http://localhost:5180 dans Chrome ou Edge (nécessaires pour les exercices de prononciation).

## Ce qu'elle fait
- **Test de niveau** au démarrage (A2 → C1), puis **adaptation automatique** : à 85 % de réussite sur les 20 dernières réponses le niveau monte, à 55 % ou moins il baisse.
- **10 unités métier** : hangar et outils, matériaux composites, dommages et CND, réparation composite, documentation de maintenance (AMM, SRM, MEL…), industrialisation (FAI, AMDEC, takt time…), qualité et sécurité, naval et automobile, réunions, e-mails et rapports.
- **Exercices** : QCM, définitions, associer les paires, texte à trous, phrase à reconstruire, écoute, dictée, traduction écrite, prononciation au micro.
- **Répétition espacée** : les mots ratés reviennent plus souvent ; bouton « Révision intelligente ».
- **Atelier d'écriture** : vraies situations (carnet de route, rapport de dommage, e-mail fournisseur ou client) avec vérification des mots-clés et réponse modèle.
- **Lexique** de plus de 100 termes avec prononciation, XP, série de jours, objectif quotidien.

La progression est enregistrée dans le navigateur (localStorage).

## Fichiers
- `data.js` : tout le contenu (vocabulaire, phrases, sujets d'écriture, test de niveau) — facile à compléter
- `app.js` : moteur d'exercices adaptatif et interface
- `style.css` : apparence
