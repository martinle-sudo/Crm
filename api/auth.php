<?php
/** Authentification : connexion, déconnexion, utilisateur courant. */

declare(strict_types=1);

function current_user(): ?array
{
    if (empty($_SESSION['uid'])) {
        return null;
    }
    $stmt = db()->prepare('SELECT id, email, name, role, active FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['uid']]);
    $user = $stmt->fetch();
    if (!$user || !$user['active']) {
        return null;
    }
    return $user;
}

function require_auth(): array
{
    $user = current_user();
    if (!$user) {
        json_error('Authentification requise.', 401);
    }
    return $user;
}

function do_login(): never
{
    $body = json_body();
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');

    if ($email === '' || $password === '') {
        json_error('Courriel et mot de passe requis.');
    }

    $stmt = db()->prepare('SELECT id, email, name, role, active, password_hash FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Comparaison à temps constant même si l'utilisateur n'existe pas.
    $hash = is_array($user)
        ? $user['password_hash']
        : '$2y$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    if (!password_verify($password, $hash) || !is_array($user)) {
        json_error('Identifiants invalides.', 401);
    }
    if (!$user['active']) {
        json_error('Compte désactivé. Contactez votre administrateur.', 403);
    }

    session_regenerate_id(true);
    $_SESSION['uid'] = $user['id'];

    json_out([
        'user' => [
            'id' => $user['id'], 'email' => $user['email'],
            'name' => $user['name'], 'role' => $user['role'],
            'active' => (bool) $user['active'],
        ],
        'csrf' => csrf_token(),
    ]);
}

function do_logout(): never
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    json_out(['ok' => true]);
}

function do_me(): never
{
    $user = current_user();
    if (!$user) {
        json_out(['user' => null]);
    }
    json_out([
        'user' => [
            'id' => $user['id'], 'email' => $user['email'],
            'name' => $user['name'], 'role' => $user['role'],
            'active' => (bool) $user['active'],
        ],
        'csrf' => csrf_token(),
    ]);
}
