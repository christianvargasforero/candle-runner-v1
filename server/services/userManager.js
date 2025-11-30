import User from '../models/User.js';
import prisma from '../config/prisma.js';

class UserManager {
    constructor() {
        this.users = new Map(); // socketId -> User (Session Cache)
    }

    /**
     * Create or restore a user session based on wallet address
     * @param {string} socketId 
     * @param {string} walletAddress Wallet address from client
     * @returns {Promise<User>}
     */
    async createUser(socketId, walletAddress) {
        if (!walletAddress) {
            throw new Error('Wallet address is required');
        }

        let dbUser;

        // 🔍 BUSCAR USUARIO POR WALLET ADDRESS
        dbUser = await prisma.user.findUnique({
            where: { walletAddress },
            include: { skins: true }
        });

        let user;

        if (!dbUser) {
            // 🆕 CREAR NUEVO USUARIO CON WELCOME BONUS
            dbUser = await prisma.user.create({
                data: {
                    walletAddress: walletAddress,
                    balanceUSDT: 1000, // 🎁 Welcome Bonus
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
            console.log(`🎁 [DB] Nuevo usuario creado con Welcome Bonus: ${dbUser.id} (${walletAddress})`);

            // Instanciar User y persistir skins iniciales
            user = new User(dbUser.id, socketId);
            user.balanceUSDT = dbUser.balanceUSDT;
            user.balanceWICK = dbUser.balanceWICK;

            // Limpiar inventario mock
            user.inventory = [];

            // Poblar inventario real desde DB
            for (const dbSkin of dbUser.skins) {
                const skinModel = new (await import('../models/Skin.js')).default(dbSkin.id, dbSkin.type);
                skinModel.level = dbSkin.level;
                skinModel.currentIntegrity = dbSkin.integrity;
                skinModel.maxIntegrity = dbSkin.maxIntegrity;
                skinModel.isBurned = dbSkin.isBurned;
                skinModel.totalInvestment = dbSkin.totalInvestment;
                user.inventory.push(skinModel);
            }

            // Asignar skin activa (la primera, o la default)
            user.activeSkin = user.inventory.find(s => s.isDefault) || user.inventory[0];

        } else {
            // 🔄 USUARIO EXISTENTE - RESTAURAR SESIÓN
            console.log(`🔄 [DB] Usuario restaurado: ${dbUser.id} (${walletAddress})`);
            console.log(`💰 [DB] Saldo: $${dbUser.balanceUSDT} USDT, ${dbUser.balanceWICK} WICK`);

            // Instanciar User
            user = new User(dbUser.id, socketId);
            user.balanceUSDT = dbUser.balanceUSDT;
            user.balanceWICK = dbUser.balanceWICK;

            // Limpiar inventario mock
            user.inventory = [];

            // Poblar inventario real desde DB
            for (const dbSkin of dbUser.skins) {
                const skinModel = new (await import('../models/Skin.js')).default(dbSkin.id, dbSkin.type);
                skinModel.level = dbSkin.level;
                skinModel.currentIntegrity = dbSkin.integrity;
                skinModel.maxIntegrity = dbSkin.maxIntegrity;
                skinModel.isBurned = dbSkin.isBurned;
                skinModel.totalInvestment = dbSkin.totalInvestment;
                user.inventory.push(skinModel);
            }

            // Asignar skin activa (la primera no quemada, o la default, o la primera)
            user.activeSkin = user.inventory.find(s => !s.isBurned) || user.inventory.find(s => s.isDefault) || user.inventory[0];
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
