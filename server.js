require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import des routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const transactionRoutes = require('./routes/transactions');
const settingsRoutes = require('./routes/settings');

// Initialiser la base de données
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger simple
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API EMB - Échange Tmoney vers Flooz',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      transactions: '/api/transactions',
      settings: '/api/settings'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/settings', settingsRoutes);

// Route 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Gestion des erreurs globale
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({
    success: false,
    message: 'Erreur serveur interne',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║         🚀 Serveur EMB démarré avec succès           ║
║                                                       ║
║  Port: ${PORT}                                          ║
║  Environnement: ${process.env.NODE_ENV || 'development'}                          ║
║  URL: http://localhost:${PORT}                        ║
║                                                       ║
║  Endpoints API:                                       ║
║  • Auth:         /api/auth                            ║
║  • Admin:        /api/admin                           ║
║  • Transactions: /api/transactions                    ║
║  • Settings:     /api/settings                        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await db.close();
  process.exit(0);
});

module.exports = app;
