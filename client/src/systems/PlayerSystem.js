// 👥 PLAYER SYSTEM - Sistema de Gestión de Jugadores
// Responsabilidad: Gestionar jugador local (con física) y jugadores remotos (visuales)

export class PlayerSystem {
    constructor(scene) {
        this.scene = scene;
        // Mapa de jugadores: userId -> { sprite, ... }
        this.players = new Map();
        this.myPlayer = null;
        this.localUserId = null;
        this.SKIN_COLORS = [
            0x00fff9, 0xff00ff, 0xffff00, 0x00ff00, 0xff6600, 0x9900ff, 0xff0099, 0x00ffcc
        ];
        this.PLAYER_GRAVITY = 1000;
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

    clearAllPlayers() {
        this.players.forEach(data => {
            if (data.sprite) data.sprite.destroy();
            if (data.nameTag) data.nameTag.destroy();
            if (data.integrityBar) data.integrityBar.destroy();
            if (data.integrityFill) data.integrityFill.destroy();
        });
        this.players.clear();
    }

    spawnPlayers(passengers, candleSystem) {
        // Limpieza CRÍTICA
        this.clearAllPlayers();
        if (!candleSystem.candleHistory.length) return;
        const lastIndex = candleSystem.candleHistory.length - 1;
        const spot = candleSystem.getCandleSpot(lastIndex);
        passengers.forEach((p, index) => {
            const id = p.odId || p.userId || p.id;
            if (!id) return;
            if (this.players.has(id)) return; // Unicidad
            const isLocal = id === this.localUserId;
            let playerData;
            if (isLocal) {
                playerData = this.spawnMyPlayer(id, p, spot, candleSystem);
            } else {
                playerData = this.spawnOtherPlayer(id, p, spot, index);
            }
            this.players.set(id, playerData);
        });
        // Cámara sigue al local
        const localData = this.players.get(this.localUserId);
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
        const y = spot.y; // CRÍTICO: la cima de la vela
        const color = playerData.skinColor || 0x00fff9;
        const sprite = this.scene.physics.add.sprite(x, y, null);
        sprite.setDisplaySize(30, 30);
        sprite.setOrigin(0.5, 1); // CRÍTICO: anclaje en los pies
        sprite.setDepth(100);
        sprite.setGravityY(this.PLAYER_GRAVITY);
        sprite.setCollideWorldBounds(true);
        sprite.setBounce(this.PLAYER_BOUNCE);
        sprite.setFriction(this.PLAYER_FRICTION);
        // Procedural texture
        const tempGraphics = this.scene.add.graphics();
        tempGraphics.fillStyle(color, 0.3);
        tempGraphics.fillCircle(22, 34, 22); // Glow en base
        tempGraphics.fillStyle(color, 1);
        tempGraphics.fillCircle(22, 22, 15);
        tempGraphics.lineStyle(2, 0xffffff, 1);
        tempGraphics.strokeCircle(22, 22, 15);
        tempGraphics.fillStyle(0xffffff, 0.5);
        tempGraphics.fillCircle(22, 19, 5);
        tempGraphics.generateTexture('playerLocal', 44, 44);
        tempGraphics.destroy();
        sprite.setTexture('playerLocal');
        // Nombre y UI
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
        // Colisión con velas
        this.scene.physics.add.collider(sprite, candleSystem.getPhysicsGroup());
        this.myPlayer = sprite;
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
        const y = spot.y; // CRÍTICO: la cima de la vela
        let color;
        if (playerData.skinColor) {
            color = playerData.skinColor;
        } else {
            const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            color = this.SKIN_COLORS[hash % this.SKIN_COLORS.length];
        }
        const sprite = this.scene.add.sprite(x, y, null);
        sprite.setDisplaySize(30, 30);
        sprite.setOrigin(0.5, 1); // CRÍTICO: anclaje en los pies
        sprite.setDepth(50);
        sprite.setAlpha(0.6);
        const textureKey = `playerRemote_${id}`;
        const tempGraphics = this.scene.add.graphics();
        tempGraphics.fillStyle(color, 0.3);
        tempGraphics.fillCircle(22, 34, 22);
        tempGraphics.fillStyle(color, 0.8);
        tempGraphics.fillCircle(22, 22, 15);
        tempGraphics.lineStyle(2, color, 1);
        tempGraphics.strokeCircle(22, 22, 15);
        tempGraphics.generateTexture(textureKey, 44, 44);
        tempGraphics.destroy();
        sprite.setTexture(textureKey);
        const shortName = (playerData.skinName || playerData.skin || 'Anon').slice(0, 8);
        const nameTag = this.scene.add.text(0, -35, shortName, {
            font: 'bold 12px "Courier New"',
            fill: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(51);
        sprite.setData('nameTag', nameTag);
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
        if (this.players.has(id)) return;
        const isLocal = id === this.localUserId;
        let playerData;
        if (isLocal) {
            playerData = this.spawnMyPlayer(id, data, spot, candleSystem);
        } else {
            playerData = this.spawnOtherPlayer(id, data, spot, this.players.size);
        }
        this.players.set(id, playerData);
    }

    // ═══════════════════════════════════════════════════════════════
    // ➖ REMOVER JUGADOR
    // ═══════════════════════════════════════════════════════════════

    removePlayer(odId) {
        const data = this.players.get(odId);
        if (data) {
            if (data.sprite) data.sprite.destroy();
            if (data.nameTag) data.nameTag.destroy();
            if (data.integrityBar) data.integrityBar.destroy();
            if (data.integrityFill) data.integrityFill.destroy();
            this.players.delete(odId);
            console.log('[👥 PlayerSystem] Jugador removido:', odId);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎬 ANIMACIONES DE RESULTADO
    // ═══════════════════════════════════════════════════════════════

    animatePlayerResults(statuses, candleSystem) {
        statuses.forEach(s => {
            const id = s.odId || s.userId || s.id;
            const data = this.players.get(id);
            if (!data || !data.sprite) return;
            const sprite = data.sprite;
            // Obtener la próxima vela
            const nextIndex = candleSystem.candleHistory.length - 1;
            const nextSpot = candleSystem.getCandleSpot(nextIndex);
            if (s.status === 'WIN') {
                this.animateWin(sprite, data, nextSpot);
            } else if (s.status === 'DAMAGE' || s.status === 'LOSS') {
                this.animateDamage(sprite, data, nextSpot);
            } else if (s.status === 'BURNED') {
                this.animateBurned(sprite, data, id);
            } else if (s.status === 'DRAW') {
                this.animateDraw(sprite, data, nextSpot);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🏆 ANIMACIÓN DE VICTORIA
    // ═══════════════════════════════════════════════════════════════

    animateWin(sprite, data, nextSpot) {
        if (data.isLocal) {
            if (sprite.body) sprite.body.enable = false;
            // Parabólico: salto a la cima de la nueva vela
            this.scene.tweens.add({
                targets: sprite,
                x: nextSpot.x,
                y: nextSpot.y - 80,
                duration: 400,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: sprite,
                        y: nextSpot.y,
                        duration: 500,
                        ease: 'Quad.easeIn',
                        onComplete: () => {
                            if (sprite.body) {
                                sprite.body.enable = true;
                                sprite.setVelocity(0, 0);
                            }
                        }
                    });
                    this.createVictoryParticles(nextSpot.x, nextSpot.y, data.color);
                    this.showWinNotification(); // 🔔 NOTIFICACIÓN DE VICTORIA
                }
            });
        } else {
            this.scene.tweens.add({
                targets: sprite,
                x: nextSpot.x,
                y: nextSpot.y - 60,
                duration: 500,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: sprite,
                        y: nextSpot.y,
                        duration: 400,
                        ease: 'Quad.easeIn'
                    });
                }
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 💥 ANIMACIÓN DE DAÑO
    // ═══════════════════════════════════════════════════════════════

    animateDamage(sprite, data, nextSpot) {
        this.createGlitchEffect(sprite);
        if (data.isLocal) {
            if (sprite.body) sprite.body.enable = false;
            this.scene.tweens.add({
                targets: sprite,
                x: nextSpot.x,
                y: nextSpot.y - 40,
                duration: 600,
                ease: 'Cubic.easeInOut',
                onComplete: () => {
                    if (sprite.body) {
                        sprite.body.enable = true;
                        sprite.setVelocity(0, 0);
                    }
                }
            });
            this.scene.tweens.add({
                targets: sprite,
                alpha: 0.3,
                duration: 100,
                yoyo: true,
                repeat: 2
            });
            this.showLossNotification(); // 🔔 NOTIFICACIÓN DE DERROTA
        } else {
            this.scene.tweens.add({
                targets: sprite,
                x: nextSpot.x,
                y: nextSpot.y - 20,
                duration: 800,
                ease: 'Cubic.easeInOut'
            });
        }
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

            this.players.delete(id); // CORRECCIÓN: this.players en lugar de this.playerSprites

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

    animateDraw(sprite, data, nextSpot) {
        if (data.isLocal) {
            if (sprite.body) sprite.body.enable = false;
            this.scene.tweens.add({
                targets: sprite,
                x: nextSpot.x,
                y: nextSpot.y - 40,
                duration: 500,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: sprite,
                        y: nextSpot.y,
                        duration: 400,
                        ease: 'Quad.easeInOut',
                        onComplete: () => {
                            if (sprite.body) {
                                sprite.body.enable = true;
                                sprite.setVelocity(0, 0);
                            }
                            this.showConfusionEmote(nextSpot.x, nextSpot.y);
                        }
                    });
                }
            });
        } else {
            this.scene.tweens.add({
                targets: sprite,
                x: nextSpot.x,
                y: nextSpot.y - 20,
                duration: 500,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: sprite,
                        y: nextSpot.y,
                        duration: 400,
                        ease: 'Quad.easeInOut',
                        onComplete: () => {
                            this.showConfusionEmote(nextSpot.x, nextSpot.y);
                        }
                    });
                }
            });
        }
        this.showFloatingText('DRAW', nextSpot.x, nextSpot.y - 50, '#cccccc');
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
        this.players.forEach((data, id) => {
            if (!data.sprite || !data.sprite.active) return;
            const sprite = data.sprite;
            if (data.nameTag) {
                data.nameTag.setPosition(sprite.x, sprite.y - 35);
            }
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
        const sprites = [];
        this.players.forEach(data => {
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
