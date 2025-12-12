const express = require('express');
const router = express.Router();

const prisma = require('../config/prisma');
const { checkPermission, checkAnyPermission } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { sendNewsletter } = require('../utils/emailService');

// Récupérer toutes les newsletters
router.get('/', checkAnyPermission(['VIEW_NEWSLETTERS', 'CREATE_NEWSLETTERS']), async (req, res) => {
  try {
    const newsletters = await prisma.newsletters.findMany({
      include: {
        admins: {
          select: {
            username: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Récupérer les statistiques pour chaque newsletter
    const newslettersWithStats = await Promise.all(
      newsletters.map(async (newsletter) => {
        const recipientCount = await prisma.newsletter_recipients.count({
          where: { newsletter_id: newsletter.id }
        });

        return {
          ...newsletter,
          created_by_name: newsletter.admins.username,
          recipient_count: recipientCount,
          admins: undefined
        };
      })
    );

    res.json({
      success: true,
      newsletters: newslettersWithStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des newsletters',
      error: error.message
    });
  }
});

// Récupérer une newsletter spécifique
router.get('/:id', checkAnyPermission(['VIEW_NEWSLETTERS', 'CREATE_NEWSLETTERS']), async (req, res) => {
  try {
    const { id } = req.params;

    const newsletter = await prisma.newsletters.findUnique({
      where: { id: parseInt(id) },
      include: {
        admins: {
          select: {
            username: true
          }
        }
      }
    });

    if (!newsletter) {
      return res.status(404).json({
        success: false,
        message: 'Newsletter introuvable'
      });
    }

    // Récupérer les destinataires
    const recipients = await prisma.newsletter_recipients.findMany({
      where: { newsletter_id: parseInt(id) },
      include: {
        users: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { sent_at: 'desc' }
    });

    // Format recipients
    const formattedRecipients = recipients.map(r => ({
      ...r,
      name: r.users.name,
      email: r.users.email,
      phone: r.users.phone,
      users: undefined
    }));

    // Récupérer l'historique d'envoi
    const history = await prisma.newsletter_history.findMany({
      where: { newsletter_id: parseInt(id) },
      include: {
        admins: {
          select: {
            username: true
          }
        }
      },
      orderBy: { sent_at: 'desc' }
    });

    // Format history
    const formattedHistory = history.map(h => ({
      ...h,
      sent_by_name: h.admins.username,
      admins: undefined
    }));

    res.json({
      success: true,
      newsletter: {
        ...newsletter,
        created_by_name: newsletter.admins.username,
        recipients: formattedRecipients,
        history: formattedHistory,
        admins: undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la newsletter',
      error: error.message
    });
  }
});

// Créer une newsletter (brouillon)
router.post('/', checkPermission('CREATE_NEWSLETTERS'), [
  body('title').trim().notEmpty().withMessage('Le titre est requis'),
  body('subject').trim().notEmpty().withMessage('Le sujet est requis'),
  body('content').trim().notEmpty().withMessage('Le contenu est requis'),
  body('content_html').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, subject, content, content_html } = req.body;

    const newsletter = await prisma.newsletters.create({
      data: {
        title,
        subject,
        content,
        content_html: content_html || null,
        status: 'draft',
        created_by: req.admin.id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Newsletter créée en tant que brouillon',
      newsletter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la newsletter',
      error: error.message
    });
  }
});

// Mettre à jour une newsletter
router.put('/:id', checkPermission('CREATE_NEWSLETTERS'), [
  body('title').optional().trim().notEmpty().withMessage('Le titre ne peut pas être vide'),
  body('subject').optional().trim().notEmpty().withMessage('Le sujet ne peut pas être vide'),
  body('content').optional().trim().notEmpty().withMessage('Le contenu ne peut pas être vide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { title, subject, content, content_html } = req.body;

    // Vérifier que la newsletter existe et est en mode brouillon
    const newsletter = await prisma.newsletters.findUnique({
      where: { id: parseInt(id) }
    });

    if (!newsletter) {
      return res.status(404).json({
        success: false,
        message: 'Newsletter introuvable'
      });
    }

    if (newsletter.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Seules les newsletters en brouillon peuvent être modifiées'
      });
    }

    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (subject !== undefined) updateData.subject = subject;
    if (content !== undefined) updateData.content = content;
    if (content_html !== undefined) updateData.content_html = content_html;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune modification fournie'
      });
    }

    const updatedNewsletter = await prisma.newsletters.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Newsletter mise à jour',
      newsletter: updatedNewsletter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message
    });
  }
});

// Envoyer une newsletter
router.post('/:id/send', checkPermission('CREATE_NEWSLETTERS'), [
  body('recipient_type').isIn(['all', 'active', 'subscribers']).withMessage('Type de destinataire invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { recipient_type } = req.body;

    // Vérifier que la newsletter existe
    const newsletter = await prisma.newsletters.findUnique({
      where: { id: parseInt(id) }
    });

    if (!newsletter) {
      return res.status(404).json({
        success: false,
        message: 'Newsletter introuvable'
      });
    }

    // Récupérer les destinataires selon le type avec leur email et nom
    let recipients = [];

    if (recipient_type === 'all') {
      recipients = await prisma.users.findMany({
        select: { id: true, email: true, name: true }
      });
    } else if (recipient_type === 'subscribers') {
      recipients = await prisma.users.findMany({
        where: { newsletter_subscribed: true },
        select: { id: true, email: true, name: true }
      });
    } else if (recipient_type === 'active') {
      // Utilisateurs ayant fait au moins une transaction
      const transactionUsers = await prisma.transactions.findMany({
        select: { user_id: true },
        distinct: ['user_id']
      });
      const userIds = transactionUsers.map(t => t.user_id);
      recipients = await prisma.users.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true }
      });
    }

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun destinataire trouvé pour ce type'
      });
    }

    // Insérer les destinataires dans newsletter_recipients
    await prisma.newsletter_recipients.createMany({
      data: recipients.map(recipient => ({
        newsletter_id: parseInt(id),
        user_id: recipient.id
      }))
    });

    // Mettre à jour le statut de la newsletter
    await prisma.newsletters.update({
      where: { id: parseInt(id) },
      data: {
        status: 'sent',
        sent_at: new Date()
      }
    });

    // Ajouter une entrée dans l'historique
    await prisma.newsletter_history.create({
      data: {
        newsletter_id: parseInt(id),
        recipient_type,
        recipient_count: recipients.length,
        sent_by: req.admin.id
      }
    });

    // Envoyer les emails en arrière-plan
    console.log(`📧 Envoi de ${recipients.length} newsletters en cours...`);
    let successCount = 0;
    let errorCount = 0;

    // Envoyer les emails un par un (TODO: utiliser une queue pour beaucoup de destinataires)
    for (const recipient of recipients) {
      try {
        // Vérifier que l'utilisateur a un email
        if (!recipient.email) {
          console.warn(`⚠️  Utilisateur ${recipient.name} (ID: ${recipient.id}) n'a pas d'email - ignoré`);
          errorCount++;
          continue;
        }

        await sendNewsletter(recipient.email, recipient.name, newsletter);

        // Mettre à jour sent_at pour ce destinataire
        await prisma.newsletter_recipients.updateMany({
          where: {
            newsletter_id: parseInt(id),
            user_id: recipient.id
          },
          data: {
            sent_at: new Date()
          }
        });

        successCount++;
      } catch (error) {
        console.error(`❌ Erreur envoi à ${recipient.email || 'email manquant'}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ ${successCount} newsletters envoyées, ${errorCount} erreurs`);

    res.json({
      success: true,
      message: `Newsletter envoyée à ${successCount}/${recipients.length} destinataires`,
      recipient_count: recipients.length,
      success_count: successCount,
      error_count: errorCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la newsletter',
      error: error.message
    });
  }
});

// Supprimer une newsletter
router.delete('/:id', checkPermission('CREATE_NEWSLETTERS'), async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que la newsletter existe
    const newsletter = await prisma.newsletters.findUnique({
      where: { id: parseInt(id) }
    });

    if (!newsletter) {
      return res.status(404).json({
        success: false,
        message: 'Newsletter introuvable'
      });
    }

    // Supprimer la newsletter (cascade supprimera les destinataires et l'historique)
    await prisma.newsletters.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Newsletter supprimée'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message
    });
  }
});

// Récupérer les statistiques des abonnés
router.get('/stats/subscribers', checkAnyPermission(['VIEW_NEWSLETTERS', 'MANAGE_NEWSLETTER_SUBSCRIBERS']), async (req, res) => {
  try {
    const totalUsers = await prisma.users.count();
    const subscribedUsers = await prisma.users.count({
      where: { newsletter_subscribed: true }
    });
    const withTransactions = await prisma.transactions.findMany({
      select: { user_id: true },
      distinct: ['user_id']
    });

    res.json({
      success: true,
      stats: {
        total_users: totalUsers,
        subscribed_users: subscribedUsers,
        unsubscribed_users: totalUsers - subscribedUsers,
        active_users: withTransactions.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// Récupérer la liste des abonnés
router.get('/subscribers/list', checkPermission('MANAGE_NEWSLETTER_SUBSCRIBERS'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const filter = req.query.filter || 'all'; // all, subscribed, unsubscribed

    const whereClause = {};

    if (filter === 'subscribed') {
      whereClause.newsletter_subscribed = true;
    } else if (filter === 'unsubscribed') {
      whereClause.newsletter_subscribed = false;
    }

    const users = await prisma.users.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        newsletter_subscribed: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    });

    const total = await prisma.users.count({
      where: whereClause
    });

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des abonnés',
      error: error.message
    });
  }
});

// Mettre à jour le statut d'abonnement d'un utilisateur
router.patch('/subscribers/:userId', checkPermission('MANAGE_NEWSLETTER_SUBSCRIBERS'), [
  body('newsletter_subscribed').isBoolean().withMessage('Le statut doit être un booléen')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { userId } = req.params;
    const { newsletter_subscribed } = req.body;

    // Vérifier que l'utilisateur existe
    const user = await prisma.users.findUnique({
      where: { id: parseInt(userId) },
      select: { id: true, name: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable'
      });
    }

    await prisma.users.update({
      where: { id: parseInt(userId) },
      data: { newsletter_subscribed }
    });

    res.json({
      success: true,
      message: `Statut d'abonnement mis à jour pour ${user.name}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message
    });
  }
});

module.exports = router;
