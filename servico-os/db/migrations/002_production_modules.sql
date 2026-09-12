-- ServiçoOS production modules: agenda, checklists, signatures, portal, storage,
-- billing lifecycle, webhook idempotency and communications.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_stripe_customer_uq
  ON organizations(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS checkout_session_id text,
  ADD COLUMN IF NOT EXISTS provider_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS payments_checkout_session_uq
  ON payments(checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS customer_portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  label text,
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_portal_tokens_lookup_idx
  ON customer_portal_tokens(token_hash, expires_at)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS customer_portal_tokens_customer_idx
  ON customer_portal_tokens(organization_id, customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS work_order_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  signer_name text NOT NULL,
  signer_document text,
  signature_data text NOT NULL,
  signature_sha256 text NOT NULL,
  consent_text text NOT NULL,
  ip_address inet,
  user_agent text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_order_signatures_order_idx
  ON work_order_signatures(organization_id, work_order_id, signed_at DESC);

CREATE TABLE IF NOT EXISTS checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  item_type text NOT NULL DEFAULT 'BOOLEAN'
    CHECK (item_type IN ('BOOLEAN','TEXT','NUMBER','PHOTO')),
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checklist_template_items_idx
  ON checklist_template_items(organization_id, template_id, sort_order);

CREATE TABLE IF NOT EXISTS work_order_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  source_template_item_id uuid REFERENCES checklist_template_items(id) ON DELETE SET NULL,
  label text NOT NULL,
  item_type text NOT NULL DEFAULT 'BOOLEAN'
    CHECK (item_type IN ('BOOLEAN','TEXT','NUMBER','PHOTO')),
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  response_text text,
  response_number numeric(18,4),
  attachment_id uuid REFERENCES attachments(id) ON DELETE SET NULL,
  completed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_order_checklist_idx
  ON work_order_checklist_items(organization_id, work_order_id, sort_order);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED','CONFIRMED','IN_PROGRESS','DONE','CANCELLED','NO_SHOW')),
  location text,
  notes text,
  reminder_minutes integer NOT NULL DEFAULT 60 CHECK (reminder_minutes >= 0),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS appointments_org_range_idx
  ON appointments(organization_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS appointments_assignee_idx
  ON appointments(organization_id, assigned_to, starts_at);

-- Private DB-backed object storage. This is intentionally bounded and can later be
-- replaced by an S3-compatible adapter without changing attachments.storage_key.
CREATE TABLE IF NOT EXISTS media_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  object_key text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0 AND byte_size <= 8388608),
  content bytea NOT NULL,
  sha256 text NOT NULL,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, object_key)
);
CREATE INDEX IF NOT EXISTS media_objects_org_created_idx
  ON media_objects(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'STRIPE',
  external_customer_id text,
  external_subscription_id text,
  price_id text,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'INCOMPLETE',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, provider)
);
CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_external_uq
  ON billing_subscriptions(provider, external_subscription_id)
  WHERE external_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS integration_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_event_id text NOT NULL,
  event_type text NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'RECEIVED'
    CHECK (status IN ('RECEIVED','PROCESSED','IGNORED','FAILED')),
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE(provider, external_event_id)
);
CREATE INDEX IF NOT EXISTS integration_webhook_events_status_idx
  ON integration_webhook_events(provider, status, received_at DESC);

CREATE TABLE IF NOT EXISTS communication_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('EMAIL','WHATSAPP','SMS','SYSTEM')),
  provider text,
  direction text NOT NULL DEFAULT 'OUTBOUND' CHECK (direction IN ('OUTBOUND','INBOUND')),
  recipient text,
  subject text,
  body_preview text,
  external_id text,
  status text NOT NULL DEFAULT 'QUEUED',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS communication_log_org_created_idx
  ON communication_log(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS nfse_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fiscal_document_id uuid NOT NULL REFERENCES fiscal_documents(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'HOMOLOGATION'
    CHECK (environment IN ('HOMOLOGATION','PRODUCTION')),
  operation text NOT NULL DEFAULT 'ISSUE'
    CHECK (operation IN ('ISSUE','QUERY','CANCEL','REPLACE')),
  dps_xml text,
  response_xml text,
  access_key text,
  attempts integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PROCESSING','SUCCEEDED','FAILED')),
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nfse_jobs_pending_idx
  ON nfse_jobs(status, next_attempt_at)
  WHERE status IN ('PENDING','FAILED');

ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS media_object_id uuid REFERENCES media_objects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS attachments_media_object_idx
  ON attachments(organization_id, media_object_id)
  WHERE media_object_id IS NOT NULL;
