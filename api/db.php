<?php
/** Connexion PDO partagée + utilitaires de base. */

declare(strict_types=1);

function crm_config(): array
{
    static $config = null;
    if ($config === null) {
        $path = __DIR__ . '/config.php';
        if (!is_file($path)) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Configuration absente. Copiez config.sample.php en config.php.']);
            exit;
        }
        $config = require $path;
    }
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = crm_config()['db'];
        $dsn = "mysql:host={$c['host']};dbname={$c['name']};charset={$c['charset']}";
        try {
            $pdo = new PDO($dsn, $c['user'], $c['pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            json_error('Connexion à la base impossible.', 500);
        }
    }
    return $pdo;
}

/** Tables d'entités autorisées (liste blanche → pas d'accès arbitraire). */
const CRM_ENTITIES = [
    'clients', 'services', 'contracts', 'employees',
    'interventions', 'invoices', 'quotes', 'leads',
];

/** Clés « singleton » (un seul enregistrement global). */
const CRM_SINGLETONS = ['company', 'preferences', 'profile', 'counters'];

function is_entity(string $name): bool
{
    return in_array($name, CRM_ENTITIES, true);
}
