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
        this.selectedAmount = 0.10; // Máximo para Protocol Droid
        this.currentBet = null; // { amount, direction }
        this.currentBet = null; // { amount, direction }
        this.canBet = false;

        // Estado de Skin
        this.skinIntegrity = 100;
        this.maxIntegrity = 100;
    }

    create() {
        console.log('🎨 [UI] Escena de interfaz iniciada');

        // Conectar a Socket.io
        this.socket = io();
        this.setupSocketListeners();

        // Crear elementos de UI
        this.createConnectionIndicator();
        this.createRoundCounter();
        this.createPriceDisplay();
        this.createBalanceDisplay();
        this.createTimer();
        this.createBettingPanel();
        this.createBettingPanel();
        this.createIntegrityBar();
        this.createLogo();

        // Botón de Settings (Placeholder)
        this.createSettingsButton();

        // Actualizar temporizador cada frame
        this.events.on('update', this.updateLocalTimer, this);
    }

    setupSocketListeners() {
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
            this.balanceWICK = data.balanceWICK || 0;
            this.updateBalanceDisplay();

            if (data.activeSkin) {
                this.skinIntegrity = data.activeSkin.integrity;
                this.maxIntegrity = data.activeSkin.maxIntegrity;
                this.isBurned = data.activeSkin.isBurned;
                this.updateIntegrityBar();
            }
        });

        // Evento: Estado del juego
        this.socket.on('GAME_STATE', (data) => {
            this.roundNumber = data.roundNumber;
            this.updateRoundCounter();

            // Habilitar/Deshabilitar apuestas según fase
            this.canBet = (data.state === 'BETTING');
            this.updateBettingButtons();

            // Resetear apuesta visual al inicio de ronda
            if (data.state === 'BETTING') {
                this.currentBet = null;
                this.updateCurrentBetDisplay();
            }
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

            // Deshabilitar botones tras apostar
            this.canBet = false;
            this.updateBettingButtons();
        });

        // Evento: Resultado de apuesta (Ganar/Perder)
        this.socket.on('BET_RESULT', (data) => {
            console.log('💰 [BET RESULT]', data);
            this.balance = data.balance;
            this.updateBalanceDisplay();

            if (data.won) {
                this.showFloatingText(`+$${data.amount.toFixed(2)}`, '#00ff00');
            } else if (data.refund) {
                this.showFloatingText(`REFUND $${data.amount.toFixed(2)}`, '#ffd700');
            }

            if (data.skinUpdate) {
                this.skinIntegrity = data.skinUpdate.integrity;
                this.isBurned = data.skinUpdate.isBurned;
                this.updateIntegrityBar();
                if (data.skinUpdate.isBurned) {
                    this.showFloatingText('🔥 SKIN BURNED!', '#ff0000');
                    if (data.refundAmount) {
                        this.showFloatingText(`🛡️ +${data.refundAmount} $WICK`, '#00ffff');
                    }
                }
            }
        });

        // Evento: Skin Reparada
        this.socket.on('SKIN_REPAIRED', (data) => {
            console.log('🔧 [REPAIRED]', data);
            this.balanceWICK = data.balanceWICK;
            this.skinIntegrity = data.skin.integrity;
            this.isBurned = data.skin.isBurned;

            this.updateBalanceDisplay();
            this.updateIntegrityBar();
            this.showFloatingText('🔧 REPARADO!', '#00ffff');
        });

        // Evento: Error
        this.socket.on('GAME_ERROR', (data) => {
            console.error('❌ [ERROR]', data);
            this.showFloatingText(data.message, '#ff0000');
        });
    }

    createBalanceDisplay() {
        // Display de Saldo (Esquina superior derecha, debajo del precio)
        const x = this.cameras.main.width - 20;
        const y = 110;

        this.balanceText = this.add.text(x, y, `Saldo: $${this.balance.toFixed(2)}`, {
            font: 'bold 20px Courier New',
            fill: '#00ff88'
        });
        this.balanceText.setOrigin(1, 0);

        this.wickText = this.add.text(x, y + 25, `WICK: ${this.balanceWICK}`, {
            font: 'bold 16px Courier New',
            fill: '#00ffff'
        });
        this.wickText.setOrigin(1, 0);
    }

    updateBalanceDisplay() {
        this.balanceText.setText(`Saldo: $${this.balance.toFixed(2)}`);
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
        const centerX = this.cameras.main.width / 2;
        const bottomY = this.cameras.main.height - 150;

        // Contenedor del panel
        this.bettingContainer = this.add.container(centerX, bottomY);

        // Botón LONG (Verde)
        this.btnLong = this.createButton(-100, 0, 'LONG ▲', 0x00ff00, () => this.placeBet('LONG'));
        this.bettingContainer.add(this.btnLong);

        // Botón SHORT (Rojo)
        this.btnShort = this.createButton(100, 0, 'SHORT ▼', 0xff0000, () => this.placeBet('SHORT'));
        this.bettingContainer.add(this.btnShort);

        // Selector de Monto
        this.amountText = this.add.text(0, 50, `Apuesta: $${this.selectedAmount.toFixed(2)}`, {
            font: '18px Courier New',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.bettingContainer.add(this.amountText);

        // Botones de monto rápido (ajustados para Protocol Droid)
        this.createAmountButton(-80, 80, 0.01);
        this.createAmountButton(0, 80, 0.05);
        this.createAmountButton(80, 80, 0.10);

        // Texto de apuesta actual
        this.currentBetText = this.add.text(0, -60, '', {
            font: 'bold 18px Courier New',
            fill: '#ffd700'
        }).setOrigin(0.5);
        this.bettingContainer.add(this.currentBetText);
    }

    createButton(x, y, text, color, callback) {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, 140, 50, color);
        bg.setStrokeStyle(2, 0xffffff);

        const label = this.add.text(0, 0, text, {
            font: 'bold 20px Arial',
            fill: '#000000'
        }).setOrigin(0.5);

        container.add([bg, label]);
        container.setSize(140, 50);

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

    createAmountButton(x, y, amount) {
        const btn = this.add.text(x, y, `$${amount}`, {
            font: '16px Courier New',
            fill: '#888888',
            backgroundColor: '#222222',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);

        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
            this.selectedAmount = amount;
            this.amountText.setText(`Apuesta: $${this.selectedAmount.toFixed(2)}`);
            // Highlight effect
            this.tweens.add({ targets: btn, scale: 1.2, duration: 100, yoyo: true });
        });

        this.bettingContainer.add(btn);
    }

    placeBet(direction) {
        if (!this.canBet) return;

        console.log(`Intentando apostar $${this.selectedAmount} a ${direction}`);

        // Comunicar apuesta a GameScene
        this.registry.events.emit('betPlaced', {
            direction: direction,
            amount: this.selectedAmount
        });

        this.socket.emit('PLACE_BET', {
            amount: this.selectedAmount,
            direction: direction
        });
    }

    updateBettingButtons() {
        const alpha = this.canBet ? 1 : 0.5;

        this.btnLong.setAlpha(alpha);
        this.btnShort.setAlpha(alpha);

        // Desactivar interacción si no se puede apostar
        if (!this.canBet) {
            this.btnLong.bg.disableInteractive();
            this.btnShort.bg.disableInteractive();
        } else {
            this.btnLong.bg.setInteractive({ useHandCursor: true });
            this.btnShort.bg.setInteractive({ useHandCursor: true });
        }
    }

    updateCurrentBetDisplay() {
        if (this.currentBet) {
            const color = this.currentBet.direction === 'LONG' ? '#00ff00' : '#ff0000';
            const arrow = this.currentBet.direction === 'LONG' ? '▲' : '▼';
            this.currentBetText.setText(`APOSTADO: $${this.currentBet.amount} ${arrow}`);
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
                font: 'bold 40px Arial',
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
        this.connectionText = this.add.text(50, 30, 'Desconectado', {
            font: '14px Courier New',
            fill: '#ff0000'
        }).setOrigin(0, 0.5);
    }

    updateConnectionIndicator() {
        if (this.connectionStatus === 'Conectado') {
            this.connectionCircle.setFillStyle(0x00ff00);
            this.connectionText.setText('Conectado');
            this.connectionText.setColor('#00ff00');
            this.tweens.add({ targets: this.connectionCircle, scale: 1.3, duration: 500, yoyo: true });
        } else {
            this.connectionCircle.setFillStyle(0xff0000);
            this.connectionText.setText('Desconectado');
            this.connectionText.setColor('#ff0000');
        }
    }

    createRoundCounter() {
        this.roundText = this.add.text(
            this.cameras.main.width / 2, 20, 'RONDA #0',
            { font: 'bold 24px Courier New', fill: '#ffd700', stroke: '#000000', strokeThickness: 4 }
        ).setOrigin(0.5, 0);
    }

    updateRoundCounter() {
        this.roundText.setText(`RONDA #${this.roundNumber}`);
        this.tweens.add({ targets: this.roundText, scale: 1.2, duration: 200, yoyo: true });
    }

    createPriceDisplay() {
        const x = this.cameras.main.width - 20;
        const y = 20;
        this.priceBackground = this.add.rectangle(x, y, 250, 80, 0x000000, 0.7).setOrigin(1, 0);
        this.priceLabelText = this.add.text(x - 10, y + 10, '💲 PRECIO BTC', { font: '12px Courier New', fill: '#888888' }).setOrigin(1, 0);
        this.priceValueText = this.add.text(x - 10, y + 35, '-', { font: 'bold 24px Courier New', fill: '#00ff88' }).setOrigin(1, 0);
    }

    updatePriceDisplay() {
        if (this.currentPrice) {
            this.priceValueText.setText(`$${this.currentPrice.toFixed(2)}`);
            this.tweens.add({ targets: this.priceValueText, scale: 1.1, duration: 150, yoyo: true });
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
    }

    createLogo() {
        this.logoText = this.add.text(20, this.cameras.main.height - 20, '🕯️ CANDLE RUNNER', { font: 'bold 16px Courier New', fill: '#00ff88', stroke: '#000000', strokeThickness: 3 }).setOrigin(0, 1);
        this.versionText = this.add.text(20, this.cameras.main.height - 5, 'v1.1 - Fase 4', { font: '10px Courier New', fill: '#555555' }).setOrigin(0, 1);
    }

    createIntegrityBar() {
        const x = 20;
        const y = 100;

        // Etiqueta
        this.add.text(x, y - 20, '🛡️ INTEGRIDAD', {
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
        this.repairBtn = this.add.text(x + 210, y - 5, '🛠️', {
            font: '16px Arial',
            backgroundColor: '#333333',
            padding: { x: 5, y: 2 }
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

    createSettingsButton() {
        const x = 30;
        const y = this.cameras.main.height - 30;
        this.settingsBtn = this.add.text(x, y, '⚙️', { font: '24px Arial', fill: '#ffffff' }).setOrigin(0, 1);
        this.settingsBtn.setInteractive({ useHandCursor: true });
        this.settingsBtn.on('pointerover', () => this.settingsBtn.setScale(1.2));
        this.settingsBtn.on('pointerout', () => this.settingsBtn.setScale(1));
        this.settingsBtn.on('pointerdown', () => console.log('⚙️ Settings clicked'));
    }
}
