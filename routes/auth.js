const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Inscription d'un utilisateur
router.post('/register', [
  body('phone').isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  body('name').trim().notEmpty().withMessage('Le nom est requis'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, name, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.get('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ce numéro de téléphone est déjà enregistré' 
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer l'utilisateur
    const result = await db.run(
      'INSERT INTO users (phone, name, email, password) VALUES (?, ?, ?, ?)',
      [phone, name, email || null, hashedPassword]
    );

    // Générer le token JWT
    const token = jwt.sign(
      { id: result.id, phone, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      token,
      user: { id: result.id, phone, name, email }
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de l\'inscription' 
    });
  }
});

// Connexion d'un utilisateur
router.post('/login', [
  body('phone').isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  body('password').notEmpty().withMessage('Le mot de passe est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, password } = req.body;

    // Trouver l'utilisateur
    const user = await db.get('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Identifiants incorrects' 
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Identifiants incorrects' 
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, phone: user.phone, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: { 
        id: user.id, 
        phone: user.phone, 
        name: user.name, 
        email: user.email 
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la connexion' 
    });
  }
});

// Obtenir le profil de l'utilisateur connecté
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, phone, name, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

module.exports = router;
