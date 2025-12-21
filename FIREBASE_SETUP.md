# Configuration Firebase Cloud Messaging - Backend

## État actuel

✅ **Firebase Cloud Messaging est configuré en mode développement**

Les endpoints suivants sont disponibles:
- `POST /api/fcm/save-token` - Sauvegarder un token FCM
- `POST /api/fcm/delete-token` - Supprimer un token FCM
- `POST /api/fcm/test-notification` - Envoyer une notification de test

⚠️ **Pour envoyer de vraies notifications**, vous devez configurer le Service Account Key Firebase.

---

## Étape 1: Obtenir le Service Account Key

### 1. Accédez à Firebase Console

Allez sur [Firebase Console](https://console.firebase.google.com/)

### 2. Sélectionnez votre projet

Cliquez sur votre projet: **notificationpush-1354a**

### 3. Accédez aux Service Accounts

1. Cliquez sur l'icône ⚙️ **Project Settings**
2. Sélectionnez l'onglet **Service Accounts**

### 4. Générez la clé privée

1. Cliquez sur le bouton **Generate new private key**
2. Une fenêtre de confirmation s'ouvre
3. Cliquez sur **Generate key**
4. Un fichier JSON sera téléchargé automatiquement

### 5. Renommez et placez le fichier

```bash
# Le fichier téléchargé a un nom comme:
# notificationpush-1354a-firebase-adminsdk-xxxxx.json

# Renommez-le en:
mv ~/Downloads/notificationpush-1354a-*.json config/firebase-service-account.json

# Ou copiez-le directement:
cp ~/Downloads/notificationpush-1354a-*.json /path/to/backend/config/firebase-service-account.json
```

---

## Étape 2: Configurer le backend

### 1. Vérifiez que le fichier est bien placé

```bash
ls -lh config/firebase-service-account.json
```

Vous devriez voir un fichier d'environ 2-3 KB.

### 2. Modifiez `config/firebase-admin.js`

Ouvrez `config/firebase-admin.js` et remplacez le contenu par:

```javascript
const admin = require('firebase-admin');

// Charger le Service Account Key
const serviceAccount = require('./firebase-service-account.json');

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'notificationpush-1354a'
    });
    console.log('✅ Firebase Admin initialisé (mode production)');
  }
} catch (error) {
  console.error('❌ Erreur initialisation Firebase Admin:', error.message);
}

module.exports = admin;
```

### 3. Ajoutez le fichier dans `.gitignore`

**TRÈS IMPORTANT** - Ne JAMAIS commiter le Service Account Key!

```bash
# Ajoutez cette ligne dans .gitignore
echo "config/firebase-service-account.json" >> .gitignore
```

Vérifiez:
```bash
cat .gitignore | grep firebase-service-account
```

---

## Étape 3: Redémarrer le backend

### En développement local

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis redémarrez
npm start
# ou
node server.js
```

### En production avec PM2

```bash
pm2 restart emb-backend
pm2 logs emb-backend --lines 20
```

Vous devriez voir dans les logs:
```
✅ Firebase Admin initialisé (mode production)
```

---

## Étape 4: Tester les notifications

### Test depuis le frontend

1. Connectez-vous sur l'application (admin ou utilisateur)
2. Allez dans les paramètres de notifications
3. Cliquez sur **Activer**
4. Acceptez la permission du navigateur
5. Cliquez sur **Tester**
6. Vous devriez recevoir une notification!

### Test depuis l'API directement

```bash
# 1. Connectez-vous et obtenez un token JWT
TOKEN="votre_token_jwt"

# 2. Activez les notifications et obtenez un token FCM
FCM_TOKEN="votre_fcm_token"

# 3. Testez l'endpoint
curl -X POST http://localhost:5000/api/fcm/test-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"fcmToken\": \"$FCM_TOKEN\"}"
```

Réponse attendue:
```json
{
  "success": true,
  "message": "Notification de test envoyée avec succès",
  "messageId": "projects/notificationpush-1354a/messages/..."
}
```

---

## Utiliser les notifications dans votre code

### Envoyer une notification à un utilisateur

```javascript
const { sendNotificationToUser } = require('./routes/fcm');

// Dans n'importe quelle route
router.post('/api/transactions/:id/approve', async (req, res) => {
  // ... logique d'approbation ...

  // Notifier l'utilisateur
  await sendNotificationToUser(
    transaction.user_id,
    'Transaction approuvée ✅',
    `Votre transaction de ${transaction.amount} ${transaction.currency} a été approuvée`,
    {
      url: '/dashboard?tab=history',
      transactionId: transaction.id.toString(),
      type: 'transaction_approved'
    }
  );

  res.json({ success: true });
});
```

### Notifier tous les admins

```javascript
const { notifyAllAdmins } = require('./routes/fcm');

// Nouvelle transaction créée
router.post('/api/transactions', async (req, res) => {
  // ... créer la transaction ...

  // Notifier les admins
  await notifyAllAdmins(
    'Nouvelle transaction 🔔',
    `Transaction de ${transaction.amount} ${transaction.currency} par ${req.user.name}`,
    {
      url: '/admin/transactions',
      transactionId: transaction.id.toString(),
      type: 'new_transaction'
    }
  );

  res.json({ success: true, transaction });
});
```

---

## Dépannage

### Erreur: "Firebase Admin n'est pas initialisé"

**Cause:** Le Service Account Key n'est pas configuré

**Solution:** Suivez l'Étape 1 et 2 de ce guide

---

### Erreur: "ENOENT: no such file or directory"

**Cause:** Le fichier `firebase-service-account.json` n'existe pas

**Solution:**
```bash
ls config/firebase-service-account.json
# Si le fichier n'existe pas, téléchargez-le depuis Firebase Console
```

---

### Erreur: "Invalid token" ou "Token not registered"

**Cause:** Le token FCM est invalide ou expiré

**Solution:** Le token sera automatiquement supprimé de la base de données. L'utilisateur doit réactiver les notifications.

---

### Les notifications ne s'affichent pas

**Vérifications:**

1. Permission du navigateur accordée?
   ```javascript
   console.log('Permission:', Notification.permission);
   // Devrait être "granted"
   ```

2. Service Worker actif?
   ```javascript
   navigator.serviceWorker.getRegistrations().then(console.log);
   ```

3. Logs backend:
   ```bash
   pm2 logs emb-backend --lines 50
   # Cherchez les logs [FCM]
   ```

4. Token FCM valide?
   ```sql
   SELECT * FROM user_fcm_tokens WHERE user_id = 123;
   ```

---

## Sécurité

### ✅ Bonnes pratiques

- ✅ Service Account Key dans `.gitignore`
- ✅ Permissions backend (authMiddleware)
- ✅ Validation des tokens invalides
- ✅ Nettoyage automatique des tokens expirés

### ⚠️ À faire

- Implémenter un rate limiting sur les endpoints FCM
- Logger les envois de notifications (audit)
- Monitorer les quotas Firebase

---

## Limites Firebase

### Gratuit (Spark Plan)
- Messages illimités
- Pas de coût par message

### Blaze Plan (Pay as you go)
- Messages illimités
- Coût minimal

### Quotas
- 1 million de messages par jour (peut être augmenté)
- 1000 tokens par requête multicast

---

## Support

### Documentation officielle

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Admin SDK Node.js](https://firebase.google.com/docs/admin/setup)

### Logs utiles

Tous les logs Firebase sont préfixés par `[FCM]`:
```bash
pm2 logs emb-backend | grep FCM
```

---

## Récapitulatif

✅ **Fait:**
- Installation firebase-admin
- Création des endpoints API
- Configuration développement

📋 **À faire:**
1. Télécharger Service Account Key
2. Placer dans `config/firebase-service-account.json`
3. Modifier `config/firebase-admin.js`
4. Ajouter dans `.gitignore`
5. Redémarrer le serveur
6. Tester!

Une fois configuré, vous pourrez envoyer des notifications push Firebase à tous vos utilisateurs! 🚀
