# 🔧 EMB Backend

Backend API pour l'application EMB (Échange Tmoney vers Flooz)

## 🚀 Technologies

- Node.js + Express
- SQLite3
- JWT Authentication
- bcryptjs

## 📦 Installation

```bash
npm install
```

## 🔐 Configuration

1. Copiez `.env.example` vers `.env`
2. Modifiez les variables d'environnement :

```env
PORT=5000
JWT_SECRET=votre_secret_securise
NODE_ENV=production
FRONTEND_URL=https://votre-frontend-url.com
```

## 🗄️ Base de données

Initialiser la base de données :

```bash
npm run init-db
```

## ▶️ Démarrage

### Développement
```bash
npm run dev
```

### Production
```bash
npm start
```

## 📡 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/admin/login` - Connexion admin

### Transactions
- `POST /api/transactions` - Créer une transaction
- `GET /api/transactions/user/:userId` - Transactions d'un utilisateur
- `GET /api/transactions` - Toutes les transactions (admin)
- `PUT /api/transactions/:id/validate` - Valider (admin)
- `PUT /api/transactions/:id/reject` - Rejeter (admin)

### Paramètres
- `GET /api/settings/commission` - Obtenir le taux de commission
- `PUT /api/settings/commission` - Modifier le taux (admin)

### Bookmakers
- `GET /api/bookmakers` - Liste des bookmakers

## 🔒 Sécurité

- Mots de passe hashés avec bcrypt
- Authentification JWT
- Validation des données
- Protection CORS

## 📝 License

MIT
