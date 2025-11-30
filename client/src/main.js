// [ CANDLE RUNNER ] - Configuración Principal de Phaser 3
// Este archivo inicializa el juego y carga todas las escenas

import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

// [ SOCKET GLOBAL COMPARTIDO ]
// ⚠️ IMPORTANTE: El socket se crea en index.html DESPUÉS del login con wallet
// NO creamos el socket aquí para evitar conexiones sin autenticación
console.log('[MAIN] Socket será creado después del login con wallet...');

// El socket se expondrá como window.globalSocket desde index.html
// después de que el usuario haga clic en "Connect Wallet"

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
    setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }, 1000);
});

// Exportar para debugging
window.game = game;
