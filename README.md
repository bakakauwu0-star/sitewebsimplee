# 𝓼ιмρℓє — site web

Site vitrine + dashboard pour le bot Discord **𝓼ιмρℓє**.

## ✨ Fonctionnel sans backend

Le site fonctionne **immédiatement** après déploiement, même sans serveur :
le portail utilise un *mode démo* (données locales + `localStorage`) pour la
connexion, le dashboard, le chat et la gestion des rôles. Tout est interactif
et persistant dans le navigateur.

Si tu héberges le vrai backend du bot, renseigne son URL dans le champ
« URL du bot » de la page de connexion : le portail bascule automatiquement
sur les routes `/api/*` (voir `api/index.php` pour une implémentation PHP
d'exemple, optionnelle).

## 📁 Structure

```
index.html      Page d'accueil + connexion
dashboard.html  Panneau de contrôle (membres)
styles.css      Design system commun
app.js          Logique partagée (auth, données, API)
api/index.php   API PHP optionnelle (persistance côté serveur)
api/.htaccess   Réécriture d'URL propre pour l'API
```

## 🚀 Hébergement

### cPanel (Git™ Version Control)
1. **Git Version Control** : Crée un dépôt avec :
   - Clone URL = `https://github.com/bakakauwu0-star/sitewebsimplee.git`
   - Repository Path = `sitewebsimplee`
2. Le dépôt doit être **public** sur GitHub pour un clonage HTTPS sans clé SSH.
3. Le site est live sur `http://tondomaine.com/sitewebsimplee/`.

### GitHub Pages
`Settings → Pages → Source : main / (root)`. En ligne sur
`https://bakakauwu0-star.github.io/sitewebsimplee/` (mode démo actif).

## 🔑 Connexion (démo)
Entre un ID Discord (ex. `412345678901234567`) → le dashboard s'ouvre.
Aucune donnée n'est envoyée à un serveur en mode démo.
