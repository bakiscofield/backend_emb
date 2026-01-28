const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { adminMiddleware, checkPermission } = require('../middleware/auth');
const { sendAdminCredentials, generateRandomPassword } = require('../utils/emailService');

const router = express.Router();

// Connexion admin
router.post('/login', [
  body('username').notEmpty().withMessage('Le nom d\'utilisateur est requis'),
  body('password').notEmpty().withMessage('Le mot de passe est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, password } = req.body;

    // Trouver l'admin
    const admin = await prisma.admins.findUnique({
      where: { username }
    });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Identifiants incorrects' 
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: admin.id, username: admin.username, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Connexion admin réussie',
      token,
      admin: { 
        id: admin.id, 
        username: admin.username, 
        email: admin.email 
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la connexion' 
    });
  }
});

// Créer un admin (protégé - nécessite d'être admin)
router.post('/create', adminMiddleware, [
  body('username').trim().notEmpty().withMessage('Le nom d\'utilisateur est requis'),
  body('email').notEmpty().withMessage('L\'email est requis').isEmail().withMessage('Email invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email } = req.body;

    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.admins.findUnique({
      where: { username }
    });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Ce nom d\'utilisateur existe déjà'
      });
    }

    // Vérifier si l'email existe déjà
    const existingEmail = await prisma.admins.findFirst({
      where: { email }
    });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Générer un mot de passe aléatoire sécurisé
    const generatedPassword = generateRandomPassword(12);

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Insérer l'admin
    const newAdmin = await prisma.admins.create({
      data: {
        username,
        password: hashedPassword,
        email
      }
    });

    // Envoyer l'email avec les identifiants
    try {
      await sendAdminCredentials(email, username, generatedPassword);
      console.log(`✅ Identifiants envoyés à ${email}`);
    } catch (emailError) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError);
      // On continue même si l'email échoue, mais on prévient l'utilisateur
    }

    res.status(201).json({
      success: true,
      message: 'Administrateur créé avec succès. Les identifiants ont été envoyés par email.',
      admin: { id: newAdmin.id, username, email }
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création'
    });
  }
});

// Obtenir le profil de l'admin connecté
router.get('/profile', adminMiddleware, async (req, res) => {
  try {
    const admin = await prisma.admins.findUnique({
      where: { id: req.admin.id },
      select: {
        id: true,
        username: true,
        email: true,
        created_at: true
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur non trouvé'
      });
    }

    res.json({
      success: true,
      admin
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Lister tous les administrateurs avec leurs permissions
router.get('/list', checkPermission('MANAGE_ADMINS'), async (req, res) => {
  try {
    const admins = await prisma.admins.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        is_active: true,
        created_at: true,
        admin_permissions: {
          include: {
            permissions: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transformer les données pour correspondre au format attendu
    const adminsWithPermissions = admins.map(admin => ({
      id: admin.id,
      username: admin.username,
      email: admin.email,
      is_active: admin.is_active,
      created_at: admin.created_at,
      permissions: admin.admin_permissions.map(ap => ap.permissions),
      permission_count: admin.admin_permissions.length
    }));

    res.json({
      success: true,
      admins: adminsWithPermissions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des admins:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Récupérer un admin spécifique avec ses permissions
router.get('/:id', checkPermission('MANAGE_ADMINS'), async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await prisma.admins.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        email: true,
        is_active: true,
        created_at: true,
        admin_permissions: {
          include: {
            permissions: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true,
                description: true
              }
            }
          },
          orderBy: [
            { permissions: { category: 'asc' } },
            { permissions: { name: 'asc' } }
          ]
        }
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur introuvable'
      });
    }

    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        is_active: admin.is_active,
        created_at: admin.created_at,
        permissions: admin.admin_permissions.map(ap => ap.permissions)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Activer/désactiver un admin
router.patch('/:id/toggle-status', checkPermission('MANAGE_ADMINS'), async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'admin existe
    const admin = await prisma.admins.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, username: true, is_active: true }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur introuvable'
      });
    }

    // Ne pas permettre de se désactiver soi-même
    if (parseInt(id) === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas désactiver votre propre compte'
      });
    }

    const newStatus = admin.is_active ? false : true;

    const updatedAdmin = await prisma.admins.update({
      where: { id: parseInt(id) },
      data: { is_active: newStatus }
    });

    res.json({
      success: true,
      message: `Compte ${newStatus ? 'activé' : 'désactivé'} avec succès`,
      admin: {
        id: updatedAdmin.id,
        username: updatedAdmin.username,
        is_active: updatedAdmin.is_active
      }
    });
  } catch (error) {
    console.error('Erreur lors de la modification du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Mettre à jour les informations d'un admin
router.put('/:id', checkPermission('MANAGE_ADMINS'), [
  body('email').optional().isEmail().withMessage('Email invalide'),
  body('password').optional().isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { email, password } = req.body;

    // Vérifier que l'admin existe
    const admin = await prisma.admins.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, username: true }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur introuvable'
      });
    }

    const updateData = {};

    if (email !== undefined) {
      updateData.email = email;
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune modification fournie'
      });
    }

    await prisma.admins.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Admin mis à jour avec succès',
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Supprimer un admin
router.delete('/:id', checkPermission('MANAGE_ADMINS'), async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'admin existe
    const admin = await prisma.admins.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, username: true }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur introuvable'
      });
    }

    // Ne pas permettre de se supprimer soi-même
    if (parseInt(id) === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    // Supprimer l'admin (les permissions seront supprimées en cascade)
    await prisma.admins.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: `Admin ${admin.username} supprimé avec succès`
    });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;
