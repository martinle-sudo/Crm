<?php
/**
 * Point d'entrée de l'API — Solutions Plan B CRM.
 * Appelé par le front via :  ./api/index.php?action=...
 *
 * Actions :
 *   login, logout, me            → authentification
 *   state   (GET)                → AppState complet assemblé depuis MySQL
 *   upsert  (POST)               → enregistre une entité ou un singleton
 *   delete  (POST)               → supprime une entité
 *   bulk    (POST)               → remplace toutes les données (import / reset / seed)
 */

declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/lib.php';
require __DIR__ . '/auth.php';

send_security_headers();
start_session();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    json_out(['ok' => true]); // pré-vol CORS
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':   do_login();
    case 'logout':  do_logout();
    case 'me':      do_me();

    case 'state':   require_auth(); do_state();
    case 'upsert':  require_auth(); require_csrf(); do_upsert();
    case 'delete':  require_auth(); require_csrf(); do_delete();
    case 'bulk':    require_auth(); require_csrf(); do_bulk();

    default:
        json_error('Action inconnue : ' . $action, 404);
}

/** Assemble l'état complet attendu par le front. */
function do_state(): never
{
    $state = ['schemaVersion' => 1];

    foreach (CRM_ENTITIES as $entity) {
        $rows = db()->query("SELECT id, data FROM `$entity`")->fetchAll();
        $map = [];
        foreach ($rows as $row) {
            $map[$row['id']] = json_decode($row['data'], true);
        }
        $state[$entity] = (object) $map; // objet JSON même si vide
    }

    $singletons = db()->query('SELECT k, data FROM singletons')->fetchAll();
    foreach ($singletons as $row) {
        $state[$row['k']] = json_decode($row['data'], true);
    }

    json_out(['state' => $state]);
}

function do_upsert(): never
{
    $body = json_body();
    $entity = (string) ($body['entity'] ?? '');
    $record = $body['record'] ?? null;

    if (!is_array($record)) {
        json_error('Enregistrement manquant.');
    }

    // Singleton (company, preferences, profile, counters)
    if (in_array($entity, CRM_SINGLETONS, true)) {
        $stmt = db()->prepare(
            'INSERT INTO singletons (k, data) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE data = VALUES(data)'
        );
        $stmt->execute([$entity, json_encode($record, JSON_UNESCAPED_UNICODE)]);
        json_out(['ok' => true]);
    }

    if (!is_entity($entity)) {
        json_error('Entité inconnue : ' . $entity);
    }
    $id = (string) ($record['id'] ?? '');
    if ($id === '') {
        json_error('Identifiant manquant.');
    }

    $stmt = db()->prepare(
        "INSERT INTO `$entity` (id, data) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data)"
    );
    $stmt->execute([$id, json_encode($record, JSON_UNESCAPED_UNICODE)]);
    json_out(['ok' => true]);
}

function do_delete(): never
{
    $body = json_body();
    $entity = (string) ($body['entity'] ?? '');
    $id = (string) ($body['id'] ?? '');

    if (!is_entity($entity)) {
        json_error('Entité inconnue : ' . $entity);
    }
    if ($id === '') {
        json_error('Identifiant manquant.');
    }

    $stmt = db()->prepare("DELETE FROM `$entity` WHERE id = ?");
    $stmt->execute([$id]);
    json_out(['ok' => true]);
}

/** Remplace toutes les données par l'état fourni (import / reset / seed). */
function do_bulk(): never
{
    $body = json_body();
    $state = $body['state'] ?? null;
    if (!is_array($state)) {
        json_error('État manquant.');
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        foreach (CRM_ENTITIES as $entity) {
            $pdo->exec("DELETE FROM `$entity`");
            $records = $state[$entity] ?? [];
            if (is_array($records)) {
                $stmt = $pdo->prepare("INSERT INTO `$entity` (id, data) VALUES (?, ?)");
                foreach ($records as $id => $record) {
                    $stmt->execute([(string) $id, json_encode($record, JSON_UNESCAPED_UNICODE)]);
                }
            }
        }
        $stmt = $pdo->prepare(
            'INSERT INTO singletons (k, data) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE data = VALUES(data)'
        );
        foreach (CRM_SINGLETONS as $key) {
            if (isset($state[$key])) {
                $stmt->execute([$key, json_encode($state[$key], JSON_UNESCAPED_UNICODE)]);
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Échec de l\'enregistrement en lot.', 500);
    }

    json_out(['ok' => true]);
}
