import Skin from './Skin.js';
import prisma from '../config/prisma.js';

/**
 * User Model
 * Represents a connected user with their balances and state.
 */
export default class User {
    constructor(id, socketId) {
        this.id = id;
        this.socketId = socketId;
        this.balanceUSDT = 1000; // Demo balance
        this.balanceWICK = 100;  // Demo WICK for repairs

        // Skin activa (por defecto Protocol Droid)
        this.activeSkin = new Skin('default_droid', 'PROTOCOL_DROID');
        this.activeSkin.userId = id; // Link skin to user for persistence

        this.createdAt = Date.now();
    }

    /**
     * Check if user has enough balance
     * @param {number} amount 
     * @returns {boolean}
     */
    hasBalance(amount) {
        return this.balanceUSDT >= amount;
    }

    /**
     * Deduct amount from balance
     * @param {number} amount 
     * @returns {Promise<boolean>} true if successful
     */
    async withdraw(amount) {
        if (!this.hasBalance(amount)) return false;

        this.balanceUSDT -= amount;

        // Persist to DB
        try {
            await prisma.user.update({
                where: { id: this.id },
                data: { balanceUSDT: this.balanceUSDT }
            });
            return true;
        } catch (error) {
            console.error(`❌ [DB] Error withdrawing user ${this.id}:`, error);
            // Rollback memory state if DB fails? For now, assume critical failure.
            this.balanceUSDT += amount;
            return false;
        }
    }

    /**
     * Add amount to balance
     * @param {number} amount 
     */
    async deposit(amount) {
        this.balanceUSDT += amount;

        try {
            await prisma.user.update({
                where: { id: this.id },
                data: { balanceUSDT: this.balanceUSDT }
            });
        } catch (error) {
            console.error(`❌ [DB] Error depositing user ${this.id}:`, error);
        }
    }

    /**
     * Get public profile data
     */
    getProfile() {
        return {
            id: this.id,
            balanceUSDT: this.balanceUSDT,
            balanceWICK: this.balanceWICK,
            activeSkin: {
                type: this.activeSkin.type,
                name: this.activeSkin.name,
                integrity: this.activeSkin.currentIntegrity,
                maxIntegrity: this.activeSkin.maxIntegrity,
                isBurned: this.activeSkin.isBurned
            }
        };
    }
}
