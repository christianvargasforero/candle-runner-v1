// [ MENU SCENE ] - Pantalla de Inicio y Selector de Salas
// Muestra tutorial, salas disponibles y permite seleccionar

import { ROOM_ACCESS_RULES } from '../../../shared/constants.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedRoom = 'TRAINING';
    }

    create() {
        // 🔌 Usar socket GLOBAL en lugar de crear uno nuevo
        this.socket = window.globalSocket;
        this.roomCounts = {};


        // Forzar entrada a GameScene si el bus ya está en progreso
        this.socket.on('GAME_STATE', (data) => {
            if ((data.state === 'BETTING' || data.state === 'LOCKED' || data.state === 'RESOLVING') && !this.scene.isActive('GameScene')) {
                this.scene.start('GameScene');
                this.scene.launch('UIScene');
            }
        });

        // Solicitar lista de buses al servidor
        this.socket.emit('ADMIN_GET_BUSES');
        this.socket.on('ADMIN_BUSES', (buses) => {
            this.renderBusSelector(buses);
        });

        const { width, height } = this.cameras.main;

        // Listeners del socket
        this.socket.on('ROOM_COUNTS_UPDATE', (counts) => {
            this.roomCounts = counts;
            this.updateRoomCounts();
        });

        // Solicitar conteos al conectar (puede que ya esté conectado)
        if (this.socket.connected) {
            console.log('[MENU] Socket ya conectado');
            this.socket.emit('GET_ROOM_COUNTS');
        } else {
            // Si aún no está conectado, esperar la conexión
            this.socket.once('connect', () => {
                console.log('[MENU] Conectado al servidor');
                this.socket.emit('GET_ROOM_COUNTS');
            });
        }

        // IMPORTANTE: NO desconectar el socket al salir de la escena
        // ya que es compartido entre todas las escenas
        this.events.on('shutdown', () => {
            // Solo remover el listener específico de esta escena
            this.socket.off('ROOM_COUNTS_UPDATE');
        });

        // Fondo y título
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0e27, 0x0a0e27, 0x1a1f3a, 0x1a1f3a, 1);
        bg.fillRect(0, 0, width, height);

        this.add.text(width / 2, 60, '[ CANDLE RUNNER ]', {
            fontSize: '48px', fontFamily: 'Courier New', color: '#FFD700', stroke: '#000', strokeThickness: 6, fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add.text(width / 2, 110, '>> SURVIVAL TRADING PROTOCOL <<', {
            fontSize: '18px', fontFamily: 'Courier New', color: '#00ff88', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Panel tutorial
        const tutorialY = 160;
        this.createTutorialPanel(width / 2, tutorialY);
        // El selector de buses se renderiza vía renderBusSelector()
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


    // Renderiza la lista de buses activos por tier en el canvas
    renderBusSelector(buses) {
        // Limpiar buses previos
        if (this.busGroup) this.busGroup.clear(true, true);
        this.busGroup = this.add.group();

        const { width } = this.cameras.main;
        const startY = 420;
        const tiers = ['TRAINING', 'SATOSHI', 'TRADER', 'WHALE'];
        const tierColors = {
            'TRAINING': 0x4CAF50,
            'SATOSHI': 0x2196F3,
            'TRADER': 0xFF9800,
            'WHALE': 0xE91E63
        };
        let y = startY;
        tiers.forEach(tier => {
            const tierBuses = buses.filter(b => b.tier === tier);
            if (tierBuses.length === 0) return;
            // Título de tier
            this.add.text(width / 2, y, `${tier} CLASS`, {
                fontSize: '22px', fontFamily: 'Courier New', color: '#FFD700', fontStyle: 'bold'
            }).setOrigin(0.5);
            y += 36;
            // Renderizar buses de este tier
            tierBuses.forEach((bus, i) => {
                const cardX = width / 2 - (tierBuses.length * 180) / 2 + i * 180;
                const cardY = y;
                const color = tierColors[tier] || 0x888888;
                const card = this.add.graphics();
                card.fillStyle(color, 0.18);
                card.fillRoundedRect(cardX, cardY, 160, 110, 10);
                card.lineStyle(3, color, 0.7);
                card.strokeRoundedRect(cardX, cardY, 160, 110, 10);
                this.busGroup.add(card);

                // Info
                this.add.text(cardX + 80, cardY + 22, `#${bus.id.split('_').pop()}`, {
                    fontSize: '16px', fontFamily: 'Courier New', color: '#FFD700', fontStyle: 'bold'
                }).setOrigin(0.5);
                this.add.text(cardX + 80, cardY + 44, `${bus.status}`, {
                    fontSize: '13px', fontFamily: 'Courier New', color: '#00ff88'
                }).setOrigin(0.5);
                this.add.text(cardX + 80, cardY + 64, `TICKET: $${bus.ticketPrice}`, {
                    fontSize: '13px', fontFamily: 'Courier New', color: '#FFD700'
                }).setOrigin(0.5);
                this.add.text(cardX + 80, cardY + 84, `USERS: ${bus.users || 0}/${bus.capacity}`, {
                    fontSize: '13px', fontFamily: 'Courier New', color: '#00ff88'
                }).setOrigin(0.5);

                // Botón de unirse
                if (bus.status === 'BOARDING') {
                    const joinBtn = this.add.text(cardX + 80, cardY + 104, '[ JOIN BUS ]', {
                        fontSize: '15px', fontFamily: 'Courier New', color: '#000', backgroundColor: '#00ff88', padding: { x: 12, y: 4 }
                    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                    joinBtn.on('pointerdown', () => {
                        this.socket.emit('JOIN_ROOM', { roomId: bus.id });
                    });
                    this.busGroup.add(joinBtn);
                }
            });
            y += 140;
        });
    }

    updateRoomCounts() {
        if (!this.roomTexts) return;

        Object.keys(this.roomTexts).forEach(key => {
            const count = this.roomCounts[key] || 0;
            this.roomTexts[key].setText(`USERS: ${count}`);
        });
    }


    // Eliminado: createStartButton. Ahora la entrada es por bus.
}
