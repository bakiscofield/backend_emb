const prisma = require('../config/prisma');
const { createNotification } = require('../routes/notifications');

/**
 * Récupérer le timeout configuré en minutes
 */
async function getTimeoutMinutes() {
  const config = await prisma.config.findUnique({
    where: { key: 'assignment_timeout_minutes' }
  });
  return config ? parseInt(config.value) : 5;
}

/**
 * Assigner une transaction à un admin éligible
 * @param {number} transactionId - ID de la transaction
 * @param {number|null} pointDeVenteId - ID du point de vente (null pour assignation en ligne)
 */
async function assignTransaction(transactionId, pointDeVenteId = null) {
  try {
    const timeoutMinutes = await getTimeoutMinutes();

    // Récupérer les admins qui ont déjà refusé ou eu un timeout pour cette transaction
    const previousAssignments = await prisma.transaction_assignments.findMany({
      where: {
        transaction_id: transactionId,
        status: { in: ['refused', 'expired'] }
      },
      select: { admin_id: true }
    });
    const excludedAdminIds = previousAssignments.map(a => a.admin_id);

    // Construire la requête pour trouver les admins éligibles
    let eligibleAdmins;

    if (pointDeVenteId) {
      // Cas point de vente : admins rattachés au PdV + actifs + VALIDATE_TRANSACTIONS
      eligibleAdmins = await prisma.admins.findMany({
        where: {
          is_active: true,
          id: { notIn: excludedAdminIds },
          admin_permissions: {
            some: {
              permissions: { code: 'VALIDATE_TRANSACTIONS' }
            }
          },
          admin_points_de_vente: {
            some: {
              point_de_vente_id: pointDeVenteId
            }
          }
        },
        select: { id: true, username: true }
      });
    } else {
      // Cas en ligne : tous les admins actifs + VALIDATE_TRANSACTIONS
      eligibleAdmins = await prisma.admins.findMany({
        where: {
          is_active: true,
          id: { notIn: excludedAdminIds },
          admin_permissions: {
            some: {
              permissions: { code: 'VALIDATE_TRANSACTIONS' }
            }
          }
        },
        select: { id: true, username: true }
      });
    }

    if (eligibleAdmins.length === 0) {
      // Aucun admin éligible → notifier les super-admins (ceux avec MANAGE_ADMINS)
      console.log(`⚠ Aucun admin éligible pour la transaction ${transactionId}`);

      const transaction = await prisma.transactions.findUnique({
        where: { id: transactionId },
        select: { transaction_id: true, amount: true }
      });

      // Notifier tous les admins avec MANAGE_ADMINS
      const superAdmins = await prisma.admins.findMany({
        where: {
          is_active: true,
          admin_permissions: {
            some: {
              permissions: { code: 'MANAGE_ADMINS' }
            }
          }
        },
        select: { id: true }
      });

      for (const superAdmin of superAdmins) {
        await createNotification({
          admin_id: superAdmin.id,
          type: 'assignment_failed',
          title: 'Assignation impossible',
          message: `La transaction ${transaction?.transaction_id || transactionId} (${transaction?.amount || 0} FCFA) n'a pu être assignée à aucun agent. Veuillez la traiter manuellement.`,
          transaction_id: transactionId
        });
      }

      // Mettre assigned_to à null
      await prisma.transactions.update({
        where: { id: transactionId },
        data: { assigned_to: null }
      });

      return null;
    }

    // Choisir aléatoirement un admin parmi les éligibles
    const randomIndex = Math.floor(Math.random() * eligibleAdmins.length);
    const selectedAdmin = eligibleAdmins[randomIndex];

    // Calculer la date d'expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + timeoutMinutes);

    // Créer l'enregistrement d'assignation
    await prisma.transaction_assignments.create({
      data: {
        transaction_id: transactionId,
        admin_id: selectedAdmin.id,
        status: 'pending',
        expires_at: expiresAt
      }
    });

    // Mettre à jour la transaction
    await prisma.transactions.update({
      where: { id: transactionId },
      data: { assigned_to: selectedAdmin.id }
    });

    // Récupérer les infos de la transaction pour la notification
    const transaction = await prisma.transactions.findUnique({
      where: { id: transactionId },
      include: {
        users: { select: { name: true } }
      }
    });

    // Envoyer notification à cet admin spécifique
    await createNotification({
      admin_id: selectedAdmin.id,
      type: 'new_transaction',
      title: 'Nouvelle transaction assignée',
      message: `La transaction de ${transaction?.users?.name || 'Un client'} (${transaction?.amount || 0} FCFA) vous a été assignée. Vous avez ${timeoutMinutes} minutes pour la traiter.`,
      transaction_id: transactionId
    });

    console.log(`✓ Transaction ${transactionId} assignée à l'admin ${selectedAdmin.username} (expire dans ${timeoutMinutes} min)`);

    return selectedAdmin;
  } catch (error) {
    console.error('Erreur lors de l\'assignation:', error);
    throw error;
  }
}

/**
 * Refuser une assignation et réassigner
 * @param {number} transactionId - ID de la transaction
 * @param {number} adminId - ID de l'admin qui refuse
 */
async function refuseAssignment(transactionId, adminId) {
  try {
    // Passer l'assignation courante en status=refused
    await prisma.transaction_assignments.updateMany({
      where: {
        transaction_id: transactionId,
        admin_id: adminId,
        status: 'pending'
      },
      data: {
        status: 'refused',
        responded_at: new Date()
      }
    });

    // Ajouter entrée dans l'historique de transaction
    await prisma.transaction_history.create({
      data: {
        transaction_id: transactionId,
        status: 'reassigned',
        comment: `Refusée par l'admin #${adminId}, réassignation en cours`,
        changed_by: adminId
      }
    });

    // Récupérer le point_de_vente_id de la transaction pour réassigner correctement
    const transaction = await prisma.transactions.findUnique({
      where: { id: transactionId },
      select: { point_de_vente_id: true }
    });

    // Réassigner
    return await assignTransaction(transactionId, transaction?.point_de_vente_id || null);
  } catch (error) {
    console.error('Erreur lors du refus d\'assignation:', error);
    throw error;
  }
}

/**
 * Vérifier et traiter les assignations expirées
 */
async function checkExpiredAssignments() {
  try {
    const now = new Date();

    // Chercher les assignations expirées (sans include pour éviter les erreurs de données orphelines)
    const expiredAssignments = await prisma.transaction_assignments.findMany({
      where: {
        status: 'pending',
        expires_at: { lt: now }
      }
    });

    // Enrichir avec les données de transaction séparément
    for (const assignment of expiredAssignments) {
      const tx = await prisma.transactions.findUnique({
        where: { id: assignment.transaction_id },
        select: { id: true, point_de_vente_id: true, status: true }
      });
      assignment.transactions = tx;
    }

    if (expiredAssignments.length === 0) return;

    console.log(`⏰ ${expiredAssignments.length} assignation(s) expirée(s) détectée(s)`);

    for (const assignment of expiredAssignments) {
      // Protection contre les données orphelines
      if (!assignment.transactions) {
        await prisma.transaction_assignments.update({
          where: { id: assignment.id },
          data: { status: 'expired', responded_at: now }
        });
        continue;
      }

      // Ne réassigner que les transactions encore en pending
      if (assignment.transactions.status !== 'pending') {
        await prisma.transaction_assignments.update({
          where: { id: assignment.id },
          data: { status: 'expired', responded_at: now }
        });
        continue;
      }

      // Marquer comme expiré
      await prisma.transaction_assignments.update({
        where: { id: assignment.id },
        data: { status: 'expired', responded_at: now }
      });

      // Ajouter à l'historique
      await prisma.transaction_history.create({
        data: {
          transaction_id: assignment.transaction_id,
          status: 'reassigned',
          comment: `Timeout de l'admin #${assignment.admin_id}, réassignation automatique`,
          changed_by: null
        }
      });

      // Réassigner
      await assignTransaction(
        assignment.transaction_id,
        assignment.transactions.point_de_vente_id
      );
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des assignations expirées:', error);
  }
}

module.exports = {
  assignTransaction,
  refuseAssignment,
  checkExpiredAssignments,
  getTimeoutMinutes
};
