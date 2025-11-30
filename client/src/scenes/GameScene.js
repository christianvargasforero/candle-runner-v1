// 🎮 CYBERPUNK CHART RACE - Motor visual para Candle Runner
// Los jugadores corren sobre velas financieras en tiempo real

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // Historial de velas y jugadores
        this.candleHistory = [];
        this.playerSprites = new Map(); // userId -> sprite
        this.localUserId = null;
        this.passengers = [];
        
        // Zoom responsivo
        this.zoomMobile = window.innerWidth < 480 ? 0.6 : 1.0;
    }

    preload() {
        // Placeholder: Assets básicos (fallback a color si no existen)
        // Los assets faltantes se reemplazarán con círculos de colores
    }

    create() {
        console.log('[🎮 CYBERPUNK CHART RACE] Escena iniciada');

        // Fondo cyberpunk con TileSprite y parallax
        const bgWidth = this.scale.width * 3;
        const bgHeight = this.scale.height * 2;
        this.bg = this.add.rectangle(0, 0, bgWidth, bgHeight, 0x0a0a0a).setOrigin(0).setScrollFactor(0.1);
        
        // Grid digital parallax (fallback a círculos si no hay asset)
        this.createDigitalGrid();

        // Scanlines y Vignette (simulados con rectangles)
        this.createPostProcessing();

        // Audio placeholder (sin cargar assets)
        this.sfx = {
            jump: null,
            damage: null,
            burned: null
        };

        // Estado de espera con animación parpadeante
        this.waitText = this.add.text(this.scale.width / 2, 80, 'WAITING FOR PASSENGERS...', {
            font: 'bold 32px Courier New', fill: '#00fff9', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0);
        
        this.tweens.add({
            targets: this.waitText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // Configurar cámara
        this.cameras.main.setZoom(this.zoomMobile);
        this.cameras.main.setBackgroundColor('#0a0a0a');

        // Socket
        this.socket = window.globalSocket;
        this.setupSocketListeners();
        
        // Obtener el userId local
        this.socket.on('USER_PROFILE', (profile) => {
            if (!this.localUserId) {
                this.localUserId = profile.id;
                console.log('[LOCAL USER]', this.localUserId);
            }
        });
    }

    createDigitalGrid() {
        // Simulación de grid cyberpunk con líneas
        const gridGraphics = this.add.graphics();
        gridGraphics.lineStyle(1, 0x00fff9, 0.1);
        
        for (let x = 0; x < this.scale.width * 3; x += 50) {
            gridGraphics.lineBetween(x, 0, x, this.scale.height * 2);
        }
        for (let y = 0; y < this.scale.height * 2; y += 50) {
            gridGraphics.lineBetween(0, y, this.scale.width * 3, y);
        }
        
        gridGraphics.setScrollFactor(0.3);
        gridGraphics.setAlpha(0.2);
    }

    createPostProcessing() {
        // Scanlines simuladas
        const scanlines = this.add.graphics();
        scanlines.lineStyle(1, 0x000000, 0.3);
        for (let y = 0; y < this.scale.height; y += 4) {
            scanlines.lineBetween(0, y, this.scale.width, y);
        }
        scanlines.setScrollFactor(0).setDepth(1000).setAlpha(0.15);

        // Vignette
        const vignette = this.add.circle(this.scale.width / 2, this.scale.height / 2, 
            Math.max(this.scale.width, this.scale.height), 0x000000, 0.4);
        vignette.setScrollFactor(0).setDepth(1001).setScale(1.5);
        vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);
    }

    setupSocketListeners() {
        // Evento BUS_START: El bus arrancó
        this.socket.on('BUS_START', (data) => {
            this.busStarted = true;
            this.candleHistory = data.candleHistory || [];
            this.passengers = data.passengers || [];
            console.log('[BUS_START]', { candleHistory: this.candleHistory.length, passengers: this.passengers.length });
            
            this.renderCandles();
            this.spawnPlayers(this.passengers);
            this.waitText.setVisible(false);
        });

        // Evento PRICE_UPDATE: Precio en tiempo real
        this.socket.on('PRICE_UPDATE', (data) => {
            this.animateLiveCandle(data.price);
        });

        // Evento ROUND_RESULT: Resultado de la ronda
        this.socket.on('ROUND_RESULT', (data) => {
            console.log('[ROUND_RESULT]', data);
            
            if (data.candleHistory) {
                this.candleHistory = data.candleHistory;
                this.renderCandles();
            }
            
            if (data.passengerStatuses) {
                this.animatePlayers(data.passengerStatuses);
            }
        });
    }

    renderCandles() {
        // Limpiar velas anteriores
        if (this.candleGroup) this.candleGroup.clear(true, true);
        this.candleGroup = this.add.group();

        const baseX = 200;
        const spacing = 120;
        const baseY = this.scale.height / 2 + 40;

        // Calcular rango de precios para normalizar
        let minPrice = Infinity, maxPrice = -Infinity;
        this.candleHistory.forEach(c => {
            minPrice = Math.min(minPrice, c.low);
            maxPrice = Math.max(maxPrice, c.high);
        });
        const priceRange = maxPrice - minPrice || 1;

        // Dibujar cada vela
        this.candleHistory.forEach((candle, i) => {
            const x = baseX + i * spacing;
            const priceNorm = (candle.close - minPrice) / priceRange;
            const y = baseY - priceNorm * 220;
            
            const color = candle.result === 'LONG' ? 0x00ff88 : 
                         (candle.result === 'SHORT' ? 0xff0055 : 0x888888);

            // Cuerpo de la vela con glow
            const graphics = this.add.graphics();
            graphics.lineStyle(8, color, 0.9);
            graphics.strokeRect(x - 18, y - 60, 36, 120);
            graphics.fillStyle(color, 0.7);
            graphics.fillRect(x - 18, y - 10, 36, 70);
            graphics.setDepth(10);
            
            // Glow para la última vela (animada en vivo)
            if (i === this.candleHistory.length - 1) {
                graphics.setAlpha(1);
                this.tweens.add({
                    targets: graphics,
                    alpha: 0.7,
                    duration: 500,
                    yoyo: true,
                    repeat: -1
                });
            } else {
                graphics.setAlpha(0.8);
            }
            
            this.candleGroup.add(graphics);
        });

        // Centrar cámara en la última vela
        if (this.candleHistory.length) {
            const lastX = baseX + (this.candleHistory.length - 1) * spacing;
            this.cameras.main.pan(lastX, baseY, 800, 'Quad.easeOut');
        }
    }

    animateLiveCandle(price) {
        // Actualizar la última vela con el nuevo precio en tiempo real
        if (!this.candleHistory.length) return;
        
        const last = this.candleHistory[this.candleHistory.length - 1];
        last.close = price;
        
        // Re-renderizar velas para reflejar el cambio
        this.renderCandles();
    }

    spawnPlayers(passengers) {
        // Limpiar sprites previos
        this.playerSprites.forEach(sprite => sprite.destroy());
        this.playerSprites.clear();

        if (!this.candleHistory.length) return;

        const baseX = 200 + (this.candleHistory.length - 1) * 120;
        const baseY = this.scale.height / 2 - 60;

        passengers.forEach(p => {
            const isLocal = p.userId === this.localUserId;
            
            // Crear sprite (círculo de color como fallback)
            const sprite = this.add.circle(baseX, baseY, 15, isLocal ? 0x00fff9 : 0x888888, 1);
            sprite.setDepth(isLocal ? 100 : 20);
            sprite.setAlpha(isLocal ? 1 : 0.5);
            sprite.userId = p.userId;
            sprite.integrity = p.integrity;
            sprite.isBurned = p.isBurned;
            
            this.playerSprites.set(p.userId, sprite);
        });

        // Seguir al jugador local con la cámara
        const localSprite = Array.from(this.playerSprites.values()).find(s => s.userId === this.localUserId);
        if (localSprite) {
            this.cameras.main.startFollow(localSprite, true, 0.1, 0.1);
        }
    }

    animatePlayers(statuses) {
        statuses.forEach(s => {
            const sprite = this.playerSprites.get(s.userId);
            if (!sprite) return;

            if (s.status === 'WIN') {
                // Salto parabólico a la siguiente vela
                this.tweens.add({
                    targets: sprite,
                    x: sprite.x + 120,
                    y: sprite.y - 80,
                    duration: 700,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                        this.tweens.add({
                            targets: sprite,
                            y: sprite.y + 80,
                            duration: 400,
                            ease: 'Quad.easeIn'
                        });
                        this.createTrailParticles(sprite.x, sprite.y);
                    }
                });
            } else if (s.status === 'DAMAGE') {
                // Parpadeo rojo y deslizamiento a la siguiente vela
                this.tweens.add({
                    targets: sprite,
                    x: sprite.x + 120,
                    duration: 700,
                    ease: 'Quad.easeInOut',
                    onStart: () => {
                        // Parpadeo rojo
                        this.tweens.add({
                            targets: sprite,
                            alpha: 0.2,
                            fillColor: 0xff0055,
                            duration: 100,
                            yoyo: true,
                            repeat: 4
                        });
                        // Texto flotante "-1 HP"
                        this.showFloatingText('-1 HP', sprite.x, sprite.y - 60, '#ff0055');
                    }
                });
            } else if (s.status === 'BURNED') {
                // Explosión y destrucción del sprite
                this.createExplosionParticles(sprite.x, sprite.y);
                sprite.destroy();
                this.playerSprites.delete(s.userId);
                
                // Si era el jugador local, detener el seguimiento de cámara
                if (s.userId === this.localUserId) {
                    this.cameras.main.stopFollow();
                    this.showGameOver();
                }
            }
        });
    }

    createTrailParticles(x, y) {
        for (let i = 0; i < 12; i++) {
            const p = this.add.circle(x, y, 4, 0x00fff9, 0.7);
            p.setDepth(50);
            this.tweens.add({
                targets: p,
                x: x + Phaser.Math.Between(-40, 40),
                y: y + Phaser.Math.Between(20, 60),
                alpha: 0,
                duration: 600,
                onComplete: () => p.destroy()
            });
        }
    }

    createExplosionParticles(x, y) {
        for (let i = 0; i < 18; i++) {
            const p = this.add.circle(x, y, 6, 0xff0055, 0.8);
            p.setDepth(50);
            this.tweens.add({
                targets: p,
                x: x + Phaser.Math.Between(-80, 80),
                y: y + Phaser.Math.Between(-60, 60),
                alpha: 0,
                duration: 900,
                onComplete: () => p.destroy()
            });
        }
    }

    showFloatingText(text, x, y, color = '#fff') {
        const t = this.add.text(x, y, text, {
            font: 'bold 24px Courier New', fill: color, stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(200);
        
        this.tweens.add({
            targets: t,
            y: y - 40,
            alpha: 0,
            duration: 1200,
            onComplete: () => t.destroy()
        });
    }

    showGameOver() {
        const text = this.add.text(this.scale.width / 2, this.scale.height / 2, 
            '[💀 SKIN BURNED 💀]\n\nGAME OVER', {
            font: 'bold 48px Courier New',
            fill: '#ff0055',
            stroke: '#000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

        this.tweens.add({
            targets: text,
            scale: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }
}
