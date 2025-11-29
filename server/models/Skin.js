/**
 * Skin Model
 * Represents an NFT Skin with integrity mechanics.
 */
export default class Skin {
    constructor(id, type = 'PROTOCOL_DROID') {
        this.id = id;
        this.type = type;

        // Configuración base según tipo
        const config = this.getSkinConfig(type);

        this.name = config.name;
        this.maxIntegrity = config.maxIntegrity;
        this.currentIntegrity = config.maxIntegrity;
        this.repairCostBase = config.repairCostBase;
        this.isBurned = false;
    }

    getSkinConfig(type) {
        switch (type) {
            case 'CYBER_SAMURAI':
                return { name: 'Cyber Samurai', maxIntegrity: 100, repairCostBase: 10 };
            case 'NEON_PUNK':
                return { name: 'Neon Punk', maxIntegrity: 80, repairCostBase: 8 };
            case 'PROTOCOL_DROID':
            default:
                return { name: 'Protocol Droid', maxIntegrity: 999999, repairCostBase: 0 }; // Indestructible
        }
    }

    /**
     * Reduce integrity on loss
     * @param {number} amount 
     * @returns {boolean} true if skin burned (integrity <= 0)
     */
    takeDamage(amount = 10) {
        if (this.type === 'PROTOCOL_DROID') return false; // Droid no recibe daño

        this.currentIntegrity = Math.max(0, this.currentIntegrity - amount);

        if (this.currentIntegrity <= 0) {
            this.isBurned = true;
            return true;
        }
        return false;
    }

    /**
     * Repair skin integrity
     * @param {number} amount 
     */
    repair(amount) {
        if (this.isBurned) return false; // Cannot repair burned skin
        this.currentIntegrity = Math.min(this.maxIntegrity, this.currentIntegrity + amount);
        return true;
    }
}
