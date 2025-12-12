const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET all email templates (Admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const templates = await prisma.email_templates.findMany({
      orderBy: { type: 'asc' }
    });

    return res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('[Email Templates] Error fetching templates:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des templates'
    });
  }
});

// GET single email template by ID (Admin only)
router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.email_templates.findUnique({
      where: { id: parseInt(id) }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template introuvable'
      });
    }

    return res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('[Email Templates] Error fetching template:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du template'
    });
  }
});

// GET template by type (Admin only)
router.get('/by-type/:type', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { type } = req.params;

    const template = await prisma.email_templates.findUnique({
      where: { type }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template introuvable'
      });
    }

    return res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('[Email Templates] Error fetching template by type:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du template'
    });
  }
});

// POST - Create new email template (Admin only)
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  [
    body('type').trim().notEmpty().withMessage('Le type est requis'),
    body('subject').trim().notEmpty().withMessage('Le sujet est requis'),
    body('html_body').trim().notEmpty().withMessage('Le contenu HTML est requis')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg
        });
      }

      const { type, subject, html_body, text_body, variables, description, is_active } = req.body;

      // Vérifier si le type existe déjà
      const existing = await prisma.email_templates.findUnique({
        where: { type }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Un template avec ce type existe déjà'
        });
      }

      const template = await prisma.email_templates.create({
        data: {
          type: type.trim(),
          subject: subject.trim(),
          html_body: html_body.trim(),
          text_body: text_body ? text_body.trim() : null,
          variables: variables ? variables.trim() : null,
          description: description ? description.trim() : null,
          is_active: is_active !== undefined ? is_active : true
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Template créé avec succès',
        data: template
      });
    } catch (error) {
      console.error('[Email Templates] Error creating template:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du template'
      });
    }
  }
);

// PUT - Update email template (Admin only)
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [
    body('subject').optional().trim().notEmpty().withMessage('Le sujet ne peut pas être vide'),
    body('html_body').optional().trim().notEmpty().withMessage('Le contenu HTML ne peut pas être vide')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg
        });
      }

      const { id } = req.params;
      const { subject, html_body, text_body, variables, description, is_active } = req.body;

      // Vérifier si le template existe
      const existing = await prisma.email_templates.findUnique({
        where: { id: parseInt(id) }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Template introuvable'
        });
      }

      // Préparer les données à mettre à jour
      const updateData = {
        updated_at: new Date()
      };

      if (subject !== undefined) updateData.subject = subject.trim();
      if (html_body !== undefined) updateData.html_body = html_body.trim();
      if (text_body !== undefined) updateData.text_body = text_body ? text_body.trim() : null;
      if (variables !== undefined) updateData.variables = variables ? variables.trim() : null;
      if (description !== undefined) updateData.description = description ? description.trim() : null;
      if (is_active !== undefined) updateData.is_active = is_active;

      const template = await prisma.email_templates.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      return res.json({
        success: true,
        message: 'Template mis à jour avec succès',
        data: template
      });
    } catch (error) {
      console.error('[Email Templates] Error updating template:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du template'
      });
    }
  }
);

// DELETE - Delete email template (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le template existe
    const existing = await prisma.email_templates.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Template introuvable'
      });
    }

    await prisma.email_templates.delete({
      where: { id: parseInt(id) }
    });

    return res.json({
      success: true,
      message: 'Template supprimé avec succès'
    });
  } catch (error) {
    console.error('[Email Templates] Error deleting template:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du template'
    });
  }
});

// POST - Test email template (Admin only)
router.post(
  '/:id/test',
  authMiddleware,
  adminMiddleware,
  [
    body('email').trim().isEmail().withMessage('Email invalide')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg
        });
      }

      const { id } = req.params;
      const { email, testData } = req.body;

      const template = await prisma.email_templates.findUnique({
        where: { id: parseInt(id) }
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template introuvable'
        });
      }

      // Importer le service d'email
      const emailService = require('../utils/emailService');

      // Données de test par défaut
      const defaultTestData = {
        user_name: 'Jean Dupont',
        transaction_id: 'TXN123456789',
        amount: '50,000',
        from_method: 'T-Money',
        to_method: 'Flooz',
        admin_message: 'Ceci est un email de test. Votre transaction a été traitée avec succès.',
        rejection_reason: 'Document illisible ou expiré',
        verified_date: new Date().toLocaleDateString('fr-FR')
      };

      const data = { ...defaultTestData, ...(testData || {}) };

      // Remplacer les variables dans le HTML
      let htmlContent = template.html_body;
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlContent = htmlContent.replace(regex, data[key]);
      });

      // Gérer les conditions {{#if variable}}...{{/if}}
      htmlContent = htmlContent.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
        return data[varName] ? content : '';
      });

      await emailService.sendEmail(
        email,
        `[TEST] ${template.subject}`,
        htmlContent
      );

      return res.json({
        success: true,
        message: 'Email de test envoyé avec succès'
      });
    } catch (error) {
      console.error('[Email Templates] Error sending test email:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'envoi de l\'email de test'
      });
    }
  }
);

module.exports = router;
