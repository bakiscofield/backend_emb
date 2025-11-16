const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Connexion admin
router.post('/login', [
  body('username').notEmpty().withMessage('Le nom d\'utilisateur est requis'),
  body('password').notEmpty().withMessage('Le mot de passe est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, password } = req.body;

    // Trouver l'admin
    const admin = await db.get('SELECT * FROM admins WHERE username = ?', [username]);
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Identifiants incorrects' 
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Identifiants incorrects' 
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: admin.id, username: admin.username, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Connexion admin réussie',
      token,
      admin: { 
        id: admin.id, 
        username: admin.username, 
        email: admin.email 
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la connexion' 
    });
  }
});

// Créer un admin (protégé - nécessite d'être admin)
router.post('/create', adminMiddleware, [
  body('username').trim().notEmpty().withMessage('Le nom d\'utilisateur est requis'),
  body('password').isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères'),
  body('email').optional().isEmail().withMessage('Email invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, password, email } = req.body;

    // Vérifier si l'admin existe déjà
    const existingAdmin = await db.get('SELECT * FROM admins WHERE username = ?', [username]);
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ce nom d\'utilisateur existe déjà' 
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer l'admin
    const result = await db.run(
      'INSERT INTO admins (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email || null]
    );

    res.status(201).json({
      success: true,
      message: 'Administrateur créé avec succès',
      admin: { id: result.id, username, email }
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la création' 
    });
  }
});

// Obtenir le profil de l'admin connecté
router.get('/profile', adminMiddleware, async (req, res) => {
  try {
    const admin = await db.get(
      'SELECT id, username, email, created_at FROM admins WHERE id = ?',
      [req.admin.id]
    );

    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Administrateur non trouvé' 
      });
    }

    res.json({
      success: true,
      admin
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

module.exports = router;
