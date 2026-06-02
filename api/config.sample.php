<?php
/**
 * Configuration du backend — Solutions Plan B CRM.
 *
 * 1. Copiez ce fichier en « config.php » (sur le même serveur).
 * 2. Remplissez vos identifiants MySQL Dreamhost (panneau → MySQL Databases).
 * 3. Ne versionnez JAMAIS config.php (il contient un mot de passe).
 *
 * Le .htaccess de ce dossier bloque l'accès direct à config.php.
 */

return [
    // ── Base de données MySQL (Dreamhost) ───────────────────────────────
    'db' => [
        'host'    => 'mysql.votredomaine.com', // hôte fourni par Dreamhost
        'name'    => 'solutionsplanb_crm',      // nom de la base
        'user'    => 'crm_user',                // utilisateur MySQL
        'pass'    => 'CHANGEZ_MOI',             // mot de passe MySQL
        'charset' => 'utf8mb4',
    ],

    // ── Sécurité ────────────────────────────────────────────────────────
    // Mettez true en production (HTTPS obligatoire pour les cookies sécurisés).
    'cookie_secure' => true,

    // Origine autorisée pour les requêtes (laissez vide si l'app et l'API
    // sont sur le même domaine, ce qui est le cas recommandé). Sinon, ex. :
    // 'https://crm.votredomaine.com'
    'allowed_origin' => '',

    // Jeton requis pour exécuter install.php (changez-le, puis supprimez
    // install.php après l'installation).
    'install_token' => 'CHANGEZ_CE_JETON',
];
