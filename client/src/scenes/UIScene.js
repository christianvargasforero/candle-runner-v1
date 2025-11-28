// 🎨 UI SCENE - Interfaz de Usuario (HUD)
// Muestra información en tiempo real: temporizador, precio, ronda

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
        this.createTimer();
        this.createLogo();

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

        // Evento: Estado del juego
        this.socket.on('GAME_STATE', (data) => {
            this.roundNumber = data.roundNumber;
            this.updateRoundCounter();
        });

        // Evento: Sincronización de tiempo
        this.socket.on('SYNC_TIME', (data) => {
            this.serverTime = data.serverTime;
            this.timeLeft = data.timeLeft;
            this.currentPhaseEndTime = data.serverTime + data.timeLeft;
            this.updateTimer();
        });

        // Evento: Resultado de la ronda
        this.socket.on('ROUND_RESULT', (data) => {
            if (data.endPrice) {
                this.currentPrice = data.endPrice;
                this.updatePriceDisplay();
            }
        });
    }

    createConnectionIndicator() {
        // Indicador de conexión en la esquina superior izquierda
        this.connectionCircle = this.add.circle(30, 30, 10, 0xff0000);

        this.connectionText = this.add.text(50, 30, 'Desconectado', {
            font: '14px Courier New',
            fill: '#ff0000'
        });
        this.connectionText.setOrigin(0, 0.5);
    }

    updateConnectionIndicator() {
        if (this.connectionStatus === 'Conectado') {
            this.connectionCircle.setFillStyle(0x00ff00);
            this.connectionText.setText('Conectado');
            this.connectionText.setColor('#00ff00');

            // Efecto de pulso
            this.tweens.add({
                targets: this.connectionCircle,
                scale: 1.3,
                duration: 500,
                yoyo: true,
                repeat: 0
            });
        } else {
            this.connectionCircle.setFillStyle(0xff0000);
            this.connectionText.setText('Desconectado');
            this.connectionText.setColor('#ff0000');
        }
    }

    createRoundCounter() {
        // Contador de ronda en la parte superior central
        this.roundText = this.add.text(
            this.cameras.main.width / 2,
            20,
            'RONDA #0',
            {
                font: 'bold 24px Courier New',
                fill: '#ffd700',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        this.roundText.setOrigin(0.5, 0);
    }

    updateRoundCounter() {
        this.roundText.setText(`RONDA #${this.roundNumber}`);

        // Efecto de actualización
        this.tweens.add({
            targets: this.roundText,
            scale: 1.2,
            duration: 200,
            yoyo: true
        });
    }

    createPriceDisplay() {
        // Display de precio en la esquina superior derecha
        const x = this.cameras.main.width - 20;
        const y = 20;

        // Fondo del precio
        this.priceBackground = this.add.rectangle(x, y, 250, 80, 0x000000, 0.7);
        this.priceBackground.setOrigin(1, 0);

        // Etiqueta
        this.priceLabelText = this.add.text(x - 10, y + 10, '💲 PRECIO BTC', {
            font: '12px Courier New',
            fill: '#888888'
        });
        this.priceLabelText.setOrigin(1, 0);

        // Valor del precio
        this.priceValueText = this.add.text(x - 10, y + 35, '-', {
            font: 'bold 24px Courier New',
            fill: '#00ff88'
        });
        this.priceValueText.setOrigin(1, 0);
    }

    updatePriceDisplay() {
        if (this.currentPrice) {
            this.priceValueText.setText(`$${this.currentPrice.toFixed(2)}`);

            // Efecto de actualización
            this.tweens.add({
                targets: this.priceValueText,
                scale: 1.1,
                duration: 150,
                yoyo: true
            });
        }
    }

    createTimer() {
        // Temporizador en la parte inferior central
        const x = this.cameras.main.width / 2;
        const y = this.cameras.main.height - 80;

        // Fondo del temporizador
        this.timerBackground = this.add.rectangle(x, y, 300, 60, 0x000000, 0.8);
        this.timerBackground.setStrokeStyle(2, 0x00ff88);

        // Texto del temporizador
        this.timerText = this.add.text(x, y, '00.0s', {
            font: 'bold 36px Courier New',
            fill: '#00ff88'
        });
        this.timerText.setOrigin(0.5);

        // Barra de progreso
        this.progressBar = this.add.rectangle(x, y + 35, 280, 8, 0x00ff88);
        this.progressBarBackground = this.add.rectangle(x, y + 35, 280, 8, 0x333333);
        this.progressBarBackground.setDepth(-1);
    }

    updateTimer() {
        if (this.timeLeft !== null) {
            const seconds = (this.timeLeft / 1000).toFixed(1);
            this.timerText.setText(`${seconds}s`);

            // Cambiar color según tiempo restante
            if (this.timeLeft <= 3000) {
                this.timerText.setColor('#ff0000');
                this.timerBackground.setStrokeStyle(2, 0xff0000);
                this.progressBar.setFillStyle(0xff0000);
            } else if (this.timeLeft <= 5000) {
                this.timerText.setColor('#ffd700');
                this.timerBackground.setStrokeStyle(2, 0xffd700);
                this.progressBar.setFillStyle(0xffd700);
            } else {
                this.timerText.setColor('#00ff88');
                this.timerBackground.setStrokeStyle(2, 0x00ff88);
                this.progressBar.setFillStyle(0x00ff88);
            }

            // Actualizar barra de progreso
            // Asumimos fase de 30 segundos total
            const progress = Math.max(0, Math.min(1, this.timeLeft / 30000));
            this.progressBar.setSize(280 * progress, 8);
        }
    }

    updateLocalTimer() {
        // Actualizar temporizador local entre sincronizaciones del servidor
        if (this.currentPhaseEndTime) {
            const remaining = this.currentPhaseEndTime - Date.now();

            if (remaining > 0) {
                this.timeLeft = remaining;

                // Actualizar display
                const seconds = (remaining / 1000).toFixed(1);
                this.timerText.setText(`${seconds}s`);

                // Actualizar color
                if (remaining <= 3000) {
                    this.timerText.setColor('#ff0000');
                } else if (remaining <= 5000) {
                    this.timerText.setColor('#ffd700');
                } else {
                    this.timerText.setColor('#00ff88');
                }

                // Actualizar barra de progreso
                const progress = Math.max(0, Math.min(1, remaining / 30000));
                this.progressBar.setSize(280 * progress, 8);
            }
        }
    }

    createLogo() {
        // Logo del juego en la esquina inferior izquierda
        this.logoText = this.add.text(20, this.cameras.main.height - 20, '🕯️ CANDLE RUNNER', {
            font: 'bold 16px Courier New',
            fill: '#00ff88',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.logoText.setOrigin(0, 1);

        // Versión
        this.versionText = this.add.text(20, this.cameras.main.height - 5, 'v1.0 - Fase 3', {
            font: '10px Courier New',
            fill: '#555555'
        });
        this.versionText.setOrigin(0, 1);
    }
}
