const webpush = require('web-push');

console.log('Génération de nouvelles clés VAPID...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('=== NOUVELLES CLÉS VAPID ===\n');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('\n=== Copiez ces valeurs dans votre fichier .env ===');
