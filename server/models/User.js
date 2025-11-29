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
     * @param {string} type Transaction type (BET, REPAIR)
     * @returns {Promise<boolean>} true if successful
     */
    async withdraw(amount, type = 'BET') {
        // Optimistic check
        if (!this.hasBalance(amount)) return false;

        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1. Create Transaction Record
                await tx.transaction.create({
                    data: {
                        userId: this.id,
                        type: type,
                        amount: amount,
                        currency: 'USDT'
                    }
                });

                // 2. Atomic Decrement
                const updatedUser = await tx.user.update({
                    where: { id: this.id },
                    data: { balanceUSDT: { decrement: amount } }
                });

                // 3. Check Balance Integrity
                if (updatedUser.balanceUSDT < 0) {
                    throw new Error('INSUFFICIENT_FUNDS');
                }

                return updatedUser;
            });

            // Sync memory state
            this.balanceUSDT = result.balanceUSDT;
            return true;

        } catch (error) {
            if (error.message !== 'INSUFFICIENT_FUNDS') {
                console.error(`❌ [DB] Error withdrawing user ${this.id}:`, error);
            }
            // If failed (rollback), memory state remains valid (old balance)
            return false;
        }
    }

    /**
     * Add amount to balance
     * @param {number} amount 
     * @param {string} type Transaction type (WIN, REFUND)
     */
    async deposit(amount, type = 'WIN') {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1. Create Transaction Record
                await tx.transaction.create({
                    data: {
                        userId: this.id,
                        type: type,
                        amount: amount,
                        currency: 'USDT'
                    }
                });

                // 2. Atomic Increment
                return await tx.user.update({
                    where: { id: this.id },
                    data: { balanceUSDT: { increment: amount } }
                });
            });

            // Sync memory state
            this.balanceUSDT = result.balanceUSDT;
            return true;
        } catch (error) {
            console.error(`❌ [DB] Error depositing user ${this.id}:`, error);
            return false;
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
