// [ MENU SCENE ] - Hub de Lobby (Overlay HTML)
// Esta escena solo activa el overlay HTML de selección de buses
// NO renderiza nada en el canvas de Phaser

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        console.log('[MENU] 🎬 MenuScene iniciada - Activando lobby HTML...');
        console.log('[MENU] 🔍 Debug - window.SOCKET_READY:', window.SOCKET_READY);
        console.log('[MENU] 🔍 Debug - window.globalSocket:', window.globalSocket);
        console.log('[MENU] 🔍 Debug - socket.connected:', window.globalSocket?.connected);

        // 🛡️ VALIDACIÓN: Socket disponible
        if (!window.globalSocket || !window.globalSocket.connected) {
            console.error('[MENU] ❌ Socket no disponible. Esto es un error crítico - el login debió conectar el socket primero.');
            console.error('[MENU] ❌ Estado: globalSocket existe:', !!window.globalSocket, 'conectado:', window.globalSocket?.connected);
            return;
        }

        // 🛡️ VALIDACIÓN: Lobby inicializado
        if (!window.isLobbyReady || !window.isLobbyReady()) {
            console.error('[MENU] ❌ Lobby no inicializado. Esperando inicialización...');
            console.error('[MENU] ❌ isLobbyReady existe:', !!window.isLobbyReady);
            return;
        }

        this.socket = window.globalSocket;
        console.log('[MENU] ✅ Socket conectado y lobby inicializado');



        // 🔴 MODO ESPECTADOR: Bypass completo
        if (window.SPECTATOR_MODE) {
            console.log('[MENU] 🔴 Modo espectador detectado. Configurando listeners y uniéndose...');

            // Ocultar lobby por si acaso
            if (window.hideBusLobby) window.hideBusLobby();

            // 1. Configurar listeners PRIMERO
            this.setupSocketListeners();

            // 2. Emitir JOIN_ROOM después de tener listeners listos
            const busId = window.SPECTATOR_BUS_ID;
            if (busId) {
                console.log(`[MENU] 🔴 Enviando solicitud JOIN_ROOM para ${busId}...`);
                this.socket.emit('JOIN_ROOM', { roomId: busId, isSpectator: true });
            } else {
                console.error('[MENU] ❌ Error: No se encontró ID de bus para espectar');
            }

            return;
        }

        // 🎮 ACTIVAR LOBBY HTML
        this.showLobbyOverlay();

        // 🔌 Setup listeners para transiciones
        this.setupSocketListeners();

        // 🎨 Agregar texto temporal en canvas mientras se carga el lobby
        this.add.text(this.scale.width / 2, this.scale.height / 2, '🚌 Buscando buses disponibles...', {
            fontSize: '32px',
            color: '#00fff9',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1000);

        console.log('[MENU] 📺 Texto temporal agregado al canvas');
    }

    showLobbyOverlay() {
        // Llamar función global que muestra el overlay de buses
        if (window.showBusLobby) {
            console.log('[MENU] 🎬 Llamando a showBusLobby()...');
            window.showBusLobby();
            console.log('[MENU] 📋 Lobby de buses activado');
        } else {
            console.error('[MENU] ❌ window.showBusLobby no está disponible');
            console.error('[MENU] ❌ window keys:', Object.keys(window).filter(k => k.includes('Lobby') || k.includes('Bus')));
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
