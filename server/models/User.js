import Skin from './Skin.js';
import prisma from '../config/prisma.js';
import { FREE_SKINS } from '../../shared/constants.js';

/**
 * User Model
 * Represents a connected user with their balances and state.
 */
export default class User {
    constructor(id, socketId) {
        this.id = id;
        this.socketId = socketId;

        // ⚠️ NO HARDCODEAR BALANCES - Se asignan desde DB en userManager.js
        this.balanceUSDT = 0; // Se sobrescribe con valor de DB
        this.balanceWICK = 0; // Se sobrescribe con valor de DB

        // 🎒 INVENTARIO DE SKINS
        this.inventory = [];

        // Crear todas las skins gratuitas disponibles
        FREE_SKINS.forEach(skinData => {
            const skin = new Skin(skinData.id, 'PROTOCOL_DROID');
            skin.name = skinData.name;
            skin.color = skinData.color;
            skin.userId = id;
            this.inventory.push(skin);
        });

        // Equipar una aleatoria por defecto
        this.activeSkin = this.inventory[Math.floor(Math.random() * this.inventory.length)];
    }

    /**
     * Equip a skin from inventory
     * @param {string} skinId 
     * @returns {boolean}
     */
    equipSkin(skinId) {
        const skin = this.inventory.find(s => s.id === skinId);
        if (skin) {
            this.activeSkin = skin;
            return true;
        }
        return false;
    }

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
     * Deduct amount from balance (multi-currency)
     * @param {number} amount 
     * @param {string} type Transaction type (BET, REPAIR)
     * @param {string} currency 'USDT' or 'WICK'
     * @returns {Promise<boolean>} true if successful
     */
    async withdraw(amount, type = 'BET', currency = 'USDT') {
        if (!this.hasBalance(amount, currency)) return false;
        try {
            const result = await prisma.$transaction(async (tx) => {
                await tx.transaction.create({
                    data: {
                        userId: this.id,
                        type: type,
                        amount: amount,
                        currency: currency
                    }
                });
                const data = currency === 'USDT'
                    ? { balanceUSDT: { decrement: amount } }
                    : { balanceWICK: { decrement: amount } };
                const updatedUser = await tx.user.update({
                    where: { id: this.id },
                    data
                });
                if ((currency === 'USDT' && updatedUser.balanceUSDT < 0) ||
                    (currency === 'WICK' && updatedUser.balanceWICK < 0)) {
                    throw new Error('INSUFFICIENT_FUNDS');
                }
                return updatedUser;
            });
            this.balanceUSDT = result.balanceUSDT;
            this.balanceWICK = result.balanceWICK;
            return true;
        } catch (error) {
            if (error.message !== 'INSUFFICIENT_FUNDS') {
                console.error(`\x1b[31m[DB] Error withdrawing user ${this.id}:`, error);
            }
            return false;
        }
    }

    /**
     * Add amount to balance (multi-currency)
     * @param {number} amount 
     * @param {string} type Transaction type (WIN, REFUND)
     * @param {string} currency 'USDT' or 'WICK'
     */
    async deposit(amount, type = 'WIN', currency = 'USDT') {
        try {
            const result = await prisma.$transaction(async (tx) => {
                await tx.transaction.create({
                    data: {
                        userId: this.id,
                        type: type,
                        amount: amount,
                        currency: currency
                    }
                });
                const data = currency === 'USDT'
                    ? { balanceUSDT: { increment: amount } }
                    : { balanceWICK: { increment: amount } };
                return await tx.user.update({
                    where: { id: this.id },
                    data
                });
            });
            this.balanceUSDT = result.balanceUSDT;
            this.balanceWICK = result.balanceWICK;
            return true;
        } catch (error) {
            console.error(`\x1b[31m[DB] Error depositing user ${this.id}:`, error);
            return false;
        }
    }
    // ...existing code...

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
