# Procès-Verbal de Recette Technique — LAME D'OR v2.0 (Prompt 10)

> **Établissement** : Salon de coiffure LAME D'OR — Bamako, Mali  
> **Commanditaire** : Diarra Multi Services (DMS)  
> **Date de Recette** : 10 Novembre 2026  
> **Document Contractuel** : *Dossier Technique de Développement v2.0*  
> **Décision de Recette** : **ACCEPTATION TECHNIQUE SANS RÉSERVE (18/18 VALIDÉS)**

---

## 1. Objet du Document

Le présent procès-verbal formalise la recette technique contradictoire du logiciel privé de caisse et de gestion des commissions **LAME D'OR**, exécutée au terme de la **Phase 10 (Prompt 10)**.

L'évaluation porte sur la vérification exhaustive des **18 critères d'acceptation contractuels** définis dans la **Section 17** du dossier technique, ainsi que sur l'intégrité de la base de données PostgreSQL, la robustesse de l'idempotence, le verrouillage en perte de connexion et l'ergonomie responsive multi-terminaux.

---

## 2. Matrice d'Évaluation des 18 Critères d'Acceptation (Section 17)

| N° | Critère Contractuel Exigé | Test Automatisé Associé | Résultat | Observation Technique |
| :-: | :--- | :--- | :-: | :--- |
| **1** | Le gérant crée, modifie et désactive une prestation. | `Critère 1` (`acceptance_criteria.test.ts`) | **CONFORME** | Rôle `manager` obligatoire. Le caissier et le barbier sont rejetés. |
| **2** | Le gérant configure un taux de commission par prestation. | `Critère 2` (`acceptance_criteria.test.ts`) | **CONFORME** | Versionnement automatique avec fermeture de l'ancienne règle (`valid_to`). |
| **3** | Une vente enregistre barbier, prestation, prix catalogue snapshot, encaissé, paiement et créateur. | `Critère 3` (`acceptance_criteria.test.ts`) | **CONFORME** | Snapshots complets et numéro de reçu normalisé généré. |
| **4** | La commission est calculée côté serveur. | `Critère 4` (`acceptance_criteria.test.ts`) | **CONFORME** | Formule `ROUND(base * rate / 100)` exécutée sous PostgreSQL RPC. |
| **5** | Les changements ultérieurs n'altèrent pas les snapshots historiques. | `Critère 5` (`acceptance_criteria.test.ts`) | **CONFORME** | Immuabilité totale des ventes archivées lors d'une hausse tarifaire. |
| **6** | Les doubles soumissions ne créent pas deux ventes. | `Critère 6` (`acceptance_criteria.test.ts`) | **CONFORME** | `idempotency_key` unique + empreinte de requête : retour du tuple existant. |
| **7** | Une vente annulée reste consultable et est exclue des agrégats actifs. | `Critère 7` (`acceptance_criteria.test.ts`) | **CONFORME** | Statut `cancelled`, motif obligatoire, exclusion du CA et des commissions. |
| **8** | Le solde est commissions valides moins paiements valides. | `Critère 8` (`acceptance_criteria.test.ts`) | **CONFORME** | Recalcul dynamique : $\sum \text{Commissions} - \sum \text{Paiements versés}$. |
| **9** | Les règlements manuels sont historisés. | `Critère 9` (`acceptance_criteria.test.ts`) | **CONFORME** | Table `commission_payments` avec horodatage, auteur, mode et référence. |
| **10**| La clôture affiche ventes et règlements par moyen. | `Critère 10` (`acceptance_criteria.test.ts`) | **CONFORME** | Ventilation séparée Espèces, Orange Money et Moov Money. |
| **11**| Les commissions payées en espèces réduisent la caisse théorique. | `Critère 11` (`acceptance_criteria.test.ts`) | **CONFORME** | $\text{Espèces attendues} = \text{Ouverture} + V_{\text{cash}} - C_{\text{cash}}$. |
| **12**| L'écart est compté moins théorique. | `Critère 12` (`acceptance_criteria.test.ts`) | **CONFORME** | Différence mathématique immédiate (Excédent / Déficit / Équilibre). |
| **13**| Les corrections sont motivées et auditées. | `Critère 13` (`acceptance_criteria.test.ts`) | **CONFORME** | Rejet si motif $< 5$ caractères ; consigné dans `audit_logs`. |
| **14**| Les exports correspondent aux filtres et chiffres affichés. | `Critère 14` (`acceptance_criteria.test.ts`) | **CONFORME** | CSV Excel avec séparateur `;` strictement concordant avec l'écran. |
| **15**| Les permissions sont imposées côté serveur et RLS. | `Critère 15` (`acceptance_criteria.test.ts`) | **CONFORME** | RLS activé sur 9 tables ; écritures directes révoquées pour `authenticated`. |
| **16**| Sans réseau, aucune vente n'est enregistrée et aucun reçu confirmé n'est affiché. | `Critère 16` (`acceptance_criteria.test.ts`) | **CONFORME** | Blocage immédiat, bandeau d'alerte, 0 ligne écrite en base. |
| **17**| La PWA ne met pas en cache les opérations ou données financières. | `Critère 17` (`acceptance_criteria.test.ts`) | **CONFORME** | Règle Workbox `NetworkOnly` sur toutes les API et routes de données. |
| **18**| Une clôture empêche les nouvelles opérations sur la même date. | `Critère 18` (`acceptance_criteria.test.ts`) | **CONFORME** | Verrouillage strict de la date métier une fois certifiée par le gérant. |

---

## 3. Synthèse de la Couverture de Tests (78 Tests Automatisés)

Le socle technique est couvert par **10 suites de tests** exécutées dans Vitest :
- `tests/unit/financial.test.ts` (5 tests) : Formules financières, arrondis FCFA entiers, schémas Zod.
- `tests/integration/security_rls.test.ts` (10 tests) : Contrôle d'accès RLS, isolation barbier, protection tarifs.
- `tests/integration/referentiels.test.ts` (8 tests) : Administration catalogue & versionnement.
- `tests/integration/caisse_rpc.test.ts` (7 tests) : RPC createSale, recalcul serveur, concurrence.
- `tests/integration/commissions.test.ts` (7 tests) : Soldes barbiers, blocage découvert, renversements.
- `tests/integration/cloture.test.ts` (7 tests) : Rapprochement de caisse, déduction espèces, ajustements.
- `tests/integration/dashboard_reports.test.ts` (5 tests) : Métriques périodiques, exports CSV conformes.
- `tests/integration/pwa_network.test.ts` (10 tests) : Les 10 tests de perte de connexion de la Section 15.
- `tests/e2e/e2e_workflow.test.ts` (1 test) : Parcours opérationnel complet d'une journée de salon.
- `tests/e2e/acceptance_criteria.test.ts` (18 tests) : Validation unitaire des 18 critères d'acceptation.

**Bilan d'exécution** : **78 passés, 0 échec, 0 avertissement.**

---

## 4. Audit Visuel, Ergonomie et Multi-Terminaux

L'interface a été auditée sur différentes largeurs d'écran représentatives des équipements du salon LAME D'OR :
1. **Smartphone (Android / iPhone)** :
   - Zone tactile minimale $\ge 44\text{px}$ pour les doigts des opérateurs de caisse.
   - Sélection rapide de la prestation et du barbier sans défilement excessif.
   - Affichage immédiat du reçu en pop-up après confirmation serveur.
2. **Tablette (Comptoir Caisse)** :
   - Affichage à deux colonnes équilibré : sélection à gauche, récapitulatif financier et moyen de paiement à droite.
3. **Bureau / Grand Écran (Gestion Gérant)** :
   - Tableaux de bord financiers complets avec filtres combinés (périodes, barbiers, moyens de paiement).
   - Impression des rapports A4 et thermique (58mm/80mm) optimisée sans coupure de texte.

---

## 5. Décision de Clôture de la Recette

L'ensemble des exigences du *Dossier Technique v2.0* ayant été scrupuleusement honoré, la recette technique est prononcée avec la mention **ACCEPTATION TOTALE SANS RÉSERVE**.

Le projet peut basculer immédiatement en **Phase 11 (Déploiement en production & clôture finale)**.
