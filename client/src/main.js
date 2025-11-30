// [ CANDLE RUNNER ] - Configuración Principal de Phaser 3
// Este archivo inicializa el juego y carga todas las escenas

import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

// [ SOCKET GLOBAL COMPARTIDO ]
// ⚠️ IMPORTANTE: El socket se crea en index.html DESPUÉS del login con wallet
console.log('[MAIN] 🔌 Verificando que el socket esté listo...');

// Verificar que el socket esté listo antes de inicializar Phaser
if (!window.SOCKET_READY) {
    console.error('[MAIN] ❌ CRITICAL: Socket no está listo. No se puede iniciar Phaser.');
    throw new Error('Socket must be ready before initializing Phaser');
}

if (!window.globalSocket || !window.globalSocket.connected) {
    console.error('[MAIN] ❌ CRITICAL: globalSocket no existe o no está conectado');
    throw new Error('globalSocket must be connected before initializing Phaser');
}

if (!window.isLobbyReady || !window.isLobbyReady()) {
    console.error('[MAIN] ❌ CRITICAL: Lobby no está inicializado');
    throw new Error('Lobby must be initialized before Phaser');
}

console.log('[MAIN] ✅ Socket y lobby listos. Iniciando Phaser...');

// Configuración del juego
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-container',
        width: '100%',
        height: '100%'
    },
    backgroundColor: '#0a0a0a',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: [BootScene, MenuScene, GameScene, UIScene]
};

// Crear instancia del juego
const game = new Phaser.Game(config);

// Ocultar pantalla de carga cuando el juego esté listo
game.events.once('ready', () => {
    console.log('[MAIN] 🎮 Phaser game ready event fired');
    setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) {
            console.log('[MAIN] 🚫 Ocultando pantalla de loading');
            loading.classList.add('hidden');
        }
    }, 300);
});

// Exportar para debugging
window.game = game;
