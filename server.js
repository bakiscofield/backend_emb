require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import des routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const transactionRoutes = require('./routes/transactions');
const settingsRoutes = require('./routes/settings');
const paymentMethodsRoutes = require('./routes/payment-methods');
const exchangePairsRoutes = require('./routes/exchange-pairs');
const notificationsRoutes = require('./routes/notifications');
const permissionsRoutes = require('./routes/permissions');
const newslettersRoutes = require('./routes/newsletters');
const usersRoutes = require('./routes/users');
const kycRoutes = require('./routes/kyc');
const chatRoutes = require('./routes/chat');
const pushRoutes = require('./routes/push');
const legalRoutes = require('./routes/legal');
const emailTemplatesRoutes = require('./routes/email-templates');
const { router: fcmRoutes } = require('./routes/fcm');
const promoCodesRoutes = require('./routes/promo-codes');
const pointsDeVenteRoutes = require('./routes/points-de-vente');

// Initialiser la base de données
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Logger simple
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API EMB - Échange de moyens de paiement digitaux',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      transactions: '/api/transactions',
      settings: '/api/settings',
      paymentMethods: '/api/payment-methods',
      exchangePairs: '/api/exchange-pairs',
      notifications: '/api/notifications',
      permissions: '/api/permissions',
      newsletters: '/api/newsletters',
      users: '/api/users',
      kyc: '/api/kyc',
      chat: '/api/chat',
      push: '/api/push',
      legal: '/api/legal',
      emailTemplates: '/api/email-templates',
      fcm: '/api/fcm',
      pointsDeVente: '/api/points-de-vente'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payment-methods', paymentMethodsRoutes);
app.use('/api/exchange-pairs', exchangePairsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/newsletters', newslettersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/email-templates', emailTemplatesRoutes);
app.use('/api/fcm', fcmRoutes);
app.use('/api/promo-codes', promoCodesRoutes);
app.use('/api/points-de-vente', pointsDeVenteRoutes);

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
║  • Auth:           /api/auth                          ║
║  • Admin:          /api/admin                         ║
║  • Transactions:   /api/transactions                  ║
║  • Settings:       /api/settings                      ║
║  • Payment Methods:/api/payment-methods               ║
║  • Exchange Pairs: /api/exchange-pairs                ║
║  • Notifications:  /api/notifications                 ║
║  • Promo Codes:    /api/promo-codes                   ║
║  • Points de vente:/api/points-de-vente               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);

  // Démarrer le scheduler d'assignations
  const { startScheduler } = require('./services/scheduler');
  startScheduler();
});

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await db.close();
  process.exit(0);
});

module.exports = app;
