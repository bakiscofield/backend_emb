const express = require('express');
const router = express.Router();

const prisma = require('../config/prisma');
const { checkPermission } = require('../middleware/auth');

// Récupérer toutes les permissions
router.get('/', checkPermission('MANAGE_PERMISSIONS'), async (req, res) => {
  try {
    const permissions = await prisma.permissions.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Grouper par catégorie
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push(perm);
      return acc;
    }, {});

    res.json({
      success: true,
      permissions,
      grouped
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des permissions',
      error: error.message
    });
  }
});

// Récupérer les permissions d'un admin spécifique
router.get('/admin/:adminId', checkPermission('MANAGE_PERMISSIONS'), async (req, res) => {
  try {
    const { adminId } = req.params;

    const adminPermissions = await prisma.admin_permissions.findMany({
      where: { admin_id: parseInt(adminId) },
      include: {
        permissions: true
      },
      orderBy: [
        { permissions: { category: 'asc' } },
        { permissions: { name: 'asc' } }
      ]
    });

    const permissions = adminPermissions.map(ap => ap.permissions);

    res.json({
      success: true,
      permissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des permissions',
      error: error.message
    });
  }
});

// Attribuer une permission à un admin
router.post('/admin/:adminId/grant', checkPermission('MANAGE_PERMISSIONS'), async (req, res) => {
  try {
    const { adminId } = req.params;
    const { permissionId } = req.body;

    if (!permissionId) {
      return res.status(400).json({
        success: false,
        message: 'ID de permission requis'
      });
    }

    // Vérifier que l'admin existe et est actif
    const admin = await prisma.admins.findUnique({
      where: { id: parseInt(adminId) },
      select: {
        id: true,
        username: true,
        is_active: true
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur introuvable'
      });
    }

    // Vérifier que la permission existe
    const permission = await prisma.permissions.findUnique({
      where: { id: permissionId },
      select: {
        id: true,
        code: true,
        name: true
      }
    });

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission introuvable'
      });
    }

    // Attribuer la permission (upsert pour éviter les doublons)
    await prisma.admin_permissions.upsert({
      where: {
        admin_id_permission_id: {
          admin_id: parseInt(adminId),
          permission_id: permissionId
        }
      },
      update: {},
      create: {
        admin_id: parseInt(adminId),
        permission_id: permissionId
      }
    });

    res.json({
      success: true,
      message: `Permission "${permission.name}" attribuée à ${admin.username}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'attribution de la permission',
      error: error.message
    });
  }
});

// Retirer une permission à un admin
router.delete('/admin/:adminId/revoke/:permissionId', checkPermission('MANAGE_PERMISSIONS'), async (req, res) => {
  try {
    const { adminId, permissionId } = req.params;

    // Vérifier que l'admin existe
    const admin = await prisma.admins.findUnique({
      where: { id: parseInt(adminId) },
      select: {
        id: true,
        username: true
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur introuvable'
      });
    }

    // Vérifier que la permission existe
    const permission = await prisma.permissions.findUnique({
      where: { id: parseInt(permissionId) },
      select: {
        id: true,
        code: true,
        name: true
      }
    });

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission introuvable'
      });
    }

    // Retirer la permission
    await prisma.admin_permissions.deleteMany({
      where: {
        admin_id: parseInt(adminId),
        permission_id: parseInt(permissionId)
      }
    });

    res.json({
      success: true,
      message: `Permission "${permission.name}" retirée à ${admin.username}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du retrait de la permission',
      error: error.message
    });
  }
});

// Mettre à jour toutes les permissions d'un admin en une fois
router.put('/admin/:adminId/bulk', checkPermission('MANAGE_PERMISSIONS'), async (req, res) => {
  try {
    const { adminId } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        message: 'permissionIds doit être un tableau'
      });
    }

    // Vérifier que l'admin existe
    const admin = await prisma.admins.findUnique({
      where: { id: parseInt(adminId) },
      select: {
        id: true,
        username: true
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur introuvable'
      });
    }

    // Supprimer toutes les permissions actuelles
    await prisma.admin_permissions.deleteMany({
      where: { admin_id: parseInt(adminId) }
    });

    // Ajouter les nouvelles permissions
    if (permissionIds.length > 0) {
      await prisma.admin_permissions.createMany({
        data: permissionIds.map(id => ({
          admin_id: parseInt(adminId),
          permission_id: id
        }))
      });
    }

    res.json({
      success: true,
      message: `Permissions mises à jour pour ${admin.username}`,
      count: permissionIds.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des permissions',
      error: error.message
    });
  }
});

module.exports = router;
