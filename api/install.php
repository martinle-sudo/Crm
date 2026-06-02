<?php
/**
 * Installateur unique — crée les tables et le premier compte administrateur.
 *
 * Utilisation :
 *   1. Configurez config.php (identifiants MySQL + install_token).
 *   2. Visitez  https://votredomaine.com/api/install.php
 *   3. Saisissez le jeton d'installation, un courriel et un mot de passe.
 *   4. SUPPRIMEZ ce fichier après usage.
 *
 * Sécurité : refuse de s'exécuter si un utilisateur existe déjà.
 */

declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/lib.php';

$config = crm_config();
$done = false;
$error = null;

// Création des tables (idempotent).
try {
    $sql = file_get_contents(__DIR__ . '/schema.sql');
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
        if ($statement !== '' && stripos($statement, 'SET NAMES') !== 0) {
            db()->exec($statement);
        }
    }
} catch (Throwable $e) {
    $error = 'Création des tables impossible : ' . $e->getMessage();
}

$userCount = (int) db()->query('SELECT COUNT(*) AS n FROM users')->fetch()['n'];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$error) {
    if ($userCount > 0) {
        $error = 'Un administrateur existe déjà. Supprimez install.php.';
    } else {
        $token = (string) ($_POST['token'] ?? '');
        $email = strtolower(trim((string) ($_POST['email'] ?? '')));
        $name  = trim((string) ($_POST['name'] ?? 'Administrateur'));
        $pass  = (string) ($_POST['password'] ?? '');

        if (!hash_equals((string) ($config['install_token'] ?? ''), $token)) {
            $error = 'Jeton d\'installation invalide.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = 'Courriel invalide.';
        } elseif (strlen($pass) < 8) {
            $error = 'Le mot de passe doit comporter au moins 8 caractères.';
        } else {
            $id = bin2hex(random_bytes(8));
            $stmt = db()->prepare(
                'INSERT INTO users (id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([$id, $email, $name, 'admin', password_hash($pass, PASSWORD_DEFAULT)]);
            $done = true;
        }
    }
}

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Installation — Solutions Plan B CRM</title>
<style>
  body { font-family: system-ui, sans-serif; background:#06070b; color:#e4e4e7; display:flex; min-height:100vh; align-items:center; justify-content:center; margin:0; }
  .card { background:#0f1219; border:1px solid #ffffff14; border-radius:18px; padding:28px; width:100%; max-width:380px; }
  h1 { font-size:18px; margin:0 0 4px; }
  p { color:#a1a1aa; font-size:13px; margin:0 0 18px; }
  label { display:block; font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:#71717a; margin:14px 0 4px; }
  input { width:100%; box-sizing:border-box; padding:9px 11px; border-radius:10px; border:1px solid #ffffff1a; background:#ffffff08; color:#fff; }
  button { margin-top:18px; width:100%; padding:10px; border:0; border-radius:10px; background:#a78bfa; color:#06070b; font-weight:600; cursor:pointer; }
  .msg { padding:10px 12px; border-radius:10px; font-size:13px; margin-bottom:14px; }
  .err { background:#fda4af1a; color:#fda4af; }
  .ok  { background:#6ee7b71a; color:#6ee7b7; }
</style>
</head>
<body>
<div class="card">
  <h1>Installation du CRM</h1>
  <p>Solutions Plan B — création du compte administrateur.</p>

  <?php if ($error): ?><div class="msg err"><?= htmlspecialchars($error) ?></div><?php endif; ?>

  <?php if ($done): ?>
    <div class="msg ok">Compte créé avec succès. <strong>Supprimez maintenant install.php</strong> puis connectez-vous au CRM.</div>
  <?php elseif ($userCount > 0): ?>
    <div class="msg err">Un administrateur existe déjà. Supprimez install.php pour des raisons de sécurité.</div>
  <?php else: ?>
    <form method="post">
      <label>Jeton d'installation</label>
      <input name="token" type="text" autocomplete="off" required>
      <label>Nom</label>
      <input name="name" type="text" value="Administrateur">
      <label>Courriel</label>
      <input name="email" type="email" required>
      <label>Mot de passe (8+ caractères)</label>
      <input name="password" type="password" required>
      <button type="submit">Créer l'administrateur</button>
    </form>
  <?php endif; ?>
</div>
</body>
</html>
