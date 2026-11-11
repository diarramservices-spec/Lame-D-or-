# Procédures de Déploiement et d'Exploitation en Production — LAME D'OR

> **Établissement** : Salon LAME D'OR — Bamako, Mali  
> **Client** : Diarra Multi Services (DMS)  
> **Version du Système** : 2.0 (Exclusivement en ligne)  
> **Fuseau Horaire de Référence** : `Africa/Bamako` (UTC+0)  

---

## 1. Architecture Cible & Prérequis

L'application LAME D'OR est conçue sur une architecture découplée haute disponibilité :
- **Base de données relationnelle & Auth** : Supabase PostgreSQL 15+ (hébergé sur GCP ou AWS région Europe/Afrique de l'Ouest).
- **Hébergement Frontend / PWA** : Vercel ou Cloud Run avec certificat SSL/TLS Let's Encrypt (HTTPS obligatoire).
- **Domaine Personnalisé** : ex. `caisse.lamedor-bamako.com` configuré avec CNAME vers la plateforme d'hébergement.

---

## 2. Variables d'Environnement

Créer le fichier d'environnement de production sur Vercel / Cloud Run :

```ini
# Supabase Configuration
VITE_SUPABASE_URL=https://<VOTRE-PROJET-ID>.supabase.co
VITE_SUPABASE_ANON_KEY=<CLE_ANON_PUBLIQUE_JWT>

# App Configuration
VITE_APP_NAME="LAME D'OR — Caisse & Commissions"
VITE_TIMEZONE=Africa/Bamako
```

> **Avertissement de Sécurité** : Ne jamais exposer la clé `service_role` dans le frontend client. Toutes les opérations financières passent par les fonctions stockées RPC `SECURITY DEFINER` avec vérification du rôle de session.

---

## 3. Déploiement de la Base de Données Neuve (Reproductibilité)

Sur une instance Supabase neuve, exécuter séquentiellement les scripts SQL situés dans `supabase/migrations/` :

### Étape 3.1 : Types, Tables et Index
Exécuter `supabase/migrations/0001_types_and_tables.sql` :
- Création des types `app_role`, `payment_method`, `sale_status`, `commission_payment_status`, `closing_status`.
- Création de la séquence `receipt_number_seq` débutant à 1001.
- Création des 9 tables relationnelles avec contraintes `CHECK` (montants $\ge 0$, taux de 0% à 100%).
- Création des index calculés sur la date métier Bamako.

### Étape 3.2 : Rôles Applicatifs & Politiques RLS
Exécuter `supabase/migrations/0002_roles_and_rls.sql` :
- Création de la fonction `current_app_role()`.
- Activation du RLS sur l'ensemble des tables.
- Révocation formelle de tout droit d'écriture direct (`INSERT`, `UPDATE`, `DELETE`) pour `authenticated`.

### Étape 3.3 : Fonctions Transactionnelles RPC
Exécuter `supabase/migrations/0003_rpc_functions.sql` :
- `create_sale` : Vente atomique avec recalcul serveur, snapshot et contrôle de date.
- `create_commission_payment` : Règlement avec interdiction de découvert.
- `reverse_commission_payment` : Renversement motivé et audit.
- `validate_cash_closing` : Rapprochement physique et formule espèces.

### Étape 3.4 : Injection du Référentiel Initial (Seed)
Exécuter `supabase/seed.sql` :
- Enregistrement des 3 à 5 barbiers du salon.
- Catalogue officiel des prestations (Coupes, Barbe, Soins) et taux de commissions initiaux.

---

## 4. Procédure de Bootstrap du Premier Gérant

L'inscription publique étant formellement fermée pour ce logiciel privé de salon :
1. Inviter ou créer l'utilisateur par e-mail dans **Supabase Dashboard > Authentication > Users**.
2. Récupérer l'identifiant unique UUID généré (`auth.users.id`).
3. Exécuter la commande SQL de nomination dans l'éditeur SQL Supabase :
   ```sql
   INSERT INTO public.profiles (id, full_name, role, active)
   VALUES ('<UID_RECUPERE>', 'Directeur Général DMS', 'manager', true)
   ON CONFLICT (id) DO UPDATE SET role = 'manager', active = true;
   ```
4. L'utilisateur peut dès lors se connecter et administrer les comptes caissiers et barbiers.

---

## 5. Procédure de Sauvegarde Automatique & Plan de Reprise d'Activité (PRA)

### 5.1 Sauvegardes Quotidiennes Supabase
- Activer les sauvegardes automatiques quotidiennes (incluses nativement avec rétention de 7 à 30 jours).

### 5.2 Export Logique Hebdomadaire Chiffré (`pg_dump`)
Planifier un script de sauvegarde externe hebdomadaire (par exemple via GitHub Actions ou cron Linux) :
```bash
#!/usr/bin/env bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="lamedor_backup_${DATE}.sql.gz"

# Dump logique PostgreSQL
pg_dump -h db.<PROJET-ID>.supabase.co -U postgres -d postgres -F p | gzip -9 > "$BACKUP_FILE"

# Chiffrement GPG et téléversement vers un bucket Cloud privé (Google Cloud Storage / S3)
gpg --encrypt --recipient "admin@diarra-services.ml" "$BACKUP_FILE"
rclone copy "${BACKUP_FILE}.gpg" remote-backup:lamedor-backups/
```

### 5.3 Procédure de Restauration Testée
Pour restaurer la base de données en cas d'incident majeur :
1. Provisionner une base de données PostgreSQL vierge.
2. Déchiffrer le dernier dump logique valide :
   ```bash
   gpg --decrypt lamedor_backup_YYYYMMDD.sql.gz.gpg | gunzip > restore.sql
   ```
3. Exécuter la restauration :
   ```bash
   psql -h <HOST> -U postgres -d postgres -f restore.sql
   ```
4. Vérifier l'intégrité :
   ```sql
   SELECT count(*) FROM public.sales;
   SELECT count(*) FROM public.cash_closings;
   ```

---

## 6. Déploiement Frontend (Vercel)

1. Connecter le dépôt Git du projet à Vercel.
2. Définir le framework sur **Vite**.
3. Configurer la commande de build : `npm run build`.
4. Configurer le répertoire de sortie : `dist`.
5. Renseigner les variables d'environnement (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
6. Déclencher le déploiement de production.

---

## 7. Checklist Finale avant Ouverture au Public

- [ ] Certificat SSL/HTTPS actif et vérifié (cadenas vert dans le navigateur).
- [ ] Fuseau horaire serveur calé sur `Africa/Bamako`.
- [ ] Clé anonyme uniquement présente dans les assets JS publics.
- [ ] RLS activé et vérifié sur les 9 tables.
- [ ] Compte gérant provisionné et connecté.
- [ ] Test d'impression de ticket thermique 58mm/80mm réalisé sur imprimante de caisse.
- [ ] PWA installée sur les téléphones et tablettes du salon.
- [ ] Test de coupure réseau validé en conditions réelles (aucun encaissement fantôme).
