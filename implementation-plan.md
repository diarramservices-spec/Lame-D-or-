# LAME D'OR — Plan d'Implémentation & Analyse d'Architecture (Prompt 0)

> **Projet** : LAME D'OR — Application privée de caisse et de commissions  
> **Client** : Diarra Multi Services (DMS) — Bamako, Mali  
> **Auteur** : Architecte Logiciel Principal  
> **Statut** : En attente de validation DMS avant démarrage de l'implémentation (Prompt 1)  
> **Document de référence** : *Dossier Technique de Développement v2.0* (Périmètre exclusivement en ligne)

---

## Synthèse Exécutive

Le présent document constitue l'exécution exhaustive du **Prompt 0 (Section 23 du dossier technique)**. Il formalise l'analyse architecturale, l'arbitrage des règles métier, la revue du modèle de données et la trajectoire de développement pour le salon de coiffure **LAME D'OR** à Bamako.

Cette version 2.0 remplace définitivement toute spécification antérieure prévoyant un mode hors ligne ou de la synchronisation locale. L'application repose sur le principe fondamental d'**autorité serveur exclusive** : aucune transaction financière n'est validée sans confirmation synchrone de PostgreSQL, garantissant ainsi l'intégrité comptable du tiroir-caisse et des commissions des barbiers.

---

## 1. Résumé du Périmètre Inclus et Exclu

### 1.1 Périmètre Inclus
- **Périmètre établissement** : Un seul salon physique LAME D'OR situé à Bamako (Mali). Une caisse logique centrale partagée en temps réel entre plusieurs terminaux connectés (téléphones, tablettes, ordinateurs).
- **Gestion des barbiers** : Référentiel de 3 à 5 barbiers (nom, contact, statut actif/inactif, liaison facultative à un compte utilisateur).
- **Catalogue de prestations & commissions** :
  - Prestations avec nom, tarif catalogue en FCFA et état d'activation.
  - Taux de commission configuré en pourcentage par prestation (avec versionnement historique).
- **Enregistrement des ventes (POS)** :
  - Sélection de la prestation et du barbier réalisateur.
  - Saisie du montant réellement encaissé et du moyen de paiement (Espèces, Orange Money, Moov Money).
  - Enregistrement immédiat d'un **snapshot immuable** : libellé prestation, tarif catalogue, taux de commission, base de calcul et commission calculée.
  - Calcul de la commission exécuté **strictement côté serveur**.
  - Génération séquentielle d'un numéro de reçu unique.
- **Gestion des commissions des barbiers** :
  - Suivi des commissions générées, des règlements effectués et du solde net dû par barbier.
  - Enregistrement des règlements manuels de commissions par le gérant (espèces, Orange Money, Moov Money).
  - Possibilité de renversement motivé d'un règlement en cas d'erreur de saisie.
- **Clôture journalière de caisse** :
  - Clôture manuelle obligatoire initiée par le gérant pour une date métier (`Africa/Bamako`).
  - Ventilation des ventes et des règlements de commissions par moyen de paiement.
  - Calcul du solde théorique d'espèces :  
    $$\text{Espèces théoriques} = \text{Fonds d'ouverture} + \text{Ventes espèces} - \text{Commissions réglées en espèces}$$
  - Saisie du comptage physique réel des espèces et calcul immédiat de l'écart (excédent / déficit).
  - Snapshot immuable de clôture et journal des ajustements ultérieurs (*append-only*).
- **Audit et traçabilité** :
  - Journal immuable (`audit_logs`) traçant les créations de ventes, annulations, modifications tarifaires, règlements de commissions et clôtures.
  - Annulation de vente avec motif obligatoire, sans suppression physique en base (`status = 'cancelled'`).
- **Tableau de bord & Reporting** :
  - Chiffre d'affaires journalier/périodique, nombre de prestations, ventilation des règlements, état des commissions et performance par barbier.
  - Exports de données (PDF & Excel/CSV) conformes aux filtres actifs et restreints selon les droits du rôle connecté.
- **PWA installable** : Mise en cache strictement confinée au socle applicatif statique (HTML, CSS, icônes, scripts JS) sans aucune donnée métier mise en cache locale.

### 1.2 Exclusions Strictes (Garanties de robustesse)
- **Aucun mode hors ligne** : Aucune vente enregistrée localement, aucune file d'attente locale (Background Sync), aucun rejeu asynchrone différé.
- **Aucun stockage transactionnel client** : Interdiction totale de stocker des ventes dans IndexedDB, WebSQL ou LocalStorage.
- **Aucune intégration API opérateur télécoms** : Les règlements Orange Money et Moov Money sont déclaratifs (saisis manuellement par l'opérateur de caisse sans interrogation des passerelles bancaires ou USSD).
- **Aucun module annexe non convenu** : Pas de gestion de stocks de produits capillaires, pas de gestion de rendez-vous ou d'agenda client, pas de programme de fidélité, pas de paie salariale fixe générale.
- **Aucun multi-salon ni architecture SaaS mutualisée** : L'instance est dédiée exclusivement au salon LAME D'OR de Bamako.

---

## 2. Ambiguïtés et Décisions Bloquantes (Arbitrages DMS)

En application de la section 21 du dossier technique, voici la matrice des décisions métier à valider formellement par DMS :

| Sujet | Question Métier | Proposition Technique Recommandée | Statut |
| :--- | :--- | :--- | :--- |
| **Base de commission** | La commission est-elle calculée sur le montant réellement encaissé ou sur le tarif catalogue ? | **Montant réellement encaissé** (conforme à la pratique commerciale standard en cas de réduction accordée). | *À confirmer par DMS* |
| **Prix dérogatoire** | Qui peut modifier le montant encaissé par rapport au tarif catalogue ? | **Gérant uniquement**, avec saisie obligatoire d'un motif textuel et trace d'audit. Le caissier ne peut pas déroger au prix catalogue sans validation. | *À confirmer par DMS* |
| **Paiements partiels de commissions** | Le gérant peut-il régler une fraction du solde dû à un barbier ? | **Oui**, les règlements partiels sont autorisés. Le solde restant dû est recalculé dynamiquement. | *Recommandé / À confirmer* |
| **Paiement supérieur au solde** | Peut-on verser une commission supérieure au solde dû (avance / crédit) ? | **Non, blocage strict par défaut**. Évite les découverts non maîtrisés. Si une avance doit exister, elle doit faire l'objet d'un flux spécifique. | *Sécurisé par défaut* |
| **Comptes utilisateurs barbiers** | Chaque barbier doit-il avoir un identifiant de connexion ? | **Facultatif**. Les barbiers disposant d'un compte ne voient que leurs propres prestations et leur solde de commission. Le salon peut fonctionner avec un seul compte caissier/gérant. | *Flexible* |
| **Visibilité du caissier** | Le caissier peut-il consulter le CA global et le dashboard ? | **Restreint** : Le caissier enregistre les ventes et consulte les ventes de sa journée/session. Le dashboard consolidé et les marges nettes restent réservés au gérant. | *À confirmer par DMS* |
| **Fonds d'ouverture** | Le tiroir-caisse démarre-t-il toujours à 0 ou avec un fond de caisse ? | **Champ paramétrable à la clôture** (ou à l'ouverture), valeur par défaut 0 FCFA. | *Prévu dans le schéma* |
| **Clôture rétroactive** | Peut-on clôturer une date passée non clôturée ? | **Oui, réservé au gérant**, avec horodatage strict et mention d'audit. | *Sécurisé* |
| **Annulation après clôture** | Peut-on annuler une vente rattachée à une journée déjà clôturée ? | **Interdiction stricte par défaut**. Toute correction post-clôture passe par la table `cash_closing_adjustments` afin de ne jamais fausser le snapshot financier certifié. | *Règle comptable stricte* |
| **Moyens de paiement des commissions** | Quels modes sont autorisés pour payer les barbiers ? | **Espèces, Orange Money, Moov Money**. Tout paiement en espèces déduit automatiquement la caisse physique. | *Prévu dans le schéma* |
| **Format du reçu client** | Quel est le format de remise du reçu ? | **Affichage écran + impression thermique / navigateur** (format ticket de caisse 58mm/80mm ou partage direct). | *Recommandé* |

---

## 3. Architecture Détaillée

### 3.1 Schéma d'Architecture Système

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TERMINAUX SALON                                  │
│         (Smartphones Android/iOS, Tablettes Android/iPad, PC Caisse)        │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │               PWA LAME D'OR (Next.js / React / Tailwind)            │   │
│   │                                                                     │   │
│   │   [Détection Réseau]  ──▶  Si Hors-ligne : Bannière rouge & blocage │   │
│   │   [Interface Caisse]  ──▶  Saisie vente, choix barbier, calcul prév │   │
│   │   [Idempotency Key]   ──▶  UUID v4 généré à l'ouverture de saisie   │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │ HTTPS obligatoire (Network-Only)
                                       │ Bearer JWT (Supabase Auth)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND & ORCHESTRATION                           │
│                     (Vercel Edge / Node Server Actions)                     │
│                                                                             │
│   • Validation stricte des schémas d'entrée (Zod)                           │
│   • Contrôle du rôle applicatif actif de la session (profiles.role)         │
│   • Génération des empreintes de requêtes (request_fingerprint)             │
│   • Horodatage et contextualisation sur le fuseau 'Africa/Bamako'           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Supabase RPC Client
                                       │ Transaction Isolation Level: READ COMMITTED
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE POSTGRESQL (Source de Vérité)                   │
│                                                                             │
│   ┌───────────────────────────┐       ┌─────────────────────────────────┐   │
│   │    FONCTIONS RPC ACID     │       │    POLITIQUES DE SÉCURITÉ RLS   │   │
│   │  • create_sale()          │       │  • profiles / barbers / services│   │
│   │  • create_comm_payment()  │       │  • sales (lecture filtrée rôle) │   │
│   │  • validate_closing()     │       │  • mutations directes révoquées │   │
│   └─────────────┬─────────────┘       └─────────────────────────────────┘   │
│                 │                                                           │
│                 ▼                                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         TABLES RELATIONNELLES                       │   │
│   │  profiles            commission_rules        commission_payments   │   │
│   │  barbers             sales                   cash_closings          │   │
│   │  services            receipt_number_seq      audit_logs             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Principes d'Ingénierie Non Négociables
1. **Intégrité Monétaire** : Tous les montants financiers sont typés en `BIGINT` (FCFA sans décimales). Les taux de commission utilisent `NUMERIC(5,2)` ($0.00$ à $100.00\%$).
2. **Autorité Serveur Absolue** : Le client web transmet uniquement les identifiants (`service_id`, `barber_id`, `payment_method`) et le `amount_received`. Le serveur PostgreSQL relit le tarif actif, valide le statut actif du barbier, calcule la commission et enregistre les snapshots.
3. **Immuabilité des Données Historiques** : Toute modification ultérieure d'un tarif catalogue ou d'un taux de commission n'altère en aucun cas les ventes passées.
4. **Zéro Écriture Directe Client** : Les permissions `INSERT`, `UPDATE` et `DELETE` sur les tables financières (`sales`, `commission_payments`, `cash_closings`) sont formellement révoquées pour le rôle `authenticated`. Toute opération passe obligatoirement par des fonctions stockées PostgreSQL RPC (`SECURITY DEFINER`).

---

## 4. Revue du Schéma SQL et des Migrations

Le socle SQL fourni dans le dossier technique est structuré et cohérent. L'analyse technique valide les tables et recommande les optimisations suivantes :

### 4.1 Inventaire des Objets SQL

```sql
-- Énumérations et séquences
CREATE TYPE public.app_role AS ENUM ('manager', 'cashier', 'barber');
CREATE TYPE public.payment_method AS ENUM ('cash', 'orange_money', 'moov_money');
CREATE TYPE public.sale_status AS ENUM ('completed', 'cancelled');
CREATE TYPE public.commission_payment_status AS ENUM ('paid', 'reversed');
CREATE TYPE public.closing_status AS ENUM ('validated');
CREATE SEQUENCE public.receipt_number_seq START WITH 1001;
```

### 4.2 Points d'Attention et Compléments Nécessaires
1. **Format du reçu (`receipt_number`)** :  
   Plutôt qu'un entier brut, formater sous forme normalisée : `'REC-' || to_char(now() at time zone 'Africa/Bamako', 'YYYYMMDD') || '-' || lpad(nextval('public.receipt_number_seq')::text, 5, '0')`.
2. **Index d'Idempotence** :  
   `idempotency_key` (UUID) est unique sur `sales`. Il convient de s'assurer que la fonction `create_sale` gère le double-appel en renvoyant le tuple existant sans générer d'erreur bloquante si l'empreinte de la requête est identique.
3. **Isolation de la Date Métier** :  
   L'index calculé `sales_business_date_idx` sur `((created_at at time zone 'Africa/Bamako')::date)` est capital pour agréger instantanément les clôtures journalières.
4. **Trigger d'Audit Généralisé** :  
   Prévoir des déclencheurs automatiques ou des insertions explicites dans `audit_logs` pour consigner toute écriture sensible (`old_values`, `new_values`, `actor_id`).

---

## 5. Stratégie RLS (Row Level Security) et Fonctions RPC

### 5.1 Matrice d'Accès et Politiques RLS

| Table | Lecture (SELECT) | Écriture (INSERT / UPDATE / DELETE) |
| :--- | :--- | :--- |
| `profiles` | Soi-même OU Rôle `manager` | Admin / Bootstrap sécurisé uniquement |
| `barbers` | Rôle `manager` OU `cashier` OU barbier lié | Rôle `manager` uniquement |
| `services` | Tout utilisateur actif authentifié | Rôle `manager` uniquement |
| `commission_rules` | Rôle `manager` OU `cashier` | Rôle `manager` uniquement |
| `sales` | Rôle `manager`, `cashier` (toutes) OU barbier (ses propres ventes) | **Révoqué à tous** $\rightarrow$ Exclusivement via RPC `create_sale` / `cancel_sale` |
| `commission_payments` | Rôle `manager` OU barbier (ses propres règlements) | **Révoqué à tous** $\rightarrow$ Exclusivement via RPC `create_commission_payment` |
| `cash_closings` | Rôle `manager` uniquement | **Révoqué à tous** $\rightarrow$ Exclusivement via RPC `validate_cash_closing` |
| `cash_closing_adjustments`| Rôle `manager` uniquement | **Révoqué à tous** $\rightarrow$ RPC `add_closing_adjustment` |
| `audit_logs` | Rôle `manager` uniquement | **Révoqué à tous** $\rightarrow$ Fonctions serveur internes |

### 5.2 Fonctions RPC et Verrous Concurrentiels
Toutes les fonctions RPC critiques opèrent sous `SECURITY DEFINER` avec un `SET search_path = public, pg_temp;` strict pour se prémunir des attaques par substitution de schéma :
- **Verrou transactionnel métier** : Utilisation de verrous applicatifs PostgreSQL (`pg_advisory_xact_lock(hashtext('closing_' || business_date::text))`) pour garantir qu'aucune vente ne puisse s'enregistrer en cours de validation de clôture de la même journée.
- **Révocation d'exécution publique** : `REVOKE EXECUTE ON ALL FUNCTIONS FROM PUBLIC;` puis octroi sélectif (`GRANT EXECUTE ... TO authenticated;`).

---

## 6. Flux Transactionnels Détaillés

### 6.1 Flux 1 : Enregistrement d'une Vente (`create_sale`)

```
Client POS                   Server Action (API)                PostgreSQL RPC create_sale()
   │                                 │                                      │
   │─── 1. Saisie Prestation/Barbier ─▶│                                    │
   │    + Montant + Moyen Paiement   │                                      │
   │    + idempotency_key (UUID)     │                                      │
   │                                 │─── 2. Validation Zod ───────────────▶│
   │                                 │    Vérification rôle & session       │
   │                                 │                                      │── 3. Vérif idempotency_key
   │                                 │                                      │   (Si existe & même payload:
   │                                 │                                      │    retourne vente existante)
   │                                 │                                      │
   │                                 │                                      │── 4. Verrou date métier
   │                                 │                                      │   Bloque si date clôturée
   │                                 │                                      │
   │                                 │                                      │── 5. Relit Service & Règle
   │                                 │                                      │   Prestation active ?
   │                                 │                                      │   Barbier actif ?
   │                                 │                                      │
   │                                 │                                      │── 6. Calcul Commission :
   │                                 │                                      │   base = amount_received
   │                                 │                                      │   comm = ROUND(base * rate / 100)
   │                                 │                                      │
   │                                 │                                      │── 7. INSERT sales + Snapshots
   │                                 │                                      │   INSERT audit_logs
   │                                 │                                      │
   │◀── 9. Confirmation & Reçu ──────│◀── 8. Reçu validé & ID Vente ────────│
```

### 6.2 Flux 2 : Annulation d'une Vente (`cancel_sale`)
1. **Contrôle d'accès** : Réservé au `manager` (sauf dérogation DMS validée).
2. **Vérification date** : Si la date de la vente a déjà fait l'objet d'une clôture validée, rejet immédiat (nécessite un ajustement de clôture).
3. **Mise à jour d'état** :
   ```sql
   UPDATE sales
   SET status = 'cancelled',
       cancelled_by = auth.uid(),
       cancelled_at = now(),
       cancellation_reason = p_reason
   WHERE id = p_sale_id AND status = 'completed';
   ```
4. **Alerte de régularisation** : Si les commissions dues du barbier deviennent négatives suite à cette annulation (car déjà payées), le solde bascule en anomalie/crédit et déclenche une notification visuelle au gérant.
5. **Traçabilité** : Insertion obligatoire dans `audit_logs`.

### 6.3 Flux 3 : Paiement d'une Commission (`create_commission_payment`)
1. **Verrouillage** : Verrou sur l'identifiant du barbier pour prévenir les doubles saisies simultanées par plusieurs terminaux gérant.
2. **Vérification du solde dû** :
   $$\text{Commissions générées (ventes 'completed')} - \text{Règlements cumulés (statut 'paid')}$$
3. **Validation montant** :
   - Le montant doit être strictement supérieur à $0$.
   - Le montant doit être inférieur ou égal au solde dû (pas de découvert autorisé par défaut).
4. **Impact sur la Caisse** :
   - Si le mode de règlement est `cash` (espèces), ce montant viendra obligatoirement en déduction du tiroir-caisse lors de la clôture de la journée.
5. **Renversement éventuel (`reverse_commission_payment`)** : Un paiement erroné peut être marqué `reversed` avec motif obligatoire par le gérant, rétablissant instantanément le solde dû du barbier.

### 6.4 Flux 4 : Clôture Quotidienne (`validate_cash_closing`)
1. Le gérant initie la clôture pour la date métier sélectionnée (par défaut : date courante à Bamako).
2. Verrouillage exclusif sur la date métier : aucune vente ne peut être créée en parallèle.
3. Agrégation temps réel côté base :
   - $V_{\text{cash}}$ : Ventes espèces du jour.
   - $V_{\text{orange}}$ : Ventes Orange Money du jour.
   - $V_{\text{moov}}$ : Ventes Moov Money du jour.
   - $C_{\text{cash}}$ : Règlements de commission effectués en espèces ce jour.
   - $C_{\text{orange}}, C_{\text{moov}}$ : Règlements de commission Orange / Moov Money.
4. Calcul automatique :
   $$\text{Espèces théoriques attendues} = \text{Fonds d'ouverture} + V_{\text{cash}} - C_{\text{cash}}$$
5. Saisie physique : Le gérant compte physiquement les billets et pièces dans le tiroir et saisit le montant compté.
6. L'écart est calculé immédiatement :
   $$\text{Écart} = \text{Espèces comptées} - \text{Espèces théoriques}$$
7. Enregistrement du snapshot certifié dans `cash_closings`. La journée est déclarée close.

---

## 7. Stratégie PWA Statique et Perte de Connexion

Conformément à la règle d'or du dossier technique v2.0 : **Aucun fonctionnement hors ligne.**

```
                                  [ DÉTECTION ÉTAT RÉSEAU ]
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
            [ En Ligne (Online) ]                               [ Hors Ligne (Offline) ]
                    │                                                   │
  • Communication directe HTTPS / Supabase              • Bannière d'alerte rouge permanente :
  • Soumission des ventes autorisée                       "Connexion Internet indisponible"
  • Bouton d'encaissement actif                         • Désactivation immédiate des boutons d'encaissement
  • Reçu affiché UNIQUEMENT après succès serveur        • Aucun stockage dans IndexedDB ou LocalStorage
                                                        • Aucune file d'attente (pas de sync en arrière-plan)
                                                        • Aucun faux reçu affiché
```

### 7.1 Cache PWA Strictement Restreint
- Le Service Worker met en cache **uniquement** les assets statiques immuables :
  - `index.html` (shell applicatif)
  - Feuilles de style CSS compilées
  - Fichiers JavaScript bundle
  - Icônes de marque, logo LAME D'OR et polices typographiques
- **Règle absolue** : Les requêtes d'API (`/api/*`, requêtes Supabase REST et RPC) utilisent une stratégie **Network-Only**. Aucun cache HTTP ne doit intercepter les flux financiers.

### 7.2 Protocole en Cas de Coupure Réseau en Cours de Requête
Si la connexion est interrompue alors que l'utilisateur a appuyé sur "Valider l'encaissement" :
1. L'application bascule dans un état explicite : **« Confirmation serveur non reçue — Vérification requise »**.
2. Aucun reçu de complétion n'est affiché.
3. La clé d'idempotence (`idempotency_key`) générée pour cette tentative reste conservée en mémoire vive de l'écran.
4. Au rétablissement du réseau, l'opérateur est invité à consulter le journal des ventes récentes avant toute nouvelle saisie. S'il retente la soumission avec le même formulaire, la même clé d'idempotence garantit qu'aucune vente double ne sera créée en base.

---

## 8. Plan de Développement Ordonné

Le projet est séquencé en lots stricts et indépendants, conformes aux Prompts 1 à 11 du dossier :

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      TRAJECTOIRE DE DÉVELOPPEMENT LAME D'OR                     │
└─────────────────────────────────────────────────────────────────────────────────┘
  [Phase 0]  Analyse architecturale & Validation DMS (Prompt 0) ──▶ [ACTUEL]
      │
  [Phase 1]  Fondations techniques : Next.js, React, Tailwind, Supabase (Prompt 1)
      │
  [Phase 2]  Base de données, Migrations SQL 0001-0003, RLS & Sécurité (Prompt 2)
      │
  [Phase 3]  Référentiels : Barbiers, Prestations & Taux de commissions (Prompt 3)
      │
  [Phase 4]  Caisse & Encaissement : RPC create_sale, Idempotence, Reçus (Prompt 4)
      │
  [Phase 5]  Gestion des Commissions : Soldes, Règlements, Renversements (Prompt 5)
      │
  [Phase 6]  Clôture de Caisse Quotidienne : Espèces théoriques vs réelles (Prompt 6)
      │
  [Phase 7]  Tableaux de Bord & Exports PDF / Excel (Prompt 7)
      │
  [Phase 8]  PWA Statique & Tests de Robustesse Réseau (Prompt 8)
      │
  [Phase 9]  Audit Final, Rapports de Tests & Recette Technique (Prompt 9)
      │
  [Phase 10] Déploiement en Production & Procédure de Sauvegarde (P11)
```

---

## 9. Analyse des Risques et Estimation de Faisabilité

| Facteur de Risque | Niveau d'Impact | Mesure Préventive & Atténuation |
| :--- | :---: | :--- |
| **Instabilité de la connexion 4G/Fibre à Bamako** | **Majeur** | Interface ultra-légère ($< 150\text{ Ko}$ de bundle initial), retours d'état réseau instantanés, idempotence stricte évitant toute double facturation lors des micro-coupures. |
| **Erreur de manipulation sur le tiroir-caisse** | **Élevé** | Prise en compte mathématique systématique des commissions payées en espèces ; calcul automatique de l'écart ; interdiction de modifier une clôture validée sans entrée d'ajustement auditée. |
| **Fraude ou contestation de commission barbier** | **Moyen** | Enregistrement de snapshots immuables au moment de la vente ; consultation transparente des prestations réalisées par chaque barbier via son interface dédiée. |
| **Périmètre budgétaire & Délais** | **Moyen** | Le budget de référence de **465 000 FCFA** (issu du retrait du module complexe de synchronisation hors ligne) est cohérent avec la stack retenue (Next.js/Supabase). Le calendrier prévisionnel réaliste pour une livraison industrielle sécurisée est de **3 à 4 semaines** découpées selon le plan par phases. |

---

## 10. Conclusion & Prochaine Étape

L'architecture proposée garantit une conformité totale avec le dossier technique v2.0 de Diarra Multi Services. Elle supprime la dette technique et les risques de désynchronisation de l'ancien modèle hors ligne pour offrir une solution robuste, traçable et pérenne.

👉 **Action requise de DMS** : Valider les choix de la Section 2 afin de lancer immédiatement l'exécution du **Prompt 1 (Fondations techniques)**.
