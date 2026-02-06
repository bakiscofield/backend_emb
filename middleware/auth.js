const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré'
    });
  }
};

const adminMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux administrateurs'
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré'
    });
  }
};

// Middleware pour vérifier une permission spécifique
const checkPermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token d\'authentification manquant'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Accès réservé aux administrateurs'
        });
      }

      // Vérifier si l'admin est actif
      const admin = await prisma.admins.findUnique({
        where: { id: decoded.id },
        select: { is_active: true }
      });

      if (!admin) {
        return res.status(403).json({
          success: false,
          message: 'Compte administrateur introuvable'
        });
      }

      if (admin.is_active === false) {
        return res.status(403).json({
          success: false,
          message: 'Compte administrateur désactivé'
        });
      }

      // Vérifier si l'admin a la permission requise
      const adminPermission = await prisma.admin_permissions.findFirst({
        where: {
          admin_id: decoded.id,
          permissions: { code: permissionCode }
        },
        include: {
          permissions: { select: { id: true, code: true, name: true } }
        }
      });

      if (!adminPermission) {
        return res.status(403).json({
          success: false,
          message: 'Permission insuffisante',
          required_permission: permissionCode
        });
      }

      req.admin = decoded;
      req.permission = adminPermission.permissions;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }
  };
};

// Middleware pour vérifier si l'admin a AU MOINS UNE des permissions listées
const checkAnyPermission = (permissionCodes) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token d\'authentification manquant'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Accès réservé aux administrateurs'
        });
      }

      // Vérifier si l'admin est actif
      const admin = await prisma.admins.findUnique({
        where: { id: decoded.id },
        select: { is_active: true }
      });

      if (!admin || admin.is_active === false) {
        return res.status(403).json({
          success: false,
          message: 'Compte administrateur désactivé ou introuvable'
        });
      }

      // Vérifier si l'admin a au moins une des permissions
      const adminPermission = await prisma.admin_permissions.findFirst({
        where: {
          admin_id: decoded.id,
          permissions: { code: { in: permissionCodes } }
        },
        include: {
          permissions: { select: { id: true, code: true, name: true } }
        }
      });

      if (!adminPermission) {
        return res.status(403).json({
          success: false,
          message: 'Permission insuffisante',
          required_permissions: permissionCodes
        });
      }

      req.admin = decoded;
      req.permission = adminPermission.permissions;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }
  };
};

module.exports = { authMiddleware, adminMiddleware, checkPermission, checkAnyPermission };
