// [ MENU SCENE ] - Hub de Lobby (Overlay HTML)
// Esta escena solo activa el overlay HTML de selección de buses
// NO renderiza nada en el canvas de Phaser

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        console.log('[MENU] 🎬 MenuScene iniciada - Activando lobby HTML...');

        // 🛡️ VALIDACIÓN: Socket disponible
        if (!window.globalSocket) {
            console.warn('[MENU] ⚠️ Socket no disponible aún. Reintentando en 200ms...');
            this.time.delayedCall(200, () => {
                this.scene.restart();
            });
            return;
        }

        this.socket = window.globalSocket;
        console.log('[MENU] ✅ Socket conectado');

        // 🎮 ACTIVAR LOBBY HTML
        this.showLobbyOverlay();

        // 🔌 Setup listeners para transiciones
        this.setupSocketListeners();
    }

    showLobbyOverlay() {
        // Llamar función global que muestra el overlay de buses
        if (window.showBusLobby) {
            window.showBusLobby();
            console.log('[MENU] 📋 Lobby de buses mostrado');
        } else {
            console.error('[MENU] ❌ window.showBusLobby no está disponible');
        }
    }

    setupSocketListeners() {
        // Cuando el usuario se una a un bus, pasar a GameScene
        this.socket.on('ROOM_JOINED', (data) => {
            console.log('[MENU] ✅ Usuario unido a bus:', data.roomName);

            // Ocultar lobby HTML
            if (window.hideBusLobby) {
                window.hideBusLobby();
            }

            // Transición a GameScene
            this.scene.start('GameScene');
            this.scene.launch('UIScene');
        });

        // Si el bus ya está en progreso, forzar entrada a GameScene
        this.socket.on('GAME_STATE', (data) => {
            if ((data.state === 'BETTING' || data.state === 'LOCKED' || data.state === 'RESOLVING')
                && !this.scene.isActive('GameScene')) {
                console.log('[MENU] 🚨 Bus en progreso detectado. Entrando a GameScene...');

                if (window.hideBusLobby) {
                    window.hideBusLobby();
                }

                this.scene.start('GameScene');
                this.scene.launch('UIScene');
            }
        });

        // Cleanup al salir
        this.events.on('shutdown', () => {
            this.socket.off('ROOM_JOINED');
            this.socket.off('GAME_STATE');
        });
    }

    update() {
        // Esta escena no renderiza nada, solo espera eventos
    }
}
