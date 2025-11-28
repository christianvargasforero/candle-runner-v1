// 🎮 GAME SCENE - Escena Principal del Juego
// Aquí se renderiza el personaje, las velas y la lógica visual

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        // Estado del juego
        this.gameState = 'WAITING';
        this.currentPrice = null;
        this.startPrice = null;
        this.endPrice = null;
        this.roundNumber = 0;
    }

    create() {
        console.log('🎮 [GAME] Escena principal iniciada');

        // Conectar a Socket.io
        this.socket = io();
        this.setupSocketListeners();

        // Crear elementos visuales
        this.createBackground();
        this.createGround();
        this.createPlayer();
        this.createCandle();
        this.createPhaseIndicator();

        // Configurar controles (opcional para testing)
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    setupSocketListeners() {
        // Evento: Conexión establecida
        this.socket.on('connect', () => {
            console.log('✅ [SOCKET] Conectado al servidor');
        });

        // Evento: Estado del juego (cambio de fase)
        this.socket.on('GAME_STATE', (data) => {
            console.log('🎮 [GAME_STATE]', data);
            this.gameState = data.state;
            this.roundNumber = data.roundNumber;

            if (data.startPrice) {
                this.startPrice = data.startPrice;
                this.resetCandle();
            }

            this.updatePhaseVisuals(data.state);
        });

        // Evento: Sincronización de tiempo
        this.socket.on('SYNC_TIME', (data) => {
            // La UI Scene manejará el temporizador
            // Aquí solo actualizamos el precio si es necesario
        });

        // Evento: Resultado de la ronda
        this.socket.on('ROUND_RESULT', (data) => {
            console.log('🏆 [ROUND_RESULT]', data);
            this.endPrice = data.endPrice;
            this.showResult(data.result, data.priceChange);
        });

        // Evento: Error del servidor
        this.socket.on('GAME_ERROR', (data) => {
            console.error('❌ [GAME_ERROR]', data);
        });
    }

    createBackground() {
        // Fondo base
        this.backgroundRect = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x0a0a0a
        );

        // Overlay de fase (cambiará de color según la fase)
        this.phaseOverlay = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.3
        );
    }

    createGround() {
        // Suelo donde corre el personaje
        this.ground = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height - 50,
            this.cameras.main.width,
            100,
            0x1a1a2e
        );
        this.physics.add.existing(this.ground, true); // Static body
    }

    createPlayer() {
        // Personaje (rectángulo por ahora)
        this.player = this.add.rectangle(200, 500, 40, 60, 0x00ff88);
        this.physics.add.existing(this.player);

        // Configurar física
        this.player.body.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.ground);

        // Animación de "correr" (simulada con escalado)
        this.time.addEvent({
            delay: 200,
            callback: () => {
                if (this.gameState === 'LOCKED') {
                    this.tweens.add({
                        targets: this.player,
                        scaleX: 1.1,
                        scaleY: 0.9,
                        duration: 100,
                        yoyo: true
                    });
                }
            },
            loop: true
        });
    }

    createCandle() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Contenedor de la vela
        this.candleContainer = this.add.container(centerX, centerY);

        // Cuerpo de la vela (se redimensionará según el precio)
        this.candleBody = this.add.rectangle(0, 0, 80, 100, 0x888888);
        this.candleContainer.add(this.candleBody);

        // Línea de precio inicial
        this.priceLine = this.add.line(0, 0, -200, 0, 200, 0, 0xffd700, 1);
        this.priceLine.setLineWidth(2);
        this.candleContainer.add(this.priceLine);

        // Texto de precio
        this.priceText = this.add.text(0, -150, 'Esperando precio...', {
            font: '16px Courier New',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });
        this.priceText.setOrigin(0.5);
        this.candleContainer.add(this.priceText);
    }

    createPhaseIndicator() {
        // Indicador de fase en la parte superior
        this.phaseText = this.add.text(
            this.cameras.main.width / 2,
            50,
            'ESPERANDO...',
            {
                font: 'bold 32px Courier New',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        this.phaseText.setOrigin(0.5);
    }

    updatePhaseVisuals(state) {
        const phaseConfig = {
            'BETTING': {
                color: 0x00ff00,
                alpha: 0.2,
                text: '🟢 BETTING - Posicionamiento Abierto',
                textColor: '#00ff00'
            },
            'LOCKED': {
                color: 0xff0000,
                alpha: 0.3,
                text: '🔴 LOCKED - Cierre Criptográfico',
                textColor: '#ff0000'
            },
            'RESOLVING': {
                color: 0xffd700,
                alpha: 0.25,
                text: '🟡 RESOLVING - Liquidación',
                textColor: '#ffd700'
            },
            'WAITING': {
                color: 0x888888,
                alpha: 0.2,
                text: '⚪ ESPERANDO...',
                textColor: '#888888'
            }
        };

        const config = phaseConfig[state] || phaseConfig['WAITING'];

        // Animar cambio de overlay
        this.tweens.add({
            targets: this.phaseOverlay,
            fillColor: config.color,
            fillAlpha: config.alpha,
            duration: 500
        });

        // Actualizar texto de fase
        this.phaseText.setText(config.text);
        this.phaseText.setColor(config.textColor);

        // Efecto de pulso en el texto
        this.tweens.add({
            targets: this.phaseText,
            scale: 1.1,
            duration: 300,
            yoyo: true
        });
    }

    resetCandle() {
        // Resetear la vela al inicio de una nueva ronda
        this.candleBody.setFillStyle(0x888888);
        this.candleBody.setSize(80, 100);
        this.candleBody.setPosition(0, 0);

        if (this.startPrice) {
            this.priceText.setText(`Precio Entrada: $${this.startPrice.toFixed(2)}`);
        }
    }

    updateCandle(currentPrice) {
        if (!this.startPrice || !currentPrice) return;

        const priceChange = currentPrice - this.startPrice;
        const priceChangePercent = (priceChange / this.startPrice) * 100;

        // Calcular altura de la vela (escala visual)
        const maxHeight = 300;
        const heightChange = Math.min(Math.abs(priceChangePercent) * 20, maxHeight);

        // Determinar color y dirección
        if (priceChange > 0) {
            // LONG (Verde, crece hacia arriba)
            this.candleBody.setFillStyle(0x00ff00);
            this.candleBody.setSize(80, 100 + heightChange);
            this.candleBody.setPosition(0, -(heightChange / 2));
        } else if (priceChange < 0) {
            // SHORT (Rojo, crece hacia abajo)
            this.candleBody.setFillStyle(0xff0000);
            this.candleBody.setSize(80, 100 + heightChange);
            this.candleBody.setPosition(0, heightChange / 2);
        } else {
            // Sin cambio
            this.candleBody.setFillStyle(0x888888);
            this.candleBody.setSize(80, 100);
            this.candleBody.setPosition(0, 0);
        }

        // Actualizar texto
        const changeSymbol = priceChange >= 0 ? '+' : '';
        this.priceText.setText(
            `$${currentPrice.toFixed(2)} (${changeSymbol}${priceChangePercent.toFixed(4)}%)`
        );
    }

    showResult(result, priceChange) {
        // Crear efecto de partículas según el resultado
        const resultConfig = {
            'LONG': { color: 0x00ff00, text: '📈 LONG GANA!' },
            'SHORT': { color: 0xff0000, text: '📉 SHORT GANA!' },
            'DRAW': { color: 0xffd700, text: '⚖️ EMPATE!' }
        };

        const config = resultConfig[result] || resultConfig['DRAW'];

        // Texto de resultado grande
        const resultText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            config.text,
            {
                font: 'bold 64px Courier New',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 6
            }
        );
        resultText.setOrigin(0.5);
        resultText.setAlpha(0);

        // Animar aparición
        this.tweens.add({
            targets: resultText,
            alpha: 1,
            scale: 1.2,
            duration: 500,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                resultText.destroy();
            }
        });

        // Efecto de partículas simple
        this.createParticleEffect(config.color);
    }

    createParticleEffect(color) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Crear partículas simples
        for (let i = 0; i < 20; i++) {
            const particle = this.add.rectangle(centerX, centerY, 10, 10, color);

            this.tweens.add({
                targets: particle,
                x: centerX + Phaser.Math.Between(-300, 300),
                y: centerY + Phaser.Math.Between(-200, 200),
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }

    update() {
        // Actualizar lógica del juego cada frame

        // Control opcional del jugador (para testing)
        if (this.cursors.space.isDown && this.player.body.touching.down) {
            this.player.body.setVelocityY(-400); // Saltar
        }

        // Movimiento automático durante LOCKED
        if (this.gameState === 'LOCKED') {
            this.player.body.setVelocityX(100);

            // Resetear posición si sale de pantalla
            if (this.player.x > this.cameras.main.width + 50) {
                this.player.x = -50;
            }
        } else {
            this.player.body.setVelocityX(0);
        }
    }
}
