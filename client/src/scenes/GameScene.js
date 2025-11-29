// 🎮 GAME SCENE - Endless Runner de Plataformas
// El personaje salta de vela en vela según los resultados de las rondas

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        // Estado del juego
        this.gameState = 'WAITING';
        this.roundNumber = 0;
        this.lastEndPrice = 90000; // Precio inicial de referencia

        // Sistema de plataformas
        this.candles = [];
        this.currentCandleIndex = 0;
        this.nextCandleX = 300; // Posición X de la próxima vela

        // Configuración visual
        this.baseY = 400; // Línea base de referencia
        this.priceToPixelScale = 0.05; // 1 USD = 0.05 pixels de altura
    }

    create() {
        console.log('🎮 [GAME] Escena principal iniciada');

        // Conectar a Socket.io
        this.socket = io();
        this.setupSocketListeners();

        // Crear elementos visuales
        this.createBackground();
        this.createParallaxParticles();
        this.createGround();

        // Crear grupo de plataformas (velas)
        this.candleGroup = this.physics.add.staticGroup();

        // Crear primera vela
        this.spawnNextCandle(this.lastEndPrice, true);

        // Crear jugador
        this.createPlayer();
        this.createPhaseIndicator();

        // Configurar cámara para seguir al jugador
        this.cameras.main.setBounds(0, 0, 10000, 700);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Controles
        this.cursors = this.input.keyboard.createCursorKeys();
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
                this.highlightCurrentCandle();
            }

            this.updatePhaseVisuals(data.state);
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
        this.backgroundRect = this.add.rectangle(
            0, 0,
            10000, 700,
            0x0a0a0a
        ).setOrigin(0, 0);

        this.phaseOverlay = this.add.rectangle(
            0, 0,
            10000, 700,
            0x000000,
            0.3
        ).setOrigin(0, 0);
        this.phaseOverlay.setScrollFactor(0); // Fixed to camera
    }

    createParallaxParticles() {
        this.particles = [];
        for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(0, 10000);
            const y = Phaser.Math.Between(0, 600);
            const particle = this.add.image(x, y, 'particleTexture');
            particle.setAlpha(Phaser.Math.FloatBetween(0.1, 0.5));
            particle.setScale(Phaser.Math.FloatBetween(0.5, 1.5));
            particle.setScrollFactor(0.3); // Parallax effect
            this.particles.push(particle);
        }
    }

    createGround() {
        const width = 10000;
        this.ground = this.add.tileSprite(
            width / 2, 650,
            width, 100,
            'groundTexture'
        );
        this.physics.add.existing(this.ground, true);
    }

    createPlayer() {
        // Colocar jugador en la primera vela
        const firstCandle = this.candles[0];
        this.player = this.physics.add.sprite(
            firstCandle.x,
            firstCandle.y - 80,
            'playerTexture'
        );

        this.player.setCollideWorldBounds(false);
        this.player.setBounce(0.1);

        // Colisión con velas
        this.physics.add.collider(this.player, this.candleGroup);
        this.physics.add.collider(this.player, this.ground);

        // Animación de correr
        this.runTween = this.tweens.add({
            targets: this.player,
            scaleY: 0.9,
            scaleX: 1.1,
            duration: 150,
            yoyo: true,
            repeat: -1,
            paused: true
        });
    }

    createPhaseIndicator() {
        this.phaseText = this.add.text(
            600, 50,
            'ESPERANDO...',
            {
                font: 'bold 32px Courier New',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        this.phaseText.setOrigin(0.5);
        this.phaseText.setScrollFactor(0); // Fixed to camera
    }

    /**
     * Genera la siguiente vela (plataforma)
     * @param {number} price - Precio de Bitcoin para esta vela
     * @param {boolean} isFirst - Si es la primera vela
     */
    spawnNextCandle(price, isFirst = false) {
        const candleWidth = 120;
        const candleHeight = 40;

        // Calcular posición Y basada en el precio
        let candleY = this.baseY;

        if (!isFirst && this.candles.length > 0) {
            const priceChange = price - this.lastEndPrice;
            const heightDelta = priceChange * this.priceToPixelScale;

            // La nueva vela está más arriba si el precio subió, más abajo si bajó
            candleY = this.candles[this.candles.length - 1].y - heightDelta;

            // Limitar altura para que no se salga de pantalla
            candleY = Phaser.Math.Clamp(candleY, 200, 600);
        }

        // Crear plataforma visual
        const candle = this.add.container(this.nextCandleX, candleY);

        // Cuerpo de la vela (rectángulo)
        const body = this.add.rectangle(0, 0, candleWidth, candleHeight, 0x888888);
        candle.add(body);

        // Mecha (línea vertical)
        const wick = this.add.rectangle(0, -candleHeight / 2 - 20, 4, 40, 0xffffff);
        candle.add(wick);

        // Texto de precio
        const priceText = this.add.text(0, -candleHeight / 2 - 50, `$${price.toFixed(0)}`, {
            font: '14px Courier New',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 3 }
        }).setOrigin(0.5);
        candle.add(priceText);

        // Añadir física a la plataforma
        const platform = this.candleGroup.create(this.nextCandleX, candleY, null);
        platform.setSize(candleWidth, candleHeight);
        platform.setVisible(false); // Invisible, solo física
        platform.refreshBody();

        // Guardar referencia
        candle.setData('price', price);
        candle.setData('body', body);
        candle.setData('priceText', priceText);
        candle.setData('platform', platform);
        this.candles.push(candle);

        // Actualizar posición para la próxima vela
        this.nextCandleX += 250;
        this.lastEndPrice = price;

        return candle;
    }

    highlightCurrentCandle() {
        const currentCandle = this.candles[this.currentCandleIndex];
        if (currentCandle) {
            const body = currentCandle.getData('body');
            this.tweens.add({
                targets: body,
                fillColor: 0xFFD700, // Dorado
                duration: 300
            });
        }
    }

    /**
     * Maneja el resultado de la ronda
     */
    handleRoundResult(data) {
        const { result, endPrice, priceChange } = data;

        // Colorear la vela actual según el resultado
        const currentCandle = this.candles[this.currentCandleIndex];
        if (currentCandle) {
            const body = currentCandle.getData('body');
            const resultColor = result === 'LONG' ? 0x00ff00 : (result === 'SHORT' ? 0xff0000 : 0xffd700);

            this.tweens.add({
                targets: body,
                fillColor: resultColor,
                duration: 500
            });
        }

        // Mostrar resultado visual
        this.showResult(result, priceChange);

        // Generar siguiente vela
        this.time.delayedCall(1500, () => {
            const nextCandle = this.spawnNextCandle(endPrice);
            this.currentCandleIndex++;

            // Hacer que el jugador salte a la siguiente vela
            this.jumpToNextCandle(nextCandle);

            // Limpiar velas antiguas (mantener solo las últimas 5)
            this.cleanupOldCandles();
        });
    }

    jumpToNextCandle(targetCandle) {
        // Animación de salto del jugador
        this.runTween.pause();

        this.tweens.add({
            targets: this.player,
            x: targetCandle.x,
            y: targetCandle.y - 80,
            duration: 800,
            ease: 'Quad.easeOut',
            onStart: () => {
                // Impulso visual de salto
                this.player.body.setVelocityY(-300);
            },
            onComplete: () => {
                this.runTween.resume();

                // Partículas de aterrizaje
                this.createLandingParticles(targetCandle.x, targetCandle.y);
            }
        });

        // Pan de cámara suave
        this.cameras.main.pan(targetCandle.x, this.cameras.main.scrollY + 350, 1000, 'Power2');
    }

    createLandingParticles(x, y) {
        for (let i = 0; i < 10; i++) {
            const particle = this.add.rectangle(x, y, 8, 8, 0xFFD700);
            this.tweens.add({
                targets: particle,
                x: x + Phaser.Math.Between(-50, 50),
                y: y + Phaser.Math.Between(20, 60),
                alpha: 0,
                duration: 600,
                onComplete: () => particle.destroy()
            });
        }
    }

    cleanupOldCandles() {
        // Eliminar velas que están muy atrás
        while (this.candles.length > 5) {
            const oldCandle = this.candles.shift();
            const platform = oldCandle.getData('platform');
            if (platform) platform.destroy();
            oldCandle.destroy();
        }
    }

    updatePhaseVisuals(state) {
        const phaseConfig = {
            'BETTING': {
                color: 0x00ff00,
                alpha: 0.2,
                text: '🟢 BETTING',
                textColor: '#00ff00'
            },
            'LOCKED': {
                color: 0xff0000,
                alpha: 0.3,
                text: '🔴 LOCKED',
                textColor: '#ff0000'
            },
            'RESOLVING': {
                color: 0xffd700,
                alpha: 0.25,
                text: '🟡 RESOLVING',
                textColor: '#ffd700'
            },
            'WAITING': {
                color: 0x888888,
                alpha: 0.2,
                text: '⚪ WAITING',
                textColor: '#888888'
            }
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

        // Activar/desactivar animación de correr
        if (state === 'LOCKED') {
            this.runTween.resume();
        } else {
            this.runTween.pause();
            this.player.setScale(1);
        }
    }

    showResult(result, priceChange) {
        const resultConfig = {
            'LONG': { color: 0x00ff00, text: '📈 LONG GANA!' },
            'SHORT': { color: 0xff0000, text: '📉 SHORT GANA!' },
            'DRAW': { color: 0xffd700, text: '⚖️ EMPATE!' }
        };

        const config = resultConfig[result] || resultConfig['DRAW'];

        const resultText = this.add.text(
            this.player.x,
            this.player.y - 150,
            config.text,
            {
                font: 'bold 48px Courier New',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 6
            }
        );
        resultText.setOrigin(0.5);
        resultText.setAlpha(0);

        this.tweens.add({
            targets: resultText,
            alpha: 1,
            y: resultText.y - 50,
            duration: 500,
            yoyo: true,
            repeat: 1,
            onComplete: () => resultText.destroy()
        });

        // Partículas de celebración
        this.createParticleEffect(this.player.x, this.player.y, config.color);

        if (result === 'SHORT') {
            this.cameras.main.shake(300, 0.005);
        }
    }

    createParticleEffect(x, y, color) {
        for (let i = 0; i < 20; i++) {
            const particle = this.add.rectangle(x, y, 10, 10, color);
            this.tweens.add({
                targets: particle,
                x: x + Phaser.Math.Between(-200, 200),
                y: y + Phaser.Math.Between(-150, 150),
                alpha: 0,
                angle: 360,
                scale: 0,
                duration: 1200,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    update() {
        // Control manual opcional (para testing)
        if (this.cursors.space.isDown && this.player.body.touching.down) {
            this.player.body.setVelocityY(-400);
        }

        // Aplicar velocidad horizontal constante durante LOCKED
        if (this.gameState === 'LOCKED') {
            this.player.body.setVelocityX(50);
        } else {
            this.player.body.setVelocityX(0);
        }
    }
}
