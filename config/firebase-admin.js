const admin = require('firebase-admin');

// Charger le Service Account Key
const serviceAccount = require('./firebase-service-account.json');

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'notificationpush-1354a'
    });
    console.log('✅ Firebase Admin initialisé (mode production avec Service Account Key)');
    console.log('🔥 Prêt à envoyer de vraies notifications push!');
  }
} catch (error) {
  console.error('❌ Erreur initialisation Firebase Admin:', error.message);
  console.error('💡 Vérifiez que firebase-service-account.json existe dans config/');
}

module.exports = admin;
