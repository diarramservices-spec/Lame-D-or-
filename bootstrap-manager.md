# Procédure de Bootstrap Sécurisé du Premier Gérant — LAME D'OR

> **Salon** : LAME D'OR, Bamako, Mali  
> **Client** : Diarra Multi Services (DMS)  
> **Version** : 2.0  
> **Statut** : Conforme aux exigences du Prompt 2 (Base et Sécurité)  

---

## 1. Principe de Sécurité Fondamental
L'application **LAME D'OR** n'autorise aucune inscription publique directe (`public sign-up`). L'ensemble des comptes (gérants, caissiers, barbiers) doit être provisionné de manière contrôlée et tracée.

Le rôle `manager` confère les pleins pouvoirs opérationnels et financiers :
- Accès aux tableaux de bord consolidés et marges du salon.
- Validation des dérogations tarifaires lors des encaissements.
- Signature des règlements manuels de commissions aux barbiers.
- Certification irréversible de la clôture journalière et de l'arrêté de caisse.
- Création et modification des tarifs et des taux de commission.

---

## 2. Procédure d'Initialisation (Étape par Étape)

### Étape 1 : Création du compte dans Supabase Auth
Le compte administrateur principal doit être créé côté serveur ou via la console Supabase (jamais via un formulaire client non authentifié) :

```sql
-- Création sécurisée de l'utilisateur dans auth.users
-- (Remplacer l'email et le mot de passe fort temporaire)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'direction@lamedor-bamako.ml',
  crypt('MotDePasseTresSecurise2026!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Directeur Général DMS"}',
  now(),
  now()
) RETURNING id;
```

### Étape 2 : Création du profil associé dans `public.profiles`
Dès l'obtention du `id` généré :

```sql
INSERT INTO public.profiles (
  id,
  full_name,
  role,
  active
) VALUES (
  '<UUID_OBTENU_A_L_ETAPE_1>',
  'Directeur Général DMS',
  'manager',
  true
);
```

### Étape 3 : Journalisation dans `audit_logs`
Pour attester formellement de l'initialisation du premier compte administrateur :

```sql
INSERT INTO public.audit_logs (
  actor_id,
  action,
  entity_type,
  entity_id,
  new_values
) VALUES (
  '<UUID_OBTENU_A_L_ETAPE_1>',
  'BOOTSTRAP_FIRST_MANAGER',
  'profile',
  '<UUID_OBTENU_A_L_ETAPE_1>',
  jsonb_build_object(
    'role', 'manager',
    'full_name', 'Directeur Général DMS',
    'timestamp', now()
  )
);
```

---

## 3. Vérification des Politiques de Sécurité (RLS Check)

Une fois créé, exécuter la requête de contrôle sous l'identité de l'utilisateur pour vérifier que RLS et les fonctions de rôles fonctionnent correctement :

```sql
-- 1. Vérifier le rôle détecté
SELECT public.current_app_role(); 
-- Doit retourner: 'manager'

-- 2. Vérifier le statut actif
SELECT public.is_active_user(); 
-- Doit retourner: true

-- 3. Tester l'interdiction des écritures directes (doit échouer avec permission denied)
INSERT INTO public.sales (idempotency_key, request_fingerprint, receipt_number, barber_id, service_id, ...)
VALUES (...);
-- Erreur attendue : ERROR 42501 (permission denied for table sales)
```

---

## 4. Procédure de Secours (Break-Glass)

Si le gérant perd ses identifiants ou en cas d'urgence opérationnelle :
1. La réinitialisation s'effectue obligatoirement au niveau de la base PostgreSQL via la commande sécurisée `UPDATE auth.users SET encrypted_password = crypt('NouveauMotDePasseTemporaire!', gen_salt('bf')) WHERE email = 'direction@lamedor-bamako.ml';`.
2. Une entrée `AUDIT_BREAK_GLASS_PASSWORD_RESET` doit obligatoirement être inscrite dans `public.audit_logs`.
