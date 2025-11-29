/**
 * User Model
 * Represents a connected user with their balances and state.
 */
export default class User {
    constructor(id, socketId) {
        this.id = id;
        this.socketId = socketId;
        this.balanceUSDT = 1000; // Demo balance
        this.balanceWICK = 0;
        this.activeSkinId = 'protocol_droid';
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
     * @returns {boolean} true if successful
     */
    withdraw(amount) {
        if (!this.hasBalance(amount)) return false;
        this.balanceUSDT -= amount;
        return true;
    }

    /**
     * Add amount to balance
     * @param {number} amount 
     */
    deposit(amount) {
        this.balanceUSDT += amount;
    }

    /**
     * Get public profile data
     */
    getProfile() {
        return {
            id: this.id,
            balanceUSDT: this.balanceUSDT,
            activeSkinId: this.activeSkinId
        };
    }
}
