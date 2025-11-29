import User from '../models/User.js';

class UserManager {
    constructor() {
        this.users = new Map(); // socketId -> User
    }

    /**
     * Create a new user session
     * @param {string} socketId 
     * @returns {User}
     */
    createUser(socketId) {
        // In a real app, we would fetch from DB using a token
        // For now, we create a new ephemeral user per socket connection
        const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
        const user = new User(userId, socketId);
        this.users.set(socketId, user);
        console.log(`👤 [USER MANAGER] User created: ${userId} (${socketId})`);
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
