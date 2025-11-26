const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const prisma = require('../config/prisma');
const { authMiddleware: authenticateUser } = require('../middleware/auth');
const authenticateAdmin = require('../middleware/authAdmin');

const UPLOAD_DIR = path.join(__dirname, '../uploads/kyc');

// Configuration multer pour l'upload des documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers JPEG, PNG et PDF sont acceptés'));
    }
  }
});

// ========== ROUTES UTILISATEURS ==========

// POST /api/kyc/submit - Soumettre les documents KYC
router.post('/submit', authenticateUser, upload.fields([
  { name: 'document_front', maxCount: 1 },
  { name: 'document_back', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.id;
    const { document_type } = req.body;

    if (!document_type || !req.files['document_front']) {
      return res.status(400).json({
        success: false,
        message: 'Type de document et image recto requis'
      });
    }

    const frontPath = req.files['document_front'][0].filename;
    const backPath = req.files['document_back'] ? req.files['document_back'][0].filename : null;

    // Vérifier si l'utilisateur a déjà un document en attente
    const existingDoc = await prisma.kyc_documents.findFirst({
      where: {
        user_id: userId,
        status: 'pending'
      }
    });

    if (existingDoc) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà une demande de vérification en cours'
      });
    }

    // Insérer le nouveau document
    const newDoc = await prisma.kyc_documents.create({
      data: {
        user_id: userId,
        document_type,
        document_front: frontPath,
        document_back: backPath,
        status: 'pending'
      }
    });

    // Mettre à jour le statut KYC de l'utilisateur
    await prisma.users.update({
      where: { id: userId },
      data: { kyc_status: 'pending' }
    });

    res.status(201).json({
      success: true,
      message: 'Documents soumis avec succès. Votre demande sera examinée sous peu.',
      data: {
        id: newDoc.id,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Erreur lors de la soumission KYC:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement'
    });
  }
});

// GET /api/kyc/status - Obtenir le statut KYC de l'utilisateur
router.get('/status', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        kyc_verified: true,
        kyc_status: true,
        kyc_documents: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            id: true,
            document_type: true,
            status: true,
            rejection_reason: true,
            verified_at: true,
            created_at: true
          }
        }
      }
    });

    const latestDoc = user.kyc_documents[0] || null;

    res.json({
      success: true,
      data: {
        kyc_verified: user.kyc_verified,
        kyc_status: user.kyc_status || 'not_submitted',
        document: latestDoc ? {
          id: latestDoc.id,
          type: latestDoc.document_type,
          status: latestDoc.status,
          rejection_reason: latestDoc.rejection_reason,
          verified_at: latestDoc.verified_at,
          submitted_at: latestDoc.created_at
        } : null
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du statut KYC:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut'
    });
  }
});

// ========== ROUTES ADMIN ==========

// GET /api/kyc/admin/pending - Obtenir tous les documents en attente
router.get('/admin/pending', authenticateAdmin, async (req, res) => {
  try {
    const documents = await prisma.kyc_documents.findMany({
      where: { status: 'pending' },
      include: {
        users: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Reformater les données pour correspondre au format attendu
    const formattedDocs = documents.map(doc => ({
      ...doc,
      user_name: doc.users.name,
      user_email: doc.users.email,
      user_phone: doc.users.phone,
      users: undefined
    }));

    res.json({
      success: true,
      data: {
        documents: formattedDocs,
        count: formattedDocs.length
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents'
    });
  }
});

// GET /api/kyc/admin/all - Obtenir tous les documents (avec filtres)
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    const whereClause = status ? { status } : {};

    const documents = await prisma.kyc_documents.findMany({
      where: whereClause,
      include: {
        users: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        admins: {
          select: {
            username: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Reformater les données pour correspondre au format attendu
    const formattedDocs = documents.map(doc => ({
      ...doc,
      user_name: doc.users.name,
      user_email: doc.users.email,
      user_phone: doc.users.phone,
      verified_by_name: doc.admins?.username || null,
      users: undefined,
      admins: undefined
    }));

    res.json({
      success: true,
      data: {
        documents: formattedDocs,
        count: formattedDocs.length
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents'
    });
  }
});

// POST /api/kyc/admin/verify/:id - Vérifier/Approuver un document
router.post('/admin/verify/:id', authenticateAdmin, async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const adminId = req.admin.id;

    // Récupérer le document
    const doc = await prisma.kyc_documents.findUnique({
      where: { id: docId }
    });

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Mettre à jour le document
    await prisma.kyc_documents.update({
      where: { id: docId },
      data: {
        status: 'approved',
        verified_by: adminId,
        verified_at: new Date()
      }
    });

    // Mettre à jour l'utilisateur
    await prisma.users.update({
      where: { id: doc.user_id },
      data: {
        kyc_verified: 1,
        kyc_status: 'approved'
      }
    });

    res.json({
      success: true,
      message: 'Document vérifié et approuvé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification'
    });
  }
});

// POST /api/kyc/admin/reject/:id - Rejeter un document
router.post('/admin/reject/:id', authenticateAdmin, async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const adminId = req.admin.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Raison du rejet requise'
      });
    }

    // Récupérer le document
    const doc = await prisma.kyc_documents.findUnique({
      where: { id: docId }
    });

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Mettre à jour le document
    await prisma.kyc_documents.update({
      where: { id: docId },
      data: {
        status: 'rejected',
        verified_by: adminId,
        verified_at: new Date(),
        rejection_reason: reason
      }
    });

    // Mettre à jour l'utilisateur
    await prisma.users.update({
      where: { id: doc.user_id },
      data: {
        kyc_verified: 0,
        kyc_status: 'rejected'
      }
    });

    res.json({
      success: true,
      message: 'Document rejeté'
    });
  } catch (error) {
    console.error('Erreur lors du rejet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du rejet'
    });
  }
});

// GET /api/kyc/document/:filename - Servir les documents (sécurisé)
router.get('/document/:filename', authenticateAdmin, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOAD_DIR, filename);

  // Vérifier si le fichier existe
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'Document non trouvé'
    });
  }

  res.sendFile(filePath);
});

module.exports = router;
