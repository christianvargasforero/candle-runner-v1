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

        // 🎒 INVENTARIO DE SKINS
        this.inventory = [];

        // Crear Protocol Droid (siempre disponible)
        // isDefault se calcula automáticamente en Skin.js basado en el tipo 'PROTOCOL_DROID'
        const protocolDroid = new Skin('default_droid', 'PROTOCOL_DROID');
        protocolDroid.userId = id;
        this.inventory.push(protocolDroid);

        // 🎨 DEMO: Crear 2 Skins NFT de prueba para el inventario
        const neonPunk = new Skin(`skin_${id}_1`, 'NEON_PUNK');
        neonPunk.userId = id;
        neonPunk.level = 1;
        neonPunk.currentIntegrity = 100;
        neonPunk.maxIntegrity = 100;
        neonPunk.totalInvestment = 300; // Demo value
        this.inventory.push(neonPunk);

        const cyberSamurai = new Skin(`skin_${id}_2`, 'CYBER_SAMURAI');
        cyberSamurai.userId = id;
        cyberSamurai.level = 0;
        cyberSamurai.currentIntegrity = 60; // Dañada para mostrar reparación
        cyberSamurai.maxIntegrity = 100;
        cyberSamurai.totalInvestment = 150;
        this.inventory.push(cyberSamurai);

        // Skin activa (por defecto Protocol Droid)
        this.activeSkin = this.inventory[0]; // El primer elemento es el Droid

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
                const field = currency === 'USDT' ? 'balanceUSDT' : 'balanceWICK';

                const updatedUser = await tx.user.update({
                    where: { id: this.id },
                    data: { [field]: { decrement: amount } }
                });

                // 3. Check Balance Integrity
                if (updatedUser[field] < 0) {
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
                const field = currency === 'USDT' ? 'balanceUSDT' : 'balanceWICK';

                return await tx.user.update({
                    where: { id: this.id },
                    data: { [field]: { increment: amount } }
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
                id: this.activeSkin.id,
                type: this.activeSkin.type,
                name: this.activeSkin.name,
                level: this.activeSkin.level || 0,
                integrity: this.activeSkin.currentIntegrity,
                maxIntegrity: this.activeSkin.maxIntegrity,
                isBurned: this.activeSkin.isBurned,
                isDefault: this.activeSkin.isDefault || false
            },
            // 🎒 Inventario completo
            inventory: this.inventory.map(skin => ({
                id: skin.id,
                type: skin.type,
                name: skin.name,
                level: skin.level || 0,
                integrity: skin.currentIntegrity,
                maxIntegrity: skin.maxIntegrity,
                isBurned: skin.isBurned,
                isDefault: skin.isDefault || false,
                isActive: skin.id === this.activeSkin.id // Marcar cual está equipada
            }))
        };
    }
}
