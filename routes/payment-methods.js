const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = require('../config/prisma');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

// Configuration de multer pour l'upload des logos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/logos');
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Générer un nom unique : timestamp + nom original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'logo-' + uniqueSuffix + ext);
  }
});

// Filtre pour accepter uniquement les images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées (jpeg, jpg, png, gif, svg, webp)'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB
});

// Middleware pour vérifier si l'utilisateur est admin
const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé. Droits administrateur requis.'
    });
  }
  next();
};

// GET - Récupérer tous les moyens de paiement (PUBLIC)
router.get('/', async (req, res) => {
  try {
    const { active_only } = req.query;

    const whereClause = {};

    if (active_only === 'true') {
      whereClause.is_active = true;
    }

    const methods = await prisma.payment_methods.findMany({
      where: whereClause,
      orderBy: { created_at: 'asc' }
    });

    res.json({
      success: true,
      data: methods
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des moyens de paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET - Récupérer un moyen de paiement par ID
router.get('/:id', async (req, res) => {
  try {
    const method = await prisma.payment_methods.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Moyen de paiement introuvable'
      });
    }

    res.json({
      success: true,
      data: method
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du moyen de paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST - Upload d'un logo (ADMIN)
router.post('/upload-logo', authMiddleware, adminMiddleware, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier uploadé'
      });
    }

    // Générer l'URL du logo
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Logo uploadé avec succès',
      data: {
        filename: req.file.filename,
        url: logoUrl,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du logo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de l\'upload'
    });
  }
});

// POST - Créer un nouveau moyen de paiement (ADMIN)
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  [
    body('name').trim().notEmpty().withMessage('Le nom est requis'),
    body('code')
      .trim()
      .notEmpty()
      .withMessage('Le code est requis')
      .isUppercase()
      .withMessage('Le code doit être en majuscules'),
    body('icon').optional().trim(),
    body('logo_url').optional().trim().isURL().withMessage('L\'URL du logo doit être valide'),
    body('description').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    try {
      const { name, code, icon, logo_url, description } = req.body;

      // Vérifier si le code existe déjà
      const existing = await prisma.payment_methods.findUnique({
        where: { code }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Un moyen de paiement avec ce code existe déjà'
        });
      }

      const newMethod = await prisma.payment_methods.create({
        data: {
          name,
          code,
          icon: icon || null,
          logo_url: logo_url || null,
          description: description || null,
          is_active: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Moyen de paiement créé avec succès',
        data: newMethod
      });
    } catch (error) {
      console.error('Erreur lors de la création du moyen de paiement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// PUT - Mettre à jour un moyen de paiement (ADMIN)
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [
    body('name').optional().trim().notEmpty(),
    body('code').optional().trim().notEmpty().isUppercase(),
    body('icon').optional().trim(),
    body('logo_url').optional().trim(),
    body('description').optional().trim(),
    body('is_active').optional().isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    try {
      const { id } = req.params;
      const { name, code, icon, logo_url, description, is_active } = req.body;

      // Vérifier si le moyen de paiement existe
      const existing = await prisma.payment_methods.findUnique({
        where: { id: parseInt(id) }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Moyen de paiement introuvable'
        });
      }

      // Si le code est modifié, vérifier qu'il n'existe pas déjà
      if (code && code !== existing.code) {
        const duplicate = await prisma.payment_methods.findUnique({
          where: { code }
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: 'Un moyen de paiement avec ce code existe déjà'
          });
        }
      }

      // Construire les données de mise à jour
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (code !== undefined) updateData.code = code;
      if (icon !== undefined) updateData.icon = icon;
      if (logo_url !== undefined) updateData.logo_url = logo_url;
      if (description !== undefined) updateData.description = description;
      if (is_active !== undefined) updateData.is_active = is_active;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucune donnée à mettre à jour'
        });
      }

      const updated = await prisma.payment_methods.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      res.json({
        success: true,
        message: 'Moyen de paiement mis à jour avec succès',
        data: updated
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du moyen de paiement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// DELETE - Supprimer un moyen de paiement (ADMIN)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le moyen de paiement existe
    const existing = await prisma.payment_methods.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Moyen de paiement introuvable'
      });
    }

    // Vérifier si le moyen de paiement est utilisé dans des paires d'échanges
    const usedInPairsFrom = await prisma.exchange_pairs.findFirst({
      where: { from_method_id: parseInt(id) }
    });

    const usedInPairsTo = await prisma.exchange_pairs.findFirst({
      where: { to_method_id: parseInt(id) }
    });

    if (usedInPairsFrom || usedInPairsTo) {
      return res.status(409).json({
        success: false,
        message: 'Impossible de supprimer ce moyen de paiement car il est utilisé dans des paires d\'échanges'
      });
    }

    await prisma.payment_methods.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Moyen de paiement supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du moyen de paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;
