// 🏛️ ROOM MANAGER - Gestión de Salas con Mitosis Fibonacci
// Maneja la escalabilidad mediante división automática de salas

import { ROOM_MAX_CAPACITY, SPLIT_RATIO_ALPHA, SPLIT_RATIO_BETA } from '../../shared/constants.js';

class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.nextRoomId = 1;

        // Crear sala inicial
        this.createRoom('main', 0);
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
     * Añade un usuario a una sala
     */
    addUserToRoom(userId, roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`❌ Sala ${roomId} no existe`);
            return false;
        }

        room.users.add(userId);
        console.log(`👤 Usuario ${userId} añadido a ${roomId} (${room.users.size}/${ROOM_MAX_CAPACITY})`);

        // Verificar si se alcanzó la capacidad crítica
        this.checkMitosis(roomId);

        return true;
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
        if (name.includes('alpha')) return 'HIGH';
        if (name.includes('beta')) return 'LOW';
        return 'STANDARD';
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
