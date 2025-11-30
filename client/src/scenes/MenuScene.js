// [ MENU SCENE ] - Tablero de Salidas (Bus Terminal)
// Muestra los buses disponibles categorizados por tier con ocupación en tiempo real

import { ROOM_ACCESS_RULES } from '../../../shared/constants.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.buses = [];
    }

    create() {
        // 🔌 Usar socket GLOBAL (compartido con index.html)
        this.socket = window.globalSocket;

        if (!this.socket) {
            console.error('[MENU] ❌ Socket global no disponible. Asegúrate de hacer login primero.');
            return;
        }

        const { width, height } = this.cameras.main;

        // Setup listeners del socket
        this.setupSocketListeners();

        // Solicitar lista de buses inmediatamente
        this.socket.emit('GET_AVAILABLE_BUSES');
        console.log('[MENU] 📋 Solicitando lista de buses...');

        // Fondo cyberpunk
        this.createBackground(width, height);

        // Header
        this.createHeader(width);

        // Tutorial panel
        this.createTutorialPanel(width, 160);

        // Contenedor para buses (se renderiza cuando lleguen datos)
        this.busesContainer = this.add.container(0, 420);
    }

    setupSocketListeners() {
        // Recibir lista de buses y renderizar
        this.socket.on('BUS_LIST_UPDATE', (buses) => {
            console.log(`[MENU] 🚌 Recibidos ${buses.length} buses`);
            this.buses = buses;
            this.renderBuses(buses);
        });

        // Respuesta exitosa al unirse a un bus
        this.socket.on('ROOM_JOINED', (data) => {
            console.log('[MENU] ✅ Unido al bus:', data.roomName);
            // Transición a GameScene
            this.scene.start('GameScene');
            this.scene.launch('UIScene');
        });

        // Forzar entrada si el bus ya está en progreso
        this.socket.on('GAME_STATE', (data) => {
            if ((data.state === 'BETTING' || data.state === 'LOCKED' || data.state === 'RESOLVING')
                && !this.scene.isActive('GameScene')) {
                this.scene.start('GameScene');
                this.scene.launch('UIScene');
            }
        });

        // Cleanup al salir de esta escena
        this.events.on('shutdown', () => {
            this.socket.off('BUS_LIST_UPDATE');
            this.socket.off('ROOM_JOINED');
        });
    }

    createBackground(width, height) {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0e27, 0x0a0e27, 0x1a1f3a, 0x1a1f3a, 1);
        bg.fillRect(0, 0, width, height);

        // Grid cyberpunk de fondo
        const gridGraphics = this.add.graphics();
        gridGraphics.lineStyle(1, 0x00fff9, 0.1);
        for (let i = 0; i < width; i += 50) {
            gridGraphics.lineBetween(i, 0, i, height);
        }
        for (let j = 0; j < height; j += 50) {
            gridGraphics.lineBetween(0, j, width, j);
        }
    }

    createHeader(width) {
        this.add.text(width / 2, 60, '[ CANDLE RUNNER ]', {
            fontSize: '48px',
            fontFamily: 'Courier New',
            color: '#FFD700',
            stroke: '#000',
            strokeThickness: 6,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, 110, '>> BUS TERMINAL <<', {
            fontSize: '18px',
            fontFamily: 'Courier New',
            color: '#00ff88',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    }

    createTutorialPanel(x, y) {
        const panel = this.add.graphics();
        panel.fillStyle(0x1a1f3a, 0.9);
        panel.fillRoundedRect(x - 350, y, 700, 240, 10);
        panel.lineStyle(2, 0xFFD700, 0.5);
        panel.strokeRoundedRect(x - 350, y, 700, 240, 10);

        this.add.text(x, y + 20, '// SYSTEM MANUAL', {
            fontSize: '24px',
            fontFamily: 'Courier New',
            color: '#FFD700',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const rules = [
            '[+] BET LONG (UP) OR SHORT (DOWN) ON BITCOIN',
            '[+] 10 SECONDS TO PLACE BET PER ROUND',
            '[+] WIN: EARN SHARE OF THE POOL',
            '[!] LOSE: SKIN INTEGRITY DROPS (-20)',
            '[+] REPAIR: USE $WICK OR PROTOCOL DROID',
            '[!] CRITICAL: 0 INTEGRITY = SKIN BURNED'
        ];

        rules.forEach((rule, i) => {
            this.add.text(x - 330, y + 60 + (i * 28), rule, {
                fontSize: '14px',
                fontFamily: 'Courier New',
                color: '#00ff88'
            });
        });
    }

    renderBuses(buses) {
        // Limpiar buses previos
        this.busesContainer.removeAll(true);

        if (!buses || buses.length === 0) {
            const noDataText = this.add.text(this.cameras.main.width / 2, 500, '[ NO BUSES AVAILABLE ]', {
                fontSize: '20px',
                fontFamily: 'Courier New',
                color: '#888',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            this.busesContainer.add(noDataText);
            return;
        }

        const { width } = this.cameras.main;
        const tiers = ['TRAINING', 'SATOSHI', 'TRADER', 'WHALE'];
        const tierColors = {
            'TRAINING': 0x4CAF50,   // Verde
            'SATOSHI': 0x2196F3,    // Azul
            'TRADER': 0xFF9800,     // Naranja
            'WHALE': 0xE91E63       // Magenta
        };

        let yOffset = 0;

        tiers.forEach(tier => {
            const tierBuses = buses.filter(b => b.tier === tier);
            if (tierBuses.length === 0) return;

            // Título del Tier
            const tierTitle = this.add.text(width / 2, yOffset, `╔══ ${tier} TIER ══╗`, {
                fontSize: '28px',
                fontFamily: 'Courier New',
                color: '#' + tierColors[tier].toString(16).padStart(6, '0'),
                fontStyle: 'bold'
            }).setOrigin(0.5);
            this.busesContainer.add(tierTitle);

            yOffset += 45;

            // Renderizar buses de este tier en horizontal
            const busWidth = 200;
            const busGap = 20;
            const totalWidth = tierBuses.length * (busWidth + busGap) - busGap;
            const startX = (width - totalWidth) / 2;

            tierBuses.forEach((bus, index) => {
                const cardX = startX + index * (busWidth + busGap);
                const cardY = yOffset;

                this.createBusCard(bus, cardX, cardY, busWidth, tierColors[tier]);
            });

            yOffset += 160; // Espacio para la siguiente tier
        });
    }

    createBusCard(bus, x, y, width, tierColor) {
        const cardHeight = 140;

        // Determinar si el bus está disponible
        const isAvailable = bus.status === 'BOARDING' && bus.userCount < bus.capacity;
        const isFull = bus.userCount >= bus.capacity;
        const inProgress = bus.status === 'IN_PROGRESS' || bus.status === 'LOCKED';

        // Fondo de la tarjeta
        const card = this.add.graphics();
        const alpha = isAvailable ? 0.2 : 0.1;
        const borderAlpha = isAvailable ? 0.8 : 0.3;

        card.fillStyle(tierColor, alpha);
        card.fillRoundedRect(x, y, width, cardHeight, 12);
        card.lineStyle(3, tierColor, borderAlpha);
        card.strokeRoundedRect(x, y, width, cardHeight, 12);

        // Efecto de glow si está disponible
        if (isAvailable) {
            card.lineStyle(6, tierColor, 0.3);
            card.strokeRoundedRect(x - 2, y - 2, width + 4, cardHeight + 4, 12);
        }

        this.busesContainer.add(card);

        // Nombre del bus
        const busNumberText = this.add.text(x + width / 2, y + 22, `BUS #${bus.id.split('_').pop()}`, {
            fontSize: '18px',
            fontFamily: 'Courier New',
            color: '#FFD700',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.busesContainer.add(busNumberText);

        // Estado
        let statusText = '';
        let statusColor = '#888';

        if (isAvailable) {
            statusText = '✓ BOARDING';
            statusColor = '#00ff88';
        } else if (inProgress) {
            statusText = '✈ EN ROUTE';
            statusColor = '#ff9800';
        } else if (isFull) {
            statusText = '✖ FULL';
            statusColor = '#ff0055';
        } else {
            statusText = bus.status;
        }

        const status = this.add.text(x + width / 2, y + 45, statusText, {
            fontSize: '13px',
            fontFamily: 'Courier New',
            color: statusColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.busesContainer.add(status);

        // Precio del ticket
        const priceText = this.add.text(x + width / 2, y + 68, `💳 $${bus.ticketPrice.toFixed(2)}`, {
            fontSize: '14px',
            fontFamily: 'Courier New',
            color: '#FFD700'
        }).setOrigin(0.5);
        this.busesContainer.add(priceText);

        // Ocupación (con iconos de pasajeros)
        const occupancyText = this.add.text(x + width / 2, y + 90,
            `👥 ${bus.userCount}/${bus.capacity}`, {
            fontSize: '14px',
            fontFamily: 'Courier New',
            color: '#00fff9'
        }).setOrigin(0.5);
        this.busesContainer.add(occupancyText);

        // Botón de Join
        if (isAvailable) {
            const joinBtn = this.add.text(x + width / 2, y + 115, '[ BOARD BUS ]', {
                fontSize: '16px',
                fontFamily: 'Courier New',
                color: '#000',
                backgroundColor: '#00ff88',
                padding: { x: 14, y: 6 },
                fontStyle: 'bold'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            // Hover effect
            joinBtn.on('pointerover', () => {
                joinBtn.setBackgroundColor('#00fff9');
                joinBtn.setScale(1.05);
            });

            joinBtn.on('pointerout', () => {
                joinBtn.setBackgroundColor('#00ff88');
                joinBtn.setScale(1);
            });

            // Click event
            joinBtn.on('pointerdown', () => {
                console.log(`[MENU] 🚀 Intentando unirse al bus: ${bus.id}`);
                this.socket.emit('JOIN_ROOM', { roomId: bus.id });

                // Feedback visual
                joinBtn.setText('[ BOARDING... ]');
                joinBtn.setBackgroundColor('#ff9800');
                joinBtn.disableInteractive();
            });

            this.busesContainer.add(joinBtn);
        } else {
            // Botón deshabilitado
            const disabledBtn = this.add.text(x + width / 2, y + 115, '[ UNAVAILABLE ]', {
                fontSize: '14px',
                fontFamily: 'Courier New',
                color: '#555',
                backgroundColor: '#222',
                padding: { x: 12, y: 6 }
            }).setOrigin(0.5);
            this.busesContainer.add(disabledBtn);
        }
    }

    update() {
        // No se necesita lógica de update por ahora
    }
}
