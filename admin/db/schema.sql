CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE application_status AS ENUM (
      'received',
      'under_review',
      'accepted',
      'waitlisted',
      'deposit_pending',
      'deposit_paid',
      'fully_paid',
      'rejected',
      'cancelled',
      'no_show'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'accommodation_tier') THEN
    CREATE TYPE accommodation_tier AS ENUM (
      'shared',
      'individual_double',
      'individual_suite',
      'couples',
      'couples_suite'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_status') THEN
    CREATE TYPE email_status AS ENUM ('queued', 'sent', 'delivered', 'opened', 'bounced', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
    CREATE TYPE activity_type AS ENUM (
      'application_received',
      'status_changed',
      'email_sent',
      'note_added',
      'payment_recorded',
      'duplicate_flagged',
      'viewed_by_admin'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category') THEN
    CREATE TYPE expense_category AS ENUM (
      'accommodation',
      'food',
      'site',
      'advertising',
      'travel',
      'materials',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_model') THEN
    CREATE TYPE expense_model AS ENUM (
      'fixed',
      'per_participant',
      'per_booking',
      'threshold_once'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_state') THEN
    CREATE TYPE expense_state AS ENUM (
      'planned',
      'committed',
      'cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'activity_type'
         AND e.enumlabel = 'expense_added'
     ) THEN
    ALTER TYPE activity_type ADD VALUE 'expense_added';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  email CITEXT NOT NULL,
  phone TEXT,
  locale TEXT NOT NULL DEFAULT 'pt' CHECK (locale IN ('pt', 'en')),
  tier accommodation_tier NOT NULL,
  participant_count SMALLINT NOT NULL DEFAULT 1 CHECK (participant_count IN (1, 2)),
  motivation TEXT,
  source TEXT,
  status application_status NOT NULL DEFAULT 'received',
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_price_cents INTEGER NOT NULL,
  deposit_amount_cents INTEGER NOT NULL DEFAULT 15000,
  deposit_paid_cents INTEGER NOT NULL DEFAULT 0,
  balance_paid_cents INTEGER NOT NULL DEFAULT 0,
  payment_notes TEXT,
  dietary_notes TEXT,
  partner_name TEXT,
  partner_dietary_notes TEXT,
  privacy_consent_at TIMESTAMPTZ,
  attribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  whatsapp_added BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_of UUID REFERENCES applications(id) ON DELETE SET NULL,
  is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_submitted ON applications(submitted_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_application_email
  ON applications (email)
  WHERE is_duplicate = FALSE
    AND status NOT IN ('rejected', 'cancelled');

CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  resend_id TEXT UNIQUE,
  template_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  to_email CITEXT NOT NULL,
  from_email TEXT NOT NULL,
  status email_status NOT NULL DEFAULT 'queued',
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  html_snapshot TEXT,
  provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_application ON email_log(application_id);
CREATE INDEX IF NOT EXISTS idx_email_status ON email_log(status);

CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status application_status,
  to_status application_status NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by TEXT NOT NULL DEFAULT 'system',
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_status_history_application ON status_history(application_id);

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_application ON activity_log(application_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE applications ADD COLUMN IF NOT EXISTS partner_name TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS partner_dietary_notes TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS attribution JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS accommodation_capacity (
  tier accommodation_tier PRIMARY KEY,
  total_slots INTEGER NOT NULL,
  label_pt TEXT NOT NULL,
  label_en TEXT NOT NULL,
  price_early_cents INTEGER NOT NULL,
  price_regular_cents INTEGER NOT NULL,
  is_couples_tier BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO accommodation_capacity (
  tier,
  total_slots,
  label_pt,
  label_en,
  price_early_cents,
  price_regular_cents,
  is_couples_tier,
  display_order
)
VALUES
  ('shared', 12, 'Preço único', 'Single price', 35000, 35000, FALSE, 1),
  ('individual_double', 0, 'Individual cama casal', 'Individual double', 35000, 35000, FALSE, 2),
  ('individual_suite', 0, 'Individual suite', 'Individual suite', 35000, 35000, FALSE, 3),
  ('couples', 0, 'Casal', 'Couples', 70000, 70000, TRUE, 4),
  ('couples_suite', 0, 'Casal com suite', 'Couples ensuite', 70000, 70000, TRUE, 5)
ON CONFLICT (tier) DO UPDATE SET
  total_slots = EXCLUDED.total_slots,
  label_pt = EXCLUDED.label_pt,
  label_en = EXCLUDED.label_en,
  price_early_cents = EXCLUDED.price_early_cents,
  price_regular_cents = EXCLUDED.price_regular_cents,
  is_couples_tier = EXCLUDED.is_couples_tier,
  display_order = EXCLUDED.display_order;

CREATE TABLE IF NOT EXISTS admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);

INSERT INTO admin_config (key, value, description)
VALUES
  ('retreat_date_start', '2026-09-04', 'Retreat start date'),
  ('retreat_date_end', '2026-09-06', 'Retreat end date'),
  ('retreat_location', 'Shamballah Yoga Retreats, Parque Natural de Sintra', 'Location for emails'),
  ('reply_to_email', 'retreat@livingprayer.pt', 'Reply-to address'),
  ('admin_notify_email', 'sentutoke@gmail.com', 'Pedro admin notifications'),
  ('admin_app_url', 'https://admin.livingprayer.pt', 'Admin app base URL'),
  ('mbway_number', '919 304 201', 'MB WAY phone'),
  ('iban', 'PT50 0035 0686 0000 1588 7001 6', 'Bank IBAN'),
  ('deposit_amount_cents', '15000', 'Fixed deposit in cents'),
  ('balance_due_days_before', '30', 'Days before retreat balance is due'),
  ('early_bird_active', 'false', 'Early bird pricing active'),
  ('max_capacity', '12', 'Max total participants')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('pt', 'en')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'cancelled', 'skipped', 'failed')),
  dedupe_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  cancel_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_due ON scheduled_emails(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_application ON scheduled_emails(application_id);

CREATE TABLE IF NOT EXISTS expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  category expense_category NOT NULL,
  label TEXT NOT NULL,
  vendor TEXT,
  description TEXT,
  model expense_model NOT NULL DEFAULT 'fixed',
  state expense_state NOT NULL DEFAULT 'planned',
  unit_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_amount_cents >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  threshold_participants INTEGER CHECK (threshold_participants IS NULL OR threshold_participants >= 1),
  threshold_bookings INTEGER CHECK (threshold_bookings IS NULL OR threshold_bookings >= 1),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT expense_threshold_rule CHECK (
    model <> 'threshold_once'
    OR threshold_participants IS NOT NULL
    OR threshold_bookings IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_expense_items_category ON expense_items(category);
CREATE INDEX IF NOT EXISTS idx_expense_items_state ON expense_items(state);
CREATE INDEX IF NOT EXISTS idx_expense_items_due_date ON expense_items(due_date);

CREATE TABLE IF NOT EXISTS expense_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expense_items(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_payments_expense ON expense_payments(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_payments_paid_at ON expense_payments(paid_at DESC);

INSERT INTO expense_items (
  code,
  category,
  label,
  vendor,
  description,
  model,
  state,
  unit_amount_cents,
  quantity,
  threshold_participants,
  due_date,
  notes
)
VALUES
  (
    'website_phase_one',
    'site',
    'Website · primeira tranche',
    'Fornecedor do site',
    'Primeira tranche do site já acordada e liquidada.',
    'fixed',
    'committed',
    20000,
    1,
    NULL,
    NULL,
    'Registado como custo já pago.'
  ),
  (
    'website_phase_two',
    'site',
    'Website · segunda tranche',
    'Fornecedor do site',
    'Segunda tranche do site a pagar quando houver pelo menos 10 inscrições confirmadas.',
    'threshold_once',
    'planned',
    20000,
    1,
    10,
    NULL,
    'Desbloqueia aos 10 participantes confirmados.'
  )
ON CONFLICT (code) DO UPDATE SET
  category = EXCLUDED.category,
  label = EXCLUDED.label,
  vendor = EXCLUDED.vendor,
  description = EXCLUDED.description,
  model = EXCLUDED.model,
  state = EXCLUDED.state,
  unit_amount_cents = EXCLUDED.unit_amount_cents,
  quantity = EXCLUDED.quantity,
  threshold_participants = EXCLUDED.threshold_participants,
  due_date = EXCLUDED.due_date,
  notes = EXCLUDED.notes;

INSERT INTO expense_payments (
  expense_id,
  amount_cents,
  paid_at,
  payment_method,
  reference,
  notes
)
SELECT
  ei.id,
  20000,
  now(),
  'manual',
  'website_phase_one',
  'Primeira tranche do site já paga.'
FROM expense_items ei
WHERE ei.code = 'website_phase_one'
  AND NOT EXISTS (
    SELECT 1
    FROM expense_payments ep
    WHERE ep.reference = 'website_phase_one'
  );

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS applications_updated_at ON applications;
CREATE TRIGGER applications_updated_at
BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS expense_items_updated_at ON expense_items;
CREATE TRIGGER expense_items_updated_at
BEFORE UPDATE ON expense_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE VIEW capacity_overview AS
SELECT
  ac.tier,
  ac.label_pt,
  ac.label_en,
  ac.total_slots,
  ac.price_early_cents,
  ac.price_regular_cents,
  ac.is_couples_tier,
  COUNT(a.id) FILTER (
    WHERE a.is_duplicate = FALSE
      AND a.status IN ('accepted', 'deposit_pending', 'deposit_paid', 'fully_paid')
  ) AS bookings_confirmed,
  COALESCE(SUM(a.participant_count) FILTER (
    WHERE a.is_duplicate = FALSE
      AND a.status IN ('accepted', 'deposit_pending', 'deposit_paid', 'fully_paid')
  ), 0) AS participants_confirmed,
  ac.total_slots - COUNT(a.id) FILTER (
    WHERE a.is_duplicate = FALSE
      AND a.status IN ('accepted', 'deposit_pending', 'deposit_paid', 'fully_paid')
  ) AS slots_remaining
FROM accommodation_capacity ac
LEFT JOIN applications a ON a.tier = ac.tier
GROUP BY
  ac.tier,
  ac.label_pt,
  ac.label_en,
  ac.total_slots,
  ac.price_early_cents,
  ac.price_regular_cents,
  ac.is_couples_tier;

CREATE OR REPLACE VIEW participant_capacity_overview AS
SELECT
  COALESCE((SELECT value::INTEGER FROM admin_config WHERE key = 'max_capacity'), 15) AS max_capacity,
  COALESCE(SUM(participant_count) FILTER (
    WHERE is_duplicate = FALSE
      AND status IN ('accepted', 'deposit_pending', 'deposit_paid', 'fully_paid')
  ), 0) AS participants_confirmed,
  COALESCE((SELECT value::INTEGER FROM admin_config WHERE key = 'max_capacity'), 15)
    - COALESCE(SUM(participant_count) FILTER (
      WHERE is_duplicate = FALSE
        AND status IN ('accepted', 'deposit_pending', 'deposit_paid', 'fully_paid')
    ), 0) AS participants_remaining
FROM applications;

CREATE OR REPLACE VIEW revenue_overview AS
SELECT
  COUNT(*) FILTER (WHERE is_duplicate = FALSE AND status = 'fully_paid') AS fully_paid_count,
  COUNT(*) FILTER (WHERE is_duplicate = FALSE AND status = 'deposit_paid') AS deposit_paid_count,
  COUNT(*) FILTER (
    WHERE is_duplicate = FALSE
      AND status IN ('accepted', 'deposit_pending', 'deposit_paid', 'fully_paid')
  ) AS confirmed_count,
  COALESCE(SUM(total_price_cents) FILTER (
    WHERE is_duplicate = FALSE
      AND status IN ('accepted', 'deposit_pending', 'deposit_paid', 'fully_paid')
  ), 0) AS projected_revenue_cents,
  COALESCE(SUM(deposit_paid_cents + balance_paid_cents) FILTER (
    WHERE is_duplicate = FALSE
  ), 0) AS actual_received_cents,
  COALESCE(SUM(total_price_cents - deposit_paid_cents - balance_paid_cents) FILTER (
    WHERE is_duplicate = FALSE
      AND status IN ('accepted', 'deposit_pending', 'deposit_paid', 'fully_paid')
  ), 0) AS outstanding_cents
FROM applications;

CREATE OR REPLACE VIEW expense_overview AS
WITH confirmed AS (
  SELECT
    COUNT(*) FILTER (
      WHERE is_duplicate = FALSE
        AND status IN ('accepted', 'deposit_pending', 'deposit_paid', 'fully_paid')
    ) AS confirmed_bookings,
    COALESCE(SUM(participant_count) FILTER (
      WHERE is_duplicate = FALSE
        AND status IN ('accepted', 'deposit_pending', 'deposit_paid', 'fully_paid')
    ), 0) AS confirmed_participants
  FROM applications
),
payments AS (
  SELECT
    expense_id,
    COALESCE(SUM(amount_cents), 0) AS paid_cents,
    MAX(paid_at) AS last_paid_at
  FROM expense_payments
  GROUP BY expense_id
)
SELECT
  ei.id,
  ei.code,
  ei.category,
  ei.label,
  ei.vendor,
  ei.description,
  ei.model,
  ei.state,
  ei.unit_amount_cents,
  ei.quantity,
  ei.threshold_participants,
  ei.threshold_bookings,
  ei.due_date,
  ei.notes,
  ei.created_at,
  ei.updated_at,
  c.confirmed_bookings,
  c.confirmed_participants,
  CASE
    WHEN ei.state = 'cancelled' THEN FALSE
    WHEN ei.model = 'threshold_once' THEN
      (
        (ei.threshold_participants IS NOT NULL AND c.confirmed_participants >= ei.threshold_participants)
        OR
        (ei.threshold_bookings IS NOT NULL AND c.confirmed_bookings >= ei.threshold_bookings)
      )
    ELSE TRUE
  END AS is_triggered,
  CASE
    WHEN ei.state = 'cancelled' THEN 0
    WHEN ei.model = 'fixed' THEN ei.unit_amount_cents * ei.quantity
    WHEN ei.model = 'per_participant' THEN ei.unit_amount_cents * ei.quantity * c.confirmed_participants
    WHEN ei.model = 'per_booking' THEN ei.unit_amount_cents * ei.quantity * c.confirmed_bookings
    WHEN ei.model = 'threshold_once' THEN CASE
      WHEN (
        (ei.threshold_participants IS NOT NULL AND c.confirmed_participants >= ei.threshold_participants)
        OR
        (ei.threshold_bookings IS NOT NULL AND c.confirmed_bookings >= ei.threshold_bookings)
      ) THEN ei.unit_amount_cents * ei.quantity
      ELSE 0
    END
    ELSE 0
  END AS projected_total_cents,
  CASE
    WHEN ei.state = 'cancelled' THEN 0
    WHEN ei.model = 'threshold_once' AND NOT (
      (ei.threshold_participants IS NOT NULL AND c.confirmed_participants >= ei.threshold_participants)
      OR
      (ei.threshold_bookings IS NOT NULL AND c.confirmed_bookings >= ei.threshold_bookings)
    ) THEN ei.unit_amount_cents * ei.quantity
    ELSE 0
  END AS pending_trigger_cents,
  COALESCE(p.paid_cents, 0) AS paid_cents,
  GREATEST(
    CASE
      WHEN ei.state = 'cancelled' THEN 0
      WHEN ei.model = 'fixed' THEN ei.unit_amount_cents * ei.quantity
      WHEN ei.model = 'per_participant' THEN ei.unit_amount_cents * ei.quantity * c.confirmed_participants
      WHEN ei.model = 'per_booking' THEN ei.unit_amount_cents * ei.quantity * c.confirmed_bookings
      WHEN ei.model = 'threshold_once' THEN CASE
        WHEN (
          (ei.threshold_participants IS NOT NULL AND c.confirmed_participants >= ei.threshold_participants)
          OR
          (ei.threshold_bookings IS NOT NULL AND c.confirmed_bookings >= ei.threshold_bookings)
        ) THEN ei.unit_amount_cents * ei.quantity
        ELSE 0
      END
      ELSE 0
    END - COALESCE(p.paid_cents, 0),
    0
  ) AS outstanding_cents,
  p.last_paid_at
FROM expense_items ei
CROSS JOIN confirmed c
LEFT JOIN payments p ON p.expense_id = ei.id;

CREATE OR REPLACE VIEW expense_category_overview AS
SELECT
  category,
  COUNT(*)::INTEGER AS item_count,
  COALESCE(SUM(projected_total_cents), 0) AS projected_total_cents,
  COALESCE(SUM(paid_cents), 0) AS paid_cents,
  COALESCE(SUM(outstanding_cents), 0) AS outstanding_cents,
  COALESCE(SUM(pending_trigger_cents), 0) AS pending_trigger_cents
FROM expense_overview
GROUP BY category;

CREATE OR REPLACE VIEW financial_overview AS
SELECT
  ro.projected_revenue_cents,
  ro.actual_received_cents,
  ro.outstanding_cents AS outstanding_revenue_cents,
  COALESCE(eo.projected_total_cents, 0) AS projected_expenses_cents,
  COALESCE(eo.paid_cents, 0) AS paid_expenses_cents,
  COALESCE(eo.outstanding_cents, 0) AS outstanding_expenses_cents,
  COALESCE(eo.pending_trigger_cents, 0) AS pending_trigger_expenses_cents,
  ro.projected_revenue_cents - COALESCE(eo.projected_total_cents, 0) AS projected_net_cents,
  ro.actual_received_cents - COALESCE(eo.paid_cents, 0) AS current_cash_cents,
  ro.projected_revenue_cents - COALESCE(eo.projected_total_cents, 0) - COALESCE(eo.pending_trigger_cents, 0) AS conservative_net_cents,
  pco.max_capacity,
  pco.participants_confirmed,
  pco.participants_remaining
FROM revenue_overview ro
CROSS JOIN participant_capacity_overview pco
LEFT JOIN (
  SELECT
    COALESCE(SUM(projected_total_cents), 0) AS projected_total_cents,
    COALESCE(SUM(paid_cents), 0) AS paid_cents,
    COALESCE(SUM(outstanding_cents), 0) AS outstanding_cents,
    COALESCE(SUM(pending_trigger_cents), 0) AS pending_trigger_cents
  FROM expense_overview
) eo ON TRUE;
