const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// CONFIGURATION

// Obtenir toutes les configurations
router.get('/config', adminMiddleware, async (req, res) => {
  try {
    const configs = await db.all('SELECT * FROM config ORDER BY key');
    
    res.json({
      success: true,
      configs
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des configurations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Obtenir une configuration publique (sans authentification)
router.get('/config/public/:key', async (req, res) => {
  try {
    const config = await db.get('SELECT * FROM config WHERE key = ?', [req.params.key]);
    
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        message: 'Configuration non trouvée' 
      });
    }

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Mettre à jour une configuration
router.put('/config/:key', adminMiddleware, [
  body('value').notEmpty().withMessage('La valeur est requise')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { value } = req.body;

    // Vérifier que la configuration existe
    const config = await db.get('SELECT * FROM config WHERE key = ?', [req.params.key]);
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        message: 'Configuration non trouvée' 
      });
    }

    // Mettre à jour
    await db.run(
      'UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      [value, req.params.key]
    );

    res.json({
      success: true,
      message: 'Configuration mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Créer une nouvelle configuration
router.post('/config', adminMiddleware, [
  body('key').trim().notEmpty().withMessage('La clé est requise'),
  body('value').notEmpty().withMessage('La valeur est requise'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { key, value, description } = req.body;

    // Vérifier que la clé n'existe pas déjà
    const existingConfig = await db.get('SELECT * FROM config WHERE key = ?', [key]);
    if (existingConfig) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cette clé de configuration existe déjà' 
      });
    }

    // Insérer
    await db.run(
      'INSERT INTO config (key, value, description) VALUES (?, ?, ?)',
      [key, value, description || null]
    );

    res.status(201).json({
      success: true,
      message: 'Configuration créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la configuration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// BOOKMAKERS

// Obtenir tous les bookmakers
router.get('/bookmakers', async (req, res) => {
  try {
    const { active_only } = req.query;
    
    let query = 'SELECT * FROM bookmakers';
    const params = [];

    if (active_only === 'true') {
      query += ' WHERE is_active = 1';
    }

    query += ' ORDER BY name';

    const bookmakers = await db.all(query, params);
    
    res.json({
      success: true,
      bookmakers
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des bookmakers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Créer un bookmaker
router.post('/bookmakers', adminMiddleware, [
  body('name').trim().notEmpty().withMessage('Le nom est requis'),
  body('code').trim().notEmpty().withMessage('Le code est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, code } = req.body;

    // Vérifier que le code n'existe pas déjà
    const existingBookmaker = await db.get('SELECT * FROM bookmakers WHERE code = ?', [code]);
    if (existingBookmaker) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ce code de bookmaker existe déjà' 
      });
    }

    // Insérer
    const result = await db.run(
      'INSERT INTO bookmakers (name, code) VALUES (?, ?)',
      [name, code.toUpperCase()]
    );

    res.status(201).json({
      success: true,
      message: 'Bookmaker créé avec succès',
      bookmaker: {
        id: result.id,
        name,
        code: code.toUpperCase()
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création du bookmaker:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Mettre à jour un bookmaker
router.put('/bookmakers/:id', adminMiddleware, [
  body('name').optional().trim().notEmpty().withMessage('Le nom ne peut pas être vide'),
  body('is_active').optional().isBoolean().withMessage('is_active doit être un booléen')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, is_active } = req.body;

    // Vérifier que le bookmaker existe
    const bookmaker = await db.get('SELECT * FROM bookmakers WHERE id = ?', [req.params.id]);
    if (!bookmaker) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bookmaker non trouvé' 
      });
    }

    // Construire la requête de mise à jour
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucune donnée à mettre à jour' 
      });
    }

    params.push(req.params.id);

    await db.run(
      `UPDATE bookmakers SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({
      success: true,
      message: 'Bookmaker mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du bookmaker:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Supprimer un bookmaker
router.delete('/bookmakers/:id', adminMiddleware, async (req, res) => {
  try {
    // Vérifier que le bookmaker existe
    const bookmaker = await db.get('SELECT * FROM bookmakers WHERE id = ?', [req.params.id]);
    if (!bookmaker) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bookmaker non trouvé' 
      });
    }

    // Vérifier qu'il n'est pas utilisé dans des transactions
    const transactionCount = await db.get(
      'SELECT COUNT(*) as count FROM transactions WHERE bookmaker_id = ?',
      [req.params.id]
    );

    if (transactionCount.count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Impossible de supprimer ce bookmaker car il est utilisé dans des transactions' 
      });
    }

    // Supprimer
    await db.run('DELETE FROM bookmakers WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Bookmaker supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du bookmaker:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

module.exports = router;
