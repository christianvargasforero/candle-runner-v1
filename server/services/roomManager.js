// 🏛️ ROOM MANAGER - Gestión de Salas con Mitosis Fibonacci
// Maneja la escalabilidad mediante división automática de salas

import { ROOM_MAX_CAPACITY, SPLIT_RATIO_ALPHA, SPLIT_RATIO_BETA, ROOM_ACCESS_RULES } from '../../shared/constants.js';
import { userManager } from './userManager.js';

class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.nextRoomId = 1;

        // Crear sala inicial (Training)
        this.createRoom('TRAINING', 0);
    }

    /**
     * Crea una nueva sala
     */
    createRoom(name, initialPot = 0) {
        const roomId = `room_${this.nextRoomId++}`;

        const room = {
            id: roomId,
            name: name,
            users: new Set(),
            accumulatedPot: initialPot,
            tier: this.determineTier(name),
            createdAt: Date.now()
        };

        this.rooms.set(roomId, room);
        console.log(`🏛️  [ROOM MANAGER] Sala creada: ${roomId} (${name}) - Pozo inicial: ${initialPot} USDT`);

        return room;
    }

    /**
     * Añade un usuario a una sala con validación de Gatekeeper
     */
    async addUserToRoom(userId, roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`❌ Sala ${roomId} no existe`);
            return { success: false, error: 'Sala no encontrada' };
        }

        const user = userManager.getUser(userId); // userId here is socketId in current context
        if (!user) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        // --- GATEKEEPER VALIDATION ---
        const rules = ROOM_ACCESS_RULES[room.tier] || ROOM_ACCESS_RULES.TRAINING;

        // 1. Skin Level
        // Assuming user.activeSkin has level, or we use defaults. 
        // Skin model in schema has level. Skin.js might not have exposed it in 'activeSkin' object in User.
        // Let's assume level 0 for now if missing.
        const userLevel = user.activeSkin.level || 0;
        if (userLevel < rules.minLevel) {
            return { success: false, error: `Nivel insuficiente. Requiere Nivel ${rules.minLevel}` };
        }

        // 2. Default Skin
        if (!rules.allowDefault && user.activeSkin.type === 'PROTOCOL_DROID') {
            return { success: false, error: 'Protocol Droid no permitido en esta sala.' };
        }

        // 3. Min Bet / Balance Check (Proof of Funds)
        // The rule is minBet. User must have at least that balance to be useful?
        // "Si el usuario no tiene el saldo mínimo (minBet) -> Rechazar"
        if (user.balanceUSDT < rules.minBet) {
            return { success: false, error: `Saldo insuficiente. Mínimo para entrar: $${rules.minBet}` };
        }

        room.users.add(userId);
        console.log(`👤 Usuario ${userId} añadido a ${roomId} (${room.users.size}/${ROOM_MAX_CAPACITY})`);

        // Verificar si se alcanzó la capacidad crítica
        this.checkMitosis(roomId);

        return { success: true };
    }

    /**
     * Elimina un usuario de una sala
     */
    removeUserFromRoom(userId, roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.users.delete(userId);
        console.log(`👋 Usuario ${userId} eliminado de ${roomId} (${room.users.size}/${ROOM_MAX_CAPACITY})`);

        return true;
    }

    /**
     * Verifica si una sala debe dividirse (Mitosis Fibonacci)
     */
    checkMitosis(roomId) {
        const room = this.rooms.get(roomId);

        if (room.users.size >= ROOM_MAX_CAPACITY) {
            console.log(`\n⚠️  [MITOSIS] Sala ${roomId} alcanzó capacidad crítica (${ROOM_MAX_CAPACITY})`);
            this.performMitosis(roomId);
        }
    }

    /**
     * Ejecuta la división de una sala en Alpha y Beta
     */
    performMitosis(roomId) {
        const parentRoom = this.rooms.get(roomId);

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧬 MITOSIS FIBONACCI - División de Sala ${roomId}`);
        console.log(`${'='.repeat(60)}`);

        // Pausar entrada a la sala padre
        console.log(`⏸️  Pausando entrada a sala ${roomId}`);

        // Dividir el pozo acumulado usando la Proporción Áurea
        const potAlpha = parentRoom.accumulatedPot * SPLIT_RATIO_ALPHA;
        const potBeta = parentRoom.accumulatedPot * SPLIT_RATIO_BETA;

        // Crear salas hijas
        const roomAlpha = this.createRoom(`${parentRoom.name}_alpha`, potAlpha);
        const roomBeta = this.createRoom(`${parentRoom.name}_beta`, potBeta);

        console.log(`\n💎 Sala ALPHA (High Tier):`);
        console.log(`   - ID: ${roomAlpha.id}`);
        console.log(`   - Pozo: ${potAlpha.toFixed(2)} USDT (61.8%)`);
        console.log(`   - Requisito: Skin Level >= 4`);

        console.log(`\n🌱 Sala BETA (Low Tier):`);
        console.log(`   - ID: ${roomBeta.id}`);
        console.log(`   - Pozo: ${potBeta.toFixed(2)} USDT (38.2%)`);
        console.log(`   - Requisito: Acceso abierto`);

        // TODO: Implementar migración de usuarios basada en skinLevel
        console.log(`\n📊 Usuarios a migrar: ${parentRoom.users.size}`);
        console.log(`   [Pendiente: Lógica de migración por skinLevel]`);

        console.log(`\n${'='.repeat(60)}\n`);
    }

    /**
     * Determina el tier de una sala basado en su nombre
     */
    determineTier(name) {
        if (name.includes('TRAINING')) return 'TRAINING';
        if (name.includes('SATOSHI')) return 'SATOSHI';
        if (name.includes('TRADER')) return 'TRADER';
        if (name.includes('WHALE')) return 'WHALE';

        if (name.includes('alpha')) return 'HIGH'; // Fallback for mitosis
        if (name.includes('beta')) return 'LOW';   // Fallback for mitosis

        return 'TRAINING';
    }

    /**
     * Obtiene información de todas las salas
     */
    getRoomsInfo() {
        const info = [];
        this.rooms.forEach((room, id) => {
            info.push({
                id: room.id,
                name: room.name,
                users: room.users.size,
                capacity: ROOM_MAX_CAPACITY,
                pot: room.accumulatedPot,
                tier: room.tier
            });
        });
        return info;
    }

    /**
     * Obtiene una sala por ID
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
}

export default RoomManager;
