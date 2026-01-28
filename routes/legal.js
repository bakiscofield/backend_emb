const express = require('express');
const router = express.Router();

// Version actuelle des documents
const CURRENT_VERSION = '2.0';

// Contenu des CGU (Conditions Générales d'Utilisation)
const getCGU = () => ({
  version: CURRENT_VERSION,
  lastUpdated: '2025-01-03',
  title: 'Conditions Générales d\'Utilisation - Emile Transfer+',
  content: `
# CONDITIONS GÉNÉRALES D'UTILISATION (CGU)
## Emile Transfer+
**Dernière mise à jour : 2025**

## 1. Présentation du service

Emile Transfer+ est une plateforme de services financiers permettant aux utilisateurs d'effectuer des échanges et transferts entre des services de Mobile Money (notamment TMoney, Flooz) et certaines applications ou services bancaires partenaires (tels que Coris Money, Orabank, Ecobank, Gozem Money), selon la disponibilité.

La plateforme est accessible via :
- Un site vitrine présentant les services ;
- Un site/app de connexion dédié aux opérations pour les utilisateurs souhaitant utiliser le web.

## 2. Acceptation des Conditions

L'utilisation des services d'Emile Transfer+ implique l'acceptation pleine et entière des présentes Conditions Générales d'Utilisation (CGU). En cas de désaccord, l'utilisateur doit cesser immédiatement toute utilisation du service.

## 3. Éligibilité

L'utilisateur déclare :
- Être âgé d'au moins 18 ans ;
- Disposer de la capacité juridique nécessaire ;
- Utiliser les services conformément aux lois et réglementations en vigueur au Togo.

## 4. Création de compte

Pour accéder aux services, l'utilisateur doit créer un compte en fournissant des informations exactes, complètes et à jour. Emile Transfer+ se réserve le droit de refuser ou suspendre tout compte en cas d'informations inexactes ou frauduleuses.

## 5. KYC (Know Your Customer)

Dans le cadre de la lutte contre la fraude et le blanchiment d'argent :
- Un KYC est obligatoire pour les opérations bancaires ;
- Le KYC avec reconnaissance faciale est requis pour certaines opérations

Emile Transfer+ peut demander des documents supplémentaires à tout moment.

## 6. Services proposés

Emile Transfer+ propose notamment :
- Échanges entre Mobile Money (TMoney, Flooz) ;
- Transferts vers des services bancaires partenaires ;
- Vente de cartes bancaires prépayées (virtuelles ou physiques selon disponibilité) ;
- Opérations de préenregistrement des envois et retraits via les services de transfert internationaux tels que Western Union, RIA et MoneyGram ;
- Autres services financiers connexes selon disponibilité.

Les services peuvent évoluer à tout moment.

## 7. Frais et commissions

Les frais applicables sont communiqués à l'utilisateur avant la validation de chaque opération. Emile Transfer+ se réserve le droit de modifier ses tarifs à tout moment.

## 8. Obligations de l'utilisateur

L'utilisateur s'engage à :
- Fournir des informations véridiques ;
- Ne pas utiliser le service à des fins illégales ;
- Sécuriser ses identifiants de connexion ;
- Signaler immédiatement toute activité suspecte.

## 9. Responsabilités

Emile Transfer+ agit en tant qu'intermédiaire technique et ne conserve pas durablement les fonds des utilisateurs au-delà du temps nécessaire à l'exécution des opérations.

Emile Transfer+ ne saurait être tenue responsable :
- Des retards dus aux opérateurs partenaires ;
- Des interruptions de service indépendantes de sa volonté ;
- D'une mauvaise utilisation du service par l'utilisateur.

## 10. Suspension et résiliation

Emile Transfer+ se réserve le droit de suspendre ou résilier un compte sans préavis en cas de :
- Violation des présentes CGU ;
- Activité frauduleuse ou suspecte ;
- Demande des autorités compétentes.

## 11. Protection des données

Les données personnelles sont traitées conformément à la réglementation en vigueur. Elles sont utilisées uniquement dans le cadre des services proposés et des obligations légales.

## 12. Propriété intellectuelle

Tous les contenus (logos, textes, designs, marques) d'Emile Transfer+ sont protégés et restent la propriété exclusive d'Emile Transfer+.

## 13. Modification des CGU

Emile Transfer+ se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des mises à jour importantes.

## 14. Droit applicable et juridiction

Les présentes CGU sont régies par le droit togolais. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire.

## 15. Contact

Pour toute question ou réclamation, l'utilisateur peut contacter le service client d'Emile Transfer+ via les canaux officiels indiqués sur la plateforme.

---

**Emile Transfer+, la solution moderne pour échanger, payer et transférer sans complication.**
  `.trim()
});

// Contenu de la Politique de Confidentialité
const getPrivacyPolicy = () => ({
  version: CURRENT_VERSION,
  lastUpdated: '2025-01-03',
  title: 'Politique de Confidentialité - Emile Transfer+',
  content: `
# POLITIQUE DE CONFIDENTIALITÉ
## Emile Transfer+
**Dernière mise à jour : 2025**

## 1. Introduction

La présente Politique de Confidentialité a pour objectif d'informer les utilisateurs de la plateforme Emile Transfer+ sur la manière dont leurs données personnelles sont collectées, utilisées, protégées et partagées.

Emile Transfer+ accorde une importance particulière à la protection de la vie privée et s'engage à traiter les données personnelles de manière transparente, sécurisée et conforme aux lois et réglementations en vigueur.

## 2. Données personnelles collectées

Dans le cadre de l'utilisation de ses services, Emile Transfer+ peut collecter les données suivantes :

- **Informations d'identification** : nom, prénom, numéro de téléphone, adresse e-mail ;
- **Informations d'identité dans le cadre du KYC** : pièce d'identité officielle, photo, reconnaissance faciale ;
- **Informations de transaction** : montants, dates, type d'opération, services utilisés ;
- **Données techniques** : adresse IP, type d'appareil, système d'exploitation, navigateur.

## 3. Méthodes de collecte

Les données personnelles sont collectées notamment lors :

- De la création d'un compte utilisateur ;
- De l'utilisation des services et de la réalisation d'opérations ;
- Des procédures de vérification d'identité (KYC) ;
- De la navigation sur le site web ou l'application.

## 4. Utilisation des données

Les données collectées sont utilisées pour :

- Fournir, gérer et sécuriser les services proposés ;
- Vérifier l'identité des utilisateurs ;
- Prévenir la fraude, le blanchiment d'argent et les activités illégales ;
- Respecter les obligations légales et réglementaires ;
- Améliorer la qualité des services et l'expérience utilisateur.

## 5. Partage des données

Les données personnelles peuvent être partagées uniquement avec :

- Les partenaires techniques, financiers ou prestataires nécessaires à l'exécution des services (Mobile Money, banques, services de transfert) ;
- Les autorités compétentes, lorsque la loi l'exige ou sur réquisition légale.

Emile Transfer+ ne vend, ne loue et ne commercialise jamais les données personnelles des utilisateurs.

## 6. Conservation des données

Les données personnelles sont conservées pendant la durée strictement nécessaire aux finalités pour lesquelles elles ont été collectées, conformément aux obligations légales et réglementaires en vigueur.

## 7. Sécurité des données

Emile Transfer+ met en place des mesures techniques et organisationnelles appropriées afin de protéger les données personnelles contre :

- L'accès non autorisé ;
- La perte ;
- L'altération ;
- La divulgation frauduleuse.

## 8. Droits des utilisateurs

Conformément à la réglementation applicable, chaque utilisateur dispose des droits suivants :

- Droit d'accès à ses données personnelles ;
- Droit de rectification des données inexactes ou incomplètes ;
- Droit de suppression, sous réserve des obligations légales ;
- Droit d'opposition au traitement de ses données.

Les demandes relatives à ces droits peuvent être adressées via les canaux officiels d'Emile Transfer+.

## 9. Cookies

Le site web d'Emile Transfer+ peut utiliser des cookies afin d'améliorer la navigation et les performances du service.
L'utilisateur peut configurer son navigateur pour refuser ou limiter l'utilisation des cookies.

## 10. Modification de la politique

Emile Transfer+ se réserve le droit de modifier la présente Politique de Confidentialité à tout moment. Toute modification importante sera portée à la connaissance des utilisateurs.

## 11. Contact

Pour toute question relative à la protection des données personnelles, l'utilisateur peut contacter Emile Transfer+ via les canaux de contact officiels disponibles sur la plateforme.

---

**Emile Transfer+, la solution moderne pour échanger, payer et transférer sans complication.**
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
          lastUpdated: '2025-01-03'
        },
        privacyPolicy: {
          version: CURRENT_VERSION,
          lastUpdated: '2025-01-03'
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
