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

// Inicializar servicios
const roomManager = new RoomManager();
const gameLoop = new GameLoop(io);

// ============================================
// 🔌 SOCKET.IO - GESTIÓN DE CONEXIONES
// ============================================

io.on('connection', (socket) => {
    console.log(`\n🔌 [SOCKET] Cliente conectado: ${socket.id}`);

    // Añadir usuario a la sala principal por defecto
    const mainRoom = Array.from(roomManager.rooms.values())[0];
    if (mainRoom) {
        roomManager.addUserToRoom(socket.id, mainRoom.id);
        socket.join(mainRoom.id);
    }

    // Enviar estado actual del juego al conectarse
    socket.emit('SYNC_TIME', gameLoop.getState());

    // Evento: Realizar apuesta
    socket.on('PLACE_BET', (data) => {
        console.log(`💰 [BET] Usuario ${socket.id} apuesta ${data.amount} USDT en ${data.direction}`);
        // TODO: Implementar lógica de apuestas en Fase 4
    });

    // Evento: Desconexión
    socket.on('disconnect', () => {
        console.log(`❌ [SOCKET] Cliente desconectado: ${socket.id}`);

        // Remover de todas las salas
        roomManager.rooms.forEach((room, roomId) => {
            roomManager.removeUserFromRoom(socket.id, roomId);
        });
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

export { io, roomManager, gameLoop };
