// 👥 PLAYER SYSTEM - Sistema de Gestión de Jugadores
// Responsabilidad: Gestionar jugador local (con física) y jugadores remotos (visuales)

export class PlayerSystem {
    constructor(scene) {
        this.scene = scene;

        // Mapa de jugadores: odId -> { sprite, nameTag, skinColor, isLocal }
        this.playerSprites = new Map();

        // Referencia al jugador local
        this.myPlayer = null;
        this.localUserId = null;

        // Colores para skins (diferenciación visual)
        this.SKIN_COLORS = [
            0x00fff9, // Neon Cyan
            0xff00ff, // Neon Pink  
            0xffff00, // Neon Yellow
            0x00ff00, // Neon Green
            0xff6600, // Neon Orange
            0x9900ff, // Neon Purple
            0xff0099, // Hot Pink
            0x00ffcc  // Turquoise
        ];

        // Configuración de física
        this.PLAYER_GRAVITY = 1000; // Gravedad pesada para que se sienta pegado al suelo
        this.PLAYER_BOUNCE = 0.2;
        this.PLAYER_FRICTION = 0.8;

        console.log('[👥 PlayerSystem] Inicializado');
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎮 CONFIGURAR USUARIO LOCAL
    // ═══════════════════════════════════════════════════════════════

    setLocalUserId(userId) {
        this.localUserId = userId;
        console.log('[👤 PlayerSystem] Usuario local:', userId);
    }

    // ═══════════════════════════════════════════════════════════════
    // 👥 SPAWN DE TODOS LOS JUGADORES
    // ═══════════════════════════════════════════════════════════════

    spawnPlayers(passengers, candleSystem) {
        // Limpiar sprites previos
        this.playerSprites.forEach(data => {
            if (data.sprite) data.sprite.destroy();
            if (data.nameTag) data.nameTag.destroy();
            if (data.integrityBar) data.integrityBar.destroy();
            if (data.integrityFill) data.integrityFill.destroy();
        });
        this.playerSprites.clear();

        if (!candleSystem.candleHistory.length) return;

        const lastIndex = candleSystem.candleHistory.length - 1;
        const spot = candleSystem.getCandleSpot(lastIndex);

        // Spawn separado para local y remotos
        passengers.forEach((p, index) => {
            const id = p.odId || p.userId || p.id;
            if (!id) return;

            const isLocal = id === this.localUserId;

            if (isLocal) {
                // Jugador local: sprite con física completa
                const playerData = this.spawnMyPlayer(id, p, spot, candleSystem);
                this.playerSprites.set(id, playerData);
            } else {
                // Otros jugadores: sprites visuales (sin colisión)
                const playerData = this.spawnOtherPlayer(id, p, spot, index);
                this.playerSprites.set(id, playerData);
            }
        });

        // Configurar cámara para seguir al jugador local
        const localData = this.playerSprites.get(this.localUserId);
        if (localData && localData.sprite) {
            this.scene.cameras.main.startFollow(localData.sprite, true, 0.1, 0.1);
            console.log('[📷 PlayerSystem] Cámara siguiendo jugador local');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎮 SPAWN JUGADOR LOCAL (CON FÍSICA)
    // ═══════════════════════════════════════════════════════════════

    spawnMyPlayer(id, playerData, spot, candleSystem) {
        const x = spot.x;
        const y = spot.y - 60; // Spawn más alto para que caiga con gravedad
        const color = playerData.skinColor || 0x00fff9;

        // Crear sprite físico
        const sprite = this.scene.physics.add.sprite(x, y, null);
        sprite.setDisplaySize(30, 30);
        sprite.setOrigin(0.5, 0.5);
        sprite.setDepth(100);

        // ============================================
        // ⚙️ CONFIGURACIÓN DE FÍSICA (CRÍTICO)
        // ============================================
        sprite.setGravityY(this.PLAYER_GRAVITY); // Gravedad fuerte para sentirse pesado
        sprite.setCollideWorldBounds(true);
        sprite.setBounce(this.PLAYER_BOUNCE); // Pequeño rebote al aterrizar
        sprite.setFriction(this.PLAYER_FRICTION); // Fricción para no resbalar

        // ============================================
        // 🎨 VISUAL: Sprite procedural del jugador
        // ============================================
        const tempGraphics = this.scene.add.graphics();

        // Glow exterior
        tempGraphics.fillStyle(color, 0.3);
        tempGraphics.fillCircle(22, 22, 22);

        // Cuerpo principal
        tempGraphics.fillStyle(color, 1);
        tempGraphics.fillCircle(22, 22, 15);

        // Borde
        tempGraphics.lineStyle(2, 0xffffff, 1);
        tempGraphics.strokeCircle(22, 22, 15);

        // Core brillante
        tempGraphics.fillStyle(0xffffff, 0.5);
        tempGraphics.fillCircle(22, 19, 5);

        // Generar textura
        tempGraphics.generateTexture('playerLocal', 44, 44);
        tempGraphics.destroy();

        // Aplicar textura
        sprite.setTexture('playerLocal');

        // ============================================
        // 📛 NOMBRE Y UI
        // ============================================
        const shortName = (playerData.skinName || playerData.skin || 'You').slice(0, 8);
        const nameTag = this.scene.add.text(0, -35, shortName, {
            font: 'bold 12px "Courier New"',
            fill: '#00fff9',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(101);

        sprite.setData('nameTag', nameTag);

        // Barra de integridad
        const integrityBar = this.scene.add.rectangle(0, 25, 30, 4, 0x333333).setDepth(101);
        const integrityPercent = (playerData.integrity || 100) / (playerData.maxIntegrity || 100);
        const integrityFill = this.scene.add.rectangle(
            -15, 25, 30 * integrityPercent, 4,
            integrityPercent > 0.5 ? 0x00ff88 : (integrityPercent > 0.2 ? 0xffff00 : 0xff0055)
        ).setOrigin(0, 0.5).setDepth(101);

        sprite.setData('integrityBar', integrityBar);
        sprite.setData('integrityFill', integrityFill);

        // ============================================
        // 🔗 COLISIONADOR CON VELAS (SOLUCIÓN AL FLOTAR)
        // ============================================
        this.scene.physics.add.collider(sprite, candleSystem.getPhysicsGroup());

        // Establecer referencia global
        this.myPlayer = sprite;

        console.log('[🎮 PlayerSystem] Jugador local spawneado con física en', x, y);
        console.log('[🔗 PlayerSystem] Colisión jugador-velas activada');

        return {
            sprite,
            nameTag,
            integrityBar,
            integrityFill,
            color,
            isLocal: true,
            odId: id
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // 👥 SPAWN JUGADOR REMOTO (SIN FÍSICA - Solo Visual)
    // ═══════════════════════════════════════════════════════════════

    spawnOtherPlayer(id, playerData, spot, index) {
        const column = index % 5;
        const row = Math.floor(index / 5);
        const jitter = (column - 2) * 18;
        const x = spot.x + jitter;
        const y = spot.y - 20 - row * 6;
        
        // TAREA 3: Diferenciación Visual
        // Usar color de skin si existe, sino generar hash consistente
        let color;
        if (playerData.skinColor) {
            color = playerData.skinColor;
        } else {
            // Hash simple del ID para color consistente
            const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            color = this.SKIN_COLORS[hash % this.SKIN_COLORS.length];
        }

        // Sprite visual simple (sin física)
        const sprite = this.scene.add.sprite(x, y, null);
        sprite.setDisplaySize(30, 30);
        sprite.setOrigin(0.5, 0.5);
        sprite.setDepth(50);
        sprite.setAlpha(0.6); // Fantasma

        // Crear textura procedural única
        const textureKey = `playerRemote_${id}`;
        const tempGraphics = this.scene.add.graphics();
        tempGraphics.fillStyle(color, 0.3);
        tempGraphics.fillCircle(22, 22, 22);
        tempGraphics.fillStyle(color, 0.8);
        tempGraphics.fillCircle(22, 22, 15);
        tempGraphics.lineStyle(2, color, 1);
        tempGraphics.strokeCircle(22, 22, 15);
        tempGraphics.generateTexture(textureKey, 44, 44);
        tempGraphics.destroy();

        // Aplicar textura
        sprite.setTexture(textureKey);

        // Nombre
        const shortName = (playerData.skinName || playerData.skin || 'Anon').slice(0, 8);
        const nameTag = this.scene.add.text(0, -35, shortName, {
            font: 'bold 12px "Courier New"',
            fill: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(51);

        sprite.setData('nameTag', nameTag);

        console.log('[👥 PlayerSystem] Jugador remoto spawneado:', shortName);

        return {
            sprite,
            nameTag,
            color,
            isLocal: false,
            odId: id
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // ➕ AÑADIR JUGADOR DINÁMICAMENTE
    // ═══════════════════════════════════════════════════════════════

    addPlayer(data, candleSystem) {
        if (!candleSystem.candleHistory.length) return;

        const lastIndex = candleSystem.candleHistory.length - 1;
        const spot = candleSystem.getCandleSpot(lastIndex);
        const id = data.id || data.odId || data.userId;
        if (!id) return;

        const isLocal = id === this.localUserId;

        if (isLocal) {
            const playerData = this.spawnMyPlayer(id, data, spot, candleSystem);
            this.playerSprites.set(id, playerData);
        } else {
            const playerData = this.spawnOtherPlayer(id, data, spot, this.playerSprites.size);
            this.playerSprites.set(id, playerData);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ➖ REMOVER JUGADOR
    // ═══════════════════════════════════════════════════════════════

    removePlayer(odId) {
        const data = this.playerSprites.get(odId);
        if (data) {
            if (data.sprite) data.sprite.destroy();
            if (data.nameTag) data.nameTag.destroy();
            if (data.integrityBar) data.integrityBar.destroy();
            if (data.integrityFill) data.integrityFill.destroy();
            this.playerSprites.delete(odId);
            console.log('[👥 PlayerSystem] Jugador removido:', odId);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎬 ANIMACIONES DE RESULTADO
    // ═══════════════════════════════════════════════════════════════

    animatePlayerResults(statuses, candleSystem) {
        statuses.forEach(s => {
            const id = s.odId || s.userId || s.id;
            const data = this.playerSprites.get(id);
            if (!data || !data.sprite) return;

            const sprite = data.sprite;

            if (s.status === 'WIN') {
                this.animateWin(sprite, data, candleSystem);
            } else if (s.status === 'DAMAGE' || s.status === 'LOSS') {
                this.animateDamage(sprite, data, candleSystem);
            } else if (s.status === 'BURNED') {
                this.animateBurned(sprite, data, id);
            } else if (s.status === 'DRAW') {
                this.animateDraw(sprite, data, candleSystem);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🏆 ANIMACIÓN DE VICTORIA
    // ═══════════════════════════════════════════════════════════════

    animateWin(sprite, data, candleSystem) {
        if (data.isLocal) {
            // 🎯 DESACTIVAR FÍSICA durante animación
            if (sprite.body) sprite.body.enable = false;

            // Salto a siguiente vela
            this.scene.tweens.add({
                targets: sprite,
                x: sprite.x + candleSystem.CANDLE_SPACING,
                y: sprite.y - 120,
                duration: 400,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    // Caída con rebote
                    this.scene.tweens.add({
                        targets: sprite,
                        y: sprite.y + 120,
                        duration: 500,
                        ease: 'Bounce.easeOut',
                        onComplete: () => {
                            // 🎯 REACTIVAR FÍSICA al aterrizar
                            if (sprite.body) {
                                sprite.body.enable = true;
                                sprite.setVelocity(0, 0);
                            }
                        }
                    });

                    this.createVictoryParticles(sprite.x, sprite.y, data.color);
                    this.showFloatingText('+WIN', sprite.x, sprite.y - 50, '#00ff88');
                }
            });
        } else {
            // Jugador remoto: tween visual
            this.scene.tweens.add({
                targets: sprite,
                x: sprite.x + candleSystem.CANDLE_SPACING,
                y: sprite.y - 100,
                duration: 500,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: sprite,
                        y: sprite.y + 100,
                        duration: 400,
                        ease: 'Bounce.easeOut'
                    });
                }
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 💥 ANIMACIÓN DE DAÑO
    // ═══════════════════════════════════════════════════════════════

    animateDamage(sprite, data, candleSystem) {
        this.createGlitchEffect(sprite);

        if (data.isLocal) {
            // 🎯 DESACTIVAR FÍSICA durante animación
            if (sprite.body) sprite.body.enable = false;

            // Tween horizontal suave
            this.scene.tweens.add({
                targets: sprite,
                x: sprite.x + candleSystem.CANDLE_SPACING,
                duration: 600,
                ease: 'Cubic.easeInOut',
                onComplete: () => {
                    // 🎯 REACTIVAR FÍSICA
                    if (sprite.body) {
                        sprite.body.enable = true;
                        sprite.setVelocity(0, 0);
                    }
                }
            });

            // Flash rojo
            this.scene.tweens.add({
                targets: sprite,
                alpha: 0.3,
                duration: 100,
                yoyo: true,
                repeat: 2
            });
        } else {
            // Jugador remoto
            this.scene.tweens.add({
                targets: sprite,
                x: sprite.x + candleSystem.CANDLE_SPACING,
                duration: 800,
                ease: 'Cubic.easeInOut'
            });
        }

        this.showFloatingText('-1 HP', sprite.x, sprite.y - 50, '#ff0055');
    }

    // ═══════════════════════════════════════════════════════════════
    // 💀 ANIMACIÓN DE QUEMADO
    // ═══════════════════════════════════════════════════════════════

    animateBurned(sprite, data, id) {
        this.createExplosion(sprite.x, sprite.y);
        this.showFloatingText('💀 BURNED', sprite.x, sprite.y - 60, '#ff0055');

        // Destruir sprite
        this.scene.time.delayedCall(500, () => {
            if (data.nameTag) data.nameTag.destroy();
            if (data.integrityBar) data.integrityBar.destroy();
            if (data.integrityFill) data.integrityFill.destroy();
            sprite.destroy();

            this.playerSprites.delete(id);

            // Si era el jugador local, mostrar Game Over
            if (id === this.localUserId) {
                this.scene.cameras.main.stopFollow();
                this.showGameOver();
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🤷 ANIMACIÓN DE EMPATE (DRAW) - CORREGIDA
    // ═══════════════════════════════════════════════════════════════

    animateDraw(sprite, data, candleSystem) {
        // ⚠️ CORRECCIÓN CRÍTICA: El jugador NO puede quedarse atrás
        // Debe saltar a la nueva vela (currentIndex + 1) para no perderse en el scroll

        if (data.isLocal) {
            // 🎯 DESACTIVAR FÍSICA durante animación
            if (sprite.body) sprite.body.enable = false;

            // Salto a siguiente vela (igual que WIN pero sin celebración)
            this.scene.tweens.add({
                targets: sprite,
                x: sprite.x + candleSystem.CANDLE_SPACING,
                y: sprite.y - 80, // Salto más bajo que victoria
                duration: 500,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    // Caída suave
                    this.scene.tweens.add({
                        targets: sprite,
                        y: sprite.y + 80,
                        duration: 400,
                        ease: 'Quad.easeInOut',
                        onComplete: () => {
                            // 🎯 REACTIVAR FÍSICA al aterrizar
                            if (sprite.body) {
                                sprite.body.enable = true;
                                sprite.setVelocity(0, 0);
                            }

                            // Emote de confusión al aterrizar
                            this.showConfusionEmote(sprite.x, sprite.y);
                        }
                    });
                }
            });
        } else {
            // Jugador remoto: salto visual simple
            this.scene.tweens.add({
                targets: sprite,
                x: sprite.x + candleSystem.CANDLE_SPACING,
                y: sprite.y - 60,
                duration: 500,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: sprite,
                        y: sprite.y + 60,
                        duration: 400,
                        ease: 'Quad.easeInOut',
                        onComplete: () => {
                            this.showConfusionEmote(sprite.x, sprite.y);
                        }
                    });
                }
            });
        }

        // Texto flotante NEUTRO (blanco/gris)
        this.showFloatingText('DRAW', sprite.x, sprite.y - 50, '#cccccc');

        console.log(`[🤷 PlayerSystem] Animación de empate (salto a nueva vela) para jugador ${data.isLocal ? 'local' : 'remoto'}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🤔 EMOTE DE CONFUSIÓN
    // ═══════════════════════════════════════════════════════════════

    showConfusionEmote(x, y) {
        // Mostrar "..." sobre la cabeza del jugador
        const emote = this.scene.add.text(
            x,
            y - 50,
            '...',
            {
                font: 'bold 32px Arial',
                fill: '#ffffff',
                stroke: '#000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(500);

        // Animación de aparición y desaparición
        emote.setAlpha(0);
        this.scene.tweens.add({
            targets: emote,
            alpha: 1,
            y: y - 60,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Mantener visible 1 segundo
                this.scene.time.delayedCall(1000, () => {
                    this.scene.tweens.add({
                        targets: emote,
                        alpha: 0,
                        y: y - 70,
                        duration: 300,
                        onComplete: () => emote.destroy()
                    });
                });
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎨 EFECTOS VISUALES
    // ═══════════════════════════════════════════════════════════════

    createVictoryParticles(x, y, color) {
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const distance = 50;

            const particle = this.scene.add.circle(x, y, 5, color, 0.8);
            particle.setDepth(60);

            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                scale: 0.2,
                duration: 800,
                onComplete: () => particle.destroy()
            });
        }
    }

    createGlitchEffect(sprite) {
        const originalX = sprite.x;

        this.scene.tweens.add({
            targets: sprite,
            x: originalX + Phaser.Math.Between(-10, 10),
            duration: 50,
            yoyo: true,
            repeat: 5
        });
    }

    createExplosion(x, y) {
        // Onda expansiva
        const shockwave = this.scene.add.circle(x, y, 10, 0xff0055, 0.8);
        shockwave.setDepth(70);

        this.scene.tweens.add({
            targets: shockwave,
            scale: 8,
            alpha: 0,
            duration: 600,
            onComplete: () => shockwave.destroy()
        });

        // Partículas de explosión
        for (let i = 0; i < 25; i++) {
            const particle = this.scene.add.circle(x, y, Phaser.Math.Between(3, 8),
                Phaser.Math.RND.pick([0xff0055, 0xff6600, 0xffff00]), 0.9);
            particle.setDepth(65);

            const angle = Math.random() * Math.PI * 2;
            const speed = Phaser.Math.Between(80, 200);

            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                duration: Phaser.Math.Between(400, 800),
                onComplete: () => particle.destroy()
            });
        }

        // Screen shake
        this.scene.cameras.main.shake(300, 0.01);
    }

    showFloatingText(text, x, y, color) {
        const t = this.scene.add.text(x, y, text, {
            font: 'bold 28px "Courier New"',
            fill: color,
            stroke: '#000',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(500);

        this.scene.tweens.add({
            targets: t,
            y: y - 60,
            alpha: 0,
            scale: 1.3,
            duration: 1500,
            ease: 'Quad.easeOut',
            onComplete: () => t.destroy()
        });
    }

    showGameOver() {
        const panel = this.scene.add.container(this.scene.scale.width / 2, this.scene.scale.height / 2);
        panel.setScrollFactor(0).setDepth(2000);

        const bg = this.scene.add.rectangle(0, 0, 500, 250, 0x000000, 0.9);
        bg.setStrokeStyle(3, 0xff0055);
        panel.add(bg);

        const title = this.scene.add.text(0, -60, '[ 💀 SKIN BURNED 💀 ]', {
            font: 'bold 36px "Courier New"',
            fill: '#ff0055',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);
        panel.add(title);

        const subtitle = this.scene.add.text(0, 10, 'GAME OVER', {
            font: 'bold 48px "Courier New"',
            fill: '#ffffff',
            stroke: '#ff0055',
            strokeThickness: 6
        }).setOrigin(0.5);
        panel.add(subtitle);

        const instruction = this.scene.add.text(0, 80, 'Repair your skin to continue', {
            font: '18px "Courier New"',
            fill: '#888888'
        }).setOrigin(0.5);
        panel.add(instruction);

        this.scene.tweens.add({
            targets: subtitle,
            scale: 1.05,
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔄 UPDATE LOOP
    // ═══════════════════════════════════════════════════════════════

    update() {
        // Sincronizar UI con sprites
        this.playerSprites.forEach((data, id) => {
            if (!data.sprite || !data.sprite.active) return;

            const sprite = data.sprite;

            // Sincronizar nombre
            if (data.nameTag) {
                data.nameTag.setPosition(sprite.x, sprite.y - 35);
            }

            // Sincronizar barra de integridad
            if (data.integrityBar) {
                data.integrityBar.setPosition(sprite.x, sprite.y + 25);
            }
            if (data.integrityFill) {
                data.integrityFill.setPosition(sprite.x - 15, sprite.y + 25);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎯 GETTERS
    // ═══════════════════════════════════════════════════════════════

    getGroup() {
        // Retornar array de sprites para colisiones
        const sprites = [];
        this.playerSprites.forEach(data => {
            if (data.sprite && data.sprite.body) {
                sprites.push(data.sprite);
            }
        });
        return sprites;
    }

    getMyPlayer() {
        return this.myPlayer;
    }
}
