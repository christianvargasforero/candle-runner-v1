// 🎮 GAME SCENE - Endless Runner con Físicas Reales
// El jugador REALMENTE salta y puede caer al vacío

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        // Estado del juego
        this.gameState = 'WAITING';
        this.roundNumber = 0;

        // Precios
        this.startPrice = null;
        this.currentPrice = null;
        this.lastCandlePrice = 90000; // Precio de referencia inicial

        // Sistema de velas
        this.currentCandle = null;
        this.nextCandleGhost = null;
        this.candleHistory = [];

        // Apuesta del jugador
        this.playerBet = null; // 'LONG' o 'SHORT'

        // Configuración visual
        this.candleSpacing = 300; // Distancia entre velas
        this.priceScale = 0.1; // 1 USD = 0.1 pixels
        this.baseY = 400; // Línea de referencia
    }

    create() {
        console.log('🎮 [GAME] Escena principal iniciada');

        // Configurar mundo
        this.physics.world.setBounds(0, 0, 10000, 700);
        this.physics.world.setFPS(60);

        // Conectar a Socket.io
        this.socket = io();
        this.setupSocketListeners();

        // Crear elementos visuales
        this.createBackground();
        this.createParallaxStars();

        // Crear grupo de velas (plataformas)
        this.candles = this.physics.add.staticGroup();

        // Crear vela inicial (plataforma de inicio)
        this.createInitialCandle();

        // Crear jugador
        this.createPlayer();

        // UI
        this.createPhaseIndicator();
        this.createPriceDisplay();

        // Configurar cámara
        this.cameras.main.setBounds(0, 0, 10000, 700);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // Controles
        this.cursors = this.input.keyboard.createCursorKeys();

        // Escuchar apuestas desde UIScene
        this.registry.events.on('betPlaced', this.onBetPlaced, this);
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('✅ [SOCKET] Conectado al servidor');
        });

        this.socket.on('GAME_STATE', (data) => {
            console.log('🎮 [GAME_STATE]', data);
            this.gameState = data.state;
            this.roundNumber = data.roundNumber;

            if (data.startPrice) {
                this.startPrice = data.startPrice;
                this.currentPrice = data.startPrice;
            }

            this.updatePhaseVisuals(data.state);

            // Iniciar renderizado de vela fantasma en LOCKED
            if (data.state === 'LOCKED') {
                this.startGhostCandleRendering();
            }
        });

        this.socket.on('SYNC_TIME', (data) => {
            // Actualizar precio en tiempo real (simulado por ahora)
            if (this.gameState === 'LOCKED' && this.startPrice) {
                // En producción, esto vendría del servidor
                // Por ahora simulamos fluctuación
                const fluctuation = Phaser.Math.FloatBetween(-0.001, 0.001);
                this.currentPrice = this.startPrice * (1 + fluctuation);
                this.updateGhostCandle();
            }
        });

        this.socket.on('ROUND_RESULT', (data) => {
            console.log('🏆 [ROUND_RESULT]', data);
            this.handleRoundResult(data);
        });

        this.socket.on('GAME_ERROR', (data) => {
            console.error('❌ [GAME_ERROR]', data);
        });
    }

    createBackground() {
        // Fondo oscuro expandido
        this.add.rectangle(5000, 350, 10000, 700, 0x0a0a0a);

        // Overlay de fase
        this.phaseOverlay = this.add.rectangle(600, 350, 1200, 700, 0x000000, 0.3);
        this.phaseOverlay.setScrollFactor(0);
    }

    createParallaxStars() {
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(0, 10000);
            const y = Phaser.Math.Between(0, 600);
            const star = this.add.circle(x, y, 2, 0xffffff, Phaser.Math.FloatBetween(0.3, 0.8));
            star.setScrollFactor(0.2);
            this.stars.push(star);
        }
    }

    createInitialCandle() {
        const x = 200;
        const y = this.baseY;

        this.currentCandle = this.createCandlePlatform(x, y, this.lastCandlePrice, 0x4CAF50);
        this.candleHistory.push(this.currentCandle);
    }

    createCandlePlatform(x, y, price, color = 0x888888) {
        const width = 120;
        const height = 30;

        // Crear plataforma física
        const platform = this.candles.create(x, y, null);
        platform.setSize(width, height);
        platform.setVisible(false);
        platform.refreshBody();

        // Crear visual
        const container = this.add.container(x, y);

        const body = this.add.rectangle(0, 0, width, height, color);
        container.add(body);

        const wick = this.add.rectangle(0, -height / 2 - 15, 3, 30, 0xffffff);
        container.add(wick);

        const priceText = this.add.text(0, -height / 2 - 35, `$${price.toFixed(0)}`, {
            font: '12px Courier New',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);
        container.add(priceText);

        return {
            x, y, price, platform, container, body, priceText
        };
    }

    createPlayer() {
        // Colocar jugador sobre la vela inicial (con margen de seguridad)
        this.player = this.physics.add.sprite(
            this.currentCandle.x,
            this.currentCandle.y - 60, // Más arriba para asegurar colisión
            'playerTexture'
        );

        this.player.setCollideWorldBounds(false); // Puede caer al vacío
        this.player.setBounce(0);
        this.player.setGravityY(600); // Gravedad moderada
        this.player.setSize(35, 55); // Ajustar hitbox

        // Colisión con velas
        this.physics.add.collider(this.player, this.candles, () => {
            // Cuando aterriza, detener movimiento horizontal si no está en RESOLVING
            if (this.gameState !== 'RESOLVING') {
                this.player.setVelocityX(0);
            }
        });

        // Animación de correr
        this.runAnimation = this.tweens.add({
            targets: this.player,
            scaleX: 1.05,
            scaleY: 0.95,
            duration: 120,
            yoyo: true,
            repeat: -1,
            paused: true
        });
    }

    createPhaseIndicator() {
        this.phaseText = this.add.text(600, 50, 'ESPERANDO...', {
            font: 'bold 28px Courier New',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0);
    }

    createPriceDisplay() {
        this.priceDisplay = this.add.text(600, 100, '', {
            font: '18px Courier New',
            fill: '#FFD700',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setScrollFactor(0);
    }

    onBetPlaced(data) {
        this.playerBet = data.direction;
        console.log(`🎯 [BET] Jugador apostó ${this.playerBet}`);
    }

    startGhostCandleRendering() {
        // Limpiar fantasma anterior
        if (this.nextCandleGhost) {
            this.nextCandleGhost.destroy();
        }

        // Crear contenedor para la vela fantasma
        const nextX = this.currentCandle.x + this.candleSpacing;
        this.nextCandleGhost = this.add.container(nextX, this.currentCandle.y);
        this.nextCandleGhost.setAlpha(0.5);

        const body = this.add.rectangle(0, 0, 120, 30, 0x888888);
        this.nextCandleGhost.add(body);
        this.nextCandleGhost.setData('body', body);

        const wick = this.add.rectangle(0, -15, 3, 30, 0xffffff);
        this.nextCandleGhost.add(wick);
        this.nextCandleGhost.setData('wick', wick);
    }

    updateGhostCandle() {
        if (!this.nextCandleGhost || !this.startPrice || !this.currentPrice) return;

        const delta = this.currentPrice - this.startPrice;
        const heightChange = delta * this.priceScale;

        // Actualizar posición Y del fantasma
        const targetY = this.currentCandle.y - heightChange;
        this.nextCandleGhost.y = targetY;

        // Actualizar color según dirección
        const body = this.nextCandleGhost.getData('body');
        const color = delta > 0 ? 0x00ff00 : (delta < 0 ? 0xff0000 : 0x888888);
        body.setFillStyle(color);

        // Actualizar display de precio
        const changePercent = (delta / this.startPrice) * 100;
        this.priceDisplay.setText(
            `$${this.currentPrice.toFixed(2)} (${delta >= 0 ? '+' : ''}${changePercent.toFixed(3)}%)`
        );
    }

    handleRoundResult(data) {
        const { result, endPrice, priceChange } = data;

        // Verificar si el jugador apostó
        if (!this.playerBet) {
            console.log('⚠️ [NO BET] Jugador no apostó - Destruyendo plataforma');
            this.destroyCurrentPlatform();
            return;
        }

        // 1. Solidificar la vela fantasma
        if (this.nextCandleGhost) {
            const nextX = this.nextCandleGhost.x;
            const nextY = this.nextCandleGhost.y;
            const color = result === 'LONG' ? 0x00ff00 : (result === 'SHORT' ? 0xff0000 : 0xFFD700);

            // Destruir fantasma
            this.nextCandleGhost.destroy();
            this.nextCandleGhost = null;

            // Crear vela real
            const newCandle = this.createCandlePlatform(nextX, nextY, endPrice, color);
            this.currentCandle = newCandle;
            this.candleHistory.push(newCandle);
            this.lastCandlePrice = endPrice;

            // 2. Ejecutar movimiento del jugador
            this.time.delayedCall(500, () => {
                this.executePlayerMovement(result, newCandle);
            });

            // 3. Limpiar velas antiguas
            this.cleanupOldCandles();
        }

        // Mostrar resultado
        this.showResultText(result, priceChange);
    }

    executePlayerMovement(result, targetCandle) {
        if (!this.playerBet) {
            console.warn('⚠️ No hay apuesta registrada');
            return;
        }

        const won = this.playerBet === result;

        console.log(`🎯 Ejecutando movimiento: ${this.playerBet}, Ganó: ${won}`);
        console.log(`📍 Target: x=${targetCandle.x}, y=${targetCandle.y}`);

        if (won) {
            // Si GANÓ: Usar tween para garantizar llegada a la plataforma
            const jumpHeight = this.playerBet === 'LONG' ? -100 : -30;

            this.tweens.add({
                targets: this.player,
                x: targetCandle.x,
                y: targetCandle.y - 60, // Posición sobre la plataforma
                duration: 1200,
                ease: 'Quad.easeInOut',
                onStart: () => {
                    // Dar impulso físico inicial
                    if (this.playerBet === 'LONG') {
                        this.player.setVelocityY(-400);
                        this.runAnimation.pause();
                    } else {
                        this.player.setVelocityY(-200);
                        this.runAnimation.resume();
                    }
                },
                onUpdate: (tween, target) => {
                    // Sincronizar física con tween
                    const progress = tween.progress;
                    if (progress > 0.8) {
                        // Al final del salto, reducir velocidad para aterrizaje suave
                        this.player.setVelocityY(Math.min(this.player.body.velocity.y, 200));
                    }
                },
                onComplete: () => {
                    console.log('✅ Jugador llegó a la plataforma');
                    this.player.setVelocity(0, 0);
                    this.createSuccessParticles(targetCandle.x, targetCandle.y);
                    this.runAnimation.pause();
                }
            });

        } else {
            // Si PERDIÓ: Aplicar física normal y dejar que caiga
            if (this.playerBet === 'LONG') {
                this.player.setVelocityX(300);
                this.player.setVelocityY(-400);
                console.log('💀 [LONG FAIL] Plataforma muy baja, jugador caerá');
            } else {
                this.player.setVelocityX(350);
                this.player.setVelocityY(-100);
                console.log('💀 [SHORT FAIL] Plataforma muy alta, jugador chocará');
            }
        }

        // Pan de cámara suave
        this.cameras.main.pan(targetCandle.x, this.cameras.main.scrollY + 350, 1500, 'Power2');

        // Resetear apuesta después de un delay
        this.time.delayedCall(2000, () => {
            this.playerBet = null;
        });
    }

    destroyCurrentPlatform() {
        if (!this.currentCandle) return;

        // Animación de destrucción de la plataforma
        const platform = this.currentCandle.platform;
        const container = this.currentCandle.container;
        const body = this.currentCandle.body;

        // Efecto de temblor
        this.tweens.add({
            targets: container,
            y: container.y + 5,
            duration: 100,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                // Hacer caer la plataforma
                this.tweens.add({
                    targets: container,
                    y: 800, // Caer fuera de pantalla
                    angle: Phaser.Math.Between(-45, 45),
                    alpha: 0,
                    duration: 1500,
                    ease: 'Quad.easeIn'
                });

                // Destruir plataforma física
                if (platform) {
                    this.time.delayedCall(100, () => {
                        platform.destroy();
                    });
                }
            }
        });

        // Partículas de destrucción
        for (let i = 0; i < 20; i++) {
            const particle = this.add.rectangle(
                this.currentCandle.x,
                this.currentCandle.y,
                10, 10,
                0xff0000
            );
            this.tweens.add({
                targets: particle,
                x: this.currentCandle.x + Phaser.Math.Between(-100, 100),
                y: this.currentCandle.y + Phaser.Math.Between(50, 200),
                alpha: 0,
                duration: 1000,
                onComplete: () => particle.destroy()
            });
        }

        // Texto de advertencia
        const warningText = this.add.text(
            this.currentCandle.x,
            this.currentCandle.y - 100,
            '⚠️ NO APOSTASTE\nPLATAFORMA DESTRUIDA',
            {
                font: 'bold 24px Courier New',
                fill: '#ff0000',
                stroke: '#000',
                strokeThickness: 5,
                align: 'center'
            }
        ).setOrigin(0.5);

        this.tweens.add({
            targets: warningText,
            y: warningText.y - 50,
            alpha: 0,
            duration: 2000,
            onComplete: () => warningText.destroy()
        });

        // El jugador caerá al vacío por gravedad
        console.log('💀 Plataforma destruida - Jugador caerá');
    }

    cleanupOldCandles() {
        // Eliminar velas que están muy atrás
        while (this.candleHistory.length > 6) {
            const oldCandle = this.candleHistory.shift();
            if (oldCandle.platform) oldCandle.platform.destroy();
            if (oldCandle.container) oldCandle.container.destroy();
        }
    }

    updatePhaseVisuals(state) {
        const phaseConfig = {
            'BETTING': { color: 0x00ff00, alpha: 0.2, text: '🟢 BETTING', textColor: '#00ff00' },
            'LOCKED': { color: 0xff0000, alpha: 0.3, text: '🔴 LOCKED', textColor: '#ff0000' },
            'RESOLVING': { color: 0xffd700, alpha: 0.25, text: '🟡 RESOLVING', textColor: '#ffd700' },
            'WAITING': { color: 0x888888, alpha: 0.2, text: '⚪ WAITING', textColor: '#888888' }
        };

        const config = phaseConfig[state] || phaseConfig['WAITING'];

        this.tweens.add({
            targets: this.phaseOverlay,
            fillColor: config.color,
            fillAlpha: config.alpha,
            duration: 500
        });

        this.phaseText.setText(config.text);
        this.phaseText.setColor(config.textColor);

        if (state === 'LOCKED') {
            this.runAnimation.resume();
        } else {
            this.runAnimation.pause();
            this.player.setScale(1);
        }
    }

    showResultText(result, priceChange) {
        const resultConfig = {
            'LONG': { text: '📈 LONG GANA!', color: '#00ff00' },
            'SHORT': { text: '📉 SHORT GANA!', color: '#ff0000' },
            'DRAW': { text: '⚖️ EMPATE!', color: '#ffd700' }
        };

        const config = resultConfig[result] || resultConfig['DRAW'];

        const text = this.add.text(this.player.x, this.player.y - 100, config.text, {
            font: 'bold 36px Courier New',
            fill: config.color,
            stroke: '#000',
            strokeThickness: 5
        }).setOrigin(0.5);

        this.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            duration: 2000,
            onComplete: () => text.destroy()
        });
    }

    update() {
        // Detectar caída al vacío
        if (this.player.y > 700) {
            console.log('💀 [GAME OVER] Jugador cayó al vacío');
            this.handleGameOver();
        }

        // Control manual (testing)
        if (this.cursors.space.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-450);
        }

        // NO frenar al jugador durante RESOLVING (está saltando entre plataformas)
        if (this.player.body.touching.down && this.gameState === 'BETTING') {
            this.player.setVelocityX(0);
        }
    }

    handleGameOver() {
        this.player.setVelocity(0, 0);
        this.player.y = 700; // Fuera de pantalla

        const gameOverText = this.add.text(600, 350, '💀 GAME OVER', {
            font: 'bold 64px Courier New',
            fill: '#ff0000',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5).setScrollFactor(0);

        this.tweens.add({
            targets: gameOverText,
            scale: 1.2,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        // Reiniciar después de 3 segundos
        this.time.delayedCall(3000, () => {
            this.scene.restart();
        });
    }
}
