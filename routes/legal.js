const express = require('express');
const router = express.Router();

// Version actuelle des documents
const CURRENT_VERSION = '1.0';

// Contenu des CGU (Conditions Générales d'Utilisation)
const getCGU = () => ({
  version: CURRENT_VERSION,
  lastUpdated: '2024-11-27',
  title: 'Conditions Générales d\'Utilisation - EMB Transfer',
  content: `
# Conditions Générales d'Utilisation

**Date de dernière mise à jour : 27 novembre 2024**

## 1. Présentation du service

EMB Transfer est une plateforme d'échange de moyens de paiement mobile permettant aux utilisateurs d'effectuer des transactions entre différents opérateurs de téléphonie mobile au Togo.

## 2. Acceptation des conditions

En utilisant EMB Transfer, vous acceptez sans réserve les présentes Conditions Générales d'Utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.

## 3. Création de compte

### 3.1 Éligibilité
Pour créer un compte, vous devez :
- Avoir au moins 18 ans
- Fournir des informations exactes et à jour
- Disposer d'un numéro de téléphone mobile valide
- Fournir une adresse email valide

### 3.2 Sécurité du compte
Vous êtes responsable de :
- La confidentialité de votre mot de passe
- Toutes les activités effectuées sous votre compte
- Informer immédiatement EMB Transfer en cas d'utilisation non autorisée

## 4. Utilisation du service

### 4.1 Services proposés
EMB Transfer permet :
- L'échange de crédit entre opérateurs mobiles (Tmoney, Flooz, etc.)
- Le suivi de vos transactions
- La gestion de votre compte

### 4.2 Obligations de l'utilisateur
Vous vous engagez à :
- Ne pas utiliser le service à des fins illégales
- Fournir des informations exactes lors des transactions
- Respecter les limites de montants fixées
- Ne pas tenter de contourner les mesures de sécurité

### 4.3 Transactions
- Toutes les transactions sont soumises à validation par nos équipes
- Les délais de traitement peuvent varier selon le volume de demandes
- EMB Transfer se réserve le droit de refuser toute transaction suspecte
- Les frais de commission sont clairement affichés avant validation

## 5. Frais et paiements

### 5.1 Commission
- Une commission est appliquée sur chaque transaction
- Le montant exact est affiché avant confirmation
- Les frais sont non remboursables une fois la transaction validée

### 5.2 Taxes
- Des taxes peuvent s'appliquer selon la réglementation en vigueur
- L'utilisateur est informé du montant total avant confirmation

## 6. Responsabilités

### 6.1 Responsabilité d'EMB Transfer
EMB Transfer s'engage à :
- Traiter les transactions dans les meilleurs délais
- Protéger vos données personnelles
- Maintenir la sécurité de la plateforme

### 6.2 Limitations de responsabilité
EMB Transfer ne peut être tenu responsable :
- Des retards dus aux opérateurs téléphoniques
- Des erreurs résultant d'informations incorrectes fournies par l'utilisateur
- Des interruptions de service indépendantes de notre volonté

## 7. Protection des données

Vos données personnelles sont traitées conformément à notre Politique de Confidentialité.

## 8. Modification des CGU

EMB Transfer se réserve le droit de modifier ces CGU à tout moment. Les utilisateurs seront informés des modifications importantes par email.

## 9. Résiliation

### 9.1 Par l'utilisateur
Vous pouvez fermer votre compte à tout moment en nous contactant.

### 9.2 Par EMB Transfer
Nous pouvons suspendre ou fermer votre compte en cas de :
- Violation des présentes CGU
- Activité suspecte ou frauduleuse
- Non-respect des réglementations en vigueur

## 10. Droit applicable

Les présentes CGU sont régies par le droit togolais. Tout litige sera soumis aux tribunaux compétents de Lomé, Togo.

## 11. Contact

Pour toute question concernant ces CGU :
- Email : support@embtransfer.com
- Téléphone : [Votre numéro de support]

---

**En utilisant EMB Transfer, vous reconnaissez avoir lu, compris et accepté les présentes Conditions Générales d'Utilisation.**
  `.trim()
});

// Contenu de la Politique de Confidentialité
const getPrivacyPolicy = () => ({
  version: CURRENT_VERSION,
  lastUpdated: '2024-11-27',
  title: 'Politique de Confidentialité - EMB Transfer',
  content: `
# Politique de Confidentialité

**Date de dernière mise à jour : 27 novembre 2024**

## 1. Introduction

EMB Transfer ("nous", "notre", "nos") s'engage à protéger votre vie privée. Cette Politique de Confidentialité explique comment nous collectons, utilisons et protégeons vos informations personnelles.

## 2. Informations collectées

### 2.1 Informations que vous nous fournissez
- **Informations de compte** : Nom, numéro de téléphone, email, mot de passe
- **Informations de transaction** : Montants, numéros de téléphone source et destination, références de paiement
- **Documents KYC** : Pièces d'identité pour la vérification (si applicable)

### 2.2 Informations collectées automatiquement
- **Données techniques** : Adresse IP, type d'appareil, navigateur
- **Données d'utilisation** : Historique des transactions, préférences
- **Cookies** : Pour améliorer votre expérience utilisateur

## 3. Utilisation des données

Nous utilisons vos données pour :

### 3.1 Fourniture du service
- Traiter vos transactions
- Gérer votre compte
- Vous envoyer des notifications importantes
- Assurer la sécurité de la plateforme

### 3.2 Communication
- Vous envoyer des confirmations de transaction
- Vous informer des mises à jour du service
- Répondre à vos demandes de support
- Vous envoyer des newsletters (avec votre consentement)

### 3.3 Amélioration du service
- Analyser l'utilisation de la plateforme
- Développer de nouvelles fonctionnalités
- Résoudre les problèmes techniques

### 3.4 Conformité légale
- Respecter nos obligations légales
- Prévenir la fraude et les activités illégales
- Répondre aux demandes des autorités compétentes

## 4. Partage des données

### 4.1 Nous ne vendons jamais vos données personnelles

### 4.2 Partage limité avec :
- **Opérateurs mobiles** : Pour effectuer les transactions
- **Prestataires de services** : Pour l'hébergement, l'email, etc. (sous contrat strict)
- **Autorités légales** : Si requis par la loi

### 4.3 Données anonymisées
Nous pouvons partager des statistiques anonymisées à des fins d'analyse.

## 5. Sécurité des données

### 5.1 Mesures de sécurité
- Chiffrement des données sensibles
- Authentification sécurisée
- Surveillance continue de la sécurité
- Accès restreint aux données personnelles

### 5.2 Conservation des données
- Vos données de compte sont conservées tant que votre compte est actif
- Les données de transaction sont conservées 5 ans pour des raisons légales
- Vous pouvez demander la suppression de vos données à tout moment

## 6. Vos droits

Conformément à la réglementation sur la protection des données, vous avez le droit de :

### 6.1 Accès
Demander une copie de vos données personnelles

### 6.2 Rectification
Corriger les informations inexactes

### 6.3 Suppression
Demander la suppression de vos données (sous certaines conditions)

### 6.4 Portabilité
Recevoir vos données dans un format structuré

### 6.5 Opposition
Vous opposer au traitement de vos données à des fins marketing

### 6.6 Retrait du consentement
Retirer votre consentement à tout moment

## 7. Cookies

### 7.1 Utilisation
Nous utilisons des cookies pour :
- Maintenir votre session
- Mémoriser vos préférences
- Analyser l'utilisation du site

### 7.2 Gestion
Vous pouvez gérer les cookies via les paramètres de votre navigateur.

## 8. Transferts internationaux

Vos données sont principalement stockées au Togo. Si un transfert international est nécessaire, nous nous assurons que des garanties appropriées sont en place.

## 9. Mineurs

Notre service n'est pas destiné aux personnes de moins de 18 ans. Nous ne collectons pas sciemment de données auprès de mineurs.

## 10. Modifications

Nous pouvons mettre à jour cette Politique de Confidentialité. Les changements importants vous seront notifiés par email.

## 11. Contact et réclamations

### 11.1 Pour exercer vos droits
Email : privacy@embtransfer.com

### 11.2 Réclamations
Si vous estimez que vos droits n'ont pas été respectés, vous pouvez déposer une réclamation auprès de l'autorité de protection des données compétente au Togo.

## 12. Base légale du traitement

Nous traitons vos données sur la base de :
- Votre consentement
- L'exécution du contrat (CGU)
- Nos obligations légales
- Notre intérêt légitime à améliorer nos services

---

**En utilisant EMB Transfer, vous reconnaissez avoir lu et compris cette Politique de Confidentialité.**
  `.trim()
});

// Route pour obtenir les CGU
router.get('/cgu', (req, res) => {
  try {
    res.json({
      success: true,
      document: getCGU()
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des CGU:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour obtenir la Politique de Confidentialité
router.get('/privacy-policy', (req, res) => {
  try {
    res.json({
      success: true,
      document: getPrivacyPolicy()
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la politique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour obtenir la version actuelle des documents
router.get('/version', (req, res) => {
  try {
    res.json({
      success: true,
      version: CURRENT_VERSION,
      documents: {
        cgu: {
          version: CURRENT_VERSION,
          lastUpdated: '2024-11-27'
        },
        privacyPolicy: {
          version: CURRENT_VERSION,
          lastUpdated: '2024-11-27'
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la version:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;
