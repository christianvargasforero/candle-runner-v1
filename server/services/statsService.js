/**
 * STATS SERVICE - Centralized Metrics for Admin Dashboard
 */
class StatsService {
    constructor(gameLoop, roomManager) {
        this.gameLoop = gameLoop;
        this.roomManager = roomManager;
    }

    getGlobalStats() {
        const gameState = this.gameLoop.getState();
        const adminStats = this.gameLoop.getAdminStats(this.roomManager); // Reuse existing logic if possible

        return {
            onlineUsers: this.roomManager.getTotalPlayers(),
            activeRound: gameState.roundNumber,
            currentPhase: gameState.phase,
            totalPot: gameState.totalPool + (this.gameLoop.accumulatedPot || 0),
            houseFeeSession: this.gameLoop.stats ? this.gameLoop.stats.revenue : 0,

            // Extra data for UI
            timeLeft: adminStats.round.timeLeft,
            price: adminStats.round.currentPrice,
            bets: adminStats.round.bets
        };
    }
}

export default StatsService;
