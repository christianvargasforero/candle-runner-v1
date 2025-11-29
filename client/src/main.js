// 🎮 CANDLE RUNNER - Configuración Principal de Phaser 3
// Este archivo inicializa el juego y carga todas las escenas

import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

// 🔌 SOCKET GLOBAL COMPARTIDO
// Creamos UNA SOLA conexión que se reutiliza en todas las escenas
console.log('🔌 [MAIN] Creando socket global...');
const globalSocket = io();

// Exponer socket globalmente para que las escenas puedan acceder
window.globalSocket = globalSocket;

globalSocket.on('connect', () => {
    console.log(`🟢 [SOCKET GLOBAL] Conectado: ${globalSocket.id}`);
});

globalSocket.on('disconnect', () => {
    console.log('🔴 [SOCKET GLOBAL] Desconectado');
});

// Configuración del juego
const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 700,
    parent: 'game-container',
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
    setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }, 1000);
});

// Exportar para debugging
window.game = game;
window.socket = globalSocket; // También exportar como window.socket para fácil acceso
