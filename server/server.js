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
const gameLoop = new GameLoop(io);

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

    // --- ADMIN DASHBOARD STATS ---
    setInterval(() => {
        const stats = gameLoop.getAdminStats(roomManager);
        io.emit('ADMIN_STATS', stats);
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
        socket.join('admin_room');
        console.log(`🛡️ [ADMIN] Conectado: ${socket.id}`);
        return;
    }

    // 👤 PLAYER CONNECTION
    console.log(`👤 [PLAYER] Conectado: ${socket.id}`);

    // Recuperar ID de usuario si existe (Persistencia)
    const userId = socket.handshake.auth.userId;

    // Crear o recuperar usuario
    const user = await userManager.createUser(socket.id, userId);

    // Añadir usuario a la sala principal por defecto
    const mainRoom = Array.from(roomManager.rooms.values())[0];
    if (mainRoom) {
        const result = await roomManager.addUserToRoom(socket.id, mainRoom.id);
        if (result.success) {
            socket.join(mainRoom.id);
            io.emit('ROOM_COUNTS_UPDATE', roomManager.getRoomCounts());
        } else {
            socket.emit('GAME_ERROR', { message: `Acceso denegado: ${result.error}` });
            // Desconectar o dejar en limbo? Dejamos conectado pero sin sala.
        }
    }

    // Enviar estado inicial
    socket.emit('SYNC_TIME', gameLoop.getState());

    // Enviar perfil de usuario (saldo inicial)
    socket.emit('USER_PROFILE', user.getProfile());

    // Evento: Realizar apuesta
    socket.on('PLACE_BET', async (data) => {
        const { amount, direction } = data;

        // Delegar al GameLoop
        const result = await gameLoop.handleBet(socket.id, amount, direction);

        if (result.success) {
            // Confirmar apuesta al cliente
            socket.emit('BET_CONFIRMED', {
                amount: amount,
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

        // Calcular costo exponencial
        // Fórmula: Base * (Multiplicador ^ Nivel)
        const skinLevel = skin.level || 1;
        const costPerPoint = Math.floor(REPAIR_COST_BASE * Math.pow(REPAIR_COST_MULTIPLIER, skinLevel));
        const damage = skin.maxIntegrity - skin.currentIntegrity;
        const totalCost = damage * costPerPoint;

        // Verificar saldo WICK
        if (!user.hasBalance(totalCost, 'WICK')) {
            socket.emit('GAME_ERROR', { message: `Faltan $WICK. Costo: ${totalCost}, Tienes: ${user.balanceWICK}` });
            return;
        }

        // Ejecutar reparación (Transacción atómica)
        if (await user.withdraw(totalCost, 'REPAIR', 'WICK')) {
            await skin.repair(damage);

            console.log(`🔧 [REPAIR] Usuario ${user.id} reparó su skin por ${totalCost} $WICK`);

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

    // --- ADMIN DASHBOARD STATS ---
    setInterval(() => {
        const stats = gameLoop.getAdminStats();
        io.emit('ADMIN_STATS', stats);
    }, 1000);

    // Iniciar Game Loop
    gameLoop.start();
});

// Manejo de errores
process.on('uncaughtException', (error) => {
    console.error('❌ [ERROR] Excepción no capturada:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [ERROR] Promesa rechazada no manejada:', reason);
});

export { io, roomManager, gameLoop, priceService };
