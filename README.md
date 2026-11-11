# LAME D'OR — Application Privée de Caisse et de Commissions

> **Établissement** : Salon de Coiffure LAME D'OR — Bamako, Mali  
> **Client** : Diarra Multi Services (DMS)  
> **Version** : 2.0 — Périmètre exclusivement en ligne  
> **Stack** : React 19 / TypeScript / Tailwind CSS / Supabase PostgreSQL / Vite PWA  
> **Statut Final** : **100% Recetté & Prêt pour la Production (Prompts 0 à 11 validés)**  

---

## 1. Principes Fondamentaux de la Version 2.0

Cette version 2.0 remplace définitivement toute spécification antérieure prévoyant un mode hors ligne ou du stockage local :
- **Autorité Serveur Stricte** : Aucune vente ni opération financière n'est considérée comme valide sans confirmation synchrone de PostgreSQL.
- **Zéro Stockage Transactionnel Local** : Pas d'IndexedDB pour les transactions financières, pas de Background Sync, pas de rejeu asynchrone après reconnexion.
- **Immuabilité des Données** : Toute vente enregistre un snapshot définitif du libellé de la prestation, du tarif catalogue, du taux de commission et de la commission calculée au moment précis de l'encaissement.
- **Rapprochement Physique de Caisse** :  
  $$\text{Espèces théoriques} = \text{Fonds d'ouverture} + \text{Ventes espèces} - \text{Commissions réglées en espèces}$$
  $$\text{Écart de caisse} = \text{Espèces comptées} - \text{Espèces théoriques}$$
- **PWA Statique & Network-Only** : Cache Service Worker strictement réservé au shell statique (HTML, CSS, icônes, bundles JS). Requêtes d'API et Supabase en `NetworkOnly`.

---

## 2. Arborescence du Projet

```text
├── docs/
│   ├── implementation-plan.md     # Analyse architecturale complète (Prompt 0)
│   ├── deployment.md              # Procédures de déploiement, migrations, sauvegardes & PRA (Prompt 1 / 11)
│   ├── bootstrap-manager.md       # Initialisation sécurisée du premier compte gérant (Prompt 2)
│   ├── user-guide.md              # Manuel opérateur pas-à-pas pour l'équipe du salon (Prompt 9)
│   ├── test-report.md             # Rapport d'audit de sécurité et de tests (Prompt 9)
│   ├── recette-technique.md       # Procès-verbal de recette des 18 critères d'acceptation (Prompt 10)
│   └── production-signoff.md      # Procès-verbal de livraison finale et PV de clôture DMS (Prompt 11)
├── supabase/
│   ├── migrations/
│   │   ├── 0001_types_and_tables.sql  # Schéma relationnel, types BIGINT FCFA et index calculés
│   │   ├── 0002_roles_and_rls.sql     # Fonctions de rôle, sécurité RLS et restrictions directes
│   │   └── 0003_rpc_functions.sql     # Fonctions transactionnelles RPC (create_sale, payments, closing)
│   └── seed.sql                   # Référentiel initial des barbiers et catalogue de prestations
├── tests/
│   ├── unit/
│   │   └── financial.test.ts          # 5 tests unitaires : calculs de commissions, arrondis, Zod
│   ├── integration/
│   │   ├── security_rls.test.ts       # 10 tests : RLS, isolation barbier, protection gérant
│   │   ├── referentiels.test.ts       # 8 tests : administration catalogue & versionnement
│   │   ├── caisse_rpc.test.ts         # 7 tests : createSale RPC, recalcul serveur, idempotence
│   │   ├── commissions.test.ts        # 7 tests : soldes barbiers, découverts interdits, renversements
│   │   ├── cloture.test.ts            # 7 tests : arrêté de caisse, déduction espèces, ajustements
│   │   ├── dashboard_reports.test.ts  # 5 tests : filtres périodiques, exports CSV conformes
│   │   └── pwa_network.test.ts        # 10 tests : tests obligatoires de perte réseau (Section 15)
│   └── e2e/
│       ├── e2e_workflow.test.ts       # 1 test : parcours opérationnel d'une journée complète de salon
│       └── acceptance_criteria.test.ts # 18 tests : validation unitaire des 18 critères d'acceptation
├── src/
│   ├── components/
│   │   ├── layout/                    # En-tête (Header), Navigation, PWAInstallButton, NetworkBanner
│   │   └── views/                     # Caisse (POS), Ventes, Commissions, Clôtures, Prestations, Barbiers, Dashboard, Audit
│   ├── hooks/                         # usePWAInstall, useOnlineStatus
│   ├── lib/                           # Formatage FCFA, dates Bamako, matrice de permissions, Supabase
│   ├── schemas/                       # Schémas de validation Zod
│   ├── services/                      # Couche de services et magasin de domaine (Store)
│   └── types/                         # Types TypeScript stricts
├── public/
│   ├── icon.svg                       # Logo vectoriel de marque LAME D'OR
│   ├── pwa-192x192.png                # Icône PWA 192x192
│   ├── pwa-512x512.png                # Icône PWA 512x512
│   ├── pwa-maskable-512x512.png       # Icône Android Maskable avec zone de sécurité
│   ├── apple-touch-icon.png           # Icône iOS Safari 180x180
│   ├── favicon-32x32.png              # Favicon PNG
│   ├── favicon.ico                    # Favicon standard
│   └── registerSW.js                  # Script Service Worker de secours
├── .env.example
├── package.json
├── tsconfig.json
└── vite.config.ts                     # Configuration VitePWA Network-Only et Tailwind CSS
```

---

## 3. Commandes Principales

```bash
# Lancement de l'environnement de développement (port 3000)
npm run dev

# Vérification du typage TypeScript (Linter)
npm run lint

# Exécution de l'intégralité des 78 tests automatisés (10 suites)
npm test

# Compilation pour la production
npm run build
```

---

## 4. Matrice des Rôles & Permissions

| Habilitation | Gérant (`manager`) | Caissier (`cashier`) | Barbier (`barber`) |
| :--- | :---: | :---: | :---: |
| **Terminal de Caisse (POS)** | ✅ Encaissement & Tarif dérogatoire motivé | ✅ Encaissement au tarif catalogue | ❌ Interdit |
| **Journal des Ventes** | ✅ Toutes les ventes & Annulation auditée | ✅ Consultation des ventes du jour | ✅ Consultation de ses prestations |
| **Règlements de Commissions** | ✅ Règlements partiels/totaux & Renversements | ❌ Interdit | ✅ Consultation de son solde dû |
| **Arrêté de Caisse (Clôture)** | ✅ Rapprochement physique & Certification | ❌ Interdit | ❌ Interdit |
| **Catalogue & Tarifs** | ✅ Création, modification & Versionnement taux | ❌ Consultation seule | ❌ Consultation seule |
| **Équipe de Barbiers** | ✅ Création, modification & Statut actif | ❌ Consultation seule | ❌ Interdit |
| **Tableau de Bord & Exports** | ✅ Statistiques complètes & Exports CSV/PDF | ❌ Interdit | ❌ Interdit |
| **Journal d'Audit** | ✅ Piste d'audit immuable complète | ❌ Interdit | ❌ Interdit |

---

## 5. Synthèse de la Recette Technique (Phase 10)

L'application a validé avec succès les **18 critères contractuels de la Section 17** du dossier technique :
- **0 erreur de compilation**
- **0 erreur de linting TypeScript**
- **78 tests passés avec succès** (100% de réussite)
- **Rapport de recette disponible** : `docs/recette-technique.md`
- **Procès-verbal de clôture finale** : `docs/production-signoff.md`
