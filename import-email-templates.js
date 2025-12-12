const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importTemplates() {
  try {
    console.log('📧 Début de l\'importation des templates d\'email...\n');

    // Lire le fichier JSON
    const templatesPath = path.join(__dirname, 'email-templates-examples.json');
    const templatesData = fs.readFileSync(templatesPath, 'utf8');
    const templates = JSON.parse(templatesData);

    console.log(`📋 ${templates.length} templates trouvés dans le fichier JSON\n`);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    // Importer chaque template
    for (const template of templates) {
      try {
        // Vérifier si le template existe déjà
        const existing = await prisma.email_templates.findFirst({
          where: { type: template.type }
        });

        if (existing) {
          // Mettre à jour le template existant
          await prisma.email_templates.update({
            where: { id: existing.id },
            data: {
              subject: template.subject,
              description: template.description,
              html_content: template.html_content,
              text_content: template.text_content,
              is_active: template.is_active
            }
          });
          console.log(`✅ Template "${template.type}" mis à jour`);
          updated++;
        } else {
          // Créer un nouveau template
          await prisma.email_templates.create({
            data: template
          });
          console.log(`✅ Template "${template.type}" créé`);
          imported++;
        }
      } catch (error) {
        console.error(`❌ Erreur pour le template "${template.type}":`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Résumé de l\'importation :');
    console.log(`   - Créés : ${imported}`);
    console.log(`   - Mis à jour : ${updated}`);
    console.log(`   - Erreurs : ${errors}`);
    console.log('='.repeat(50) + '\n');

    // Afficher tous les templates
    const allTemplates = await prisma.email_templates.findMany({
      orderBy: { type: 'asc' }
    });

    console.log('📋 Templates disponibles dans la base de données :');
    allTemplates.forEach(t => {
      console.log(`   - ${t.type}: "${t.subject}" ${t.is_active ? '(Actif)' : '(Inactif)'}`);
    });

    console.log('\n✅ Importation terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors de l\'importation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter l'import
importTemplates()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
