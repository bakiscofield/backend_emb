const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { authMiddleware } = require('../middleware/auth');
const admin = require('../config/firebase-admin');

const router = express.Router();

// ==================== ENDPOINT 1: Sauvegarder un token FCM ====================
router.post('/save-token',
  authMiddleware,
  [
    body('fcmToken').trim().notEmpty().withMessage('Token FCM requis')
  ],
  async (req, res) => {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fcmToken } = req.body;
      const userId = req.user.id;

      console.log('[FCM] Sauvegarde token pour user:', userId);

      // Vérifier si la table existe, sinon la créer
      try {
        // Sauvegarder ou mettre à jour le token dans la base de données (SQLite syntax)
        await prisma.$executeRaw`
          INSERT INTO user_fcm_tokens (user_id, fcm_token, created_at, updated_at)
          VALUES (${userId}, ${fcmToken}, datetime('now'), datetime('now'))
          ON CONFLICT(user_id) DO UPDATE SET
            fcm_token = ${fcmToken},
            updated_at = datetime('now')
        `;

        console.log('[FCM] Token sauvegardé avec succès');

        res.json({
          success: true,
          message: 'Token FCM sauvegardé avec succès'
        });
      } catch (dbError) {
        // Si la table n'existe pas, créer la structure
        if (dbError.code === 'ER_NO_SUCH_TABLE' || dbError.message.includes('user_fcm_tokens')) {
          console.log('[FCM] Table user_fcm_tokens non trouvée, création...');

          await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS user_fcm_tokens (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL UNIQUE,
              fcm_token TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `;

          console.log('[FCM] Table créée, nouvelle tentative de sauvegarde...');

          // Réessayer la sauvegarde
          await prisma.$executeRaw`
            INSERT INTO user_fcm_tokens (user_id, fcm_token, created_at, updated_at)
            VALUES (${userId}, ${fcmToken}, datetime('now'), datetime('now'))
          `;

          res.json({
            success: true,
            message: 'Token FCM sauvegardé avec succès (table créée)'
          });
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error('[FCM] Erreur sauvegarde token:', error);
      res.status(500).json({
        error: 'Erreur serveur lors de la sauvegarde du token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// ==================== ENDPOINT 2: Supprimer un token FCM ====================
router.post('/delete-token',
  authMiddleware,
  [
    body('fcmToken').trim().notEmpty().withMessage('Token FCM requis')
  ],
  async (req, res) => {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fcmToken } = req.body;
      const userId = req.user.id;

      console.log('[FCM] Suppression token pour user:', userId);

      // Supprimer le token de la base de données
      await prisma.$executeRaw`
        DELETE FROM user_fcm_tokens
        WHERE user_id = ${userId} AND fcm_token = ${fcmToken}
      `;

      console.log('[FCM] Token supprimé avec succès');

      res.json({
        success: true,
        message: 'Token FCM supprimé avec succès'
      });
    } catch (error) {
      console.error('[FCM] Erreur suppression token:', error);
      res.status(500).json({
        error: 'Erreur serveur lors de la suppression du token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// ==================== ENDPOINT 3: Envoyer une notification de test ====================
router.post('/test-notification',
  authMiddleware,
  [
    body('fcmToken').trim().notEmpty().withMessage('Token FCM requis')
  ],
  async (req, res) => {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fcmToken } = req.body;
      const userId = req.user.id;

      console.log('[FCM] Envoi notification de test pour user:', userId);

      // Vérifier si Firebase Admin est correctement initialisé
      if (!admin.apps.length) {
        return res.status(503).json({
          error: 'Firebase Admin n\'est pas initialisé',
          message: 'Veuillez configurer le Service Account Key dans config/firebase-admin.js'
        });
      }

      // Message de notification
      const message = {
        notification: {
          title: 'EMB - Notification de test',
          body: 'Ceci est une notification de test Firebase Cloud Messaging ✅'
        },
        data: {
          url: '/dashboard',
          type: 'test',
          timestamp: Date.now().toString()
        },
        token: fcmToken
      };

      // Envoyer la notification
      try {
        const response = await admin.messaging().send(message);
        console.log('[FCM] Notification de test envoyée:', response);

        res.json({
          success: true,
          message: 'Notification de test envoyée avec succès',
          messageId: response
        });
      } catch (sendError) {
        // Gestion des erreurs spécifiques Firebase
        if (sendError.code === 'messaging/invalid-registration-token' ||
            sendError.code === 'messaging/registration-token-not-registered') {
          // Token invalide, le supprimer de la base de données
          console.log('[FCM] Token invalide, suppression...');
          await prisma.$executeRaw`
            DELETE FROM user_fcm_tokens WHERE fcm_token = ${fcmToken}
          `;

          return res.status(400).json({
            error: 'Token FCM invalide ou expiré',
            message: 'Le token a été supprimé. Veuillez réactiver les notifications.'
          });
        } else if (sendError.code === 'app/invalid-credential') {
          return res.status(503).json({
            error: 'Configuration Firebase invalide',
            message: 'Veuillez configurer le Service Account Key correctement'
          });
        }

        throw sendError;
      }
    } catch (error) {
      console.error('[FCM] Erreur envoi notification de test:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'envoi de la notification',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// ==================== FONCTION UTILITAIRE: Envoyer notification à un utilisateur ====================
async function sendNotificationToUser(userId, title, body, data = {}) {
  try {
    // Récupérer le token FCM de l'utilisateur
    const tokens = await prisma.$queryRaw`
      SELECT fcm_token FROM user_fcm_tokens WHERE user_id = ${userId}
    `;

    if (tokens.length === 0) {
      console.log('[FCM] Utilisateur sans token FCM:', userId);
      return null;
    }

    const fcmToken = tokens[0].fcm_token;

    // Préparer le message
    const message = {
      notification: {
        title: title,
        body: body
      },
      data: {
        ...data,
        timestamp: Date.now().toString()
      },
      token: fcmToken
    };

    // Envoyer la notification
    const response = await admin.messaging().send(message);
    console.log('[FCM] Notification envoyée à user', userId, ':', response);

    return response;
  } catch (error) {
    console.error('[FCM] Erreur envoi notification:', error);

    // Si le token est invalide, le supprimer
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      await prisma.$executeRaw`
        DELETE FROM user_fcm_tokens WHERE user_id = ${userId}
      `;
      console.log('[FCM] Token invalide supprimé pour user:', userId);
    }

    throw error;
  }
}

// ==================== FONCTION UTILITAIRE: Notifier tous les admins ====================
async function notifyAllAdmins(title, body, data = {}) {
  try {
    // Récupérer tous les tokens FCM des admins
    const admins = await prisma.$queryRaw`
      SELECT uft.fcm_token
      FROM user_fcm_tokens uft
      JOIN users u ON uft.user_id = u.id
      WHERE u.role = 'admin'
    `;

    if (admins.length === 0) {
      console.log('[FCM] Aucun admin avec token FCM');
      return null;
    }

    // Préparer le message
    const message = {
      notification: {
        title: title,
        body: body
      },
      data: {
        ...data,
        timestamp: Date.now().toString()
      },
      tokens: admins.map(a => a.fcm_token)
    };

    // Envoyer la notification (multicast)
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`[FCM] ${response.successCount} notifications envoyées aux admins`);
    console.log(`[FCM] ${response.failureCount} échecs`);

    return response;
  } catch (error) {
    console.error('[FCM] Erreur notification admins:', error);
    throw error;
  }
}

// Exporter les fonctions utilitaires
module.exports = {
  router,
  sendNotificationToUser,
  notifyAllAdmins
};
