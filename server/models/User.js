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
        this.balanceUSDT = 10000; // Demo balance (Testing)
        this.balanceWICK = 500;   // Demo WICK for repairs (Testing)

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
    /**
     * Check if user has enough balance
     * @param {number} amount 
     * @param {string} currency 'USDT' or 'WICK'
     * @returns {boolean}
     */
    hasBalance(amount, currency = 'USDT') {
        if (currency === 'WICK') return this.balanceWICK >= amount;
        return this.balanceUSDT >= amount;
    }

    /**
     * Deduct amount from balance
     * @param {number} amount 
     * @param {string} type Transaction type (BET, REPAIR)
     * @param {string} currency 'USDT' or 'WICK'
     * @returns {Promise<boolean>} true if successful
     */
    async withdraw(amount, type = 'BET', currency = 'USDT') {
        // Optimistic check
        if (!this.hasBalance(amount, currency)) return false;

        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1. Create Transaction Record
                await tx.transaction.create({
                    data: {
                        userId: this.id,
                        type: type,
                        amount: amount,
                        currency: currency
                    }
                });

                // 2. Atomic Decrement
                const updateData = currency === 'WICK'
                    ? { balanceWICK: { decrement: amount } }
                    : { balanceUSDT: { decrement: amount } };

                const updatedUser = await tx.user.update({
                    where: { id: this.id },
                    data: updateData
                });

                // 3. Check Balance Integrity
                const newBalance = currency === 'WICK' ? updatedUser.balanceWICK : updatedUser.balanceUSDT;
                if (newBalance < 0) {
                    throw new Error('INSUFFICIENT_FUNDS');
                }

                return updatedUser;
            });

            // Sync memory state
            this.balanceUSDT = result.balanceUSDT;
            this.balanceWICK = result.balanceWICK;
            return true;

        } catch (error) {
            if (error.message !== 'INSUFFICIENT_FUNDS') {
                console.error(`❌ [DB] Error withdrawing user ${this.id}:`, error);
            }
            return false;
        }
    }

    /**
     * Add amount to balance
     * @param {number} amount 
     * @param {string} type Transaction type (WIN, REFUND)
     * @param {string} currency 'USDT' or 'WICK'
     */
    async deposit(amount, type = 'WIN', currency = 'USDT') {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1. Create Transaction Record
                await tx.transaction.create({
                    data: {
                        userId: this.id,
                        type: type,
                        amount: amount,
                        currency: currency
                    }
                });

                // 2. Atomic Increment
                const updateData = currency === 'WICK'
                    ? { balanceWICK: { increment: amount } }
                    : { balanceUSDT: { increment: amount } };

                return await tx.user.update({
                    where: { id: this.id },
                    data: updateData
                });
            });

            // Sync memory state
            this.balanceUSDT = result.balanceUSDT;
            this.balanceWICK = result.balanceWICK;
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
