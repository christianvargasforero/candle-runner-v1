// 🚌 ROOM MANAGER - Gestión de "Buses" con Sistema Sit & Go
// Cada sala es un bus independiente con capacidad y trigger de inicio

import {
    ROOM_ACCESS_RULES,
    DEFAULT_CAPACITY,
    FIBONACCI_CAPACITIES,
    BUS_STATES,
    FILL_SPEED_THRESHOLD
} from '../../shared/constants.js';
import { userManager } from './userManager.js';

class Room {
    constructor(id, name, ticketPrice, capacity) {
        this.id = id;
        this.name = name;
        this.ticketPrice = ticketPrice;
        this.capacity = capacity; // Número de sillas (Fibonacci)
        this.users = new Map(); // socketId -> userId
        this.status = BUS_STATES.BOARDING; // BOARDING | LOCKED | IN_PROGRESS | FINISHED
        this.tier = this.determineTier(name);
        this.createdAt = Date.now();
        this.lastFillTime = null; // Para calcular velocidad de llenado
        this.gameLoopInstance = null; // Referencia al GameLoop de este bus
    }

    determineTier(name) {
        if (name.includes('TRAINING')) return 'TRAINING';
        if (name.includes('SATOSHI')) return 'SATOSHI';
        if (name.includes('TRADER')) return 'TRADER';
        if (name.includes('WHALE')) return 'WHALE';
        if (name.includes('alpha')) return 'HIGH';
        if (name.includes('beta')) return 'LOW';
        return 'TRAINING';
    }

    /**
     * Intenta sentar a un jugador en el bus
     * @returns {boolean} true si se sentó, false si está lleno
     */
    sitPlayer(socketId, userId) {
        if (this.users.size >= this.capacity) {
            return false; // Bus lleno
        }

        if (this.status !== BUS_STATES.BOARDING) {
            return false; // Bus ya salió
        }

        this.users.set(socketId, userId);
        console.log(`👤 [BUS ${this.id}] Pasajero ${userId} sentado (${this.users.size}/${this.capacity})`);

        return true;
    }

    /**
     * Verifica si el bus está lleno (trigger)
     */
    isFull() {
        return this.users.size === this.capacity;
    }

    /**
     * Remueve un usuario del bus
     */
    removePlayer(socketId) {
        const userId = this.users.get(socketId);
        if (userId) {
            this.users.delete(socketId);
            console.log(`👋 [BUS ${this.id}] Pasajero ${userId} se bajó (${this.users.size}/${this.capacity})`);
            return true;
        }
        return false;
    }

    /**
     * Resetea el bus para una nueva partida
     */
    reset() {
        this.users.clear();
        this.status = BUS_STATES.BOARDING;
        this.lastFillTime = null;
        this.gameLoopInstance = null;
        console.log(`🔄 [BUS ${this.id}] Reseteado y listo para nuevos pasajeros`);
    }
}

class RoomManager {

        /**
         * Elimina un bus por ID
         * @param {string} busId
         * @returns {{success: boolean, error?: string}}
         */
        deleteBus(busId) {
            if (!this.rooms.has(busId)) {
                return { success: false, error: 'Bus no encontrado' };
            }
            this.rooms.delete(busId);
            console.log(`🗑️ [ADMIN] Bus eliminado: ${busId}`);
            return { success: true };
        }
    constructor() {
        this.rooms = new Map();
        this.nextRoomId = 1;

        // 🚌 MODELO "BUS": Crear buses estáticos con capacidades Fibonacci
        console.log('🚌 [ROOM MANAGER] Inicializando buses con modelo SIT & GO...\n');

        // Crear un bus por cada tier
        for (const [tierName, rules] of Object.entries(ROOM_ACCESS_RULES)) {
            this.createRoom(tierName, rules.ticketPrice, rules.defaultCapacity);
        }

        console.log('✅ [ROOM MANAGER] Buses creados y listos.\n');
    }

    /**
     * Crea un nuevo bus
     * @param {string} name - Nombre del tier (TRAINING, SATOSHI, TRADER, WHALE)
     * @param {number} ticketPrice - Precio del ticket
     * @param {number} capacity - Número de sillas (debe ser Fibonacci)
     */
    createRoom(name, ticketPrice = 0, capacity = DEFAULT_CAPACITY) {
        // Validar que la capacidad sea Fibonacci
        if (!FIBONACCI_CAPACITIES.includes(capacity)) {
            console.warn(`⚠️  Capacidad ${capacity} no es Fibonacci. Usando default: ${DEFAULT_CAPACITY}`);
            capacity = DEFAULT_CAPACITY;
        }

        const roomId = `bus_${name.toLowerCase()}_${this.nextRoomId++}`;
        const room = new Room(roomId, name, ticketPrice, capacity);

        this.rooms.set(roomId, room);
        console.log(`🚌 [BUS] ${roomId} creado | Ticket: $${ticketPrice.toFixed(2)} | Capacidad: ${capacity} sillas`);

        return room;
    }

    /**
     * Añade un usuario a un bus con validación Gatekeeper
     * @param {string} socketId - ID del socket del usuario
     * @param {string} roomId - ID del bus
     * @param {function} onBusFull - Callback cuando el bus se llena
     */
    async addUserToRoom(socketId, roomId, onBusFull = null) {
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`❌ Bus ${roomId} no existe`);
            return { success: false, error: 'Bus no encontrado' };
        }

        const user = userManager.getUser(socketId);
        if (!user) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        // --- GATEKEEPER VALIDATION ---
        const rules = ROOM_ACCESS_RULES[room.tier] || ROOM_ACCESS_RULES.TRAINING;

        // 1. Validar Nivel de Skin
        const userLevel = user.activeSkin.level || 0;
        if (userLevel < rules.minLevel) {
            return { success: false, error: `Nivel insuficiente. Requiere Nivel ${rules.minLevel}` };
        }

        // 2. Validar Protocol Droid (Anti-Farming)
        if (!rules.allowDefault && user.activeSkin.isDefault) {
            return { success: false, error: 'Protocol Droid no permitido en este bus.' };
        }

        // 3. Validar Saldo Mínimo (Proof of Funds)
        if (user.balanceUSDT < room.ticketPrice) {
            return { success: false, error: `Saldo insuficiente. Ticket: $${room.ticketPrice.toFixed(2)}` };
        }

        // 4. Validar que el bus no esté lleno o ya haya salido
        if (room.status !== BUS_STATES.BOARDING) {
            return { success: false, error: 'Bus ya salió. Espera el próximo.' };
        }

        // Intentar sentar al jugador
        const seated = room.sitPlayer(socketId, user.id);
        if (!seated) {
            return { success: false, error: 'Bus lleno. Espera el próximo.' };
        }

        // Actualizar referencia en el usuario
        user.currentRoom = roomId;

        // 🚨 TRIGGER: Verificar si el bus está lleno
        if (room.isFull()) {
            room.status = BUS_STATES.LOCKED; // Cerrar puertas
            room.lastFillTime = Date.now() - room.createdAt;

            console.log(`\n🚨 [TRIGGER] Bus ${roomId} LLENO! Iniciando partida...`);
            console.log(`⏱️  Tiempo de llenado: ${(room.lastFillTime / 1000).toFixed(1)}s\n`);

            // Llamar callback para iniciar el GameLoop
            if (onBusFull) {
                onBusFull(room);
            }

            // Verificar si necesitamos Mitosis (llenado rápido)
            this.checkMitosis(roomId);
        }

        return {
            success: true,
            room: {
                id: room.id,
                name: room.name,
                ticketPrice: room.ticketPrice,
                capacity: room.capacity,
                occupancy: room.users.size
            }
        };
    }

    /**
     * Elimina un usuario de un bus
     */
    removeUserFromRoom(socketId, roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        const removed = room.removePlayer(socketId);

        // Actualizar referencia en el usuario
        const user = userManager.getUser(socketId);
        if (user) {
            user.currentRoom = null;
        }

        return removed;
    }

    /**
     * Verifica si un tier necesita escalar (Mitosis)
     * Se activa si los buses se llenan muy rápido consistentemente
     */
    checkMitosis(roomId) {
        const room = this.rooms.get(roomId);

        // Solo verificar si se llenó rápido
        if (room.lastFillTime && room.lastFillTime < FILL_SPEED_THRESHOLD) {
            console.log(`⚡ [MITOSIS CHECK] Bus ${roomId} se llenó en ${(room.lastFillTime / 1000).toFixed(1)}s`);

            // Buscar siguiente capacidad Fibonacci
            const currentCapacity = room.capacity;
            const currentIndex = FIBONACCI_CAPACITIES.indexOf(currentCapacity);

            if (currentIndex !== -1 && currentIndex < FIBONACCI_CAPACITIES.length - 1) {
                const nextCapacity = FIBONACCI_CAPACITIES[currentIndex + 1];

                console.log(`🧬 [MITOSIS] Alta demanda detectada en ${room.name}`);
                console.log(`   Creando bus con capacidad ${nextCapacity} sillas...\n`);

                // Crear nuevo bus con mayor capacidad
                this.createRoom(room.name, room.ticketPrice, nextCapacity);
            }
        }
    }

    /**
     * Permite al admin crear un bus con capacidad personalizada
     * @param {string} tierName - TRAINING, SATOSHI, TRADER, WHALE
     * @param {number} capacity - Debe ser Fibonacci
     */
    createCustomBus(tierName, capacity) {
        const rules = ROOM_ACCESS_RULES[tierName];
        if (!rules) {
            return { success: false, error: 'Tier no válido' };
        }

        if (!FIBONACCI_CAPACITIES.includes(capacity)) {
            return { success: false, error: 'Capacidad debe ser Fibonacci: ' + FIBONACCI_CAPACITIES.join(', ') };
        }

        const room = this.createRoom(tierName, rules.ticketPrice, capacity);
        return { success: true, room: room };
    }

    /**
     * Obtiene buses disponibles (BOARDING) para un tier específico
     */
    getAvailableBuses(tierName) {
        const buses = [];
        for (const room of this.rooms.values()) {
            if (room.name === tierName && room.status === BUS_STATES.BOARDING) {
                buses.push({
                    id: room.id,
                    capacity: room.capacity,
                    occupancy: room.users.size,
                    ticketPrice: room.ticketPrice
                });
            }
        }
        return buses;
    }

    /**
     * Obtiene el conteo de usuarios por tipo de bus
     */
    getRoomCounts() {
        const counts = {
            'TRAINING': 0,
            'SATOSHI': 0,
            'TRADER': 0,
            'WHALE': 0
        };

        this.rooms.forEach(room => {
            const baseName = room.name.split('_')[0]; // Extraer tier base
            if (counts[baseName] !== undefined) {
                counts[baseName] += room.users.size;
            }
        });

        return counts;
    }

    /**
     * Obtiene información de todos los buses
     */
    getRoomsInfo() {
        const info = [];
        this.rooms.forEach((room) => {
            info.push({
                id: room.id,
                name: room.name,
                users: room.users.size,
                occupancy: room.users.size, // Explicitly add occupancy for client
                capacity: room.capacity,
                status: room.status,
                ticketPrice: room.ticketPrice,
                tier: room.tier
            });
        });
        return info;
    }

    /**
     * Obtiene un bus por ID
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    /**
     * Obtiene el total de jugadores únicos en todos los buses
     */
    getTotalPlayers() {
        const uniqueUsers = new Set();
        for (const room of this.rooms.values()) {
            for (const userId of room.users.values()) {
                uniqueUsers.add(userId);
            }
        }
        return uniqueUsers.size;
    }

    /**
     * Resetea un bus después de terminar una partida
     */
    resetRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            // Limpiar referencias de usuarios
            for (const socketId of room.users.keys()) {
                const user = userManager.getUser(socketId);
                if (user) {
                    user.currentRoom = null;
                }
            }

            room.reset();
            console.log(`♻️  [RESET] Bus ${roomId} reseteado y disponible`);
            return true;
        }
        return false;
    }
}

export default RoomManager;
