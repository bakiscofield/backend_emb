const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'emb.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Démarrage de la migration - Permissions Chat, KYC, Templates, Codes Promo...\n');

db.serialize(() => {
  // 1. Insérer les nouvelles permissions
  console.log('📝 Insertion des nouvelles permissions...');
  const newPermissions = [
    // Chat
    ['VIEW_CHAT', 'Voir les conversations', 'Consulter les conversations du chat', 'CHAT'],
    ['MANAGE_CHAT', 'Gérer le chat', 'Répondre, fermer et réouvrir les conversations', 'CHAT'],

    // KYC
    ['VIEW_KYC', 'Voir les vérifications KYC', 'Consulter les documents KYC soumis', 'KYC'],
    ['MANAGE_KYC', 'Gérer les vérifications KYC', 'Approuver ou rejeter les documents KYC', 'KYC'],

    // Email Templates
    ['VIEW_EMAIL_TEMPLATES', 'Voir les templates d\'emails', 'Consulter les templates d\'emails', 'EMAIL_TEMPLATES'],
    ['MANAGE_EMAIL_TEMPLATES', 'Gérer les templates d\'emails', 'Créer, modifier et supprimer les templates d\'emails', 'EMAIL_TEMPLATES'],

    // Codes Promo
    ['VIEW_PROMO_CODES', 'Voir les codes promo', 'Consulter les codes promo et leur utilisation', 'PROMO_CODES'],
    ['MANAGE_PROMO_CODES', 'Gérer les codes promo', 'Créer, activer/désactiver et supprimer les codes promo', 'PROMO_CODES']
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO permissions (code, name, description, category)
    VALUES (?, ?, ?, ?)
  `);

  newPermissions.forEach(([code, name, description, category]) => {
    stmt.run(code, name, description, category);
  });

  stmt.finalize(() => {
    console.log(`✓ ${newPermissions.length} nouvelles permissions insérées`);
  });

  // 2. Donner les nouvelles permissions aux admins existants
  console.log('\n📝 Attribution des nouvelles permissions aux admins existants...');
  db.run(`
    INSERT OR IGNORE INTO admin_permissions (admin_id, permission_id)
    SELECT a.id, p.id
    FROM admins a
    CROSS JOIN permissions p
    WHERE p.code IN ('VIEW_CHAT', 'MANAGE_CHAT', 'VIEW_KYC', 'MANAGE_KYC', 'VIEW_EMAIL_TEMPLATES', 'MANAGE_EMAIL_TEMPLATES', 'VIEW_PROMO_CODES', 'MANAGE_PROMO_CODES')
  `, (err) => {
    if (err) {
      console.error('❌ Erreur lors de l\'attribution des permissions:', err.message);
    } else {
      console.log('✓ Nouvelles permissions attribuées aux admins existants');
    }
  });

  console.log('\n✅ Migration terminée avec succès!');
  console.log('\n📊 Résumé des modifications:');
  console.log('  - 2 permissions CHAT: VIEW_CHAT, MANAGE_CHAT');
  console.log('  - 2 permissions KYC: VIEW_KYC, MANAGE_KYC');
  console.log('  - 2 permissions EMAIL_TEMPLATES: VIEW_EMAIL_TEMPLATES, MANAGE_EMAIL_TEMPLATES');
  console.log('  - 2 permissions PROMO_CODES: VIEW_PROMO_CODES, MANAGE_PROMO_CODES');
});

// Fermer la connexion après un délai
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('❌ Erreur lors de la fermeture:', err.message);
    } else {
      console.log('\n✓ Connexion à la base de données fermée');
    }
  });
}, 2000);
