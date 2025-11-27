const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { authMiddleware } = require('../middleware/auth');
const { generateVerificationCode, sendVerificationCode, sendPasswordResetCode } = require('../utils/emailService');

const router = express.Router();

// Étape 1: Demander un code de vérification
router.post('/request-verification-code', [
  body('email').isEmail().withMessage('Email invalide'),
  body('phone').isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  body('name').trim().notEmpty().withMessage('Le nom est requis'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('acceptCGU').isBoolean().equals('true').withMessage('Vous devez accepter les Conditions Générales d\'Utilisation'),
  body('acceptPrivacyPolicy').isBoolean().equals('true').withMessage('Vous devez accepter la Politique de Confidentialité')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, phone, name, password, acceptCGU, acceptPrivacyPolicy } = req.body;

    // Vérifier l'acceptation des CGU et de la politique de confidentialité
    if (!acceptCGU || !acceptPrivacyPolicy) {
      return res.status(400).json({
        success: false,
        message: 'Vous devez accepter les CGU et la Politique de Confidentialité pour créer un compte'
      });
    }

    // Vérifier si l'email existe déjà
    const existingEmail = await prisma.users.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Vérifier si le téléphone existe déjà
    const existingPhone = await prisma.users.findUnique({
      where: { phone }
    });

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Ce numéro de téléphone est déjà enregistré'
      });
    }

    // Générer un code à 3 chiffres
    const code = generateVerificationCode();

    // Hasher le mot de passe pour le stocker temporairement
    const hashedPassword = await bcrypt.hash(password, 10);

    // Supprimer les anciens codes pour cet email
    await prisma.email_verification_codes.deleteMany({
      where: { email }
    });

    // Calculer l'expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Enregistrer le code avec les informations d'inscription
    await prisma.email_verification_codes.create({
      data: {
        email,
        code,
        phone,
        name,
        password: hashedPassword,
        expires_at: expiresAt
      }
    });

    // Envoyer le code par email
    await sendVerificationCode(email, code);

    res.json({
      success: true,
      message: 'Code de vérification envoyé à votre email',
      email
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Étape 2: Vérifier le code et créer le compte
router.post('/verify-and-register', [
  body('email').isEmail().withMessage('Email invalide'),
  body('code').trim().notEmpty().withMessage('Le code est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, code } = req.body;

    // Récupérer le code de vérification
    const verification = await prisma.email_verification_codes.findFirst({
      where: {
        email,
        verified: false
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Aucune demande de vérification trouvée'
      });
    }

    // Vérifier si le code a expiré
    if (new Date() > new Date(verification.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'Le code a expiré. Demandez un nouveau code',
        expired: true
      });
    }

    // Incrémenter le nombre de tentatives
    await prisma.email_verification_codes.update({
      where: { id: verification.id },
      data: { attempts: (verification.attempts || 0) + 1 }
    });

    // Vérifier le code
    if (code !== verification.code) {
      // Si c'est la 3ème tentative incorrecte, générer et envoyer un nouveau code
      if ((verification.attempts || 0) >= 2) {
        const newCode = generateVerificationCode();
        const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.email_verification_codes.update({
          where: { id: verification.id },
          data: {
            code: newCode,
            expires_at: newExpiresAt,
            attempts: 0
          }
        });

        await sendVerificationCode(email, newCode);

        return res.status(400).json({
          success: false,
          message: 'Code incorrect. Un nouveau code a été envoyé à votre email',
          newCodeSent: true
        });
      }

      return res.status(400).json({
        success: false,
        message: `Code incorrect. ${3 - (verification.attempts || 0) - 1} tentative(s) restante(s)`
      });
    }

    // Code correct, créer le compte
    const now = new Date();
    const newUser = await prisma.users.create({
      data: {
        phone: verification.phone,
        name: verification.name,
        email: verification.email,
        password: verification.password,
        newsletter_subscribed: true,
        cgu_accepted: 1,
        cgu_accepted_at: now,
        privacy_policy_accepted: 1,
        privacy_policy_accepted_at: now,
        terms_version: '1.0'
      }
    });

    // Marquer comme vérifié
    await prisma.email_verification_codes.update({
      where: { id: verification.id },
      data: { verified: true }
    });

    // Générer le token JWT
    const token = jwt.sign(
      { id: newUser.id, phone: newUser.phone, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      token,
      user: {
        id: newUser.id,
        phone: newUser.phone,
        name: newUser.name,
        email: newUser.email,
        kyc_verified: newUser.kyc_verified === 1,
        kyc_status: newUser.kyc_status
      }
    });
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Renvoyer un nouveau code
router.post('/resend-verification-code', [
  body('email').isEmail().withMessage('Email invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;

    // Récupérer la dernière demande
    const verification = await prisma.email_verification_codes.findFirst({
      where: {
        email,
        verified: false
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Aucune demande de vérification trouvée'
      });
    }

    // Générer un nouveau code
    const newCode = generateVerificationCode();
    const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.email_verification_codes.update({
      where: { id: verification.id },
      data: {
        code: newCode,
        expires_at: newExpiresAt,
        attempts: 0
      }
    });

    await sendVerificationCode(email, newCode);

    res.json({
      success: true,
      message: 'Nouveau code envoyé à votre email'
    });
  } catch (error) {
    console.error('Erreur lors du renvoi du code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Ancienne route d'inscription (conservée pour compatibilité, mais déconseillée)
router.post('/register', [
  body('phone').isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  body('name').trim().notEmpty().withMessage('Le nom est requis'),
  body('email').isEmail().withMessage('Email invalide et requis'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('acceptCGU').optional().isBoolean().withMessage('L\'acceptation des CGU doit être un booléen'),
  body('acceptPrivacyPolicy').optional().isBoolean().withMessage('L\'acceptation de la politique doit être un booléen')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, name, email, password, acceptCGU, acceptPrivacyPolicy } = req.body;

    // Vérifier l'acceptation des CGU (optionnel pour compatibilité ascendante)
    if (acceptCGU === false || acceptPrivacyPolicy === false) {
      return res.status(400).json({
        success: false,
        message: 'Vous devez accepter les CGU et la Politique de Confidentialité pour créer un compte'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.users.findUnique({
      where: { phone }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Ce numéro de téléphone est déjà enregistré'
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer l'utilisateur
    const now = new Date();
    const newUser = await prisma.users.create({
      data: {
        phone,
        name,
        email: email || null,
        password: hashedPassword,
        cgu_accepted: acceptCGU ? 1 : 0,
        cgu_accepted_at: acceptCGU ? now : null,
        privacy_policy_accepted: acceptPrivacyPolicy ? 1 : 0,
        privacy_policy_accepted_at: acceptPrivacyPolicy ? now : null,
        terms_version: '1.0'
      }
    });

    // Générer le token JWT
    const token = jwt.sign(
      { id: newUser.id, phone: newUser.phone, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      token,
      user: {
        id: newUser.id,
        phone: newUser.phone,
        name: newUser.name,
        email: newUser.email,
        kyc_verified: newUser.kyc_verified === 1,
        kyc_status: newUser.kyc_status
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription'
    });
  }
});

// Connexion d'un utilisateur
router.post('/login', [
  body('phone').isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  body('password').notEmpty().withMessage('Le mot de passe est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, password } = req.body;

    // Trouver l'utilisateur
    const user = await prisma.users.findUnique({
      where: { phone }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, phone: user.phone, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        kyc_verified: user.kyc_verified === 1,
        kyc_status: user.kyc_status
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion'
    });
  }
});

// Obtenir le profil de l'utilisateur connecté
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        created_at: true,
        kyc_verified: true,
        kyc_status: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      user: {
        ...user,
        kyc_verified: user.kyc_verified === 1
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// ========== RÉINITIALISATION DE MOT DE PASSE ==========

// Étape 1: Demander un code de réinitialisation
router.post('/request-password-reset', [
  body('email').isEmail().withMessage('Email invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Aucun compte associé à cet email'
      });
    }

    // Générer un code à 3 chiffres
    const code = generateVerificationCode();

    // Supprimer les anciens codes pour cet utilisateur
    await prisma.password_reset_tokens.deleteMany({
      where: { user_id: user.id }
    });

    // Calculer l'expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Enregistrer le code
    await prisma.password_reset_tokens.create({
      data: {
        user_id: user.id,
        email,
        code,
        expires_at: expiresAt
      }
    });

    // Envoyer le code par email
    await sendPasswordResetCode(email, code);

    res.json({
      success: true,
      message: 'Code de réinitialisation envoyé à votre email',
      email
    });
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Étape 2: Vérifier le code et réinitialiser le mot de passe
router.post('/reset-password', [
  body('email').isEmail().withMessage('Email invalide'),
  body('code').trim().notEmpty().withMessage('Le code est requis'),
  body('newPassword').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, code, newPassword } = req.body;

    // Récupérer le code de réinitialisation
    const resetToken = await prisma.password_reset_tokens.findFirst({
      where: {
        email,
        used: false
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Aucune demande de réinitialisation trouvée'
      });
    }

    // Vérifier si le code a expiré
    if (new Date() > new Date(resetToken.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'Le code a expiré. Demandez un nouveau code',
        expired: true
      });
    }

    // Incrémenter le nombre de tentatives
    await prisma.password_reset_tokens.update({
      where: { id: resetToken.id },
      data: { attempts: (resetToken.attempts || 0) + 1 }
    });

    // Vérifier le code
    if (code !== resetToken.code) {
      // Si c'est la 3ème tentative incorrecte, générer et envoyer un nouveau code
      if ((resetToken.attempts || 0) >= 2) {
        const newCode = generateVerificationCode();
        const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.password_reset_tokens.update({
          where: { id: resetToken.id },
          data: {
            code: newCode,
            expires_at: newExpiresAt,
            attempts: 0
          }
        });

        await sendPasswordResetCode(email, newCode);

        return res.status(400).json({
          success: false,
          message: 'Code incorrect. Un nouveau code a été envoyé à votre email',
          newCodeSent: true
        });
      }

      return res.status(400).json({
        success: false,
        message: `Code incorrect. ${3 - (resetToken.attempts || 0) - 1} tentative(s) restante(s)`
      });
    }

    // Code correct, réinitialiser le mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { id: resetToken.user_id },
      data: { password: hashedPassword }
    });

    // Marquer le token comme utilisé
    await prisma.password_reset_tokens.update({
      where: { id: resetToken.id },
      data: { used: true }
    });

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;
