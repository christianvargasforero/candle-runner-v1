// 🎨 UI SCENE - Interfaz de Usuario (HUD)
// Muestra información en tiempo real: temporizador, precio, ronda, apuestas y saldo

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });

        // Estado de la UI
        this.roundNumber = 0;
        this.currentPrice = null;
        this.timeLeft = 0;
        this.serverTime = null;
        this.connectionStatus = 'Desconectado';
        this.currentPhaseEndTime = null;

        // Estado de Apuestas
        this.balance = 0;
        this.balanceWICK = 0;
        // 🚌 ELIMINADO: this.selectedAmount (ahora lo dicta la sala)
        this.currentBet = null; // { amount, direction }
        this.currentBet = null; // { amount, direction }
        this.canBet = false;

        // Estado de Skin
        this.skinIntegrity = 100;
        this.maxIntegrity = 100;

        // ============================================
        // 📡 LIVE FEED MONITORING
        // ============================================
        this.lastPriceUpdateTime = null;
        this.liveFeedStatus = 'disconnected'; // 'live', 'reconnecting', 'disconnected'
    }

    create() {
        console.log('🎨 [UI] Escena de interfaz iniciada');

        // 🔌 Usar socket GLOBAL en lugar de crear uno nuevo
        this.socket = window.globalSocket;
        this.setupSocketListeners();

        // Crear elementos de UI
        this.createConnectionIndicator();
        this.createRoundCounter();
        this.createPriceDisplay();
        this.createBalanceDisplay();
        this.createTimer();
        this.createBettingPanel();
        this.createIntegrityBar();
        this.createLogo();

        // Botón de Settings (Placeholder)
        this.createSettingsButton();

        // 🎥 CONTROLES DE CÁMARA
        this.createRecenterButton();
        this.createFreeLookIndicator();
        this.setupCameraListeners();

        // Actualizar temporizador cada frame
        this.events.on('update', this.updateLocalTimer, this);
    }

    setupSocketListeners() {
        // Evento: Ganador del mayor bote
        this.socket.on('BIG_POT_WIN', (data) => {
            // Mensaje destacado en pantalla
            this.showFloatingText(data.message, '#FFD700');
            // Efecto especial: parpadeo o animación
            this.cameras.main.flash(500, 255, 215, 0);
        });
        // Evento: Conexión establecida
        this.socket.on('connect', () => {
            this.connectionStatus = 'Conectado';
            this.updateConnectionIndicator();
        });

        // Evento: Desconexión
        this.socket.on('disconnect', () => {
            this.connectionStatus = 'Desconectado';
            this.updateConnectionIndicator();
        });

        // Evento: Perfil de usuario (Saldo inicial)
        this.socket.on('USER_PROFILE', (data) => {
            console.log('👤 [PROFILE]', data);
            this.balance = data.balanceUSDT;
            this.balanceWICK = data.balanceWICK;

            // Guardar saldo inicial para calcular ganancias
            if (this.initialBalance === undefined) {
                this.initialBalance = this.balance;
            }

            if (data.activeSkin) {
                this.skinIntegrity = data.activeSkin.integrity;
                this.maxIntegrity = data.activeSkin.maxIntegrity;
                this.isBurned = data.activeSkin.isBurned;
            }
            this.updateBalanceDisplay();
            this.updateIntegrityBar();
        });

        // Evento: Estado del juego
        this.socket.on('GAME_STATE', (data) => {
            console.log('[UI] GAME_STATE recibido:', data.state);
            this.roundNumber = data.roundNumber;
            this.updateRoundCounter();

            // Habilitar/Deshabilitar apuestas según fase
            if (data.state === 'BETTING') {
                this.canBet = true;
                this.currentBet = null; // Resetear apuesta visual
                this.updateCurrentBetDisplay();
                this.enableBettingUI(); // FORZAR reactivación explícita
                console.log('[UI] ✅ Botones de apuesta HABILITADOS');
            } else {
                this.canBet = false;
                this.disableBettingUI();
                console.log('[UI] ⛔ Botones de apuesta DESHABILITADOS');
            }
            
            this.updateBettingButtons();
        });

        // Evento: Sincronización de tiempo
        this.socket.on('SYNC_TIME', (data) => {
            this.serverTime = data.serverTime;
            this.timeLeft = data.timeLeft;
            this.currentPhaseEndTime = data.serverTime + data.timeLeft;
            this.updateTimer();

            // Sincronizar estado de apuestas si nos unimos tarde
            if (data.state === 'BETTING' && !this.currentBet) {
                this.canBet = true;
                this.updateBettingButtons();
            } else {
                this.canBet = false;
                this.updateBettingButtons();
            }
        });

        // Evento: Resultado de la ronda
        this.socket.on('ROUND_RESULT', (data) => {
            if (data.endPrice) {
                this.currentPrice = data.endPrice;
                this.updatePriceDisplay();
            }
        });

        // Evento: Apuesta confirmada
        this.socket.on('BET_CONFIRMED', (data) => {
            console.log('✅ [BET CONFIRMED]', data);
            this.balance = data.balance;
            this.currentBet = { amount: data.amount, direction: data.direction };
            this.updateBalanceDisplay();
            this.updateCurrentBetDisplay();

            // NO deshabilitar botones - permitir cambiar de decisión
            // Los botones se deshabilitarán automáticamente en fase LOCKED
            this.showFloatingText(`BET: ${data.direction} $${data.amount.toFixed(2)}`, '#FFD700');
            this.updateBettingButtons();
        });

        // Evento: Resultado de apuesta (Ganar/Perder)
        this.socket.on('BET_RESULT', (data) => {
            console.log('[BET RESULT]', data);
            this.balance = data.balance;
            this.updateBalanceDisplay();

            if (data.won) {
                if (data.isSoleWinner) {
                    this.showFloatingText(`🏆 JACKPOT! +$${data.amount.toFixed(2)}`, '#FFD700');
                    this.cameras.main.flash(500, 255, 215, 0); // Flash dorado
                } else {
                    this.showFloatingText(`+$${data.amount.toFixed(2)}`, '#00ff88');
                }
            } else if (data.refund) {
                this.showFloatingText(`REFUND $${data.amount.toFixed(2)}`, '#ffd700');
            }

            if (data.skinUpdate) {
                this.skinIntegrity = data.skinUpdate.integrity;
                this.isBurned = data.skinUpdate.isBurned;
                this.updateIntegrityBar();
                if (data.skinUpdate.isBurned) {
                    this.showFloatingText('[!] SKIN BURNED [!]', '#ff0000');
                    if (data.refundAmount) {
                        this.showFloatingText(`[+] +${data.refundAmount} $WICK`, '#00ffff');
                    }
                }
            }
        });

        // Evento: Skin Reparada
        this.socket.on('SKIN_REPAIRED', (data) => {
            console.log('[REPAIRED]', data);
            this.balanceWICK = data.balanceWICK;
            this.skinIntegrity = data.skin.integrity;
            this.isBurned = data.skin.isBurned;

            this.updateBalanceDisplay();
            this.updateIntegrityBar();
            this.showFloatingText('[OK] REPAIRED', '#00ffff');
        });

        // Evento: Error
        this.socket.on('GAME_ERROR', (data) => {
            console.error('[ERROR]', data);
            this.showFloatingText(data.message, '#ff0000');
        });

        // Evento: Retiro exitoso
        this.socket.on('WITHDRAW_SUCCESS', (data) => {
            console.log('[WITHDRAW]', data);
            this.balance = 0;
            this.updateBalanceDisplay();
            this.showFloatingText(`[OK] WITHDRAW SUCCESS`, '#00ff88');

            // Volver al menú (NO desconectar el socket compartido)
            this.time.delayedCall(2000, () => {
                this.scene.stop('GameScene');
                this.scene.start('MenuScene');
            });
        });

        // Evento: Sala unida exitosamente
        this.socket.on('ROOM_JOINED', (data) => {
            console.log('[ROOM JOINED]', data);
            // Actualizar el precio del ticket en la UI
            if (this.ticketPriceText) {
                this.ticketPriceText.setText(`TICKET: $${data.ticketPrice.toFixed(2)}`);
            }
        });

        // ============================================
        // 📡 LIVE FEED: Monitorear actualizaciones de precio
        // ============================================
        this.socket.on('PRICE_UPDATE', (data) => {
            if (data.price) {
                this.currentPrice = data.price;
                this.lastPriceUpdateTime = Date.now();
                this.liveFeedStatus = 'live';
                this.updatePriceDisplay();
                this.updateLiveFeedIndicator();
            }
        });
    }

    createBalanceDisplay() {
        if (window.SPECTATOR_MODE) return; // 🔴 No mostrar saldo en modo espectador

        // Display de Saldo (Esquina superior derecha, debajo del precio)
        const x = this.cameras.main.width - 20;
        const y = 110;

        this.balanceText = this.add.text(x, y, `BAL: $${this.balance.toFixed(2)}`, {
            font: 'bold 20px Courier New',
            fill: '#00ff88'
        });
        this.balanceText.setOrigin(1, 0);

        this.wickText = this.add.text(x, y + 25, `WICK: ${this.balanceWICK.toFixed(0)}`, {
            font: 'bold 16px Courier New',
            fill: '#00ffff'
        });
        this.wickText.setOrigin(1, 0);

        // Botón de Retiro
        this.withdrawBtn = this.add.text(x, y + 55, '[ WITHDRAW ]', {
            font: 'bold 14px Courier New',
            fill: '#FFD700',
            backgroundColor: '#1a4d2e',
            padding: { x: 10, y: 5 }
        });
        this.withdrawBtn.setOrigin(1, 0);
        this.withdrawBtn.setInteractive({ useHandCursor: true });

        this.withdrawBtn.on('pointerdown', () => {
            this.handleWithdraw();
        });

        this.withdrawBtn.on('pointerover', () => {
            this.withdrawBtn.setScale(1.05);
            this.withdrawBtn.setStyle({ backgroundColor: '#2d6a4f' });
        });

        this.withdrawBtn.on('pointerout', () => {
            this.withdrawBtn.setScale(1);
            this.withdrawBtn.setStyle({ backgroundColor: '#1a4d2e' });
        });
    }

    updateBalanceDisplay() {
        this.balanceText.setText(`BAL: $${this.balance.toFixed(2)}`);
        this.wickText.setText(`WICK: ${this.balanceWICK.toFixed(0)}`);

        // Efecto de pulso
        this.tweens.add({
            targets: [this.balanceText, this.wickText],
            scale: 1.2,
            duration: 200,
            yoyo: true
        });
    }

    createBettingPanel() {
        // 🧹 Limpieza preventiva: Evitar duplicados si la función se llama más de una vez
        if (this.bettingContainer) {
            this.bettingContainer.destroy();
        }

        const centerX = this.cameras.main.width / 2;
        const bottomY = this.cameras.main.height - 150;

        // Contenedor del panel
        this.bettingContainer = this.add.container(centerX, bottomY);

        // 🔴 MODO ESPECTADOR
        if (window.SPECTATOR_MODE) {
            const spectatorLabel = this.add.text(0, 0, '👁️ VIEWING LIVE MATCH', {
                font: 'bold 24px Courier New',
                fill: '#00ff88',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 },
                stroke: '#ffffff',
                strokeThickness: 2
            }).setOrigin(0.5);

            // Animación de parpadeo
            this.tweens.add({
                targets: spectatorLabel,
                alpha: 0.5,
                duration: 1000,
                yoyo: true,
                repeat: -1
            });

            this.bettingContainer.add(spectatorLabel);
            return; // 🛑 Salir, no crear botones de apuesta
        }

        // Texto de apuesta actual (arriba de los botones)
        this.currentBetText = this.add.text(0, -80, '', {
            font: 'bold 18px Courier New',
            fill: '#ffd700'
        }).setOrigin(0.5);
        this.bettingContainer.add(this.currentBetText);

        // Mostrar precio del ticket de la sala
        const ticketPrice = this.registry.get('ticketPrice') || 0;
        this.ticketPriceText = this.add.text(0, -50, `TICKET: $${ticketPrice.toFixed(2)}`, {
            font: 'bold 20px Courier New',
            fill: '#00ffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.bettingContainer.add(this.ticketPriceText);

        // Botón LONG (Verde)
        this.btnLong = this.createButton(-110, 20, 'BUY TICKET [UP]', 0x00ff00, () => this.placeBet('LONG'));
        this.bettingContainer.add(this.btnLong);

        // Botón SHORT (Rojo)
        this.btnShort = this.createButton(110, 20, 'BUY TICKET [DN]', 0xff0000, () => this.placeBet('SHORT'));
        this.bettingContainer.add(this.btnShort);

        // NOTA: ELIMINADOS los botones de selección de monto
        // Ya no es necesario porque el servidor dicta el precio
    }

    createButton(x, y, text, color, callback) {
        const container = this.add.container(x, y);

        // Aumentar ancho a 180px para textos largos
        const bg = this.add.rectangle(0, 0, 180, 50, color);
        bg.setStrokeStyle(2, 0xffffff);

        const label = this.add.text(0, 0, text, {
            font: 'bold 16px Courier New', // Fuente monoespaciada
            fill: '#000000'
        }).setOrigin(0.5);

        container.add([bg, label]);
        container.setSize(180, 50);

        // Guardar referencias directas para acceso seguro
        container.bg = bg;
        container.label = label;

        // Interacción
        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => container.setScale(1.1));
        bg.on('pointerout', () => container.setScale(1));
        bg.on('pointerdown', () => {
            if (this.canBet) {
                this.tweens.add({
                    targets: container,
                    scale: 0.9,
                    duration: 100,
                    yoyo: true,
                    onComplete: callback
                });
            }
        });

        // Guardar referencia para deshabilitar
        container.bg = bg;
        return container;
    }



    placeBet(direction) {
        if (!this.canBet) return;

        console.log(`Comprando ticket: ${direction}`);

        // Comunicar apuesta a GameScene (solo dirección)
        this.registry.events.emit('betPlaced', { direction: direction });

        // Enviar solo la dirección - el servidor dicta el precio
        this.socket.emit('PLACE_BET', { direction: direction });
    }

    updateBettingButtons() {
        const alpha = this.canBet ? 1 : 0.5;

        // Resetear estilos base
        this.btnLong.setAlpha(alpha);
        this.btnShort.setAlpha(alpha);
        this.btnLong.bg.setStrokeStyle(2, 0xffffff);
        this.btnShort.bg.setStrokeStyle(2, 0xffffff);

        // Resaltar selección si existe y estamos en fase de apuestas
        if (this.currentBet && this.canBet) {
            if (this.currentBet.direction === 'LONG') {
                this.btnLong.bg.setStrokeStyle(4, 0x00ff00); // Borde Verde Brillante
                this.btnLong.setAlpha(1);
                this.btnShort.setAlpha(0.6); // Menos atenuado para indicar que aún se puede pulsar
            } else {
                this.btnShort.bg.setStrokeStyle(4, 0xff0000); // Borde Rojo Brillante
                this.btnShort.setAlpha(1);
                this.btnLong.setAlpha(0.6); // Menos atenuado para indicar que aún se puede pulsar
            }
        }

        // Habilitar/Deshabilitar interacción
        if (!this.canBet) {
            this.btnLong.bg.disableInteractive();
            this.btnShort.bg.disableInteractive();
            this.btnLong.label.setText('WAITING...'); // Cambiar texto
            this.btnShort.label.setText('WAITING...');
        } else {
            this.btnLong.bg.setInteractive({ useHandCursor: true });
            this.btnShort.bg.setInteractive({ useHandCursor: true });

            // Restaurar texto original o mostrar "CAMBIAR" si ya apostó
            if (this.currentBet) {
                this.btnLong.label.setText(this.currentBet.direction === 'LONG' ? 'HOLDING [UP]' : 'SWITCH [UP]');
                this.btnShort.label.setText(this.currentBet.direction === 'SHORT' ? 'HOLDING [DN]' : 'SWITCH [DN]');
            } else {
                this.btnLong.label.setText('BUY TICKET [UP]');
                this.btnShort.label.setText('BUY TICKET [DN]');
            }
        }
    }

    updateCurrentBetDisplay() {
        if (this.currentBet) {
            const color = this.currentBet.direction === 'LONG' ? '#00ff00' : '#ff0000';
            const arrow = this.currentBet.direction === 'LONG' ? '[UP]' : '[DN]';
            this.currentBetText.setText(`BET: $${this.currentBet.amount} ${arrow}`);
            this.currentBetText.setColor(color);
        } else {
            this.currentBetText.setText('');
        }
    }

    showFloatingText(text, color) {
        const floatText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 100,
            text,
            {
                font: 'bold 40px Courier New',
                fill: color,
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);

        this.tweens.add({
            targets: floatText,
            y: floatText.y - 100,
            alpha: 0,
            duration: 2000,
            onComplete: () => floatText.destroy()
        });
    }

    // --- MÉTODOS EXISTENTES (Sin cambios mayores) ---

    createConnectionIndicator() {
        this.connectionCircle = this.add.circle(30, 30, 10, 0xff0000);
        this.connectionText = this.add.text(50, 30, 'DISCONNECTED', {
            font: '14px Courier New',
            fill: '#ff0000'
        }).setOrigin(0, 0.5);
    }

    updateConnectionIndicator() {
        if (this.connectionStatus === 'Conectado') {
            this.connectionCircle.setFillStyle(0x00ff00);
            this.connectionText.setText('CONNECTED');
            this.connectionText.setColor('#00ff00');
            this.tweens.add({ targets: this.connectionCircle, scale: 1.3, duration: 500, yoyo: true });
        } else {
            this.connectionCircle.setFillStyle(0xff0000);
            this.connectionText.setText('DISCONNECTED');
            this.connectionText.setColor('#ff0000');
        }
    }

    createRoundCounter() {
        this.roundText = this.add.text(
            this.cameras.main.width / 2, 20, 'ROUND #0',
            { font: 'bold 24px Courier New', fill: '#ffd700', stroke: '#000000', strokeThickness: 4 }
        ).setOrigin(0.5, 0);
    }

    updateRoundCounter() {
        this.roundText.setText(`ROUND #${this.roundNumber}`);
        this.tweens.add({ targets: this.roundText, scale: 1.2, duration: 200, yoyo: true });
    }

    createPriceDisplay() {
        const x = this.cameras.main.width - 20;
        const y = 20;
        this.priceBackground = this.add.rectangle(x, y, 250, 110, 0x000000, 0.7).setOrigin(1, 0);
        this.priceLabelText = this.add.text(x - 10, y + 10, 'BTC PRICE', { font: '12px Courier New', fill: '#888888' }).setOrigin(1, 0);
        this.priceValueText = this.add.text(x - 10, y + 35, '-', { font: 'bold 24px Courier New', fill: '#00ff88' }).setOrigin(1, 0);

        // ============================================
        // 📡 LIVE FEED INDICATOR
        // ============================================
        const feedY = y + 75;

        // Punto indicador (parpadeante)
        this.liveFeedDot = this.add.circle(x - 10, feedY, 6, 0xff0000).setOrigin(1, 0.5);

        // Texto de estado
        this.liveFeedText = this.add.text(x - 25, feedY, 'DISCONNECTED', {
            font: 'bold 11px Courier New',
            fill: '#ff0000'
        }).setOrigin(1, 0.5);

        // Animación de parpadeo inicial (desconectado)
        this.liveFeedPulse = this.tweens.add({
            targets: this.liveFeedDot,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
            paused: true
        });
    }

    updatePriceDisplay() {
        if (this.currentPrice) {
            this.priceValueText.setText(`$${this.currentPrice.toFixed(2)}`);
            this.tweens.add({ targets: this.priceValueText, scale: 1.1, duration: 150, yoyo: true });
        }
    }

    // ============================================
    // 📡 ACTUALIZAR INDICADOR DE LIVE FEED
    // ============================================

    updateLiveFeedIndicator() {
        if (!this.liveFeedDot || !this.liveFeedText) return;

        const now = Date.now();
        const timeSinceUpdate = this.lastPriceUpdateTime ? now - this.lastPriceUpdateTime : Infinity;

        // Determinar estado según tiempo transcurrido
        if (timeSinceUpdate < 2000) {
            // LIVE: Verde parpadeante (actualización reciente)
            this.liveFeedStatus = 'live';
            this.liveFeedDot.setFillStyle(0x00ff00);
            this.liveFeedText.setText('LIVE FEED');
            this.liveFeedText.setColor('#00ff00');

            // Activar parpadeo rápido
            if (this.liveFeedPulse.paused) {
                this.liveFeedPulse.resume();
                this.liveFeedPulse.timeScale = 1.5; // Más rápido
            }

        } else if (timeSinceUpdate < 5000) {
            // RECONNECTING: Ámbar (advertencia)
            this.liveFeedStatus = 'reconnecting';
            this.liveFeedDot.setFillStyle(0xffaa00);
            this.liveFeedText.setText('RECONNECTING');
            this.liveFeedText.setColor('#ffaa00');

            // Parpadeo medio
            if (this.liveFeedPulse.paused) {
                this.liveFeedPulse.resume();
            }
            this.liveFeedPulse.timeScale = 1;

        } else {
            // DISCONNECTED: Rojo (error)
            this.liveFeedStatus = 'disconnected';
            this.liveFeedDot.setFillStyle(0xff0000);
            this.liveFeedText.setText('DISCONNECTED');
            this.liveFeedText.setColor('#ff0000');

            // Parpadeo lento
            if (this.liveFeedPulse.paused) {
                this.liveFeedPulse.resume();
            }
            this.liveFeedPulse.timeScale = 0.5;
        }
    }

    createTimer() {
        const x = this.cameras.main.width / 2;
        const y = this.cameras.main.height - 80;
        this.timerBackground = this.add.rectangle(x, y, 300, 60, 0x000000, 0.8);
        this.timerBackground.setStrokeStyle(2, 0x00ff88);
        this.timerText = this.add.text(x, y, '00.0s', { font: 'bold 36px Courier New', fill: '#00ff88' }).setOrigin(0.5);
        this.progressBar = this.add.rectangle(x, y + 35, 280, 8, 0x00ff88);
        this.progressBarBackground = this.add.rectangle(x, y + 35, 280, 8, 0x333333).setDepth(-1);
    }

    updateTimer() {
        if (this.timeLeft !== null) {
            const seconds = (this.timeLeft / 1000).toFixed(1);
            this.timerText.setText(`${seconds}s`);

            if (this.timeLeft <= 3000) {
                this.timerText.setColor('#ff0000');
                this.timerBackground.setStrokeStyle(2, 0xff0000);
                this.progressBar.setFillStyle(0xff0000);
                this.timerText.setVisible(Math.floor(Date.now() / 100) % 2 === 0);
            } else {
                this.timerText.setVisible(true);
                if (this.timeLeft <= 5000) {
                    this.timerText.setColor('#ffd700');
                    this.timerBackground.setStrokeStyle(2, 0xffd700);
                    this.progressBar.setFillStyle(0xffd700);
                } else {
                    this.timerText.setColor('#00ff88');
                    this.timerBackground.setStrokeStyle(2, 0x00ff88);
                    this.progressBar.setFillStyle(0x00ff88);
                }
            }
            const progress = Math.max(0, Math.min(1, this.timeLeft / 30000));
            this.progressBar.setSize(280 * progress, 8);
        }
    }

    updateLocalTimer() {
        if (this.currentPhaseEndTime) {
            const remaining = this.currentPhaseEndTime - Date.now();
            if (remaining > 0) {
                this.timeLeft = remaining;
                const seconds = (remaining / 1000).toFixed(1);
                this.timerText.setText(`${seconds}s`);

                if (remaining <= 3000) {
                    this.timerText.setColor('#ff0000');
                    this.timerText.setVisible(Math.floor(Date.now() / 100) % 2 === 0);
                } else {
                    this.timerText.setVisible(true);
                    if (remaining <= 5000) {
                        this.timerText.setColor('#ffd700');
                    } else {
                        this.timerText.setColor('#00ff88');
                    }
                }
                const progress = Math.max(0, Math.min(1, remaining / 30000));
                this.progressBar.setSize(280 * progress, 8);
            }
        }

        // ============================================
        // 📡 MONITOREAR LIVE FEED CADA FRAME
        // ============================================
        this.updateLiveFeedIndicator();
    }

    createLogo() {
        this.logoText = this.add.text(20, this.cameras.main.height - 20, '[ CANDLE RUNNER ]', { font: 'bold 16px Courier New', fill: '#00ff88', stroke: '#000000', strokeThickness: 3 }).setOrigin(0, 1);
        this.versionText = this.add.text(20, this.cameras.main.height - 5, 'v1.1 - Phase 4', { font: '10px Courier New', fill: '#555555' }).setOrigin(0, 1);
    }

    createIntegrityBar() {
        const x = 20;
        const y = 100;

        // Etiqueta
        this.add.text(x, y - 20, 'INTEGRITY', {
            font: '12px Courier New',
            fill: '#888888'
        });

        // Fondo
        this.integrityBg = this.add.rectangle(x, y, 200, 10, 0x333333);
        this.integrityBg.setOrigin(0, 0);

        // Barra
        this.integrityBar = this.add.rectangle(x, y, 200, 10, 0x00ffff);
        this.integrityBar.setOrigin(0, 0);

        // Botón de Reparar
        this.repairBtn = this.add.text(x + 210, y - 5, '[R]', {
            font: '16px Courier New',
            backgroundColor: '#333333',
            padding: { x: 5, y: 2 },
            fill: '#00ffff'
        });
        this.repairBtn.setInteractive({ useHandCursor: true });

        this.repairBtn.on('pointerdown', () => {
            if (!this.isBurned && this.skinIntegrity < this.maxIntegrity) {
                this.socket.emit('REPAIR_SKIN');
            }
        });
    }

    updateIntegrityBar() {
        if (!this.integrityBar || this.maxIntegrity <= 0) return; // Evitar errores

        const percent = Math.max(0, Math.min(1, this.skinIntegrity / this.maxIntegrity));
        const targetWidth = 200 * percent;

        // Animar cambio de tamaño
        this.tweens.add({
            targets: this.integrityBar,
            width: targetWidth,
            duration: 300,
            ease: 'Power2'
        });

        // Color según daño
        if (this.isBurned) {
            this.integrityBar.setFillStyle(0x333333); // Gris oscuro (cenizas)
            this.repairBtn.setAlpha(0.5); // No se puede reparar
        } else if (percent < 0.3) {
            this.integrityBar.setFillStyle(0xff0000);
            this.repairBtn.setAlpha(1);
        } else if (percent < 0.6) {
            this.integrityBar.setFillStyle(0xffd700);
            this.repairBtn.setAlpha(1);
        } else {
            this.integrityBar.setFillStyle(0x00ffff);
            this.repairBtn.setAlpha(0.5); // No necesita reparación
        }
    }

    handleWithdraw() {
        if (this.balance <= 0) {
            this.showFloatingText('NO FUNDS TO WITHDRAW', '#ff0000');
            return;
        }

        // Calcular Ganancias/Pérdidas
        const profit = this.balance - (this.initialBalance || 0);
        const isProfit = profit >= 0;
        const profitColor = isProfit ? '#00ff88' : '#ff0000';
        const profitSign = isProfit ? '+' : '';

        const summaryText = `
:: WITHDRAW FUNDS ::

FINAL BALANCE: $${this.balance.toFixed(2)}
INIT BALANCE: $${(this.initialBalance || 0).toFixed(2)}
----------------
P/L: ${profitSign}$${profit.toFixed(2)}
        `;

        // Mostrar confirmación
        const confirmText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            summaryText + '\n\n[ CLICK TO CONFIRM ]',
            {
                font: 'bold 20px Courier New',
                fill: profitColor,
                backgroundColor: '#000000',
                padding: { x: 30, y: 20 },
                align: 'center',
                stroke: '#ffffff',
                strokeThickness: 2
            }
        ).setOrigin(0.5);

        confirmText.setInteractive({ useHandCursor: true });
        confirmText.setDepth(1000);

        // Fondo oscuro
        const overlay = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        );
        overlay.setDepth(999);
        overlay.setInteractive();

        // Confirmar retiro
        confirmText.on('pointerdown', () => {
            this.socket.emit('WITHDRAW', { amount: this.balance });
            overlay.destroy();
            confirmText.destroy();
            this.showFloatingText('PROCESSING WITHDRAWAL...', '#00ff88');
        });

        // Cancelar al hacer clic en el overlay
        overlay.on('pointerdown', () => {
            overlay.destroy();
            confirmText.destroy();
        });

        // Auto-cerrar después de 5 segundos
        this.time.delayedCall(5000, () => {
            if (overlay.active) overlay.destroy();
            if (confirmText.active) confirmText.destroy();
        });
    }

    createSettingsButton() {
        const x = 30;
        const y = this.cameras.main.height - 30;
        this.settingsBtn = this.add.text(x, y, '[SET]', { font: '16px Courier New', fill: '#ffffff' }).setOrigin(0, 1);
        this.settingsBtn.setInteractive({ useHandCursor: true });
        this.settingsBtn.on('pointerover', () => this.settingsBtn.setScale(1.2));
        this.settingsBtn.on('pointerout', () => this.settingsBtn.setScale(1));
        this.settingsBtn.on('pointerdown', () => console.log('Settings clicked'));
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎮 MÉTODOS DE CONTROL DE UI
    // ═══════════════════════════════════════════════════════════════

    enableBettingUI() {
        if (!this.btnLong || !this.btnShort) return;
        
        // Remover tinte gris y reactivar interactividad
        this.btnLong.setAlpha(1);
        this.btnShort.setAlpha(1);
        this.btnLong.clearTint();
        this.btnShort.clearTint();
        
        // Restaurar interactividad
        if (this.btnLong.bg) this.btnLong.bg.setInteractive({ useHandCursor: true });
        if (this.btnShort.bg) this.btnShort.bg.setInteractive({ useHandCursor: true });
        
        // Restaurar texto original
        if (this.btnLong.label) this.btnLong.label.setText('BUY TICKET [UP]');
        if (this.btnShort.label) this.btnShort.label.setText('BUY TICKET [DN]');
        
        console.log('[UI] 🟢 Botones HABILITADOS explícitamente');
    }

    disableBettingUI() {
        if (!this.btnLong || !this.btnShort) return;
        
        // Aplicar tinte gris
        this.btnLong.setAlpha(0.5);
        this.btnShort.setAlpha(0.5);
        this.btnLong.setTint(0x666666);
        this.btnShort.setTint(0x666666);
        
        // Deshabilitar interactividad
        if (this.btnLong.bg) this.btnLong.bg.disableInteractive();
        if (this.btnShort.bg) this.btnShort.bg.disableInteractive();
        
        // Cambiar texto
        if (this.btnLong.label) this.btnLong.label.setText('WAITING...');
        if (this.btnShort.label) this.btnShort.label.setText('WAITING...');
        
        console.log('[UI] 🔴 Botones DESHABILITADOS explícitamente');
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎥 CONTROLES DE CÁMARA
    // ═══════════════════════════════════════════════════════════════

    setupCameraListeners() {
        // Escuchar eventos de GameScene
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            gameScene.events.on('CAMERA_UNLOCKED', () => {
                if (this.recenterBtn) {
                    this.recenterBtn.setVisible(true);
                    this.recenterBtn.setAlpha(0);
                    this.tweens.add({
                        targets: this.recenterBtn,
                        alpha: 1,
                        duration: 300
                    });
                }
                
                if (this.freeLookText) {
                    this.freeLookText.setVisible(true);
                    this.freeLookText.setAlpha(1);
                }
            });

            gameScene.events.on('CAMERA_LOCKED', () => {
                if (this.recenterBtn) this.recenterBtn.setVisible(false);
                if (this.freeLookText) this.freeLookText.setVisible(false);
            });
        }
    }

    createRecenterButton() {
        const x = this.cameras.main.width - 50;
        const y = this.cameras.main.height - 180; // Encima de apuestas

        this.recenterBtn = this.add.container(x, y);
        this.recenterBtn.setVisible(false); // Oculto por defecto
        this.recenterBtn.setScrollFactor(0);

        const bg = this.add.circle(0, 0, 25, 0x000000, 0.8);
        bg.setStrokeStyle(2, 0x00ff88);
        
        const icon = this.add.text(0, 0, '🎯', { fontSize: '24px' }).setOrigin(0.5);
        
        this.recenterBtn.add([bg, icon]);
        
        // Interacción
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => {
            const gameScene = this.scene.get('GameScene');
            if (gameScene) {
                gameScene.recenterCamera();
            }
        });
        
        bg.on('pointerover', () => this.recenterBtn.setScale(1.1));
        bg.on('pointerout', () => this.recenterBtn.setScale(1));
    }

    createFreeLookIndicator() {
        this.freeLookText = this.add.text(
            this.cameras.main.width / 2, 
            100, 
            '[ FREE LOOK MODE ]', 
            {
                font: 'bold 16px Courier New',
                fill: '#00ff88',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5);
        
        this.freeLookText.setVisible(false);
        this.freeLookText.setScrollFactor(0);

        // Parpadeo discreto
        this.tweens.add({
            targets: this.freeLookText,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
    }
}
