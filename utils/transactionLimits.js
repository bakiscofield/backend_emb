const prisma = require('../config/prisma');

/**
 * Calcule le total des montants échangés par un utilisateur durant le mois en cours
 * @param {number} userId - L'ID de l'utilisateur
 * @returns {Promise<number>} - Le montant total échangé ce mois
 */
async function getMonthlyTransactionTotal(userId) {
  try {
    // Obtenir le premier et le dernier jour du mois en cours
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Calculer la somme des montants des transactions validées du mois en cours
    const result = await prisma.transactions.aggregate({
      where: {
        user_id: userId,
        status: 'validated',
        created_at: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth
        }
      },
      _sum: {
        amount: true
      }
    });

    return result._sum.amount || 0;
  } catch (error) {
    console.error('Erreur lors du calcul du total mensuel:', error);
    throw error;
  }
}

/**
 * Vérifie si un utilisateur peut effectuer une transaction selon sa limite mensuelle
 * @param {number} userId - L'ID de l'utilisateur
 * @param {number} amount - Le montant de la transaction à effectuer
 * @returns {Promise<{allowed: boolean, message?: string, currentTotal?: number, limit?: number}>}
 */
async function checkMonthlyLimit(userId, amount) {
  try {
    // Récupérer les informations de l'utilisateur
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        kyc_verified: true,
        kyc_status: true
      }
    });

    if (!user) {
      return {
        allowed: false,
        message: 'Utilisateur introuvable'
      };
    }

    // Déterminer la clé de configuration selon le statut KYC
    const hasKyc = user.kyc_verified === 1 && user.kyc_status === 'verified';
    const configKey = hasKyc ? 'monthly_limit_with_kyc' : 'monthly_limit_without_kyc';

    // Récupérer la limite mensuelle depuis la configuration
    const limitConfig = await prisma.config.findUnique({
      where: { key: configKey }
    });

    if (!limitConfig) {
      // Si la configuration n'existe pas, autoriser par défaut (pas de limite)
      console.warn(`Configuration ${configKey} non trouvée`);
      return {
        allowed: true
      };
    }

    const monthlyLimit = parseFloat(limitConfig.value);

    // Calculer le total des transactions du mois en cours
    const currentMonthTotal = await getMonthlyTransactionTotal(userId);

    // Vérifier si l'ajout de ce montant dépasserait la limite
    const newTotal = currentMonthTotal + amount;

    if (newTotal > monthlyLimit) {
      const userType = hasKyc ? 'avec KYC validé' : 'sans KYC';
      return {
        allowed: false,
        message: `Limite mensuelle dépassée. Vous avez déjà échangé ${currentMonthTotal} FCFA ce mois. La limite mensuelle pour les utilisateurs ${userType} est de ${monthlyLimit} FCFA.`,
        currentTotal: currentMonthTotal,
        limit: monthlyLimit
      };
    }

    return {
      allowed: true,
      currentTotal: currentMonthTotal,
      limit: monthlyLimit,
      remaining: monthlyLimit - newTotal
    };
  } catch (error) {
    console.error('Erreur lors de la vérification de la limite mensuelle:', error);
    throw error;
  }
}

/**
 * Récupère les statistiques de limite mensuelle pour un utilisateur
 * @param {number} userId - L'ID de l'utilisateur
 * @returns {Promise<{currentTotal: number, limit: number, remaining: number, hasKyc: boolean}>}
 */
async function getMonthlyLimitStats(userId) {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        kyc_verified: true,
        kyc_status: true
      }
    });

    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const hasKyc = user.kyc_verified === 1 && user.kyc_status === 'verified';

    // Déterminer la clé de configuration selon le statut KYC
    const configKey = hasKyc ? 'monthly_limit_with_kyc' : 'monthly_limit_without_kyc';

    // Récupérer la limite mensuelle
    const limitConfig = await prisma.config.findUnique({
      where: { key: configKey }
    });

    const monthlyLimit = limitConfig ? parseFloat(limitConfig.value) : 0;
    const currentTotal = await getMonthlyTransactionTotal(userId);
    const remaining = Math.max(0, monthlyLimit - currentTotal);

    return {
      currentTotal,
      limit: monthlyLimit,
      remaining,
      hasKyc
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de limite:', error);
    throw error;
  }
}

module.exports = {
  getMonthlyTransactionTotal,
  checkMonthlyLimit,
  getMonthlyLimitStats
};
