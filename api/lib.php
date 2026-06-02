<?php
/** Utilitaires HTTP/JSON + CSRF + sessions. */

declare(strict_types=1);

function json_out($data, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $code = 400): never
{
    json_out(['error' => $message], $code);
}

/** Corps JSON de la requête, en tableau associatif. */
function json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_error('Corps de requête JSON invalide.');
    }
    return $data;
}

/** Démarre la session avec des cookies durcis. */
function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (bool) (crm_config()['cookie_secure'] ?? true);
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'secure'   => $secure,
        'samesite' => 'Lax',
    ]);
    session_name('crm_session');
    session_start();
}

/** En-têtes de sécurité + CORS éventuel (même origine recommandé). */
function send_security_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: same-origin');

    $origin = crm_config()['allowed_origin'] ?? '';
    if ($origin !== '' && ($_SERVER['HTTP_ORIGIN'] ?? '') === $origin) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, X-CRM-CSRF');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    }
}

/** Jeton CSRF lié à la session (créé au besoin). */
function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

/** Vérifie le jeton CSRF pour toute requête mutante. */
function require_csrf(): void
{
    $sent = $_SERVER['HTTP_X_CRM_CSRF'] ?? '';
    $known = $_SESSION['csrf'] ?? '';
    if ($known === '' || !hash_equals($known, $sent)) {
        json_error('Jeton CSRF invalide ou manquant.', 419);
    }
}
