# Déploiement sur Dreamhost (hébergement partagé)

Ce CRM peut tourner de deux façons. Choisissez selon votre besoin :

| Mode | Données | Quand l'utiliser |
|------|---------|------------------|
| **Local** (défaut) | Dans le navigateur (IndexedDB) | Test, démo, usage solo sur un seul poste |
| **Serveur** | MySQL via le backend PHP (`/api`) | Vrai usage : données partagées entre postes/employés, connexion, sauvegarde serveur |

---

## A. Préparer le build

Sur votre ordinateur (une fois Node.js installé) :

```sh
npm install
npm run build
```

Le dossier **`dist/`** est généré : ce sont les fichiers du site à téléverser.

> Si vous hébergez dans un sous-dossier (ex. `votredomaine.com/crm/`), buildez avec
> `VITE_BASE=/crm/ npm run build`. À la racine du domaine, rien à changer.

---

## B. Déploiement en mode LOCAL (le plus simple, 5 min)

1. Dans le panneau Dreamhost, assurez-vous que votre domaine est en hébergement web.
2. Téléversez **le contenu de `dist/`** dans le dossier du domaine
   (`~/votredomaine.com/`) via SFTP ou le gestionnaire de fichiers.
3. Visitez `https://votredomaine.com` → l'app fonctionne immédiatement.

Aucune base de données requise. Chaque navigateur garde ses propres données.
Sauvegarde via le bouton **Exporter (JSON)** dans l'en-tête.

---

## C. Déploiement en mode SERVEUR (MySQL + connexion)

### 1. Créer la base de données MySQL

Dans le panneau Dreamhost → **Databases → MySQL Databases** :
- Créez une nouvelle base (ex. `solutionsplanb_crm`).
- Créez un utilisateur MySQL avec un mot de passe fort.
- Notez l'**hôte** (ex. `mysql.votredomaine.com`), le **nom de la base**,
  l'**utilisateur** et le **mot de passe**.

### 2. Activer HTTPS

Panneau Dreamhost → **Secure Hosting** → activez le certificat **Let's Encrypt**
(gratuit). **Obligatoire** : la connexion sécurisée exige HTTPS.

### 3. Téléverser les fichiers

Dans `~/votredomaine.com/`, téléversez :
- **le contenu de `dist/`** (l'application)
- **le dossier `api/`** entier (le backend PHP)

Vous devez obtenir cette structure :

```
votredomaine.com/
├── index.html
├── config.js
├── assets/
└── api/
    ├── index.php
    ├── db.php  auth.php  lib.php
    ├── schema.sql  install.php
    ├── config.sample.php
    └── .htaccess
```

### 4. Configurer le backend

- Copiez `api/config.sample.php` en **`api/config.php`**.
- Éditez `api/config.php` avec vos identifiants MySQL (étape 1).
- Mettez `'cookie_secure' => true` (HTTPS actif).
- Choisissez un `install_token` secret.

### 5. Créer les tables et l'administrateur

- Visitez `https://votredomaine.com/api/install.php`.
- Saisissez le jeton d'installation, votre nom, courriel et un mot de passe (8+ car.).
- **Supprimez ensuite `api/install.php`** (sécurité).

> Alternative : importez `api/schema.sql` via phpMyAdmin, puis utilisez
> `install.php` uniquement pour créer l'admin.

### 6. Activer le mode serveur dans l'app

Éditez **`config.js`** (à la racine, à côté de `index.html`) :

```js
window.__CRM_CONFIG__ = {
  apiBase: 'api',   // ← activez le mode serveur
};
```

Rechargez `https://votredomaine.com` → un écran de **connexion** apparaît.
Connectez-vous avec le compte créé à l'étape 5. 🎉

### 7. (Optionnel) Ajouter d'autres utilisateurs

Chaque employé qui doit accéder au CRM a besoin d'un compte. Pour l'instant,
ajoutez-les via phpMyAdmin dans la table `users` (le mot de passe doit être
hashé avec `password_hash`). Un écran de gestion des utilisateurs peut être
ajouté ultérieurement.

---

## Sécurité — points importants

- `api/config.php` contient votre mot de passe MySQL : il n'est **jamais**
  versionné (voir `.gitignore`) et son accès direct est bloqué par `.htaccess`.
- Toujours servir le site en **HTTPS**.
- Supprimez `install.php` après l'installation.
- Le backend utilise des **requêtes préparées** (PDO), le **hachage bcrypt** des
  mots de passe, des **cookies de session HttpOnly/Secure** et une protection
  **CSRF**.

## Sauvegardes

- Mode serveur : sauvegardez la base MySQL depuis le panneau Dreamhost, ou via
  le bouton **Exporter (JSON)** de l'app.
- Le bouton **Importer (JSON)** (Paramètres) restaure un export.
