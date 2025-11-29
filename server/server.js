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
        return;
    }

    // 👤 PLAYER CONNECTION
    console.log(`👤 [PLAYER] Conectado: ${socket.id}`);

    // Recuperar ID de usuario si existe (Persistencia)
    const userId = socket.handshake.auth.userId;

    // Crear o recuperar usuario
    const user = await userManager.createUser(socket.id, userId);

    // 🚌 MODELO BUS: El usuario NO entra a ninguna sala automáticamente
    // Debe elegir explícitamente su sala mediante JOIN_ROOM
    user.currentRoom = null;

    // Enviar estado inicial
    socket.emit('SYNC_TIME', gameLoop.getState());

    // Enviar perfil de usuario (saldo inicial)
    socket.emit('USER_PROFILE', user.getProfile());

    // 🚌 Evento: Unirse a una sala (elegir el "Bus")
    socket.on('JOIN_ROOM', async (data) => {
        const { roomName } = data; // 'TRAINING', 'SATOSHI', 'TRADER', 'WHALE'
        const roomId = `room_${roomName.toLowerCase()}`;

        // Salir de la sala actual si existe
        if (user.currentRoom) {
            socket.leave(user.currentRoom);
            roomManager.removeUserFromRoom(socket.id, user.currentRoom);
        }

        // Intentar unirse a la nueva sala
        const result = await roomManager.addUserToRoom(socket.id, roomId);

        if (result.success) {
            user.currentRoom = roomId;
            socket.join(roomId);

            socket.emit('ROOM_JOINED', {
                roomId: roomId,
                roomName: roomName,
                ticketPrice: roomManager.getRoom(roomId).ticketPrice
            });

            io.emit('ROOM_COUNTS_UPDATE', roomManager.getRoomCounts());
            console.log(`🚌 [JOIN] Usuario ${user.id} subió al bus ${roomName}`);
        } else {
            socket.emit('GAME_ERROR', { message: `No puedes entrar a ${roomName}: ${result.error}` });
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

        // Calcular costo exponencial (Flat Fee por reparación completa)
        // Fórmula: 50 * (1.618 ^ Nivel)
        const cost = Math.floor(50 * Math.pow(1.618, skin.level || 1));
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
        } else {
            socket.emit('GAME_ERROR', { message: 'Error al procesar el retiro' });
        }
    });

    // Evento: Solicitar conteo de salas
    socket.on('GET_ROOM_COUNTS', () => {
        socket.emit('ROOM_COUNTS_UPDATE', roomManager.getRoomCounts());
    });

    // Evento: Desconexión
    socket.on('disconnect', () => {
        console.log(`🔌 [DISCONNECT] Cliente desconectado: ${socket.id}`);
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

export { io, roomManager, gameLoop, priceService };
