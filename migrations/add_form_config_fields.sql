-- Migration pour ajouter les champs de configuration du formulaire client
-- Uniquement pour les abonnements (subscription)

-- Ajouter les nouveaux champs à la table exchange_pairs
ALTER TABLE exchange_pairs ADD COLUMN from_number_label TEXT DEFAULT NULL;
ALTER TABLE exchange_pairs ADD COLUMN from_number_placeholder TEXT DEFAULT NULL;
ALTER TABLE exchange_pairs ADD COLUMN to_number_label TEXT DEFAULT NULL;
ALTER TABLE exchange_pairs ADD COLUMN to_number_placeholder TEXT DEFAULT NULL;
ALTER TABLE exchange_pairs ADD COLUMN show_to_number INTEGER DEFAULT 1; -- SQLite utilise INTEGER pour BOOLEAN
ALTER TABLE exchange_pairs ADD COLUMN amount_label TEXT DEFAULT 'Montant';
ALTER TABLE exchange_pairs ADD COLUMN amount_placeholder TEXT DEFAULT NULL;
ALTER TABLE exchange_pairs ADD COLUMN reference_required INTEGER DEFAULT 1; -- SQLite utilise INTEGER pour BOOLEAN
ALTER TABLE exchange_pairs ADD COLUMN reference_label TEXT DEFAULT 'Référence de paiement';
ALTER TABLE exchange_pairs ADD COLUMN reference_placeholder TEXT DEFAULT NULL;
