const express = require('express');
const router = express.Router();
const path = require('path');
const prisma = require('../config/prisma');
const { authMiddleware: authenticateUser } = require('../middleware/auth');
const authenticateAdmin = require('../middleware/authAdmin');

// ========== ROUTES UTILISATEURS ==========

// GET /api/chat/conversation - Obtenir ou créer la conversation de l'utilisateur
router.get('/conversation', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Chercher une conversation existante
    let conversation = await prisma.chat_conversations.findFirst({
      where: { user_id: userId },
      orderBy: { last_message_at: 'desc' }
    });

    // Si pas de conversation ou conversation fermée, en créer une nouvelle
    if (!conversation || conversation.status === 'closed') {
      conversation = await prisma.chat_conversations.create({
        data: {
          user_id: userId,
          status: 'open'
        }
      });

      return res.json({
        success: true,
        data: {
          conversation,
          messages: []
        }
      });
    }

    // Récupérer les messages de la conversation existante
    const messages = await prisma.chat_messages.findMany({
      where: { conversation_id: conversation.id },
      orderBy: { created_at: 'asc' }
    });

    res.json({
      success: true,
      data: {
        conversation,
        messages
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la conversation'
    });
  }
});

// POST /api/chat/message - Envoyer un message
router.post('/message', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversation_id, message } = req.body;
    const conversationId = parseInt(conversation_id);

    if (!conversation_id || !message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'ID de conversation et message requis'
      });
    }

    // Vérifier que la conversation appartient à l'utilisateur
    const conversation = await prisma.chat_conversations.findFirst({
      where: {
        id: conversationId,
        user_id: userId
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Insérer le message
    const newMessage = await prisma.chat_messages.create({
      data: {
        conversation_id: conversationId,
        sender_type: 'user',
        sender_id: userId,
        message: message.trim()
      }
    });

    // Mettre à jour last_message_at de la conversation
    await prisma.chat_conversations.update({
      where: { id: conversationId },
      data: { last_message_at: new Date() }
    });

    res.status(201).json({
      success: true,
      message: 'Message envoyé',
      data: newMessage
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message'
    });
  }
});

// GET /api/chat/messages/:conversationId - Obtenir les messages d'une conversation
router.get('/messages/:conversationId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = parseInt(req.params.conversationId);

    // Vérifier que la conversation appartient à l'utilisateur
    const conversation = await prisma.chat_conversations.findFirst({
      where: {
        id: conversationId,
        user_id: userId
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Récupérer les messages
    const messages = await prisma.chat_messages.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' }
    });

    // Marquer les messages de l'admin comme lus
    await prisma.chat_messages.updateMany({
      where: {
        conversation_id: conversationId,
        sender_type: 'admin',
        is_read: 0
      },
      data: { is_read: 1 }
    });

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des messages'
    });
  }
});

// ========== ROUTES ADMIN ==========

// GET /api/chat/admin/conversations - Obtenir toutes les conversations
router.get('/admin/conversations', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    const whereClause = status ? { status } : {};

    const conversations = await prisma.chat_conversations.findMany({
      where: whereClause,
      include: {
        users: {
          select: {
            name: true,
            email: true
          }
        },
        chat_messages: {
          where: {
            sender_type: 'user',
            is_read: 0
          },
          select: { id: true }
        }
      },
      orderBy: { last_message_at: 'desc' }
    });

    // Formater les données pour correspondre au format attendu
    const formattedConversations = conversations.map(conv => ({
      ...conv,
      user_name: conv.users.name,
      user_email: conv.users.email,
      unread_count: conv.chat_messages.length,
      users: undefined,
      chat_messages: undefined
    }));

    res.json({
      success: true,
      data: {
        conversations: formattedConversations,
        count: formattedConversations.length
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des conversations'
    });
  }
});

// GET /api/chat/admin/conversation/:id - Obtenir une conversation spécifique
router.get('/admin/conversation/:id', authenticateAdmin, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    const conversation = await prisma.chat_conversations.findUnique({
      where: { id: conversationId },
      include: {
        users: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Récupérer les messages
    const messages = await prisma.chat_messages.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' }
    });

    res.json({
      success: true,
      data: {
        conversation: {
          ...conversation,
          user_name: conversation.users.name,
          user_email: conversation.users.email,
          user_phone: conversation.users.phone,
          users: undefined
        },
        messages
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la conversation'
    });
  }
});

// POST /api/chat/admin/message - L'admin envoie un message
router.post('/admin/message', authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { conversation_id, message } = req.body;
    const conversationId = parseInt(conversation_id);

    if (!conversation_id || !message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'ID de conversation et message requis'
      });
    }

    // Vérifier que la conversation existe
    const conversation = await prisma.chat_conversations.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Insérer le message
    const newMessage = await prisma.chat_messages.create({
      data: {
        conversation_id: conversationId,
        sender_type: 'admin',
        sender_id: adminId,
        message: message.trim()
      }
    });

    // Mettre à jour la conversation
    await prisma.chat_conversations.update({
      where: { id: conversationId },
      data: {
        last_message_at: new Date(),
        admin_id: adminId
      }
    });

    // Marquer les messages de l'utilisateur comme lus
    await prisma.chat_messages.updateMany({
      where: {
        conversation_id: conversationId,
        sender_type: 'user',
        is_read: 0
      },
      data: { is_read: 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Message envoyé',
      data: newMessage
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message'
    });
  }
});

// POST /api/chat/admin/close/:id - Fermer une conversation
router.post('/admin/close/:id', authenticateAdmin, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    const conversation = await prisma.chat_conversations.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    await prisma.chat_conversations.update({
      where: { id: conversationId },
      data: {
        status: 'closed',
        closed_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Conversation fermée'
    });
  } catch (error) {
    console.error('Erreur lors de la fermeture de la conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la fermeture de la conversation'
    });
  }
});

// POST /api/chat/admin/reopen/:id - Réouvrir une conversation
router.post('/admin/reopen/:id', authenticateAdmin, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    const conversation = await prisma.chat_conversations.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    await prisma.chat_conversations.update({
      where: { id: conversationId },
      data: {
        status: 'open',
        closed_at: null
      }
    });

    res.json({
      success: true,
      message: 'Conversation réouverte'
    });
  } catch (error) {
    console.error('Erreur lors de la réouverture de la conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réouverture de la conversation'
    });
  }
});

module.exports = router;
