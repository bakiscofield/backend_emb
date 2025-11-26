const express = require('express');
const router = express.Router();
const webpush = require('web-push');

const prisma = require('../config/prisma');
const { authMiddleware } = require('../middleware/auth');

// Configuration de web-push avec les clés VAPID
webpush.setVapidDetails(
  'mailto:' + process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// GET - Récupérer la clé publique VAPID
router.get('/vapid-public-key', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      publicKey: process.env.VAPID_PUBLIC_KEY
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la clé VAPID:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST - Sauvegarder une souscription push
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { id, isAdmin } = req.user;
    const subscription = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Données de souscription invalides'
      });
    }

    // Vérifier si une souscription existe déjà pour cet endpoint
    const existingSubscription = await prisma.push_subscriptions.findFirst({
      where: { endpoint: subscription.endpoint }
    });

    if (existingSubscription) {
      // Mettre à jour l'utilisateur associé
      await prisma.push_subscriptions.update({
        where: { id: existingSubscription.id },
        data: {
          user_id: isAdmin ? null : id,
          admin_id: isAdmin ? id : null,
          subscription_data: JSON.stringify(subscription)
        }
      });
    } else {
      // Créer une nouvelle souscription
      await prisma.push_subscriptions.create({
        data: {
          user_id: isAdmin ? null : id,
          admin_id: isAdmin ? id : null,
          endpoint: subscription.endpoint,
          subscription_data: JSON.stringify(subscription)
        }
      });
    }

    res.json({
      success: true,
      message: 'Souscription enregistrée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la souscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST - Supprimer une souscription push
router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint manquant'
      });
    }

    await prisma.push_subscriptions.deleteMany({
      where: { endpoint }
    });

    res.json({
      success: true,
      message: 'Souscription supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la souscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST - Envoyer une notification push de test
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const { id, isAdmin } = req.user;

    // Récupérer la souscription de l'utilisateur
    const subscription = await prisma.push_subscriptions.findFirst({
      where: isAdmin
        ? { admin_id: id }
        : { user_id: id }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Aucune souscription trouvée'
      });
    }

    const payload = JSON.stringify({
      title: 'Notification de test',
      body: 'Ceci est une notification push de test',
      icon: '/logo.png',
      badge: '/logo.png'
    });

    await webpush.sendNotification(
      JSON.parse(subscription.subscription_data),
      payload
    );

    res.json({
      success: true,
      message: 'Notification de test envoyée'
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification de test:', error);

    // Si la souscription est expirée ou invalide, la supprimer
    if (error.statusCode === 410 || error.statusCode === 404) {
      try {
        await prisma.push_subscriptions.deleteMany({
          where: isAdmin
            ? { admin_id: id }
            : { user_id: id }
        });
      } catch (deleteError) {
        console.error('Erreur lors de la suppression de la souscription expirée:', deleteError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la notification'
    });
  }
});

// Fonction utilitaire pour envoyer des notifications push
async function sendPushNotification({ userId, adminId, title, body, url, notificationId }) {
  try {
    // Récupérer toutes les souscriptions pour cet utilisateur/admin
    const subscriptions = await prisma.push_subscriptions.findMany({
      where: userId
        ? { user_id: userId }
        : { admin_id: adminId }
    });

    if (subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      title: title || 'EMB Banking',
      body: body || 'Nouvelle notification',
      icon: '/logo.png',
      badge: '/logo.png',
      url: url || '/dashboard',
      notificationId
    });

    // Envoyer la notification à toutes les souscriptions
    const promises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          JSON.parse(sub.subscription_data),
          payload
        );
      } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification push:', error);

        // Si la souscription est expirée, la supprimer
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.push_subscriptions.delete({
            where: { id: sub.id }
          });
        }
      }
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications push:', error);
  }
}

module.exports = router;
module.exports.sendPushNotification = sendPushNotification;
