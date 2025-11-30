

// 🎯 SERVIDOR PRINCIPAL - CANDLE RUNNER PROTOCOL
// Express + Socket.io + Game Loop

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Importar servicios
import GameLoop from './services/gameLoop.js';
import RoomManager from './services/roomManager.js';
import priceService from './services/priceService.js';
import StatsService from './services/statsService.js';
import { userManager } from './services/userManager.js';
import { REPAIR_COST_BASE, REPAIR_COST_MULTIPLIER } from '../shared/constants.js';

// Configuración de ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// Configuración
const PORT = process.env.PORT || 3000;
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // TODO: Configurar CORS apropiadamente en producción
        methods: ["GET", "POST"]
    }
});



// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// Inicializar servicios
const roomManager = new RoomManager();
const gameLoop = new GameLoop(io, roomManager); // 🚌 Inyectar roomManager
const statsService = new StatsService(gameLoop, roomManager);

// ============================================
// 📡 API REST - ENDPOINTS
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        gameState: gameLoop.getState(),
        rooms: roomManager.getRoomsInfo()
    });
});

// Obtener estado del juego
app.get('/api/game/state', (req, res) => {
    res.json(gameLoop.getState());
});

// Obtener información de salas
app.get('/api/rooms', (req, res) => {
    res.json(roomManager.getRoomsInfo());
});

// ============================================
// 🚀 INICIO DEL SERVIDOR
// ============================================

httpServer.listen(PORT, () => {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║           🕯️  CANDLE RUNNER PROTOCOL v1.0 🕯️              ║');
    console.log('║                                                            ║');
    console.log('║              Survival Trading & Creative Economy           ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log(`🌐 Servidor HTTP escuchando en puerto ${PORT}`);
    console.log(`🔌 WebSocket Server activo`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log('\n');

    // Iniciar Price Service (Oráculo)
    priceService.start();

    // --- ADMIN METRICS LOOP ---
    setInterval(() => {
        const metrics = statsService.getGlobalStats();
        io.to('admin_channel').emit('ADMIN_METRICS', metrics);
    }, 1000);

    // Iniciar Game Loop
    gameLoop.start();
});

// ============================================
// 🔌 SOCKET.IO - GESTIÓN DE CONEXIONES
// ============================================

// Socket Connection Logic
io.on('connection', async (socket) => {
    const clientType = socket.handshake.query.type;

    // 🛡️ ADMIN CONNECTION
    if (clientType === 'admin') {
        console.log(`🛡️ [ADMIN] Conectado (Esperando Auth): ${socket.id}`);

        socket.on('ADMIN_SUBSCRIBE', (key) => {
            if (key === 'admin_secret') {
                socket.join('admin_channel');
                console.log(`🛡️ [ADMIN] Autenticado: ${socket.id}`);
                socket.emit('ADMIN_AUTH_SUCCESS');
            } else {
                console.log(`⛔ [ADMIN] Fallo de Auth: ${socket.id}`);
                socket.disconnect();
            }
        });

        // Evento: Admin crea un bus personalizado
        socket.on('ADMIN_SET_BUS_SIZE', (data) => {
            const { tierName, capacity } = data;
            const result = roomManager.createCustomBus(tierName, capacity);
            socket.emit('BUS_CREATED', result);
        });

        // Evento: Admin solicita info de buses activos
        socket.on('ADMIN_GET_BUSES', () => {
            socket.emit('ADMIN_BUSES', roomManager.getRoomsInfo());
        });

        // Evento: Admin elimina un bus por ID
        socket.on('ADMIN_DELETE_BUS', (data) => {
            const { busId } = data;
            const result = roomManager.deleteBus(busId);
            socket.emit('BUS_DELETED', result);
            // Actualizar lista para todos los admins conectados
            io.to('admin_channel').emit('ADMIN_BUSES', roomManager.getRoomsInfo());
        });

        return;
    }
    if (clientType === 'admin') {
        console.log(`🛡️ [ADMIN] Conectado (Esperando Auth): ${socket.id}`);

        socket.on('ADMIN_SUBSCRIBE', (key) => {
            if (key === 'admin_secret') {
                socket.join('admin_channel');
                console.log(`🛡️ [ADMIN] Autenticado: ${socket.id}`);
                socket.emit('ADMIN_AUTH_SUCCESS');
            } else {
                console.log(`⛔ [ADMIN] Fallo de Auth: ${socket.id}`);
                socket.disconnect();
            }
        });

        // Evento: Admin crea un bus personalizado
        socket.on('ADMIN_SET_BUS_SIZE', (data) => {
            const { tierName, capacity } = data;
            const result = roomManager.createCustomBus(tierName, capacity);
            socket.emit('BUS_CREATED', result);
        });

        // Evento: Admin solicita info de buses activos
        socket.on('ADMIN_GET_BUSES', () => {
            socket.emit('ADMIN_BUSES', roomManager.getRoomsInfo());
        });

        return;
    }

    // 👤 PLAYER CONNECTION
    console.log(`👤 [PLAYER] Conectado: ${socket.id}`);

    // 🦊 LEER WALLET ADDRESS DEL HANDSHAKE
    const walletAddress = socket.handshake.auth.wallet;

    // 🛡️ VALIDACIÓN: Si no hay wallet, desconectar
    if (!walletAddress) {
        console.warn(`⚠️ [AUTH] Socket ${socket.id} sin wallet - DESCONECTANDO`);
        socket.emit('AUTH_ERROR', { message: 'Wallet address required. Please connect your wallet.' });
        socket.disconnect();
        return;
    }

    try {
        // 🔐 CREAR O RECUPERAR USUARIO POR WALLET
        const user = await userManager.createUser(socket.id, walletAddress);

        // 🚌 MODELO BUS: El usuario NO entra a ninguna sala automáticamente
        // Debe elegir explícitamente su sala mediante JOIN_ROOM
        user.currentRoom = null;

        // ✅ AUTENTICACIÓN EXITOSA
        socket.emit('AUTH_SUCCESS', {
            userId: user.id,
            wallet: walletAddress
        });

        // Enviar estado inicial
        socket.emit('SYNC_TIME', gameLoop.getState());

        // Enviar perfil de usuario (saldo desde DB)
        socket.emit('USER_PROFILE', user.getProfile());

        console.log(`✅ [AUTH] Usuario autenticado: ${user.id} (${walletAddress})`);

    } catch (error) {
        console.error(`❌ [AUTH] Error al crear usuario:`, error);
        socket.emit('AUTH_ERROR', { message: 'Authentication failed. Please try again.' });
        socket.disconnect();
        return;
    }

    // 🚌 Evento: Unirse a una sala (elegir el "Bus")
    socket.on('JOIN_ROOM', async (data) => {
        // Ahora esperamos un ID específico de bus (ej: 'bus_training_1')
        const { roomId } = data;

        if (!roomId) {
            socket.emit('GAME_ERROR', { message: 'Bus ID is required' });
            return;
        }

        // Salir de la sala actual si existe
        if (user.currentRoom) {
            socket.leave(user.currentRoom);
            roomManager.removeUserFromRoom(socket.id, user.currentRoom);
        }

        // Intentar unirse a la nueva sala
        const { BusGameLoop } = await import('./services/gameLoop.js');
        const result = await roomManager.addUserToRoom(socket.id, roomId, (room) => {
            // Solo arrancar si no hay ya un gameLoopInstance
            if (!room.gameLoopInstance) {
                room.gameLoopInstance = new BusGameLoop(io, room, roomManager);
                room.gameLoopInstance.startBus();
            }
        });

        if (result.success) {
            user.currentRoom = roomId;
            socket.join(roomId);

            const room = roomManager.getRoom(roomId);
            socket.emit('ROOM_JOINED', {
                roomId: roomId,
                roomName: room.name, // Tier name
                ticketPrice: room.ticketPrice
            });

            // 👥 GESTIÓN DE PRESENCIA - Notificar a los demás jugadores
            socket.to(roomId).emit('PLAYER_JOINED', {
                id: user.id,
                skin: user.activeSkin ? user.activeSkin.name : 'Default'
            });

            // 👥 GESTIÓN DE PRESENCIA - Enviar lista de jugadores actuales al nuevo
            const currentPlayers = [];
            for (const [socketId, userId] of room.users.entries()) {
                const player = userManager.getUser(socketId);
                if (player && player.id !== user.id) { // Excluir al jugador recién unido
                    currentPlayers.push({
                        id: player.id,
                        skin: player.activeSkin ? player.activeSkin.name : 'Default'
                    });
                }
            }

            socket.emit('CURRENT_PLAYERS', currentPlayers);

            io.emit('ROOM_COUNTS_UPDATE', roomManager.getRoomCounts());
            // También actualizar la lista de buses para todos (admin y clientes)
            io.emit('ADMIN_BUSES', roomManager.getRoomsInfo());

            console.log(`🚌 [JOIN] Usuario ${user.id} subió al bus ${roomId} (${room.name})`);
            console.log(`👥 [PRESENCE] ${currentPlayers.length} jugadores ya en el bus`);
        } else {
            socket.emit('GAME_ERROR', { message: `No puedes entrar a ${roomId}: ${result.error}` });
        }
    });

    // 🎟️ Evento: Realizar apuesta (COMPRAR TICKET)
    socket.on('PLACE_BET', async (data) => {
        const { direction } = data; // Solo recibimos la dirección, NO el amount

        // Delegar al GameLoop (handleBet ahora obtiene el amount de la sala)
        const result = await gameLoop.handleBet(socket.id, direction);

        if (result.success) {
            // Confirmar apuesta al cliente
            socket.emit('BET_CONFIRMED', {
                amount: result.amount, // El servidor devuelve el amount que usó
                direction: direction,
                balance: result.balance
            });
        } else {
            // Enviar error
            socket.emit('GAME_ERROR', { message: result.error });
        }
    });

    // Evento: Reparar Skin
    socket.on('REPAIR_SKIN', async () => {
        const user = userManager.getUser(socket.id);
        if (!user) return;

        const skin = user.activeSkin;
        if (!skin) {
            socket.emit('GAME_ERROR', { message: 'No tienes una skin activa para reparar.' });
            return;
        }

        if (skin.currentIntegrity >= skin.maxIntegrity) {
            socket.emit('GAME_ERROR', { message: 'La skin ya está en perfecto estado.' });
            return;
        }

        // Calcular costo exponencial áureo (White Paper)
        // Fórmula: 50 * (1.618 ^ nivel)
        const cost = Math.floor(50 * Math.pow(1.618, skin.level));
        const damage = skin.maxIntegrity - skin.currentIntegrity;

        // Verificar saldo WICK
        if (!user.hasBalance(cost, 'WICK')) {
            socket.emit('GAME_ERROR', { message: `Faltan $WICK. Costo: ${cost}, Tienes: ${user.balanceWICK}` });
            return;
        }

        // Ejecutar reparación (Transacción atómica)
        if (await user.withdraw(cost, 'REPAIR', 'WICK')) {
            await skin.repair(damage);

            console.log(`🔧 [REPAIR] Usuario ${user.id} reparó su skin por ${cost} $WICK`);

            // Notificar éxito y actualización
            socket.emit('SKIN_UPDATE', {
                integrity: skin.currentIntegrity,
                maxIntegrity: skin.maxIntegrity,
                isBurned: skin.isBurned
            });

            socket.emit('BALANCE_UPDATE', {
                balanceUSDT: user.balanceUSDT,
                balanceWICK: user.balanceWICK
            });

        } else {
            socket.emit('GAME_ERROR', { message: 'Error al procesar la reparación' });
        }
    });

    // Evento: Retiro de fondos
    socket.on('WITHDRAW', async (data) => {
        const user = userManager.getUser(socket.id);
        if (!user) return;

        const { amount } = data;

        // Validar monto
        if (amount <= 0 || amount > user.balanceUSDT) {
            socket.emit('GAME_ERROR', { message: 'Monto de retiro inválido' });
            return;
        }

        // Procesar retiro (en producción, aquí iría la lógica de blockchain/payment)
        if (await user.withdraw(amount, 'WITHDRAWAL')) {
            console.log(`💰 [WITHDRAW] Usuario ${user.id} retiró $${amount}`);

            // Notificar éxito
            socket.emit('WITHDRAW_SUCCESS', {
                amount: amount,
                balance: user.balanceUSDT,
                transactionId: `TX-${Date.now()}`
            });
            // Emitir perfil actualizado tras retiro
            socket.emit('USER_PROFILE', user.getProfile());
        } else {
            socket.emit('GAME_ERROR', { message: 'Error al procesar el retiro' });
        }
    });

    // 🎒 Evento: Equipar Skin del inventario
    socket.on('EQUIP_SKIN', (data) => {
        const user = userManager.getUser(socket.id);
        if (!user) return;

        const { skinId } = data;

        // Buscar la skin en el inventario
        const skin = user.inventory.find(s => s.id === skinId);

        if (!skin) {
            socket.emit('GAME_ERROR', { message: 'Skin no encontrada en inventario' });
            return;
        }

        // Verificar que no esté quemada
        if (skin.isBurned) {
            socket.emit('GAME_ERROR', { message: '💀 Esta skin está quemada. No puede equiparse.' });
            return;
        }

        // Cambiar la skin activa
        user.activeSkin = skin;

        console.log(`🎨 [EQUIP] Usuario ${user.id} equipó skin: ${skin.name}`);

        // Enviar perfil actualizado
        socket.emit('USER_PROFILE', user.getProfile());
        socket.emit('SKIN_EQUIPPED', {
            skinId: skin.id,
            skinName: skin.name,
            message: `✅ ${skin.name} equipada`
        });
    });


    // Evento: Solicitar conteo de salas
    socket.on('GET_ROOM_COUNTS', () => {
        socket.emit('ROOM_COUNTS_UPDATE', roomManager.getRoomCounts());
    });

    // Evento: Admin solicita info de buses activos
    socket.on('ADMIN_GET_BUSES', () => {
        // Devuelve la lista de buses y su estado actual
        socket.emit('ADMIN_BUSES', roomManager.getRoomsInfo());
    });

    // Evento: Desconexión
    socket.on('disconnect', () => {
        console.log(`🔌 [DISCONNECT] Cliente desconectado: ${socket.id}`);

        const user = userManager.getUser(socket.id);

        // 👥 GESTIÓN DE PRESENCIA - Notificar a los demás que este jugador se fue
        if (user && user.currentRoom) {
            socket.to(user.currentRoom).emit('PLAYER_LEFT', {
                id: user.id
            });
            console.log(`👋 [PRESENCE] Usuario ${user.id} dejó el bus ${user.currentRoom}`);
        }

        userManager.removeUser(socket.id);

        // Remover de todas las salas
        roomManager.rooms.forEach((room, roomId) => {
            roomManager.removeUserFromRoom(socket.id, roomId);
        });

        // Actualizar conteos a todos
        io.emit('ROOM_COUNTS_UPDATE', roomManager.getRoomCounts());
    });
});



// Manejo de errores
process.on('uncaughtException', (error) => {
    console.error('❌ [ERROR] Excepción no capturada:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [ERROR] Promesa rechazada no manejada:', reason);
});


