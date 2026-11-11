# Guide d'Utilisation Officiel — Salon LAME D'OR

> **Établissement** : Salon LAME D'OR — Bamako, Mali  
> **Client** : Diarra Multi Services (DMS)  
> **Version Applicative** : 2.0 (Application privée de gestion de caisse et de commissions)  

---

## 1. Vue d'Ensemble & Connexion

LAME D'OR est une application web progressive (PWA) sécurisée accessible depuis tout smartphone, tablette ou ordinateur connecté à Internet dans le salon.

### Rôles Utilisateurs
- 👑 **Gérant (Manager)** : Accès complet (tarifs, barbiers, encaissements, dérogations de prix, règlements de commissions, clôtures quotidiennes certifiées, exports et piste d'audit).
- 💼 **Caissier (Cashier)** : Encaissement des ventes, émission des reçus clients, consultation du journal de caisse du jour.
- ✂️ **Barbier (Barber)** : Consultation exclusive de ses propres prestations et de son solde de commission accumulé.

---

## 2. Procédure d'Encaissement (Terminal de Caisse)

### Étape 1 : Sélection de la Prestation et du Barbier
1. Ouvrir l'écran **Caisse**.
2. Dans la section **1. Choisir la prestation**, cliquer sur le soin réalisé (ex. *Coupe Homme Classique*, *Coupe + Barbe Prestige*, *Soin Visage Royal*). Le tarif catalogue en FCFA et l'estimation de commission s'affichent automatiquement.
3. Dans la section **2. Choisir le barbier**, cliquer sur le barbier qui a réalisé la coupe.

### Étape 2 : Encaissement & Moyen de Paiement
1. Vérifier le montant réellement encaissé :
   - Par défaut, il correspond au tarif catalogue officiel.
   - **Tarif dérogatoire** : Seul le gérant peut modifier ce montant (ex. réduction commerciale). Dans ce cas, un **motif obligatoire** doit obligatoirement être saisi pour l'audit.
2. Sélectionner le moyen de paiement reçu du client :
   - **Espèces** : Billets et pièces remis en main propre.
   - **Orange Money** : Paiement mobile déclaré par le client.
   - **Moov Money** : Paiement mobile déclaré par le client.

### Étape 3 : Validation et Remise du Reçu
1. Cliquer sur **« Valider l'Encaissement »**.
2. Le serveur PostgreSQL enregistre la transaction de manière atomique et génère le numéro de reçu officiel (format normalisé `REC-AAAAMMJJ-XXXXX`).
3. La confirmation s'affiche à l'écran. Cliquer sur **« Imprimer Reçu »** pour éditer le ticket sur l'imprimante thermique du salon ou sur **« Nouvel Encaissement »** pour passer au client suivant.

---

## 3. Gestion des Commissions des Barbiers

### Consultation des Soldes
Dans l'onglet **Commissions**, le tableau récapitulatif affiche pour chaque barbier :
- **Total commissions générées** (cumul de toutes les prestations actives réalisées).
- **Total déjà versé** (somme des règlements effectués par le gérant).
- **Solde Net Dû** (montant restant à verser au barbier).

### Règlement d'une Commission (Gérant)
1. Cliquer sur **« Régler la commission »** sur la fiche du barbier.
2. Saisir le montant à verser :
   - Les règlements partiels sont autorisés.
   - Le système bloque automatiquement tout montant supérieur au solde dû (interdiction des découverts non maîtrisés).
   - Le bouton raccourci permet de régler la totalité en un clic.
3. Choisir le mode de versement :
   - ⚠️ **Attention Règle de Caisse** : Si vous versez la commission en **Espèces**, cette somme sera **automatiquement déduite de la caisse physique** lors de la clôture du soir.
   - Si vous versez par Orange Money ou Moov Money, le tiroir-caisse physique n'est pas impacté.
4. Indiquer une référence ou observation facultative (ex. *Acompte déjeuner*, *Semaine 45*).
5. Cliquer sur **« Confirmer le Règlement »**. Le solde est mis à jour immédiatement.

### Renversement d'un Règlement Erroné (Gérant)
En cas d'erreur de saisie (ex. erreur sur le bénéficiaire ou sur le montant) :
1. Dans l'historique des règlements au bas de l'écran, repérer la ligne et cliquer sur l'icône de renversement 🔄.
2. Saisir obligatoirement le **motif d'annulation** ($\ge 5$ caractères).
3. Confirmer. Le paiement passe au statut **ANNULÉ** et le solde dû du barbier est immédiatement rétabli.

---

## 4. Cérémonie de Clôture Quotidienne (Arrêté de Caisse du Soir)

Chaque soir avant la fermeture du salon, le gérant doit obligatoirement réaliser l'arrêté de caisse :

1. Ouvrir l'onglet **Clôture Journalière**.
2. Vérifier la date du jour (`Africa/Bamako`).
3. Examiner le tableau de bord des opérations du jour :
   - Ventes totales ventilées par Espèces, Orange Money et Moov Money.
   - Commissions décaissées en espèces pour les barbiers.
4. Renseigner le **Fonds de caisse d'ouverture** (par défaut 0 FCFA ou le montant présent le matin dans le tiroir).
5. **Comptage Physique Réel** :
   - Vider le tiroir-caisse et compter méticuleusement toutes les pièces et billets physiques.
   - Saisir le montant exact compté dans **« Espèces Physiques Réellement Comptées »**.
6. Lecture instantanée de l'écart :
   $$\text{Espèces Attendues} = \text{Fonds d'ouverture} + \text{Ventes Espèces} - \text{Commissions versées en espèces}$$
   $$\text{Écart} = \text{Montant Compté} - \text{Espèces Attendues}$$
   - **Équilibré (0 FCFA)** : Caisse parfaite.
   - **Excédent (+)** : Surplus d'espèces dans le tiroir.
   - **Déficit (-)** : Manque d'espèces à justifier.
7. Ajouter une note ou observation si un écart est constaté.
8. Cliquer sur **« Certifier & Clôturer la Journée »**.
9. Une fois validée, la journée est scellée : aucune nouvelle vente ni paiement ne peut être ajouté sur cette date. Le rapport officiel peut être imprimé ou archivé.

---

## 5. Tableaux de Bord & Exports

Dans l'onglet **Rapports & Dashboard** :
- Filtrer par période : **Aujourd'hui**, **7 derniers jours**, **Mois en cours** ou **Tout l'historique**.
- Filtrer par barbier spécifique ou moyen de paiement.
- Consulter le Chiffre d'Affaires net (hors annulations), les commissions barbiers et la marge nette conservée par le salon.
- **Export Excel / CSV** : Télécharge instantanément le fichier `.csv` séparé par point-virgule compatible avec Microsoft Excel et Google Sheets.
- **Impression Rapport** : Génère un état de synthèse imprimable format A4 ou thermique.

---

## 6. Consignes Strictes en Cas de Coupure Réseau (Bamako)

L'application applique la règle contractuelle d'**autorité serveur exclusive** :

1. **Bandeau d'Alerte Rouge** : Dès qu'une perte de 4G/Fibre survient, un bandeau rouge **« CONNEXION INTERNET INDISPONIBLE »** apparaît en haut de l'écran.
2. **Boutons Verrouillés** : Les boutons d'encaissement et de clôture sont automatiquement bloqués.
3. **Coupure en Cours de Validation** :
   - Si la connexion est perdue pendant que vous appuyez sur « Valider l'encaissement », l'écran affiche : **« Confirmation serveur non reçue — Vérification requise »**.
   - **Ne pas paniquer** : Votre formulaire reste rempli et la clé de sécurité de la transaction (`idempotency_key`) est conservée en mémoire.
   - **Procédure à suivre dès le retour du réseau** :
     1. Consulter l'onglet **Journal des Ventes**.
     2. Si la vente y apparaît déjà (le serveur avait reçu la requête avant la coupure), le reçu est déjà émis. Imprimez-le directement.
     3. Si la vente n'apparaît pas, retournez sur l'écran Caisse et cliquez à nouveau sur « Valider ». La clé conservée garantit qu'**aucun double encaissement ne sera créé**.
