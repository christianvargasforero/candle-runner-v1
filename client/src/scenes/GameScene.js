// 🎮 NEON TRADER - Game Scene (Refactorizado)
// Arquitectura limpia: La escena es un orquestador que delega a sistemas especializados

import { CandleSystem } from '../systems/CandleSystem.js';
import { PlayerSystem } from '../systems/PlayerSystem.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        // Estado del juego
        this.busStarted = false;

        // Paleta Neon Cyberpunk
        this.COLORS = {
            LONG: 0x00ff88,
            SHORT: 0xff0055,
            NEUTRAL: 0x888888,
            GRID: 0x00fff9,
            BG: 0x0a0a12
        };

        // Zoom responsivo
        this.zoomLevel = window.innerWidth < 480 ? 0.55 : 0.85;

        // Parallax
        this.gridScrollX = 0;
    }

    preload() {
        // Sin assets externos - todo se genera proceduralmente
    }

    // ═══════════════════════════════════════════════════════════════
    // 🧹 LIMPIEZA DE RECURSOS
    // ═══════════════════════════════════════════════════════════════

    cleanup() {
        console.log('[🧹 CLEANUP] Removiendo listeners de socket...');

        if (this.socket && this.listenersAttached) {
            this.socket.off('BUS_START');
            this.socket.off('PRICE_UPDATE');
            this.socket.off('ROUND_RESULT');
            this.socket.off('PLAYER_JOINED');
            this.socket.off('PLAYER_LEFT');
            this.socket.off('CURRENT_GAME_STATE');

            this.listenersAttached = false;
            console.log('[✅ CLEANUP] Listeners removidos correctamente');
        }
    }

    create() {
        console.log('[🎮 NEON TRADER] Escena iniciada');

        // ============================================
        // 🎥 CAMERA CONTROL STATE
        // ============================================
        this.isCameraLocked = true;
        this.dragStartX = 0;

        // ============================================
        // ⚙️ CONFIGURACIÓN DE FÍSICA ARCADE
        // ============================================
        this.physics.world.setBounds(0, 0, 20000, 2000);
        this.physics.world.setFPS(60);

        console.log('[⚙️ PHYSICS] Sistema Arcade activado');

        // ============================================
        // 🎨 CONFIGURACIÓN VISUAL
        // ============================================
        this.cameras.main.setBackgroundColor(this.COLORS.BG);
        this.cameras.main.setZoom(this.zoomLevel);
        this.cameras.main.setBounds(0, 0, 20000, 2000);
        
        // CRÍTICO: Detener cualquier paneo automático previo
        this.cameras.main.stopFollow();

        // ============================================
        // 🖱️ INPUT & CAMERA DRAG
        // ============================================
        this.input.on('pointerdown', (pointer) => {
            // Desbloquear cámara al iniciar arrastre (si no es UI)
            if (this.isCameraLocked) {
                this.isCameraLocked = false;
                this.cameras.main.stopFollow();
                
                // Notificar a UI
                const uiScene = this.scene.get('UIScene');
                if (uiScene) {
                    uiScene.events.emit('CAMERA_UNLOCKED');
                }
            }
            this.dragStartX = pointer.x;
        });

        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown && !this.isCameraLocked) {
                const diff = (pointer.x - this.dragStartX) * 0.5; // Sensibilidad 0.5
                this.cameras.main.scrollX -= diff;
                this.dragStartX = pointer.x;

                // Límites (Clamping)
                const minX = 0; 
                let maxX = 20000; 
                
                if (this.candleSystem && this.candleSystem.candleHistory) {
                    const lastIndex = this.candleSystem.candleHistory.length;
                    const spacing = this.candleSystem.CANDLE_SPACING || 140;
                    const baseX = this.candleSystem.BASE_X || 300;
                    maxX = baseX + (lastIndex + 5) * spacing + 500; 
                }

                if (this.cameras.main.scrollX < minX) this.cameras.main.scrollX = minX;
                if (this.cameras.main.scrollX > maxX) this.cameras.main.scrollX = maxX;
            }
        });

        // Capas de profundidad
        this.bgLayer = this.add.container(0, 0).setDepth(0);
        this.gridLayer = this.add.container(0, 0).setDepth(1);
        this.uiLayer = this.add.container(0, 0).setDepth(100);

        // Crear fondo y grid
        this.createAnimatedBackground();
        this.createNeonGrid();
        this.createPostProcessing();

        // ============================================
        // 🏗️ INICIALIZAR SISTEMAS
        // ============================================
        this.candleSystem = new CandleSystem(this);
        this.playerSystem = new PlayerSystem(this);

        console.log('[🏗️ SYSTEMS] CandleSystem y PlayerSystem inicializados');

        // ============================================
        // 🔗 CONFIGURAR COLISIONES
        // ============================================
        // Los jugadores colisionan con el grupo físico de velas
        // Nota: La colisión se configura individualmente en PlayerSystem.spawnMyPlayer

        // UI de espera
        this.createWaitingUI();

        // ============================================
        // 🔌 SOCKET Y EVENTOS
        // ============================================
        this.socket = window.globalSocket;
        this.setupSocketListeners();

        // Obtener userId local
        this.socket.on('USER_PROFILE', (profile) => {
            if (!this.playerSystem.localUserId) {
                this.playerSystem.setLocalUserId(profile.id);
            }
        });

        // 🛡️ REGISTRAR CLEANUP EN SHUTDOWN
        this.events.once('shutdown', () => {
            this.cleanup();
        });

        this.events.once('destroy', () => {
            this.cleanup();
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎥 CÁMARA: RE-CENTER
    // ═══════════════════════════════════════════════════════════════

    centerOnLatestCandle() {
        if (this.candleSystem && this.candleSystem.candleHistory.length > 0) {
            const lastIndex = this.candleSystem.candleHistory.length - 1;
            const spot = this.candleSystem.getCandleSpot(lastIndex);
            
            // Centrar inmediatamente en la última vela
            this.cameras.main.centerOnX(spot.x);
            console.log('[🎥 CAMERA] Centrado inicial en última vela:', spot.x);
        }
    }

    recenterCamera() {
        const player = this.playerSystem.getMyPlayer();
        if (player) {
            console.log('[🎥 CAMERA] Re-centrando en jugador...');
            
            // Pan suave hacia el jugador
            this.cameras.main.pan(player.x, player.y, 500, 'Power2', false, (camera, progress) => {
                if (progress === 1) {
                    this.cameras.main.startFollow(player, true, 0.1, 0.1);
                    this.isCameraLocked = true;
                    
                    // Notificar a UI
                    const uiScene = this.scene.get('UIScene');
                    if (uiScene) {
                        uiScene.events.emit('CAMERA_LOCKED');
                    }
                }
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎨 BACKGROUND & GRID
    // ═══════════════════════════════════════════════════════════════

    createAnimatedBackground() {
        const bgWidth = 5000;
        const bgHeight = 1500;

        // Base oscura
        const bg = this.add.rectangle(bgWidth / 2, bgHeight / 2, bgWidth, bgHeight, this.COLORS.BG);
        this.bgLayer.add(bg);

        // Gradiente central (glow)
        const centerGlow = this.add.circle(bgWidth / 2, bgHeight / 2, 600, 0x001122, 0.5);
        centerGlow.setBlendMode(Phaser.BlendModes.ADD);
        this.bgLayer.add(centerGlow);
    }

    createNeonGrid() {
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.setScrollFactor(0.3); // Parallax lento

        const gridWidth = 3000;
        const gridHeight = 1500;
        const cellSize = 60;

        // Líneas verticales
        this.gridGraphics.lineStyle(1, this.COLORS.GRID, 0.08);
        for (let x = 0; x < gridWidth; x += cellSize) {
            this.gridGraphics.lineBetween(x, 0, x, gridHeight);
        }

        // Líneas horizontales
        for (let y = 0; y < gridHeight; y += cellSize) {
            this.gridGraphics.lineBetween(0, y, gridWidth, y);
        }

        // Líneas más brillantes cada 5 celdas
        this.gridGraphics.lineStyle(1, this.COLORS.GRID, 0.2);
        for (let x = 0; x < gridWidth; x += cellSize * 5) {
            this.gridGraphics.lineBetween(x, 0, x, gridHeight);
        }
        for (let y = 0; y < gridHeight; y += cellSize * 5) {
            this.gridGraphics.lineBetween(0, y, gridWidth, y);
        }

        this.gridLayer.add(this.gridGraphics);
    }

    createPostProcessing() {
        // Scanlines
        const scanlines = this.add.graphics();
        scanlines.setScrollFactor(0).setDepth(1000);

        for (let y = 0; y < this.scale.height; y += 3) {
            scanlines.lineStyle(1, 0x000000, 0.15);
            scanlines.lineBetween(0, y, this.scale.width, y);
        }

        // Vignette corners
        const vignetteSize = 300;
        const corners = [
            { x: 0, y: 0 },
            { x: this.scale.width, y: 0 },
            { x: 0, y: this.scale.height },
            { x: this.scale.width, y: this.scale.height }
        ];

        corners.forEach(corner => {
            const vignette = this.add.circle(corner.x, corner.y, vignetteSize, 0x000000, 0.6);
            vignette.setScrollFactor(0).setDepth(999);
            vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);
        });
    }

    createWaitingUI() {
        this.waitPanel = this.add.container(this.scale.width / 2, 100);
        this.waitPanel.setScrollFactor(0).setDepth(200);

        const panelBg = this.add.rectangle(0, 0, 500, 80, 0x000000, 0.7);
        panelBg.setStrokeStyle(2, this.COLORS.GRID, 0.8);
        this.waitPanel.add(panelBg);

        this.waitText = this.add.text(0, 0, '[ WAITING FOR PASSENGERS ]', {
            font: 'bold 24px "Courier New"',
            fill: '#00fff9',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.waitPanel.add(this.waitText);

        this.tweens.add({
            targets: this.waitText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔌 SOCKET LISTENERS (DELEGACIÓN A SISTEMAS)
    // ═══════════════════════════════════════════════════════════════

    setupSocketListeners() {
        // 🛡️ PREVENIR LISTENERS DUPLICADOS
        if (this.listenersAttached) {
            console.log('[⚠️ LISTENERS] Ya existen listeners, saltando setup...');
            return;
        }

        this.listenersAttached = true;

        // ============================================
        // 🛡️ SISTEMA DE RECUPERACIÓN DE ESTADO
        // ============================================
        console.log('[🔍 RECOVERY] Solicitando estado del juego...');
        this.socket.emit('REQUEST_GAME_STATE');

        // CURRENT_GAME_STATE: Respuesta del servidor con estado actual
        this.socket.on('CURRENT_GAME_STATE', (data) => {
            console.log('[📦 CURRENT_GAME_STATE] Recibido:', data);

            if (data.status === 'IN_PROGRESS') {
                console.log('[🚨 CATCH-UP] El bus ya salió! Sincronizando...');

                this.busStarted = true;

                // Ocultar UI de espera
                this.waitPanel.setVisible(false);

                // ============================================
                // 🎯 DELEGAR A SISTEMAS
                // ============================================
                this.candleSystem.buildChart(data.candleHistory);
                this.centerOnLatestCandle(); // Fix de Cámara (Tarea 3)
                this.playerSystem.spawnPlayers(data.passengers || [], this.candleSystem);

                console.log('[✅ CATCH-UP] Sincronización completa!');
            } else {
                console.log('[⏳ WAITING] Bus aún no inicia. Estado:', data.status);
            }
        });

        // ============================================
        // 🚌 BUS_START: El bus arrancó
        // ============================================
        this.socket.on('BUS_START', (data) => {
            console.log('[BUS_START] Recibido:', data);

            // Evitar doble inicialización
            if (this.busStarted) {
                console.log('[⚠️ BUS_START] Ya iniciado, ignorando...');
                return;
            }

            this.busStarted = true;

            console.log('[BUS_START] ' + (data.candleHistory?.length || 0) + ' velas, ' + (data.passengers?.length || 0) + ' pasajeros');

            // Ocultar UI de espera
            this.waitPanel.setVisible(false);

            // ============================================
            // 🎯 DELEGAR A SISTEMAS
            // ============================================
            this.candleSystem.buildChart(data.candleHistory);
            this.centerOnLatestCandle(); // Fix de Cámara (Tarea 3)
            this.playerSystem.spawnPlayers(data.passengers || [], this.candleSystem);
        });

        // ============================================
        // 📊 PRICE_UPDATE: Precio en tiempo real
        // ============================================
        this.socket.on('PRICE_UPDATE', (data) => {
            // 🎯 DELEGAR A CandleSystem
            this.candleSystem.updateLiveCandle(data.price);
        });

        // ============================================
        // 🏁 ROUND_RESULT: Resultado de la ronda
        // ============================================
        this.socket.on('ROUND_RESULT', (data) => {
            console.log('[ROUND_RESULT]', data);

            // 🎥 AUTO-RECENTER: Forzar cámara al jugador
            this.recenterCamera();

            // 🎯 RESETEAR ESTADO DE VELA EN VIVO
            this.candleSystem.resetLiveCandle();

            // 🎯 SOLIDIFICAR VELA EN VIVO → HISTÓRICA
            if (data.candleHistory) {
                this.candleSystem.solidifyLiveCandle(data.candleHistory);
            }

            // 🎯 ANIMAR RESULTADOS DE JUGADORES
            if (data.passengerStatuses) {
                this.playerSystem.animatePlayerResults(data.passengerStatuses, this.candleSystem);
            }
        });

        // ============================================
        // 🔄 GAME_STATE: Actualización de fase
        // ============================================
        this.socket.on('GAME_STATE', (data) => {
            // Actualizar fase en CandleSystem para visualización
            if (this.candleSystem) {
                this.candleSystem.setPhase(data.state);
            }
        });

        // ============================================
        // ➕ PLAYER_JOINED: Nuevo jugador se une
        // ============================================
        this.socket.on('PLAYER_JOINED', (data) => {
            console.log('[PLAYER_JOINED]', data);
            // 🎯 DELEGAR A PlayerSystem
            this.playerSystem.addPlayer(data, this.candleSystem);
        });

        // ============================================
        // ➖ PLAYER_LEFT: Jugador se va
        // ============================================
        this.socket.on('PLAYER_LEFT', (data) => {
            console.log('[PLAYER_LEFT]', data);
            // 🎯 DELEGAR A PlayerSystem
            this.playerSystem.removePlayer(data.id);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔄 UPDATE LOOP (DELEGACIÓN A SISTEMAS)
    // ═══════════════════════════════════════════════════════════════

    update(time, delta) {
        // Parallax del grid
        if (this.gridGraphics) {
            this.gridScrollX += delta * 0.01;
        }

        // ============================================
        // 🎯 DELEGAR A SISTEMAS
        // ============================================
        this.candleSystem.update(delta);
        this.playerSystem.update();

        // ============================================
        // 🗑️ GARBAGE COLLECTION: Limpiar objetos fuera de cámara
        // ============================================
        const cameraLeft = this.cameras.main.scrollX - 500;

        // Limpiar velas físicas antiguas
        this.candleSystem.candlePhysicsBodies.forEach((body, index) => {
            if (body && body.x < cameraLeft) {
                body.destroy();
                this.candleSystem.candlePhysicsBodies.delete(index);
            }
        });

        // Limpiar gráficos de velas visuales
        if (this.candleSystem.candleLayer) {
            const candlesToRemove = [];
            this.candleSystem.candleLayer.list.forEach(container => {
                if (container.x < cameraLeft) {
                    candlesToRemove.push(container);
                }
            });
            candlesToRemove.forEach(c => {
                this.candleSystem.candleLayer.remove(c, true);
            });
        }

        // Limpiar jugadores remotos fuera de cámara
        if (this.playerSystem.players) {
            this.playerSystem.players.forEach((data, id) => {
                if (!data.isLocal && data.sprite && data.sprite.x < cameraLeft) {
                    console.log(`[🗑️ GC] Limpiando jugador remoto fuera de cámara: ${id}`);
                    this.playerSystem.removePlayer(id);
                }
            });
        }
    }
}
