// Configuration runtime du CRM — éditable SANS recompiler l'application.
//
// apiBase vide ("")  → mode LOCAL : les données vivent dans le navigateur
//                      (IndexedDB). Idéal pour tester ou un usage solo.
//
// apiBase = "api"    → mode SERVEUR : les données sont stockées dans MySQL via
//                      le backend PHP (dossier /api). Connexion requise,
//                      données partagées entre tous les postes.
//
// Le chemin est relatif à la page : « api » pointe vers ./api/index.php.
window.__CRM_CONFIG__ = {
  apiBase: '',
};
