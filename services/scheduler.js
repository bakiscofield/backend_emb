const { checkExpiredAssignments } = require('./assignment');

let intervalId = null;
const CHECK_INTERVAL_MS = 30 * 1000; // 30 secondes

/**
 * Démarrer le scheduler de vérification des assignations expirées
 */
function startScheduler() {
  console.log('⏱ Scheduler d\'assignations démarré (vérification toutes les 30 secondes)');

  // Exécuter immédiatement au démarrage pour rattraper les expirations
  checkExpiredAssignments().catch(err => {
    console.error('Erreur lors de la vérification initiale des assignations:', err);
  });

  // Exécuter périodiquement
  intervalId = setInterval(() => {
    checkExpiredAssignments().catch(err => {
      console.error('Erreur lors de la vérification périodique des assignations:', err);
    });
  }, CHECK_INTERVAL_MS);
}

/**
 * Arrêter le scheduler
 */
function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('⏱ Scheduler d\'assignations arrêté');
  }
}

module.exports = { startScheduler, stopScheduler };
