const db = require('../config/database');

async function addUserPermissions() {
  try {
    console.log('🔧 Ajout des permissions de gestion des utilisateurs...');

    // Vérifier si les permissions existent déjà
    const existingPermission = await db.get(
      "SELECT * FROM permissions WHERE code = 'view_users'"
    );

    if (existingPermission) {
      console.log('✓ Permissions utilisateurs déjà présentes');
      return;
    }

    // Ajouter les nouvelles permissions
    await db.run(`
      INSERT INTO permissions (code, name, description, category) VALUES
      ('view_users', 'Voir les utilisateurs', 'Voir la liste des utilisateurs et leurs informations', 'Utilisateurs'),
      ('manage_users', 'Gérer les utilisateurs', 'Activer/désactiver des utilisateurs et gérer leurs abonnements', 'Utilisateurs')
    `);

    console.log('✓ Permissions utilisateurs ajoutées avec succès');

    // Donner ces permissions à tous les admins existants
    const admins = await db.all('SELECT id FROM admins');
    const permissions = await db.all("SELECT id FROM permissions WHERE code IN ('view_users', 'manage_users')");

    for (const admin of admins) {
      for (const permission of permissions) {
        try {
          await db.run(
            'INSERT OR IGNORE INTO admin_permissions (admin_id, permission_id) VALUES (?, ?)',
            [admin.id, permission.id]
          );
        } catch (error) {
          // Permission déjà attribuée, ignorer
        }
      }
    }

    console.log(`✓ Permissions attribuées à ${admins.length} administrateur(s)`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des permissions:', error);
  }
}

module.exports = addUserPermissions;
