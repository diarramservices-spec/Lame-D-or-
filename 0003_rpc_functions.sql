-- LAME D'OR - Migration 0003 : Fonctions transactionnelles RPC (Vente, Commission, Clôture)
-- Établissement : LAME D'OR, Bamako, Mali

-- 1. RPC : create_sale
CREATE OR REPLACE FUNCTION public.create_sale(
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_barber_id uuid,
  p_service_id uuid,
  p_amount_received bigint,
  p_payment_method public.payment_method,
  p_price_override_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_user_role public.app_role;
  v_business_date date;
  v_existing_sale public.sales%ROWTYPE;
  v_barber public.barbers%ROWTYPE;
  v_service public.services%ROWTYPE;
  v_comm_rule public.commission_rules%ROWTYPE;
  v_commission_amount bigint;
  v_receipt_number text;
  v_new_sale public.sales%ROWTYPE;
BEGIN
  -- 1. Vérification utilisateur authentifié et actif
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise.' USING ERRCODE = '28000';
  END IF;

  SELECT role INTO v_user_role FROM public.profiles
  WHERE id = v_user_id AND active = true;

  IF v_user_role IS NULL OR v_user_role NOT IN ('manager', 'cashier') THEN
    RAISE EXCEPTION 'Accès refusé : rôle caissier ou gérant requis.' USING ERRCODE = '42501';
  END IF;

  -- 2. Détermination de la date métier Africa/Bamako
  v_business_date := (now() AT TIME ZONE 'Africa/Bamako')::date;

  -- 3. Verrou transactionnel par date métier
  PERFORM pg_advisory_xact_lock(hashtext('closing_' || v_business_date::text));

  -- 4. Refuser si la date est déjà clôturée
  IF EXISTS (
    SELECT 1 FROM public.cash_closings
    WHERE business_date = v_business_date AND status = 'validated'
  ) THEN
    RAISE EXCEPTION 'La caisse est déjà clôturée pour le %.', v_business_date USING ERRCODE = '23514';
  END IF;

  -- 5. Vérification d'idempotence
  SELECT * INTO v_existing_sale FROM public.sales
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_sale.request_fingerprint = p_request_fingerprint THEN
      RETURN to_jsonb(v_existing_sale);
    ELSE
      RAISE EXCEPTION 'Conflit d''idempotence : empreinte différente pour la même clé.' USING ERRCODE = '23505';
    END IF;
  END IF;

  -- 6. Vérification du barbier actif
  SELECT * INTO v_barber FROM public.barbers
  WHERE id = p_barber_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barbier introuvable ou inactif.' USING ERRCODE = '22000';
  END IF;

  -- 7. Vérification de la prestation active
  SELECT * INTO v_service FROM public.services
  WHERE id = p_service_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prestation introuvable ou inactive.' USING ERRCODE = '22000';
  END IF;

  -- 8. Relire la règle de commission active
  SELECT * INTO v_comm_rule FROM public.commission_rules
  WHERE service_id = p_service_id AND valid_to IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucune règle de commission active pour cette prestation.' USING ERRCODE = '22000';
  END IF;

  -- 9. Vérification du prix dérogatoire
  IF p_amount_received <> v_service.current_price THEN
    IF v_user_role <> 'manager' THEN
      RAISE EXCEPTION 'Seul le gérant est autorisé à appliquer un tarif dérogatoire.' USING ERRCODE = '42501';
    END IF;
    IF p_price_override_reason IS NULL OR trim(p_price_override_reason) = '' THEN
      RAISE EXCEPTION 'Un motif est obligatoire pour tout tarif dérogatoire.' USING ERRCODE = '22000';
    END IF;
  END IF;

  -- 10. Calcul serveur de la commission
  -- Commission = ROUND(montant réellement encaissé * taux / 100)
  v_commission_amount := round((p_amount_received * v_comm_rule.commission_rate) / 100.0);

  -- 11. Génération du numéro de reçu normalisé
  v_receipt_number := 'REC-' || to_char(now() AT TIME ZONE 'Africa/Bamako', 'YYYYMMDD') || '-' ||
                      lpad(nextval('public.receipt_number_seq')::text, 5, '0');

  -- 12. Insertion de la vente
  INSERT INTO public.sales (
    idempotency_key,
    request_fingerprint,
    receipt_number,
    barber_id,
    service_id,
    service_name_snapshot,
    catalog_price_snapshot,
    commission_rule_id,
    commission_rate_snapshot,
    commission_base_amount,
    amount_received,
    commission_amount,
    price_override_reason,
    payment_method,
    status,
    created_by
  ) VALUES (
    p_idempotency_key,
    p_request_fingerprint,
    v_receipt_number,
    p_barber_id,
    p_service_id,
    v_service.name,
    v_service.current_price,
    v_comm_rule.id,
    v_comm_rule.commission_rate,
    p_amount_received,
    p_amount_received,
    v_commission_amount,
    p_price_override_reason,
    p_payment_method,
    'completed',
    v_user_id
  )
  RETURNING * INTO v_new_sale;

  -- 13. Audit
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (v_user_id, 'create_sale', 'sale', v_new_sale.id, to_jsonb(v_new_sale));

  RETURN to_jsonb(v_new_sale);
END;
$$;

-- 2. RPC : create_commission_payment
CREATE OR REPLACE FUNCTION public.create_commission_payment(
  p_barber_id uuid,
  p_amount bigint,
  p_payment_method public.payment_method,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_user_role public.app_role;
  v_business_date date;
  v_total_earned bigint;
  v_total_paid bigint;
  v_balance bigint;
  v_new_payment public.commission_payments%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise.' USING ERRCODE = '28000';
  END IF;

  SELECT role INTO v_user_role FROM public.profiles
  WHERE id = v_user_id AND active = true;

  IF v_user_role <> 'manager' THEN
    RAISE EXCEPTION 'Accès refusé : seul le gérant peut régler les commissions.' USING ERRCODE = '42501';
  END IF;

  v_business_date := (now() AT TIME ZONE 'Africa/Bamako')::date;
  PERFORM pg_advisory_xact_lock(hashtext('barber_payment_' || p_barber_id::text));

  IF EXISTS (
    SELECT 1 FROM public.cash_closings
    WHERE business_date = v_business_date AND status = 'validated'
  ) THEN
    RAISE EXCEPTION 'Impossible de payer une commission : la journée du % est clôturée.', v_business_date USING ERRCODE = '23514';
  END IF;

  -- Calcul du solde dû
  SELECT coalesce(sum(commission_amount), 0) INTO v_total_earned
  FROM public.sales
  WHERE barber_id = p_barber_id AND status = 'completed';

  SELECT coalesce(sum(amount), 0) INTO v_total_paid
  FROM public.commission_payments
  WHERE barber_id = p_barber_id AND status = 'paid';

  v_balance := v_total_earned - v_total_paid;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Le montant du règlement doit être supérieur à zéro.' USING ERRCODE = '22000';
  END IF;

  IF p_amount > v_balance THEN
    RAISE EXCEPTION 'Montant demandé (% FCFA) supérieur au solde dû (% FCFA).', p_amount, v_balance USING ERRCODE = '22000';
  END IF;

  INSERT INTO public.commission_payments (
    barber_id, amount, payment_method, reference, notes, paid_by
  ) VALUES (
    p_barber_id, p_amount, p_payment_method, p_reference, p_notes, v_user_id
  )
  RETURNING * INTO v_new_payment;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (v_user_id, 'create_commission_payment', 'commission_payment', v_new_payment.id, to_jsonb(v_new_payment));

  RETURN jsonb_build_object(
    'payment', to_jsonb(v_new_payment),
    'previous_balance', v_balance,
    'new_balance', v_balance - p_amount
  );
END;
$$;

-- 3. RPC : reverse_commission_payment
CREATE OR REPLACE FUNCTION public.reverse_commission_payment(
  p_payment_id uuid,
  p_reversal_reason text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_user_role public.app_role;
  v_payment public.commission_payments%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id AND active = true;
  IF v_user_role <> 'manager' THEN
    RAISE EXCEPTION 'Seul le gérant peut annuler un règlement.' USING ERRCODE = '42501';
  END IF;

  IF p_reversal_reason IS NULL OR trim(p_reversal_reason) = '' THEN
    RAISE EXCEPTION 'Un motif est obligatoire pour annuler un règlement.' USING ERRCODE = '22000';
  END IF;

  SELECT * INTO v_payment FROM public.commission_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Règlement introuvable.' USING ERRCODE = '22000';
  END IF;

  IF v_payment.status = 'reversed' THEN
    RAISE EXCEPTION 'Ce règlement est déjà annulé.' USING ERRCODE = '22000';
  END IF;

  UPDATE public.commission_payments
  SET status = 'reversed',
      reversed_by = v_user_id,
      reversed_at = now(),
      reversal_reason = p_reversal_reason
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (v_user_id, 'reverse_commission_payment', 'commission_payment', v_payment.id, to_jsonb(v_payment));

  RETURN to_jsonb(v_payment);
END;
$$;

-- 4. RPC : validate_cash_closing
CREATE OR REPLACE FUNCTION public.validate_cash_closing(
  p_business_date date,
  p_opening_cash bigint,
  p_counted_cash bigint,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_user_role public.app_role;
  v_cash_sales bigint;
  v_orange_sales bigint;
  v_moov_sales bigint;
  v_cash_comm bigint;
  v_orange_comm bigint;
  v_moov_comm bigint;
  v_expected_cash bigint;
  v_difference bigint;
  v_closing public.cash_closings%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id AND active = true;
  IF v_user_role <> 'manager' THEN
    RAISE EXCEPTION 'Seul le gérant peut valider la clôture.' USING ERRCODE = '42501';
  END IF;

  IF p_business_date > (now() AT TIME ZONE 'Africa/Bamako')::date THEN
    RAISE EXCEPTION 'Impossible de clôturer une date future.' USING ERRCODE = '22000';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('closing_' || p_business_date::text));

  IF EXISTS (
    SELECT 1 FROM public.cash_closings WHERE business_date = p_business_date
  ) THEN
    RAISE EXCEPTION 'La date du % a déjà été clôturée.', p_business_date USING ERRCODE = '23505';
  END IF;

  -- Agrégation des ventes completed
  SELECT
    coalesce(sum(CASE WHEN payment_method = 'cash' THEN amount_received ELSE 0 END), 0),
    coalesce(sum(CASE WHEN payment_method = 'orange_money' THEN amount_received ELSE 0 END), 0),
    coalesce(sum(CASE WHEN payment_method = 'moov_money' THEN amount_received ELSE 0 END), 0)
  INTO v_cash_sales, v_orange_sales, v_moov_sales
  FROM public.sales
  WHERE (created_at AT TIME ZONE 'Africa/Bamako')::date = p_business_date
    AND status = 'completed';

  -- Agrégation des règlements de commission paid
  SELECT
    coalesce(sum(CASE WHEN payment_method = 'cash' THEN amount_received ELSE 0 END), 0),
    coalesce(sum(CASE WHEN payment_method = 'orange_money' THEN amount ELSE 0 END), 0),
    coalesce(sum(CASE WHEN payment_method = 'moov_money' THEN amount ELSE 0 END), 0)
  INTO v_cash_comm, v_orange_comm, v_moov_comm
  FROM public.commission_payments
  WHERE (paid_at AT TIME ZONE 'Africa/Bamako')::date = p_business_date
    AND status = 'paid';

  -- Espèces théoriques = fonds d'ouverture + ventes espèces - commissions espèces
  v_expected_cash := p_opening_cash + v_cash_sales - v_cash_comm;
  v_difference := p_counted_cash - v_expected_cash;

  INSERT INTO public.cash_closings (
    business_date,
    opening_cash,
    cash_sales,
    orange_money_sales,
    moov_money_sales,
    cash_commission_payments,
    orange_commission_payments,
    moov_commission_payments,
    expected_cash,
    counted_cash,
    difference,
    note,
    created_by,
    validated_by
  ) VALUES (
    p_business_date,
    p_opening_cash,
    v_cash_sales,
    v_orange_sales,
    v_moov_sales,
    v_cash_comm,
    v_orange_comm,
    v_moov_comm,
    v_expected_cash,
    p_counted_cash,
    v_difference,
    p_note,
    v_user_id,
    v_user_id
  )
  RETURNING * INTO v_closing;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (v_user_id, 'validate_cash_closing', 'cash_closing', v_closing.id, to_jsonb(v_closing));

  RETURN to_jsonb(v_closing);
END;
$$;
