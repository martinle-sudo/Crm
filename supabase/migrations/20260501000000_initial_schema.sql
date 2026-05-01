-- ============================================================
-- CRM Entretien Ménager - Schéma Initial Supabase
-- Migration: 20260501000000_initial_schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('direction', 'personnel', 'supervisor');
CREATE TYPE contract_frequency AS ENUM ('weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'one_time');
CREATE TYPE contract_status AS ENUM ('pending_activation', 'active', 'paused', 'cancelled', 'completed');
CREATE TYPE work_order_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'invoiced');
CREATE TYPE assignment_status AS ENUM ('pending', 'en_route', 'on_site', 'completed', 'cancelled');
CREATE TYPE team_type AS ENUM ('solo', 'duo');
CREATE TYPE incident_status AS ENUM ('open', 'acknowledged', 'resolved');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE prospect_status AS ENUM ('lead', 'contacted', 'proposal_sent', 'signed', 'lost');
CREATE TYPE proposal_status AS ENUM ('draft', 'sent', 'signed', 'declined', 'expired');
CREATE TYPE material_request_status AS ENUM ('pending', 'approved', 'ordered', 'fulfilled', 'rejected');
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'critical');
CREATE TYPE timesheet_code AS ENUM ('transit_A', 'work_B');

-- ============================================================
-- PROFILES (étend auth.users de Supabase)
-- ============================================================

CREATE TABLE profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role            user_role   NOT NULL DEFAULT 'personnel',
    first_name      TEXT        NOT NULL,
    last_name       TEXT        NOT NULL,
    phone           TEXT,
    employee_code   TEXT        UNIQUE,
    hourly_rate     NUMERIC(10, 2),
    is_supervisor   BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Extension de auth.users. role=direction → Niveau 1 (accès complet), role=personnel → Niveau 2 (accès restreint aux bons assignés).';

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE TABLE clients (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name          TEXT,
    first_name            TEXT        NOT NULL,
    last_name             TEXT        NOT NULL,
    email                 TEXT,
    phone                 TEXT,
    phone_secondary       TEXT,
    -- Adresse de facturation
    billing_address       TEXT,
    billing_city          TEXT,
    billing_province      TEXT        DEFAULT 'QC',
    billing_postal_code   TEXT,
    billing_country       TEXT        DEFAULT 'CA',
    -- Adresse de service (peut différer)
    service_address       TEXT,
    service_city          TEXT,
    service_province      TEXT        DEFAULT 'QC',
    service_postal_code   TEXT,
    service_country       TEXT        DEFAULT 'CA',
    -- Codes d'accès (visibles au personnel assigné seulement)
    door_code             TEXT,
    alarm_code            TEXT,
    entry_instructions    TEXT,
    parking_instructions  TEXT,
    -- CRM
    notes                 TEXT,
    internal_alerts       TEXT,
    is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
    -- Intégration Sage
    sage_client_id        TEXT        UNIQUE,
    sage_account_number   TEXT,
    -- Méta
    created_by            UUID        REFERENCES profiles(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE clients IS 'Fiches clients. Les colonnes financières sont masquées au personnel via la vue client_basic_info et les politiques RLS.';

-- ============================================================
-- GABARITS DE LISTES DE VÉRIFICATION (Templates)
-- ============================================================

CREATE TABLE checklist_templates (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT        NOT NULL,
    description TEXT,
    is_master   BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by  UUID        REFERENCES profiles(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE checklist_template_items (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id   UUID        NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
    task_name     TEXT        NOT NULL,
    task_description TEXT,
    task_icon     TEXT,
    display_order INTEGER     NOT NULL DEFAULT 0,
    is_mandatory  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONTRATS
-- ============================================================

CREATE SEQUENCE contract_number_seq START 1;

CREATE TABLE contracts (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id               UUID            NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    checklist_template_id   UUID            REFERENCES checklist_templates(id),
    -- Numérotation
    contract_number         TEXT            UNIQUE,
    title                   TEXT,
    -- Planification
    frequency               contract_frequency NOT NULL,
    preferred_day_of_week   SMALLINT        CHECK (preferred_day_of_week BETWEEN 0 AND 6),
    preferred_time          TIME,
    team_type               team_type       NOT NULL DEFAULT 'solo',
    estimated_duration_minutes INTEGER,
    -- Finances (structure prête pour Sage)
    base_price              NUMERIC(10, 2)  NOT NULL,
    currency                CHAR(3)         NOT NULL DEFAULT 'CAD',
    tax_rate_gst            NUMERIC(5, 4)   NOT NULL DEFAULT 0.0500,   -- TPS 5 %
    tax_rate_qst            NUMERIC(5, 4)   NOT NULL DEFAULT 0.09975,  -- TVQ 9,975 %
    gst_number              TEXT,
    qst_number              TEXT,
    -- Statut (pending_activation = dans le Sas, en attente d'activation manuelle)
    status                  contract_status NOT NULL DEFAULT 'pending_activation',
    activation_date         DATE,
    start_date              DATE,
    end_date                DATE,
    -- Notes
    special_instructions    TEXT,
    internal_notes          TEXT,
    -- Sage
    sage_contract_id        TEXT            UNIQUE,
    sage_revenue_account    TEXT,
    -- Méta
    activated_by            UUID            REFERENCES profiles(id),
    created_by              UUID            REFERENCES profiles(id),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE contracts IS 'status=pending_activation → dans le Sas opérationnel. Le répartiteur active manuellement pour déclencher la génération des bons de travail récurrents.';
COMMENT ON COLUMN contracts.tax_rate_gst IS 'TPS fédérale 5 %. Modifiable si le client est exempté.';
COMMENT ON COLUMN contracts.tax_rate_qst IS 'TVQ provinciale 9,975 %. Modifiable si le client est exempté.';

-- Personnalisation par client (ajouts/retraits par rapport au gabarit)
CREATE TABLE contract_checklist_overrides (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id      UUID        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    template_item_id UUID        REFERENCES checklist_template_items(id),
    task_name        TEXT        NOT NULL,
    task_description TEXT,
    task_icon        TEXT,
    display_order    INTEGER     NOT NULL DEFAULT 0,
    is_included      BOOLEAN     NOT NULL DEFAULT TRUE,  -- FALSE = tâche retirée du gabarit
    is_mandatory     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BONS DE TRAVAIL (Work Orders)
-- ============================================================

CREATE SEQUENCE work_order_number_seq START 1;

CREATE TABLE work_orders (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id             UUID            NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    client_id               UUID            NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    -- Numérotation et planification
    work_order_number       TEXT            UNIQUE,
    scheduled_date          DATE            NOT NULL,
    scheduled_time          TIME,
    team_type               team_type       NOT NULL DEFAULT 'solo',
    -- Statut agrégé (complété seulement quand TOUS les employés ont terminé)
    status                  work_order_status NOT NULL DEFAULT 'scheduled',
    all_employees_completed BOOLEAN         NOT NULL DEFAULT FALSE,
    completed_at            TIMESTAMPTZ,
    -- Facturation
    invoice_id              UUID,           -- FK ajoutée après création de la table invoices
    -- Méta
    notes                   TEXT,
    is_recurring            BOOLEAN         NOT NULL DEFAULT TRUE,
    recurrence_index        INTEGER,
    created_by              UUID            REFERENCES profiles(id),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE work_orders IS 'Bon de travail global. Le statut passe à completed uniquement quand tous les work_order_assignments sont completed.';

-- Assignations individuelles par employé (horodatage distinct par personne)
CREATE TABLE work_order_assignments (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id             UUID            NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    employee_id               UUID            NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    -- Statut individuel
    status                    assignment_status NOT NULL DEFAULT 'pending',
    -- Code A – Transit (non rémunéré si premier client de la journée)
    is_first_client_of_day    BOOLEAN         NOT NULL DEFAULT FALSE,
    transit_start_time        TIMESTAMPTZ,
    transit_end_time          TIMESTAMPTZ,
    transit_duration_minutes  NUMERIC(8, 2)   GENERATED ALWAYS AS (
        CASE
            WHEN transit_start_time IS NOT NULL AND transit_end_time IS NOT NULL
            THEN EXTRACT(EPOCH FROM (transit_end_time - transit_start_time)) / 60.0
            ELSE NULL
        END
    ) STORED,
    -- Code B – Travail sur site
    work_start_time           TIMESTAMPTZ,
    work_end_time             TIMESTAMPTZ,
    work_duration_minutes     NUMERIC(8, 2)   GENERATED ALWAYS AS (
        CASE
            WHEN work_start_time IS NOT NULL AND work_end_time IS NOT NULL
            THEN EXTRACT(EPOCH FROM (work_end_time - work_start_time)) / 60.0
            ELSE NULL
        END
    ) STORED,
    -- Verrou incident (le bouton "Terminer" est bloqué si TRUE)
    has_blocking_incident     BOOLEAN         NOT NULL DEFAULT FALSE,
    employee_notes            TEXT,
    created_at                TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (work_order_id, employee_id)
);

COMMENT ON TABLE work_order_assignments IS 'Horodatage individuel par employé. transit_duration_minutes = Code A (transit), work_duration_minutes = Code B (travail facturable). is_first_client_of_day=TRUE → transit non payé.';

-- ============================================================
-- LISTE DE VÉRIFICATION DU BON DE TRAVAIL
-- ============================================================

CREATE TABLE work_order_checklist_items (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id    UUID        NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    -- Référence à la source (copie immuable au moment de la création du bon)
    template_item_id UUID        REFERENCES checklist_template_items(id),
    override_item_id UUID        REFERENCES contract_checklist_overrides(id),
    -- Détails de la tâche
    task_name        TEXT        NOT NULL,
    task_description TEXT,
    task_icon        TEXT,
    display_order    INTEGER     NOT NULL DEFAULT 0,
    is_mandatory     BOOLEAN     NOT NULL DEFAULT FALSE,
    -- Complétion partagée en temps réel entre les membres de l'équipe
    is_completed     BOOLEAN     NOT NULL DEFAULT FALSE,
    completed_by     UUID        REFERENCES profiles(id),
    completed_at     TIMESTAMPTZ,
    task_notes       TEXT,
    task_photo_url   TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE work_order_checklist_items IS 'Cases cochées partagées en temps réel via Supabase Realtime. Si employé A coche, employé B voit la mise à jour instantanément.';

-- ============================================================
-- INCIDENTS
-- ============================================================

CREATE TABLE incidents (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id               UUID            NOT NULL REFERENCES work_orders(id) ON DELETE RESTRICT,
    work_order_assignment_id    UUID            NOT NULL REFERENCES work_order_assignments(id) ON DELETE RESTRICT,
    reported_by                 UUID            NOT NULL REFERENCES profiles(id),
    -- Détails
    title                       TEXT            NOT NULL,
    description                 TEXT            NOT NULL,
    severity                    TEXT            NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    -- Photos obligatoires avant de pouvoir terminer le bon
    photo_urls                  TEXT[]          NOT NULL DEFAULT '{}',
    -- Statut (aucune notification automatique au client)
    status                      incident_status NOT NULL DEFAULT 'open',
    acknowledged_by             UUID            REFERENCES profiles(id),
    acknowledged_at             TIMESTAMPTZ,
    resolution_notes            TEXT,
    resolved_by                 UUID            REFERENCES profiles(id),
    resolved_at                 TIMESTAMPTZ,
    -- Notification manuelle seulement
    client_notified             BOOLEAN         NOT NULL DEFAULT FALSE,
    client_notified_at          TIMESTAMPTZ,
    client_notified_by          UUID            REFERENCES profiles(id),
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE incidents IS 'Bloquant: le bouton Terminer est verrouillé si un incident est open sans photo ET sans description. Aucune notification automatique au client.';

-- ============================================================
-- FACTURES (Facturation – structure Sage)
-- ============================================================

CREATE SEQUENCE invoice_number_seq START 1;

CREATE TABLE invoices (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id         UUID            UNIQUE REFERENCES work_orders(id),
    client_id             UUID            NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    contract_id           UUID            NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    -- Numérotation
    invoice_number        TEXT            UNIQUE NOT NULL,
    invoice_date          DATE            NOT NULL DEFAULT CURRENT_DATE,
    due_date              DATE,
    -- Montants (structure Sage : sous-total → taxes → total)
    subtotal              NUMERIC(12, 2)  NOT NULL,
    discount_amount       NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    taxable_amount        NUMERIC(12, 2)  NOT NULL,
    gst_rate              NUMERIC(5, 4)   NOT NULL DEFAULT 0.0500,
    gst_amount            NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    qst_rate              NUMERIC(5, 4)   NOT NULL DEFAULT 0.09975,
    qst_amount            NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    total_amount          NUMERIC(12, 2)  NOT NULL,
    currency              CHAR(3)         NOT NULL DEFAULT 'CAD',
    -- Comptes du grand livre (GL) pour Sage
    revenue_account       TEXT,
    tax_account_gst       TEXT,
    tax_account_qst       TEXT,
    -- Statut
    status                invoice_status  NOT NULL DEFAULT 'draft',
    sent_at               TIMESTAMPTZ,
    sent_by               UUID            REFERENCES profiles(id),
    paid_at               TIMESTAMPTZ,
    paid_amount           NUMERIC(12, 2),
    payment_method        TEXT,
    payment_reference     TEXT,
    -- Rappels de paiement (alertes internes, pas automatiques)
    reminder_15_sent_at   TIMESTAMPTZ,
    reminder_30_sent_at   TIMESTAMPTZ,
    reminder_45_sent_at   TIMESTAMPTZ,
    -- Sage
    sage_invoice_id       TEXT            UNIQUE,
    sage_synced_at        TIMESTAMPTZ,
    -- Méta
    internal_notes        TEXT,
    created_by            UUID            REFERENCES profiles(id),
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invoices IS 'Générée uniquement quand tous les employés assignés ont cliqué Terminer. Structure prête pour synchronisation Sage (par lots ou temps réel).';
COMMENT ON COLUMN invoices.revenue_account IS 'Code de compte GL Sage, ex: 4100-Services.';
COMMENT ON COLUMN invoices.tax_account_gst IS 'Compte GL Sage pour TPS, ex: 2310-TPS.';
COMMENT ON COLUMN invoices.tax_account_qst IS 'Compte GL Sage pour TVQ, ex: 2315-TVQ.';

-- Lignes de facture (Code A = Transit, Code B = Travail)
CREATE TABLE invoice_line_items (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id    UUID            NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description   TEXT            NOT NULL,
    billing_code  CHAR(1)         NOT NULL CHECK (billing_code IN ('A', 'B')),
    quantity      NUMERIC(10, 2)  NOT NULL,
    unit          TEXT            NOT NULL DEFAULT 'hr',
    unit_price    NUMERIC(10, 2)  NOT NULL,
    amount        NUMERIC(12, 2)  NOT NULL,
    sage_account_code TEXT,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN invoice_line_items.billing_code IS 'A = temps de transit (Code A), B = temps de travail facturable (Code B).';

-- FK circulaire ajoutée après la création des deux tables
ALTER TABLE work_orders
    ADD CONSTRAINT fk_work_orders_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- ============================================================
-- FEUILLES DE TEMPS (Paie automatisée)
-- ============================================================

CREATE TABLE timesheet_entries (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_assignment_id  UUID            NOT NULL REFERENCES work_order_assignments(id) ON DELETE CASCADE,
    employee_id               UUID            NOT NULL REFERENCES profiles(id),
    work_order_id             UUID            NOT NULL REFERENCES work_orders(id),
    code                      timesheet_code  NOT NULL,
    start_time                TIMESTAMPTZ     NOT NULL,
    end_time                  TIMESTAMPTZ     NOT NULL,
    duration_minutes          NUMERIC(8, 2)   GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60.0
    ) STORED,
    -- is_paid = FALSE pour le premier transit de la journée
    is_paid                   BOOLEAN         NOT NULL DEFAULT TRUE,
    hourly_rate_snapshot      NUMERIC(10, 2),
    amount                    NUMERIC(10, 2),
    sage_payroll_code         TEXT,
    approved_by               UUID            REFERENCES profiles(id),
    approved_at               TIMESTAMPTZ,
    created_at                TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE timesheet_entries IS 'Auto-générées depuis work_order_assignments. Code transit_A → is_paid=FALSE si is_first_client_of_day=TRUE. Code work_B toujours payé.';

-- ============================================================
-- DEMANDES DE MATÉRIEL
-- ============================================================

CREATE TABLE material_requests (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id    UUID            REFERENCES work_orders(id),
    requested_by     UUID            NOT NULL REFERENCES profiles(id),
    item_name        TEXT            NOT NULL,
    item_description TEXT,
    quantity         INTEGER         NOT NULL DEFAULT 1,
    unit             TEXT,
    urgency          TEXT            NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
    status           material_request_status NOT NULL DEFAULT 'pending',
    approved_by      UUID            REFERENCES profiles(id),
    approved_at      TIMESTAMPTZ,
    fulfillment_notes TEXT,
    fulfilled_at     TIMESTAMPTZ,
    notes            TEXT,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROSPECTION ET SOUMISSIONS (Kanban CRM)
-- ============================================================

CREATE SEQUENCE proposal_number_seq START 1;

CREATE TABLE prospects (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name      TEXT,
    first_name        TEXT            NOT NULL,
    last_name         TEXT            NOT NULL,
    email             TEXT,
    phone             TEXT,
    address           TEXT,
    city              TEXT,
    province          TEXT            DEFAULT 'QC',
    -- Kanban
    status            prospect_status NOT NULL DEFAULT 'lead',
    source            TEXT,
    assigned_to       UUID            REFERENCES profiles(id),
    kanban_position   INTEGER         DEFAULT 0,
    notes             TEXT,
    first_contact_date DATE,
    last_contact_date  DATE,
    signed_date       DATE,
    lost_date         DATE,
    lost_reason       TEXT,
    created_by        UUID            REFERENCES profiles(id),
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE proposals (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prospect_id                 UUID            NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    proposal_number             TEXT            UNIQUE,
    title                       TEXT            NOT NULL,
    description                 TEXT,
    frequency                   contract_frequency NOT NULL,
    team_type                   team_type       NOT NULL DEFAULT 'solo',
    estimated_duration_minutes  INTEGER,
    price                       NUMERIC(10, 2)  NOT NULL,
    currency                    CHAR(3)         NOT NULL DEFAULT 'CAD',
    status                      proposal_status NOT NULL DEFAULT 'draft',
    sent_at                     TIMESTAMPTZ,
    sent_by                     UUID            REFERENCES profiles(id),
    signed_at                   TIMESTAMPTZ,
    declined_at                 TIMESTAMPTZ,
    expiry_date                 DATE,
    internal_notes              TEXT,
    created_by                  UUID            REFERENCES profiles(id),
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDITS QUALITÉ (Superviseur)
-- ============================================================

CREATE TABLE audits (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id   UUID            NOT NULL REFERENCES work_orders(id) ON DELETE RESTRICT,
    supervisor_id   UUID            NOT NULL REFERENCES profiles(id),
    audit_date      DATE            NOT NULL DEFAULT CURRENT_DATE,
    audit_start_time TIMESTAMPTZ,
    audit_end_time  TIMESTAMPTZ,
    overall_score   NUMERIC(5, 2),
    general_notes   TEXT,
    -- Employés évalués (pour le suivi RH)
    employee_ids    UUID[]          NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audits IS 'Les résultats des audits ne modifient pas les routes ni la facturation. Ils alimentent employee_performance_reviews uniquement.';

CREATE TABLE audit_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id            UUID            NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    checklist_item_id   UUID            REFERENCES work_order_checklist_items(id),
    task_name           TEXT            NOT NULL,
    task_icon           TEXT,
    score               SMALLINT        CHECK (score BETWEEN 0 AND 5),
    notes               TEXT,
    photo_urls          TEXT[]          DEFAULT '{}',
    passed              BOOLEAN,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PERFORMANCE EMPLOYÉS (RH)
-- ============================================================

CREATE TABLE employee_performance_reviews (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id         UUID            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    period_start        DATE            NOT NULL,
    period_end          DATE            NOT NULL,
    total_work_orders   INTEGER         DEFAULT 0,
    total_work_hours    NUMERIC(10, 2)  DEFAULT 0,
    total_transit_hours NUMERIC(10, 2)  DEFAULT 0,
    average_audit_score NUMERIC(5, 2),
    total_incidents     INTEGER         DEFAULT 0,
    notes               TEXT,
    reviewed_by         UUID            REFERENCES profiles(id),
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE employee_performance_reviews IS 'Données RH confidentielles. Non visibles au personnel via RLS. Alimentées par les audits et les feuilles de temps.';

-- ============================================================
-- NOTIFICATIONS / ALERTES
-- ============================================================

CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id        UUID            REFERENCES profiles(id),
    target_role         user_role,
    type                TEXT            NOT NULL,
    priority            notification_priority NOT NULL DEFAULT 'normal',
    title               TEXT            NOT NULL,
    body                TEXT,
    -- Références aux enregistrements concernés
    work_order_id       UUID            REFERENCES work_orders(id),
    incident_id         UUID            REFERENCES incidents(id),
    invoice_id          UUID            REFERENCES invoices(id),
    material_request_id UUID            REFERENCES material_requests(id),
    -- Statut
    is_read             BOOLEAN         NOT NULL DEFAULT FALSE,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEX DE PERFORMANCE
-- ============================================================

CREATE INDEX idx_work_orders_client_id          ON work_orders(client_id);
CREATE INDEX idx_work_orders_contract_id        ON work_orders(contract_id);
CREATE INDEX idx_work_orders_scheduled_date     ON work_orders(scheduled_date);
CREATE INDEX idx_work_orders_status             ON work_orders(status);
CREATE INDEX idx_woa_employee_id                ON work_order_assignments(employee_id);
CREATE INDEX idx_woa_work_order_id              ON work_order_assignments(work_order_id);
CREATE INDEX idx_woa_status                     ON work_order_assignments(status);
CREATE INDEX idx_woci_work_order_id             ON work_order_checklist_items(work_order_id);
CREATE INDEX idx_incidents_work_order_id        ON incidents(work_order_id);
CREATE INDEX idx_incidents_status               ON incidents(status);
CREATE INDEX idx_invoices_client_id             ON invoices(client_id);
CREATE INDEX idx_invoices_status                ON invoices(status);
CREATE INDEX idx_invoices_due_date              ON invoices(due_date);
CREATE INDEX idx_timesheet_employee_id          ON timesheet_entries(employee_id);
CREATE INDEX idx_notifications_recipient_id     ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read          ON notifications(is_read);
CREATE INDEX idx_cti_template_id                ON checklist_template_items(template_id);

-- ============================================================
-- FONCTIONS ET TRIGGERS
-- ============================================================

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_work_orders_updated_at
    BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_woa_updated_at
    BEFORE UPDATE ON work_order_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_woci_updated_at
    BEFORE UPDATE ON work_order_checklist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_material_requests_updated_at
    BEFORE UPDATE ON material_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_prospects_updated_at
    BEFORE UPDATE ON prospects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_audits_updated_at
    BEFORE UPDATE ON audits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Génération automatique du numéro de contrat
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contract_number IS NULL THEN
        NEW.contract_number := 'CTR-' || TO_CHAR(NOW(), 'YYYYMM') || '-' ||
                               LPAD(nextval('contract_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_contract_number
    BEFORE INSERT ON contracts
    FOR EACH ROW EXECUTE FUNCTION generate_contract_number();

-- Génération automatique du numéro de bon de travail
CREATE OR REPLACE FUNCTION generate_work_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.work_order_number IS NULL THEN
        NEW.work_order_number := 'BT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                                 LPAD(nextval('work_order_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_work_order_number
    BEFORE INSERT ON work_orders
    FOR EACH ROW EXECUTE FUNCTION generate_work_order_number();

-- Génération automatique du numéro de facture
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := 'FAC-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                              LPAD(nextval('invoice_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Génération automatique du numéro de soumission
CREATE OR REPLACE FUNCTION generate_proposal_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.proposal_number IS NULL THEN
        NEW.proposal_number := 'SOM-' || TO_CHAR(NOW(), 'YYYYMM') || '-' ||
                               LPAD(nextval('proposal_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_proposal_number
    BEFORE INSERT ON proposals
    FOR EACH ROW EXECUTE FUNCTION generate_proposal_number();

-- Complétion automatique du bon de travail quand tous les employés ont terminé
CREATE OR REPLACE FUNCTION check_work_order_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_total     INTEGER;
    v_completed INTEGER;
BEGIN
    IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
        SELECT COUNT(*) INTO v_total
        FROM work_order_assignments
        WHERE work_order_id = NEW.work_order_id;

        SELECT COUNT(*) INTO v_completed
        FROM work_order_assignments
        WHERE work_order_id = NEW.work_order_id AND status = 'completed';

        IF v_total > 0 AND v_total = v_completed THEN
            UPDATE work_orders
            SET all_employees_completed = TRUE,
                status                  = 'completed',
                completed_at            = NOW()
            WHERE id = NEW.work_order_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_work_order_completion
    AFTER UPDATE ON work_order_assignments
    FOR EACH ROW EXECUTE FUNCTION check_work_order_completion();

-- Blocage du bouton "Terminer" si incident non documenté
CREATE OR REPLACE FUNCTION enforce_incident_block()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
        IF EXISTS (
            SELECT 1 FROM incidents
            WHERE work_order_assignment_id = NEW.id
              AND status                   = 'open'
              AND (
                  array_length(photo_urls, 1) IS NULL OR
                  array_length(photo_urls, 1) = 0    OR
                  description = ''
              )
        ) THEN
            RAISE EXCEPTION
                'Impossible de terminer : un incident ouvert requiert au moins une photo et une description.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_incident_block
    BEFORE UPDATE ON work_order_assignments
    FOR EACH ROW EXECUTE FUNCTION enforce_incident_block();

-- Mise à jour du verrou has_blocking_incident sur l'assignation
CREATE OR REPLACE FUNCTION sync_blocking_incident_flag()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'open') THEN
        UPDATE work_order_assignments
        SET has_blocking_incident = TRUE
        WHERE id = NEW.work_order_assignment_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status IN ('acknowledged', 'resolved') THEN
        -- Vérifier s'il reste des incidents bloquants
        UPDATE work_order_assignments
        SET has_blocking_incident = EXISTS (
            SELECT 1 FROM incidents
            WHERE work_order_assignment_id = NEW.work_order_assignment_id
              AND status = 'open'
        )
        WHERE id = NEW.work_order_assignment_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_blocking_incident_flag
    AFTER INSERT OR UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION sync_blocking_incident_flag();

-- ============================================================
-- SÉCURITÉ AU NIVEAU DES LIGNES (RLS)
-- ============================================================

ALTER TABLE profiles                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_checklist_overrides    ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_assignments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_checklist_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries               ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requests               ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_items                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_performance_reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications                   ENABLE ROW LEVEL SECURITY;

-- Fonctions d'aide pour les politiques RLS
CREATE OR REPLACE FUNCTION is_direction()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'direction'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_supervisor_or_direction()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND (role = 'direction' OR is_supervisor = TRUE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -------- PROFILES --------
CREATE POLICY "direction_all_profiles"
    ON profiles FOR ALL
    USING (is_direction());

CREATE POLICY "personnel_read_own_profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "personnel_update_own_profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        role = (SELECT role FROM profiles WHERE id = auth.uid())
    );

-- -------- CLIENTS --------
CREATE POLICY "direction_all_clients"
    ON clients FOR ALL
    USING (is_direction());

-- Le personnel voit uniquement les clients dont le bon est dans les 7 derniers/prochains jours
-- Les colonnes financières sont masquées via la vue client_basic_info
CREATE POLICY "personnel_read_assigned_clients"
    ON clients FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM work_orders wo
            JOIN work_order_assignments woa ON woa.work_order_id = wo.id
            WHERE wo.client_id     = clients.id
              AND woa.employee_id  = auth.uid()
              AND wo.scheduled_date BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE + 30
        )
    );

-- -------- GABARITS --------
CREATE POLICY "direction_all_templates"
    ON checklist_templates FOR ALL
    USING (is_direction());

CREATE POLICY "personnel_read_active_templates"
    ON checklist_templates FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "direction_all_template_items"
    ON checklist_template_items FOR ALL
    USING (is_direction());

CREATE POLICY "personnel_read_template_items"
    ON checklist_template_items FOR SELECT
    USING (TRUE);

-- -------- CONTRATS (direction uniquement) --------
CREATE POLICY "direction_all_contracts"
    ON contracts FOR ALL
    USING (is_direction());

CREATE POLICY "direction_all_overrides"
    ON contract_checklist_overrides FOR ALL
    USING (is_direction());

-- -------- BONS DE TRAVAIL --------
CREATE POLICY "direction_all_work_orders"
    ON work_orders FOR ALL
    USING (is_direction());

CREATE POLICY "personnel_read_assigned_work_orders"
    ON work_orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM work_order_assignments
            WHERE work_order_id = work_orders.id
              AND employee_id   = auth.uid()
        )
    );

-- -------- ASSIGNATIONS --------
CREATE POLICY "direction_all_assignments"
    ON work_order_assignments FOR ALL
    USING (is_direction());

CREATE POLICY "personnel_read_own_assignments"
    ON work_order_assignments FOR SELECT
    USING (employee_id = auth.uid());

CREATE POLICY "personnel_update_own_assignments"
    ON work_order_assignments FOR UPDATE
    USING (employee_id = auth.uid())
    WITH CHECK (employee_id = auth.uid());

-- -------- LISTE DE VÉRIFICATION --------
CREATE POLICY "direction_all_checklist_items"
    ON work_order_checklist_items FOR ALL
    USING (is_direction());

CREATE POLICY "personnel_read_checklist_assigned"
    ON work_order_checklist_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM work_order_assignments
            WHERE work_order_id = work_order_checklist_items.work_order_id
              AND employee_id   = auth.uid()
        )
    );

-- Mise à jour partagée entre membres d'une même équipe
CREATE POLICY "personnel_update_checklist_assigned"
    ON work_order_checklist_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM work_order_assignments
            WHERE work_order_id = work_order_checklist_items.work_order_id
              AND employee_id   = auth.uid()
        )
    );

-- -------- INCIDENTS --------
CREATE POLICY "direction_all_incidents"
    ON incidents FOR ALL
    USING (is_direction());

CREATE POLICY "personnel_read_incidents_assigned"
    ON incidents FOR SELECT
    USING (
        reported_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM work_order_assignments
            WHERE work_order_id = incidents.work_order_id
              AND employee_id   = auth.uid()
        )
    );

CREATE POLICY "personnel_create_incidents_assigned"
    ON incidents FOR INSERT
    WITH CHECK (
        reported_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM work_order_assignments
            WHERE work_order_id = incidents.work_order_id
              AND employee_id   = auth.uid()
        )
    );

CREATE POLICY "personnel_update_own_incidents"
    ON incidents FOR UPDATE
    USING (reported_by = auth.uid());

-- -------- FACTURES (direction uniquement) --------
CREATE POLICY "direction_all_invoices"
    ON invoices FOR ALL
    USING (is_direction());

CREATE POLICY "direction_all_invoice_line_items"
    ON invoice_line_items FOR ALL
    USING (is_direction());

-- -------- FEUILLES DE TEMPS --------
CREATE POLICY "direction_all_timesheet"
    ON timesheet_entries FOR ALL
    USING (is_direction());

CREATE POLICY "personnel_read_own_timesheet"
    ON timesheet_entries FOR SELECT
    USING (employee_id = auth.uid());

-- -------- DEMANDES DE MATÉRIEL --------
CREATE POLICY "direction_all_material_requests"
    ON material_requests FOR ALL
    USING (is_direction());

CREATE POLICY "personnel_read_own_material_requests"
    ON material_requests FOR SELECT
    USING (requested_by = auth.uid());

CREATE POLICY "personnel_create_material_requests"
    ON material_requests FOR INSERT
    WITH CHECK (requested_by = auth.uid());

-- -------- PROSPECTS / SOUMISSIONS (direction uniquement) --------
CREATE POLICY "direction_all_prospects"
    ON prospects FOR ALL
    USING (is_direction());

CREATE POLICY "direction_all_proposals"
    ON proposals FOR ALL
    USING (is_direction());

-- -------- AUDITS --------
CREATE POLICY "direction_all_audits"
    ON audits FOR ALL
    USING (is_direction());

CREATE POLICY "supervisor_manage_audits"
    ON audits FOR ALL
    USING (is_supervisor_or_direction());

CREATE POLICY "direction_all_audit_items"
    ON audit_items FOR ALL
    USING (is_direction());

CREATE POLICY "supervisor_manage_audit_items"
    ON audit_items FOR ALL
    USING (is_supervisor_or_direction());

-- -------- PERFORMANCE RH (direction uniquement) --------
CREATE POLICY "direction_all_performance"
    ON employee_performance_reviews FOR ALL
    USING (is_direction());

-- -------- NOTIFICATIONS --------
CREATE POLICY "direction_all_notifications"
    ON notifications FOR ALL
    USING (is_direction());

CREATE POLICY "personnel_read_own_notifications"
    ON notifications FOR SELECT
    USING (recipient_id = auth.uid());

CREATE POLICY "personnel_mark_own_notifications_read"
    ON notifications FOR UPDATE
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

-- ============================================================
-- VUE SÉCURISÉE POUR LE PERSONNEL (sans données financières)
-- ============================================================

-- Le personnel mobile utilise cette vue; les colonnes billing_*, sage_*, etc. sont absentes
CREATE OR REPLACE VIEW client_basic_info AS
SELECT
    id,
    company_name,
    first_name,
    last_name,
    phone,
    service_address,
    service_city,
    service_province,
    service_postal_code,
    door_code,
    alarm_code,
    entry_instructions,
    parking_instructions,
    internal_alerts
FROM clients;

-- ============================================================
-- BUCKETS SUPABASE STORAGE
-- À exécuter via le tableau de bord Supabase → Storage :
--
-- INSERT INTO storage.buckets (id, name, public)
--     VALUES ('incident-photos', 'incident-photos', FALSE);
-- INSERT INTO storage.buckets (id, name, public)
--     VALUES ('audit-photos', 'audit-photos', FALSE);
-- INSERT INTO storage.buckets (id, name, public)
--     VALUES ('proposal-documents', 'proposal-documents', FALSE);
-- INSERT INTO storage.buckets (id, name, public)
--     VALUES ('avatars', 'avatars', FALSE);
-- ============================================================
