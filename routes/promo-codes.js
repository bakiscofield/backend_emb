const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// ==================== ADMIN: Créer un code promo ====================
router.post('/',
  adminMiddleware,
  [
    body('code').trim().notEmpty().withMessage('Code requis'),
    body('discount_percent').isFloat({ min: 0, max: 100 }).withMessage('Pourcentage entre 0 et 100'),
    body('valid_until').isISO8601().withMessage('Date de fin requise'),
    body('max_uses').optional().isInt({ min: 1 }).withMessage('Nombre d\'utilisations doit être positif'),
    body('user_id').optional().isInt().withMessage('ID utilisateur invalide')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { code, discount_percent, valid_from, valid_until, user_id, max_uses } = req.body;

      // Vérifier que le code n'existe pas déjà
      const existing = await prisma.promo_codes.findUnique({
        where: { code: code.toUpperCase() }
      });

      if (existing) {
        return res.status(400).json({
          error: 'Code promo déjà existant'
        });
      }

      // Créer le code promo
      const promoCode = await prisma.promo_codes.create({
        data: {
          code: code.toUpperCase(),
          discount_percent: parseFloat(discount_percent),
          valid_from: valid_from ? new Date(valid_from) : new Date(),
          valid_until: new Date(valid_until),
          user_id: user_id ? parseInt(user_id) : null,
          max_uses: max_uses ? parseInt(max_uses) : null,
          created_by: req.admin.id
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        }
      });

      res.json({
        success: true,
        promo_code: promoCode
      });
    } catch (error) {
      console.error('Erreur création code promo:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ==================== ADMIN: Liste des codes promo ====================
router.get('/',
  adminMiddleware,
  async (req, res) => {
    try {
      const promoCodes = await prisma.promo_codes.findMany({
        include: {
          users: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          },
          promo_code_usage: {
            include: {
              users: {
                select: {
                  name: true,
                  phone: true
                }
              }
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      res.json({
        success: true,
        promo_codes: promoCodes
      });
    } catch (error) {
      console.error('Erreur récupération codes promo:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ==================== ADMIN: Activer/Désactiver un code promo ====================
router.patch('/:id/toggle',
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const promoCode = await prisma.promo_codes.findUnique({
        where: { id: parseInt(id) }
      });

      if (!promoCode) {
        return res.status(404).json({ error: 'Code promo non trouvé' });
      }

      const updated = await prisma.promo_codes.update({
        where: { id: parseInt(id) },
        data: {
          is_active: !promoCode.is_active
        }
      });

      res.json({
        success: true,
        promo_code: updated
      });
    } catch (error) {
      console.error('Erreur toggle code promo:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ==================== ADMIN: Supprimer un code promo ====================
router.delete('/:id',
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.promo_codes.delete({
        where: { id: parseInt(id) }
      });

      res.json({
        success: true,
        message: 'Code promo supprimé'
      });
    } catch (error) {
      console.error('Erreur suppression code promo:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ==================== USER: Récupérer mes codes promo ====================
router.get('/my-codes',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const now = new Date();

      // Récupérer tous les codes promo actifs pour cet utilisateur
      const promoCodes = await prisma.promo_codes.findMany({
        where: {
          is_active: true,
          valid_from: {
            lte: now
          },
          valid_until: {
            gte: now
          },
          OR: [
            { user_id: null }, // Codes pour tous
            { user_id: userId } // Codes pour cet utilisateur spécifiquement
          ]
        },
        select: {
          id: true,
          code: true,
          discount_percent: true,
          valid_until: true
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      // Filtrer les codes déjà utilisés par cet utilisateur
      const unusedCodes = [];
      for (const promo of promoCodes) {
        const usage = await prisma.promo_code_usage.findFirst({
          where: {
            promo_code_id: promo.id,
            user_id: userId
          }
        });

        if (!usage) {
          unusedCodes.push(promo);
        }
      }

      res.json({
        success: true,
        promo_codes: unusedCodes
      });
    } catch (error) {
      console.error('Erreur récupération codes promo utilisateur:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ==================== USER: Valider un code promo ====================
router.post('/validate',
  authMiddleware,
  [
    body('code').trim().notEmpty().withMessage('Code requis')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { code } = req.body;
      const userId = req.user.id;

      // Récupérer le code promo
      const promoCode = await prisma.promo_codes.findUnique({
        where: { code: code.toUpperCase() }
      });

      // Validations
      if (!promoCode) {
        return res.status(400).json({
          error: 'Code promo invalide'
        });
      }

      if (!promoCode.is_active) {
        return res.status(400).json({
          error: 'Code promo désactivé'
        });
      }

      const now = new Date();
      if (now < promoCode.valid_from) {
        return res.status(400).json({
          error: 'Code promo pas encore valide'
        });
      }

      if (now > promoCode.valid_until) {
        return res.status(400).json({
          error: 'Code promo expiré'
        });
      }

      // Vérifier si le code est pour un utilisateur spécifique
      if (promoCode.user_id && promoCode.user_id !== userId) {
        return res.status(400).json({
          error: 'Code promo non valide pour votre compte'
        });
      }

      // Vérifier le nombre max d'utilisations
      if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
        return res.status(400).json({
          error: 'Code promo épuisé'
        });
      }

      // Vérifier si l'utilisateur a déjà utilisé ce code
      const existingUsage = await prisma.promo_code_usage.findFirst({
        where: {
          promo_code_id: promoCode.id,
          user_id: userId
        }
      });

      if (existingUsage) {
        return res.status(400).json({
          error: 'Vous avez déjà utilisé ce code promo'
        });
      }

      // Code valide!
      res.json({
        success: true,
        promo_code: {
          code: promoCode.code,
          discount_percent: promoCode.discount_percent
        }
      });
    } catch (error) {
      console.error('Erreur validation code promo:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

module.exports = router;
