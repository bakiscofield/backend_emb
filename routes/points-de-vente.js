const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { authMiddleware, adminMiddleware, checkPermission, checkAnyPermission } = require('../middleware/auth');

const router = express.Router();

// GET /api/points-de-vente — Points de vente actifs (public pour les clients authentifiés)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pointsDeVente = await prisma.points_de_vente.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: pointsDeVente
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des points de vente:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/points-de-vente/all — Tous les PdV (admin)
router.get('/all', checkAnyPermission(['VIEW_POINTS_DE_VENTE', 'MANAGE_POINTS_DE_VENTE']), async (req, res) => {
  try {
    const pointsDeVente = await prisma.points_de_vente.findMany({
      include: {
        admin_points_de_vente: {
          include: {
            admins: {
              select: { id: true, username: true, email: true, is_active: true }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Formatter la réponse pour inclure les agents
    const formatted = pointsDeVente.map(pdv => ({
      ...pdv,
      agents: pdv.admin_points_de_vente.map(apdv => apdv.admins),
      admin_points_de_vente: undefined
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des points de vente:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/points-de-vente — Créer un PdV
router.post('/', checkPermission('MANAGE_POINTS_DE_VENTE'), [
  body('name').trim().notEmpty().withMessage('Le nom est requis'),
  body('address').trim().notEmpty().withMessage('L\'adresse est requise'),
  body('google_maps_url').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, address, google_maps_url } = req.body;

    const pdv = await prisma.points_de_vente.create({
      data: {
        name,
        address,
        google_maps_url: google_maps_url || null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Point de vente créé avec succès',
      data: pdv
    });
  } catch (error) {
    console.error('Erreur lors de la création du point de vente:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/points-de-vente/:id — Modifier un PdV
router.put('/:id', checkPermission('MANAGE_POINTS_DE_VENTE'), [
  body('name').optional().trim().notEmpty().withMessage('Le nom ne peut pas être vide'),
  body('address').optional().trim().notEmpty().withMessage('L\'adresse ne peut pas être vide'),
  body('google_maps_url').optional().trim(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { name, address, google_maps_url, is_active } = req.body;

    const existing = await prisma.points_de_vente.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Point de vente introuvable' });
    }

    const pdv = await prisma.points_de_vente.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(google_maps_url !== undefined && { google_maps_url: google_maps_url || null }),
        ...(is_active !== undefined && { is_active })
      }
    });

    res.json({
      success: true,
      message: 'Point de vente modifié avec succès',
      data: pdv
    });
  } catch (error) {
    console.error('Erreur lors de la modification du point de vente:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/points-de-vente/:id — Supprimer un PdV
router.delete('/:id', checkPermission('MANAGE_POINTS_DE_VENTE'), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.points_de_vente.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Point de vente introuvable' });
    }

    await prisma.points_de_vente.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Point de vente supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du point de vente:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/points-de-vente/:id/agents — Lister les agents d'un PdV
router.get('/:id/agents', checkAnyPermission(['VIEW_POINTS_DE_VENTE', 'MANAGE_POINTS_DE_VENTE']), async (req, res) => {
  try {
    const { id } = req.params;

    const pdv = await prisma.points_de_vente.findUnique({
      where: { id: parseInt(id) }
    });

    if (!pdv) {
      return res.status(404).json({ success: false, message: 'Point de vente introuvable' });
    }

    const agents = await prisma.admin_points_de_vente.findMany({
      where: { point_de_vente_id: parseInt(id) },
      include: {
        admins: {
          select: { id: true, username: true, email: true, is_active: true }
        }
      }
    });

    res.json({
      success: true,
      data: agents.map(a => a.admins)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des agents:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/points-de-vente/:id/agents — Ajouter un agent à un PdV
router.post('/:id/agents', checkPermission('MANAGE_POINTS_DE_VENTE'), [
  body('admin_id').isInt().withMessage('ID admin invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { admin_id } = req.body;

    // Vérifier que le PdV existe
    const pdv = await prisma.points_de_vente.findUnique({
      where: { id: parseInt(id) }
    });

    if (!pdv) {
      return res.status(404).json({ success: false, message: 'Point de vente introuvable' });
    }

    // Vérifier que l'admin existe
    const admin = await prisma.admins.findUnique({
      where: { id: parseInt(admin_id) }
    });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Administrateur introuvable' });
    }

    // Vérifier si l'agent est déjà rattaché
    const existing = await prisma.admin_points_de_vente.findFirst({
      where: {
        admin_id: parseInt(admin_id),
        point_de_vente_id: parseInt(id)
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Cet agent est déjà rattaché à ce point de vente' });
    }

    await prisma.admin_points_de_vente.create({
      data: {
        admin_id: parseInt(admin_id),
        point_de_vente_id: parseInt(id)
      }
    });

    res.status(201).json({
      success: true,
      message: 'Agent ajouté au point de vente avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'agent:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/points-de-vente/:id/agents/:adminId — Retirer un agent d'un PdV
router.delete('/:id/agents/:adminId', checkPermission('MANAGE_POINTS_DE_VENTE'), async (req, res) => {
  try {
    const { id, adminId } = req.params;

    const existing = await prisma.admin_points_de_vente.findFirst({
      where: {
        admin_id: parseInt(adminId),
        point_de_vente_id: parseInt(id)
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Relation agent-point de vente introuvable' });
    }

    await prisma.admin_points_de_vente.delete({
      where: { id: existing.id }
    });

    res.json({
      success: true,
      message: 'Agent retiré du point de vente avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du retrait de l\'agent:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
