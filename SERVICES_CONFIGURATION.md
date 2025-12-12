# Système de Configuration des Services - Guide Complet

## Vue d'ensemble

Le système a été généralisé pour supporter tous types de services de manière configurable:
- ✅ **Échanges d'argent** (TMoney ↔ Flooz)
- ✅ **Crédits de communication** (TMoney → Crédit Togocel/Moov)
- ✅ **Abonnements** (Canalbox, Fibre YAS)
- ✅ **Achats** (Cash Power, TDE)
- ✅ **Services bancaires** (Ecobank, Coris Money, Orabank)

## Catégories de Services

### 1. `money_exchange` - Échange d'argent
Conversion entre moyens de paiement mobile (ex: TMoney → Flooz)

### 2. `credit` - Achat de crédit
Achat de crédit de communication pour Togocel ou Moov

### 3. `subscription` - Abonnements
Services d'abonnement comme Canalbox, Fibre YAS

### 4. `purchase` - Achats
Achats de services comme Cash Power (électricité), TDE (eau)

### 5. `bank_service` - Services bancaires
Retraits bancaires via code jeton (Ecobank, Coris Money, Orabank)

## Champs de Configuration

### Champs de base (existants)
- `from_method_id` - Méthode de paiement source
- `to_method_id` - Méthode de paiement destination
- `fee_percentage` - Pourcentage de frais (%)
- `tax_amount` - Montant de taxe fixe (FCFA)
- `min_amount` / `max_amount` - Limites de montant
- `payment_syntax_type` - Type d'instruction (TEXTE, LIEN, AUTRE)
- `payment_syntax_value` - Instruction de paiement

### Nouveaux champs
- **`category`** - Catégorie du service (voir ci-dessus)
- **`requires_additional_info`** - Le client doit-il fournir des infos après paiement?
- **`automatic_processing`** - Le service est-il livré automatiquement?
- **`instruction_title`** - Titre des instructions affichées au client
- **`instruction_content`** - Contenu des instructions
- **`instruction_link_url`** - Lien vers plus d'infos
- **`instruction_link_text`** - Texte du lien

## Modes de Traitement

### Mode Automatique (`automatic_processing: true`)
✅ Le service est livré **automatiquement** après validation du paiement
- Pas besoin d'intervention manuelle
- Idéal pour: crédits de communication
- Exemple: TMoney → Crédit Togocel

```json
{
  "category": "credit",
  "automatic_processing": true,
  "requires_additional_info": false
}
```

### Mode Manuel (`automatic_processing: false`)
⚠️ Le service nécessite une **validation manuelle** par un admin
- L'admin doit traiter la demande manuellement
- Idéal pour: abonnements, services bancaires, achats
- Le client est notifié une fois le service livré

```json
{
  "category": "subscription",
  "automatic_processing": false,
  "requires_additional_info": true
}
```

## Informations Additionnelles

### Sans infos additionnelles (`requires_additional_info: false`)
Le client paie et c'est tout. Pas besoin de fournir d'autres informations.

### Avec infos additionnelles (`requires_additional_info: true`)
Le client doit fournir des informations supplémentaires via `dynamic_fields`:
- Nom et prénoms
- Numéro de décodeur
- Code de retrait bancaire
- Numéro de compteur électrique
- etc.

## Instructions pour le Client

Les instructions sont affichées dans le formulaire d'échange pour guider le client:

```json
{
  "instruction_title": "Comment générer un code de retrait Ecobank?",
  "instruction_content": "1. Ouvrez l'app Ecobank Mobile\n2. Allez dans 'Retrait sans carte'...",
  "instruction_link_url": "https://ecobank.com/tg/app",
  "instruction_link_text": "Télécharger Ecobank Mobile"
}
```

L'interface affichera:
```
📋 Comment générer un code de retrait Ecobank?

1. Ouvrez l'app Ecobank Mobile
2. Allez dans 'Retrait sans carte'
...

🔗 [Télécharger Ecobank Mobile]
```

## Exemples de Configuration

### Exemple 1: Crédit Togocel (Automatique)
```json
{
  "from_method_id": 1,  // TMoney
  "to_method_id": 3,    // Togocel
  "category": "credit",
  "fee_percentage": 2,
  "tax_amount": 0,
  "min_amount": 500,
  "max_amount": 50000,
  "payment_syntax_type": "TEXTE",
  "payment_syntax_value": "*155*5*montant*90000000#",
  "requires_additional_info": false,
  "automatic_processing": true,
  "is_active": true
}
```

**Comportement:** Le client paie et reçoit son crédit automatiquement.

---

### Exemple 2: Abonnement Canalbox (Manuel avec infos)
```json
{
  "from_method_id": 1,  // TMoney
  "to_method_id": 6,    // Canalbox
  "category": "subscription",
  "fee_percentage": 0,
  "tax_amount": 500,
  "min_amount": 5000,
  "max_amount": 50000,
  "payment_syntax_type": "TEXTE",
  "payment_syntax_value": "*155*6*montant*CODE_MARCHAND#",
  "requires_additional_info": true,
  "automatic_processing": false,
  "instruction_title": "Comment souscrire à Canalbox?",
  "instruction_content": "Après paiement, veuillez fournir vos nom et prénoms ainsi que votre numéro de décodeur.",
  "instruction_link_url": "https://www.canalplus-afrique.com",
  "instruction_link_text": "Voir les offres Canalbox",
  "is_active": true
}
```

**Champs dynamiques requis:**
```json
[
  {
    "field_name": "subscriber_name",
    "field_type": "text",
    "field_label": "Nom et prénoms",
    "is_required": true
  },
  {
    "field_name": "decoder_number",
    "field_type": "text",
    "field_label": "Numéro de décodeur",
    "is_required": true
  }
]
```

**Comportement:**
1. Le client paie
2. Le client fournit nom, prénom et numéro de décodeur
3. Un admin valide et active l'abonnement
4. Le client est notifié

---

### Exemple 3: Service Bancaire Ecobank (Manuel avec instructions)
```json
{
  "from_method_id": 1,  // TMoney
  "to_method_id": 10,   // Ecobank
  "category": "bank_service",
  "fee_percentage": 0,
  "tax_amount": 0,
  "min_amount": 1000,
  "max_amount": 500000,
  "payment_syntax_type": "TEXTE",
  "payment_syntax_value": "Générer un code de retrait depuis l'app Ecobank Mobile",
  "requires_additional_info": true,
  "automatic_processing": false,
  "instruction_title": "Comment générer un code de retrait Ecobank?",
  "instruction_content": "1. Ouvrez l'application Ecobank Mobile\n2. Allez dans 'Retrait sans carte'\n3. Sélectionnez 'Code agent Xpress'\n4. Entrez le montant et validez\n5. Copiez le code généré et soumettez-le ici",
  "instruction_link_url": "https://ecobank.com/tg/personal-banking/mobile-app",
  "instruction_link_text": "Télécharger Ecobank Mobile",
  "is_active": true
}
```

**Champs dynamiques requis:**
```json
[
  {
    "field_name": "withdrawal_code",
    "field_type": "text",
    "field_label": "Code de retrait",
    "is_required": true
  },
  {
    "field_name": "full_name",
    "field_type": "text",
    "field_label": "Nom et prénoms",
    "is_required": true
  }
]
```

**Comportement:**
1. Le client lit les instructions
2. Le client génère un code dans l'app Ecobank
3. Le client crée la transaction avec le code
4. Un admin valide et effectue le retrait
5. Le client reçoit son argent

## API - Créer une Paire d'Échange

### POST `/api/exchange-pairs`

```bash
curl -X POST http://localhost:3001/api/exchange-pairs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "from_method_id": 1,
    "to_method_id": 6,
    "category": "subscription",
    "fee_percentage": 0,
    "tax_amount": 500,
    "min_amount": 5000,
    "max_amount": 50000,
    "payment_syntax_type": "TEXTE",
    "payment_syntax_value": "*155*6*montant*CODE#",
    "requires_additional_info": true,
    "automatic_processing": false,
    "instruction_title": "Instructions Canalbox",
    "instruction_content": "Fournir nom et numéro décodeur",
    "instruction_link_url": "https://example.com",
    "instruction_link_text": "En savoir plus",
    "fields": [
      {
        "field_name": "subscriber_name",
        "field_type": "text",
        "field_label": "Nom complet",
        "is_required": true
      }
    ]
  }'
```

## Migration et Seeding

### 1. Exécuter la migration
```bash
cd backend
node migrations/add-service-configuration.js
```

### 2. Générer le client Prisma
```bash
npx prisma generate
```

### 3. Charger les exemples de données
```bash
node scripts/seed-service-examples.js
```

Cela créera automatiquement:
- ✅ 2 crédits (automatique)
- ✅ 1 abonnement (manuel)
- ✅ 1 service bancaire (manuel)
- ✅ 1 achat (manuel)

## Workflow Client

### Service Automatique
```
1. Client choisit le service
2. Client voit les instructions de paiement
3. Client effectue le paiement
4. Client soumet la transaction
5. ✅ Service livré automatiquement
```

### Service Manuel
```
1. Client choisit le service
2. Client voit les instructions (si disponibles)
3. Client effectue le paiement
4. Client fournit les infos additionnelles (si requises)
5. Client soumet la transaction
6. ⏳ Admin valide la transaction
7. ✅ Service livré manuellement
8. 📧 Client notifié
```

## Récapitulatif des Changements

### Base de données
- ✅ 7 nouveaux champs ajoutés à `exchange_pairs`
- ✅ Migration créée et exécutée
- ✅ Client Prisma régénéré

### Backend
- ✅ Routes `exchange-pairs` mises à jour
- ✅ Validation des nouveaux champs
- ✅ Route `transactions` mise à jour
- ✅ Respect du flag `automatic_processing`
- ✅ Messages contextuels selon le mode

### Scripts
- ✅ Script de migration
- ✅ Script de seeding avec exemples complets

## Support

Pour toute question ou assistance, consultez:
- Schema Prisma: `/backend/prisma/schema.prisma`
- Routes: `/backend/routes/exchange-pairs.js` et `/backend/routes/transactions.js`
- Exemples: `/backend/scripts/seed-service-examples.js`
