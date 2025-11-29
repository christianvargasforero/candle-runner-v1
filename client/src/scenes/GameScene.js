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

        // Configuración de scroll
        this.scrollSpeed = 0;
    }

    create() {
        console.log('🎮 [GAME] Escena principal iniciada');

        // Conectar a Socket.io
        this.socket = io();
        this.setupSocketListeners();

        // Crear elementos visuales en orden de capas
        this.createBackground();
        this.createParallaxParticles(); // Partículas de fondo
        this.createGround(); // Suelo con scroll
        this.createPlayer(); // Sprite del jugador
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
            this.updateScrollSpeed(data.state);
        });

        // Evento: Sincronización de tiempo
        this.socket.on('SYNC_TIME', (data) => {
            // La UI Scene manejará el temporizador
        });

        // Evento: Resultado de la ronda
        this.socket.on('ROUND_RESULT', (data) => {
            console.log('🏆 [ROUND_RESULT]', data);
            this.endPrice = data.endPrice;
            this.showResult(data.result, data.priceChange);

            // Actualizar vela final con tween suave
            if (data.endPrice) {
                this.updateCandle(data.endPrice);
            }
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

    createParallaxParticles() {
        // Crear grupo de partículas de fondo (polvo digital)
        this.particles = [];
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, this.cameras.main.width);
            const y = Phaser.Math.Between(0, this.cameras.main.height - 100);
            const particle = this.add.image(x, y, 'particleTexture');
            particle.setAlpha(Phaser.Math.FloatBetween(0.1, 0.5));
            particle.setScale(Phaser.Math.FloatBetween(0.5, 1.5));
            this.particles.push({
                sprite: particle,
                speed: Phaser.Math.FloatBetween(0.5, 2)
            });
        }
    }

    createGround() {
        // Suelo usando TileSprite para efecto de scroll infinito
        const width = this.cameras.main.width;
        const height = 100; // Altura del suelo

        // TileSprite permite repetir la textura
        this.ground = this.add.tileSprite(
            width / 2,
            this.cameras.main.height - 50,
            width,
            height,
            'groundTexture'
        );

        // Añadir física al suelo
        this.physics.add.existing(this.ground, true); // Static body
    }

    createPlayer() {
        // Personaje usando Sprite con textura generada
        this.player = this.physics.add.sprite(200, 500, 'playerTexture');

        // Configurar física
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0.1);
        this.physics.add.collider(this.player, this.ground);

        // Animación de "correr" (simulada con tweens por ahora)
        this.runTween = this.tweens.add({
            targets: this.player,
            scaleY: 0.9,
            scaleX: 1.1,
            y: '+=2',
            duration: 150,
            yoyo: true,
            repeat: -1,
            paused: true
        });
    }

    createCandle() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Contenedor de la vela
        this.candleContainer = this.add.container(centerX, centerY);

        // Cuerpo de la vela
        this.candleBody = this.add.rectangle(0, 0, 80, 100, 0x888888);
        this.candleContainer.add(this.candleBody);

        // Mecha (Wick) - Línea vertical
        this.candleWick = this.add.rectangle(0, 0, 4, 100, 0xffffff);
        this.candleContainer.addAt(this.candleWick, 0); // Detrás del cuerpo

        // Línea de precio inicial
        this.priceLine = this.add.line(0, 0, -200, 0, 200, 0, 0xffd700, 1);
        this.priceLine.setLineWidth(2);
        this.candleContainer.add(this.priceLine);

        // Texto de precio
        this.priceText = this.add.text(0, -180, 'Esperando precio...', {
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

    updateScrollSpeed(state) {
        // Ajustar velocidad de scroll según la fase
        if (state === 'LOCKED') {
            // Fase de acción: Velocidad máxima
            this.tweens.add({
                targets: this,
                scrollSpeed: 10,
                duration: 1000,
                ease: 'Power2'
            });
            if (this.runTween) this.runTween.resume();
        } else if (state === 'RESOLVING') {
            // Fase de resultado: Ralentizar
            this.tweens.add({
                targets: this,
                scrollSpeed: 2,
                duration: 500,
                ease: 'Power2'
            });
            if (this.runTween) this.runTween.pause();
        } else {
            // Betting/Waiting: Parado o muy lento
            this.tweens.add({
                targets: this,
                scrollSpeed: 0.5,
                duration: 1000,
                ease: 'Power2'
            });
            if (this.runTween) this.runTween.pause();
            // Resetear escala del jugador
            this.player.setScale(1);
        }
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
        this.tweens.add({
            targets: this.candleBody,
            width: 80,
            height: 100,
            y: 0,
            fillColor: 0x888888, // Gris neutral
            duration: 500
        });

        // Resetear mecha
        this.candleWick.height = 100;
        this.candleWick.y = 0;

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

        let targetColor = 0x888888;
        let targetY = 0;
        let targetHeight = 100 + heightChange;

        // Determinar color y dirección
        if (priceChange > 0) {
            // LONG (Verde, crece hacia arriba)
            targetColor = 0x00ff00;
            targetY = -(heightChange / 2);
        } else if (priceChange < 0) {
            // SHORT (Rojo, crece hacia abajo)
            targetColor = 0xff0000;
            targetY = heightChange / 2;
        }

        // Aplicar Tween suave a la vela
        this.tweens.add({
            targets: this.candleBody,
            height: targetHeight,
            y: targetY,
            duration: 300, // Suavizado
            ease: 'Power1',
            onUpdate: () => {
                this.candleBody.setFillStyle(targetColor);
            }
        });

        // Actualizar mecha (siempre conecta extremos)
        this.tweens.add({
            targets: this.candleWick,
            height: targetHeight + 50, // Un poco más larga
            y: targetY,
            duration: 300
        });

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

        // Screen Shake si es SHORT (sensación de caída/pérdida)
        if (result === 'SHORT') {
            this.cameras.main.shake(500, 0.01);
        }
    }

    createParticleEffect(color) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Crear partículas simples
        for (let i = 0; i < 30; i++) {
            const particle = this.add.rectangle(centerX, centerY, 10, 10, color);

            this.tweens.add({
                targets: particle,
                x: centerX + Phaser.Math.Between(-400, 400),
                y: centerY + Phaser.Math.Between(-300, 300),
                alpha: 0,
                angle: 360,
                scale: 0,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }

    update() {
        // Actualizar lógica del juego cada frame

        // Scroll del suelo (Parallax)
        if (this.ground && this.scrollSpeed > 0) {
            this.ground.tilePositionX += this.scrollSpeed;
        }

        // Scroll de partículas (Parallax más lento)
        if (this.particles) {
            this.particles.forEach(p => {
                p.sprite.x -= this.scrollSpeed * p.speed * 0.5;
                // Resetear posición si sale de pantalla
                if (p.sprite.x < -20) {
                    p.sprite.x = this.cameras.main.width + 20;
                    p.sprite.y = Phaser.Math.Between(0, this.cameras.main.height - 100);
                }
            });
        }

        // Control opcional del jugador (para testing)
        if (this.cursors.space.isDown && this.player.body.touching.down) {
            this.player.body.setVelocityY(-500); // Saltar más alto
        }
    }
}
