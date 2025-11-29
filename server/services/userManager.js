import User from '../models/User.js';
import prisma from '../config/prisma.js';

class UserManager {
    constructor() {
        this.users = new Map(); // socketId -> User (Session Cache)
    }

    /**
     * Create or restore a user session
     * @param {string} socketId 
     * @param {string} [existingUserId] Optional ID to restore session
     * @returns {Promise<User>}
     */
    async createUser(socketId, existingUserId = null) {
        let dbUser;

        if (existingUserId) {
            dbUser = await prisma.user.findUnique({
                where: { id: existingUserId },
                include: { skins: true }
            });
        }

        if (!dbUser) {
            // Create new user in DB
            dbUser = await prisma.user.create({
                data: {
                    balanceUSDT: 1000,
                    balanceWICK: 0,
                    skins: {
                        create: {
                            type: 'PROTOCOL_DROID',
                            integrity: 100,
                            maxIntegrity: 100,
                            isBurned: false
                        }
                    }
                },
                include: { skins: true }
            });
            console.log(`👤 [DB] Nuevo usuario creado: ${dbUser.id}`);
        } else {
            console.log(`👤 [DB] Usuario recuperado: ${dbUser.id}`);
        }

        // Create User instance (Session)
        const user = new User(dbUser.id, socketId);

        // Sync state from DB
        user.balanceUSDT = dbUser.balanceUSDT;
        user.balanceWICK = dbUser.balanceWICK;

        // Load active skin (logic to pick active skin, for now pick first or default)
        const activeSkinData = dbUser.skins.find(s => !s.isBurned) || dbUser.skins[0];
        if (activeSkinData) {
            user.activeSkin.id = activeSkinData.id;
            user.activeSkin.type = activeSkinData.type;
            user.activeSkin.currentIntegrity = activeSkinData.integrity;
            user.activeSkin.maxIntegrity = activeSkinData.maxIntegrity;
            user.activeSkin.isBurned = activeSkinData.isBurned;
            user.activeSkin.totalInvestment = activeSkinData.totalInvestment;
        }

        this.users.set(socketId, user);
        return user;
    }

    /**
     * Get user by socket ID
     * @param {string} socketId 
     * @returns {User}
     */
    getUser(socketId) {
        return this.users.get(socketId);
    }

    /**
     * Remove user session
     * @param {string} socketId 
     */
    removeUser(socketId) {
        const user = this.users.get(socketId);
        if (user) {
            console.log(`👤 [USER MANAGER] User disconnected: ${user.id}`);
            this.users.delete(socketId);
        }
    }

    /**
     * Get total connected users
     */
    getUserCount() {
        return this.users.size;
    }
}

// Export singleton
export const userManager = new UserManager();
