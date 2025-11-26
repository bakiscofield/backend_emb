const jwt = require('jsonwebtoken');
const db = require('../config/database');

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
      const admin = await db.get(
        'SELECT is_active FROM admins WHERE id = ?',
        [decoded.id]
      );

      if (!admin) {
        return res.status(403).json({
          success: false,
          message: 'Compte administrateur introuvable'
        });
      }

      if (!admin.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Compte administrateur désactivé'
        });
      }

      // Vérifier si l'admin a la permission requise
      const permission = await db.get(`
        SELECT p.id, p.code, p.name
        FROM permissions p
        INNER JOIN admin_permissions ap ON p.id = ap.permission_id
        WHERE ap.admin_id = ? AND p.code = ?
      `, [decoded.id, permissionCode]);

      if (!permission) {
        return res.status(403).json({
          success: false,
          message: 'Permission insuffisante',
          required_permission: permissionCode
        });
      }

      req.admin = decoded;
      req.permission = permission;
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
      const admin = await db.get(
        'SELECT is_active FROM admins WHERE id = ?',
        [decoded.id]
      );

      if (!admin || !admin.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Compte administrateur désactivé ou introuvable'
        });
      }

      // Vérifier si l'admin a au moins une des permissions
      const placeholders = permissionCodes.map(() => '?').join(',');
      const permission = await db.get(`
        SELECT p.id, p.code, p.name
        FROM permissions p
        INNER JOIN admin_permissions ap ON p.id = ap.permission_id
        WHERE ap.admin_id = ? AND p.code IN (${placeholders})
        LIMIT 1
      `, [decoded.id, ...permissionCodes]);

      if (!permission) {
        return res.status(403).json({
          success: false,
          message: 'Permission insuffisante',
          required_permissions: permissionCodes
        });
      }

      req.admin = decoded;
      req.permission = permission;
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
