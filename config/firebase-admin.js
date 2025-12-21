const admin = require('firebase-admin');

// Configuration Firebase sans Service Account Key (pour le développement)
// En production, utilisez le Service Account Key téléchargé depuis Firebase Console
const firebaseConfig = {
  projectId: 'notificationpush-1354a',
};

// Initialiser Firebase Admin SDK
// IMPORTANT: Pour la production, remplacez par:
// const serviceAccount = require('./firebase-service-account.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   projectId: 'notificationpush-1354a'
// });

try {
  if (!admin.apps.length) {
    // Mode développement: initialisation minimale
    // Cela permettra de tester la structure mais pas d'envoyer de vraies notifications
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
    console.log('✅ Firebase Admin initialisé (mode développement)');
    console.warn('⚠️  Pour envoyer des notifications réelles, ajoutez le Service Account Key');
  }
} catch (error) {
  console.error('❌ Erreur initialisation Firebase Admin:', error.message);
}

module.exports = admin;
