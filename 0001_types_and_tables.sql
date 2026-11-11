-- LAME D'OR - Migration 0001 : Types, tables, séquences et index
-- Établissement : LAME D'OR, Bamako, Mali (Diarra Multi Services)
-- Version 2.0 (Périmètre en ligne strict)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Énumérations
CREATE TYPE public.app_role AS ENUM ('manager', 'cashier', 'barber');
CREATE TYPE public.payment_method AS ENUM ('cash', 'orange_money', 'moov_money');
CREATE TYPE public.sale_status AS ENUM ('completed', 'cancelled');
CREATE TYPE public.commission_payment_status AS ENUM ('paid', 'reversed');
CREATE TYPE public.closing_status AS ENUM ('validated');

-- 2. Séquence pour numéro de reçu
CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START WITH 1001;

-- 3. Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  full_name text NOT NULL,
  role public.app_role NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Table des barbiers (référentiel opérationnel)
CREATE TABLE IF NOT EXISTS public.barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Catalogue des prestations
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  current_price bigint NOT NULL CHECK (current_price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Règles et historique des taux de commission par prestation
CREATE TABLE IF NOT EXISTS public.commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  commission_rate numeric(5,2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_current_commission_rule_per_service
  ON public.commission_rules(service_id) WHERE valid_to IS NULL;

-- 7. Ventes enregistrées (avec snapshots immuables)
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL UNIQUE,
  request_fingerprint text NOT NULL,
  receipt_number text NOT NULL UNIQUE,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  service_name_snapshot text NOT NULL,
  catalog_price_snapshot bigint NOT NULL CHECK (catalog_price_snapshot >= 0),
  commission_rule_id uuid REFERENCES public.commission_rules(id) ON DELETE RESTRICT,
  commission_rate_snapshot numeric(5,2) NOT NULL CHECK (commission_rate_snapshot BETWEEN 0 AND 100),
  commission_base_amount bigint NOT NULL CHECK (commission_base_amount >= 0),
  amount_received bigint NOT NULL CHECK (amount_received >= 0),
  commission_amount bigint NOT NULL CHECK (commission_amount >= 0),
  price_override_reason text,
  payment_method public.payment_method NOT NULL,
  status public.sale_status NOT NULL DEFAULT 'completed',
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_by uuid REFERENCES public.profiles(id),
  cancelled_at timestamptz,
  cancellation_reason text,
  CHECK (
    (status = 'completed' AND cancelled_at IS NULL AND cancelled_by IS NULL)
    OR
    (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancellation_reason IS NOT NULL)
  )
);

-- 8. Règlements manuels des commissions
CREATE TABLE IF NOT EXISTS public.commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE RESTRICT,
  amount bigint NOT NULL CHECK (amount > 0),
  payment_method public.payment_method NOT NULL,
  status public.commission_payment_status NOT NULL DEFAULT 'paid',
  reference text,
  notes text,
  paid_by uuid NOT NULL REFERENCES public.profiles(id),
  paid_at timestamptz NOT NULL DEFAULT now(),
  reversed_by uuid REFERENCES public.profiles(id),
  reversed_at timestamptz,
  reversal_reason text,
  CHECK (
    (status = 'paid' AND reversed_at IS NULL AND reversed_by IS NULL)
    OR
    (status = 'reversed' AND reversed_at IS NOT NULL AND reversed_by IS NOT NULL AND reversal_reason IS NOT NULL)
  )
);

-- 9. Clôtures quotidiennes de caisse
CREATE TABLE IF NOT EXISTS public.cash_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_date date NOT NULL UNIQUE,
  opening_cash bigint NOT NULL DEFAULT 0,
  cash_sales bigint NOT NULL DEFAULT 0,
  orange_money_sales bigint NOT NULL DEFAULT 0,
  moov_money_sales bigint NOT NULL DEFAULT 0,
  cash_commission_payments bigint NOT NULL DEFAULT 0,
  orange_commission_payments bigint NOT NULL DEFAULT 0,
  moov_commission_payments bigint NOT NULL DEFAULT 0,
  expected_cash bigint NOT NULL,
  counted_cash bigint NOT NULL,
  difference bigint NOT NULL,
  status public.closing_status NOT NULL DEFAULT 'validated',
  note text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  validated_by uuid NOT NULL REFERENCES public.profiles(id),
  validated_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Ajustements post-clôture (append-only)
CREATE TABLE IF NOT EXISTS public.cash_closing_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_id uuid NOT NULL REFERENCES public.cash_closings(id) ON DELETE RESTRICT,
  amount_delta bigint NOT NULL CHECK (amount_delta <> 0),
  reason text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Journal d'audit append-only
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Index de performance
CREATE INDEX IF NOT EXISTS sales_created_at_idx ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS sales_business_date_idx
  ON public.sales (((created_at AT TIME ZONE 'Africa/Bamako')::date));
CREATE INDEX IF NOT EXISTS sales_barber_created_idx ON public.sales(barber_id, created_at);
CREATE INDEX IF NOT EXISTS sales_service_created_idx ON public.sales(service_id, created_at);
CREATE INDEX IF NOT EXISTS commission_payments_barber_date_idx
  ON public.commission_payments(barber_id, paid_at);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at);
