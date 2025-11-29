import { MAX_INTEGRITY_BASE } from '../../shared/constants.js';
import prisma from '../config/prisma.js';

/**
 * Skin Model
 * Represents an NFT Skin with integrity mechanics.
 */
export default class Skin {
    constructor(id, type = 'PROTOCOL_DROID') {
        this.id = id;
        this.type = type;
        this.userId = null; // Set by User

        // Configuración base según tipo
        const config = this.getSkinConfig(type);

        this.name = config.name;
        this.maxIntegrity = config.maxIntegrity;
        this.currentIntegrity = config.maxIntegrity;
        this.repairCostBase = config.repairCostBase;
        this.isBurned = false;

        // Tracking de inversión para seguro
        this.totalInvestment = 1000; // Valor base inicial
    }

    get isDefault() {
        return this.type === 'PROTOCOL_DROID';
    }

    getSkinConfig(type) {
        switch (type) {
            case 'CYBER_SAMURAI':
                return { name: 'Cyber Samurai', maxIntegrity: MAX_INTEGRITY_BASE, repairCostBase: 10 };
            case 'NEON_PUNK':
                return { name: 'Neon Punk', maxIntegrity: Math.floor(MAX_INTEGRITY_BASE * 0.8), repairCostBase: 8 };
            case 'PROTOCOL_DROID':
            default:
                return { name: 'Protocol Droid', maxIntegrity: 999999, repairCostBase: 0 }; // Indestructible
        }
    }

    /**
     * Reduce integrity on loss
     * @param {number} amount 
     * @returns {Promise<boolean>} true if skin burned (integrity <= 0)
     */
    async takeDamage(amount) {
        if (this.type === 'PROTOCOL_DROID') return false; // Droid no recibe daño

        this.currentIntegrity = Math.max(0, this.currentIntegrity - amount);
        let burned = false;

        if (this.currentIntegrity <= 0) {
            this.isBurned = true;
            burned = true;
        }

        // Persist
        try {
            await prisma.skin.update({
                where: { id: this.id },
                data: {
                    integrity: this.currentIntegrity,
                    isBurned: this.isBurned
                }
            });
        } catch (error) {
            console.error(`❌ [DB] Error updating skin ${this.id}:`, error);
        }

        return burned;
    }

    /**
     * Repair skin integrity
     * @param {number} amount 
     * @param {number} cost Cost in $WICK
     */
    async repair(amount, cost = 0) {
        if (this.isBurned) return false; // Cannot repair burned skin
        this.currentIntegrity = Math.min(this.maxIntegrity, this.currentIntegrity + amount);

        // Aumentar valor asegurado
        this.totalInvestment += cost;

        // Persist
        try {
            await prisma.skin.update({
                where: { id: this.id },
                data: {
                    integrity: this.currentIntegrity,
                    totalInvestment: this.totalInvestment
                }
            });
        } catch (error) {
            console.error(`❌ [DB] Error repairing skin ${this.id}:`, error);
        }

        return true;
    }
}
