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

      // Utiliser Prisma ORM pour upsert (compatible avec toutes les DB)
      await prisma.user_fcm_tokens.upsert({
        where: { user_id: userId },
        update: { fcm_token: fcmToken },
        create: {
          user_id: userId,
          fcm_token: fcmToken
        }
      });

      console.log('[FCM] Token sauvegardé avec succès');

      res.json({
        success: true,
        message: 'Token FCM sauvegardé avec succès'
      });
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

      // Utiliser Prisma ORM pour supprimer
      await prisma.user_fcm_tokens.deleteMany({
        where: {
          user_id: userId,
          fcm_token: fcmToken
        }
      });

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
          await prisma.user_fcm_tokens.deleteMany({
            where: { fcm_token: fcmToken }
          });

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
    // Récupérer le token FCM de l'utilisateur avec Prisma ORM
    const tokenRecord = await prisma.user_fcm_tokens.findUnique({
      where: { user_id: userId }
    });

    if (!tokenRecord) {
      console.log('[FCM] Utilisateur sans token FCM:', userId);
      return null;
    }

    const fcmToken = tokenRecord.fcm_token;

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
      await prisma.user_fcm_tokens.delete({
        where: { user_id: userId }
      }).catch(() => {}); // Ignorer si déjà supprimé
      console.log('[FCM] Token invalide supprimé pour user:', userId);
    }

    throw error;
  }
}

// ==================== FONCTION UTILITAIRE: Notifier tous les admins ====================
async function notifyAllAdmins(title, body, data = {}) {
  try {
    // Récupérer tous les tokens FCM des admins avec Prisma ORM
    // Note: Les admins sont dans la table "admins", pas "users"
    // Pour l'instant, on notifie tous les utilisateurs ayant un token
    const tokenRecords = await prisma.user_fcm_tokens.findMany({
      include: {
        users: true
      }
    });

    if (tokenRecords.length === 0) {
      console.log('[FCM] Aucun utilisateur avec token FCM');
      return null;
    }

    const admins = tokenRecords;

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
