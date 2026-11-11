-- LAME D'OR - Migration 0002 : Fonctions de rôle, sécurité RLS et révocation des mutations
-- Établissement : LAME D'OR, Bamako, Mali

-- 1. Fonctions d'aide pour RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT p.role FROM public.profiles p
  WHERE p.id = auth.uid() AND p.active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.active = true
  );
$$;

-- 2. Activation RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closing_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Politiques RLS (Profiles)
CREATE POLICY profiles_read_self_or_manager
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.current_app_role() = 'manager');

-- 4. Politiques RLS (Barbers)
CREATE POLICY barbers_read_authorized
  ON public.barbers FOR SELECT TO authenticated
  USING (
    public.current_app_role() IN ('manager', 'cashier')
    OR profile_id = auth.uid()
  );

CREATE POLICY barbers_manager_write
  ON public.barbers FOR ALL TO authenticated
  USING (public.current_app_role() = 'manager')
  WITH CHECK (public.current_app_role() = 'manager');

-- 5. Politiques RLS (Services)
CREATE POLICY services_read_authenticated
  ON public.services FOR SELECT TO authenticated
  USING (public.is_active_user());

CREATE POLICY services_manager_write
  ON public.services FOR ALL TO authenticated
  USING (public.current_app_role() = 'manager')
  WITH CHECK (public.current_app_role() = 'manager');

-- 6. Politiques RLS (Commission Rules)
CREATE POLICY commission_rules_read_authorized
  ON public.commission_rules FOR SELECT TO authenticated
  USING (public.current_app_role() IN ('manager', 'cashier'));

CREATE POLICY commission_rules_manager_write
  ON public.commission_rules FOR ALL TO authenticated
  USING (public.current_app_role() = 'manager')
  WITH CHECK (public.current_app_role() = 'manager');

-- 7. Politiques RLS (Sales - SELECT uniquement)
CREATE POLICY sales_read_by_role
  ON public.sales FOR SELECT TO authenticated
  USING (
    public.current_app_role() IN ('manager', 'cashier')
    OR EXISTS (
      SELECT 1 FROM public.barbers b
      WHERE b.id = sales.barber_id AND b.profile_id = auth.uid()
    )
  );

-- 8. Politiques RLS (Commission Payments - SELECT uniquement)
CREATE POLICY commission_payments_read_by_role
  ON public.commission_payments FOR SELECT TO authenticated
  USING (
    public.current_app_role() = 'manager'
    OR EXISTS (
      SELECT 1 FROM public.barbers b
      WHERE b.id = commission_payments.barber_id
      AND b.profile_id = auth.uid()
    )
  );

-- 9. Politiques RLS (Cash Closings)
CREATE POLICY cash_closings_manager_read
  ON public.cash_closings FOR SELECT TO authenticated
  USING (public.current_app_role() = 'manager');

CREATE POLICY closing_adjustments_manager_read
  ON public.cash_closing_adjustments FOR SELECT TO authenticated
  USING (public.current_app_role() = 'manager');

CREATE POLICY audit_manager_read
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.current_app_role() = 'manager');

-- 10. Révocation formelle des écritures directes (INSERT, UPDATE, DELETE)
-- Toutes les mutations financières doivent passer par des fonctions RPC sécurisées
REVOKE INSERT, UPDATE, DELETE ON public.sales FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.commission_payments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.cash_closings FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.cash_closing_adjustments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;
