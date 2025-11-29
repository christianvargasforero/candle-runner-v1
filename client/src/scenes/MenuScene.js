// 🎮 MENU SCENE - Pantalla de Inicio y Selector de Salas
// Muestra tutorial, salas disponibles y permite seleccionar

import { ROOM_ACCESS_RULES } from '../../../shared/constants.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedRoom = 'TRAINING';
    }

    create() {
        const { width, height } = this.cameras.main;

        // 🔌 Usar socket GLOBAL en lugar de crear uno nuevo
        this.socket = window.globalSocket;
        this.roomCounts = {};

        // Listeners del socket
        this.socket.on('ROOM_COUNTS_UPDATE', (counts) => {
            this.roomCounts = counts;
            this.updateRoomCounts();
        });

        // Solicitar conteos al conectar (puede que ya esté conectado)
        if (this.socket.connected) {
            console.log('🔌 [MENU] Socket ya conectado');
            this.socket.emit('GET_ROOM_COUNTS');
        } else {
            // Si aún no está conectado, esperar la conexión
            this.socket.once('connect', () => {
                console.log('🔌 [MENU] Conectado al servidor');
                this.socket.emit('GET_ROOM_COUNTS');
            });
        }

        // IMPORTANTE: NO desconectar el socket al salir de la escena
        // ya que es compartido entre todas las escenas
        this.events.on('shutdown', () => {
            // Solo remover el listener específico de esta escena
            this.socket.off('ROOM_COUNTS_UPDATE');
        });

        // Fondo oscuro con gradiente
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0e27, 0x0a0e27, 0x1a1f3a, 0x1a1f3a, 1);
        bg.fillRect(0, 0, width, height);

        // ... (resto del código igual) ...

        // ============================================
        // HEADER - Logo y Título
        // ============================================
        this.add.text(width / 2, 60, '🕯️ CANDLE RUNNER', {
            fontSize: '48px',
            fontFamily: 'Arial Black',
            color: '#FFD700',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(width / 2, 110, 'Survival Trading Protocol', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#888',
            fontStyle: 'italic'
        }).setOrigin(0.5);

        // ============================================
        // TUTORIAL PANEL
        // ============================================
        const tutorialY = 160;
        this.createTutorialPanel(width / 2, tutorialY);

        // ============================================
        // ROOM SELECTOR
        // ============================================
        const roomsY = tutorialY + 280;
        this.createRoomSelector(width / 2, roomsY);

        // ============================================
        // START BUTTON
        // ============================================
        this.createStartButton(width / 2, height - 80);
    }

    createTutorialPanel(x, y) {
        const panel = this.add.graphics();
        panel.fillStyle(0x1a1f3a, 0.9);
        panel.fillRoundedRect(x - 350, y, 700, 240, 10);
        panel.lineStyle(2, 0xFFD700, 0.5);
        panel.strokeRoundedRect(x - 350, y, 700, 240, 10);

        this.add.text(x, y + 20, '📖 CÓMO JUGAR', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: '#FFD700'
        }).setOrigin(0.5);

        const rules = [
            '🎯 Apuesta LONG (sube) o SHORT (baja) en Bitcoin',
            '⏱️  Tienes 10 segundos para apostar cada ronda',
            '💰 Si aciertas, ganas parte del pozo acumulado',
            '🔥 Si fallas, tu Skin pierde integridad (20 puntos)',
            '🛡️  Repara tu Skin con $WICK o usa Protocol Droid (gratis)',
            '💀 Si tu Skin llega a 0, se quema (recibes seguro de cenizas)'
        ];

        rules.forEach((rule, i) => {
            this.add.text(x - 330, y + 60 + (i * 28), rule, {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#CCC'
            });
        });
    }

    createRoomSelector(x, y) {
        this.add.text(x, y, '🏛️ SELECCIONA TU SALA', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: '#FFD700'
        }).setOrigin(0.5);

        const rooms = [
            { key: 'TRAINING', name: '🎓 Training', color: 0x4CAF50, desc: 'Gratis • Practice' },
            { key: 'SATOSHI', name: '🪙 Satoshi Pit', color: 0x2196F3, desc: 'Ticket: $0.10' },
            { key: 'TRADER', name: '📈 Trader Lounge', color: 0xFF9800, desc: 'Ticket: $1.00 • Nivel 1+' },
            { key: 'WHALE', name: '🐋 Whale Club', color: 0xE91E63, desc: 'Ticket: $10.00 • Nivel 4+' }
        ];

        const startX = x - 360;
        const spacing = 180;

        this.roomTexts = {}; // Store references

        rooms.forEach((room, i) => {
            const roomX = startX + (i * spacing);
            const roomY = y + 50;

            // Card background
            const card = this.add.graphics();
            const isSelected = this.selectedRoom === room.key;
            card.fillStyle(room.color, isSelected ? 0.3 : 0.1);
            card.fillRoundedRect(roomX, roomY, 160, 120, 8);
            card.lineStyle(3, room.color, isSelected ? 1 : 0.5);
            card.strokeRoundedRect(roomX, roomY, 160, 120, 8);

            // Room name
            this.add.text(roomX + 80, roomY + 30, room.name, {
                fontSize: '18px',
                fontFamily: 'Arial Black',
                color: '#FFF'
            }).setOrigin(0.5);

            // Description
            this.add.text(roomX + 80, roomY + 60, room.desc, {
                fontSize: '11px',
                fontFamily: 'Arial',
                color: '#AAA',
                align: 'center',
                wordWrap: { width: 140 }
            }).setOrigin(0.5);

            // User Count
            const countText = this.add.text(roomX + 80, roomY + 90, '👤 0', {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#00ff88',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            this.roomTexts[room.key] = countText;

            // Make interactive
            const hitArea = new Phaser.Geom.Rectangle(roomX, roomY, 160, 120);
            const zone = this.add.zone(roomX, roomY, 160, 120).setOrigin(0).setInteractive();

            zone.on('pointerdown', () => {
                this.selectedRoom = room.key;
                this.scene.restart(); // Refresh to show selection
            });

            zone.on('pointerover', () => {
                card.clear();
                card.fillStyle(room.color, 0.3);
                card.fillRoundedRect(roomX, roomY, 160, 120, 8);
                card.lineStyle(3, room.color, 1);
                card.strokeRoundedRect(roomX, roomY, 160, 120, 8);
            });

            zone.on('pointerout', () => {
                if (this.selectedRoom !== room.key) {
                    card.clear();
                    card.fillStyle(room.color, 0.1);
                    card.fillRoundedRect(roomX, roomY, 160, 120, 8);
                    card.lineStyle(3, room.color, 0.5);
                    card.strokeRoundedRect(roomX, roomY, 160, 120, 8);
                }
            });
        });
    }

    updateRoomCounts() {
        if (!this.roomTexts) return;

        Object.keys(this.roomTexts).forEach(key => {
            const count = this.roomCounts[key] || 0;
            this.roomTexts[key].setText(`👤 ${count}`);
        });
    }

    createStartButton(x, y) {
        const button = this.add.graphics();
        button.fillStyle(0x4CAF50, 1);
        button.fillRoundedRect(x - 150, y - 25, 300, 50, 25);
        button.lineStyle(3, 0xFFD700, 1);
        button.strokeRoundedRect(x - 150, y - 25, 300, 50, 25);

        const text = this.add.text(x, y, '🚀 ENTRAR AL JUEGO', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: '#FFF'
        }).setOrigin(0.5);

        const zone = this.add.zone(x - 150, y - 25, 300, 50).setOrigin(0).setInteractive();

        zone.on('pointerdown', () => {
            // 🚌 Emitir JOIN_ROOM antes de iniciar el juego
            this.socket.emit('JOIN_ROOM', { roomName: this.selectedRoom });

            // Guardar sala seleccionada
            this.registry.set('selectedRoom', this.selectedRoom);

            // Esperar confirmación y luego iniciar GameScene
            this.socket.once('ROOM_JOINED', (data) => {
                console.log(`✅ [MENU] Unido a sala: ${data.roomName} | Ticket: $${data.ticketPrice}`);

                // Guardar ticketPrice en el registry para mostrarlo en UIScene
                this.registry.set('ticketPrice', data.ticketPrice);

                // Iniciar GameScene y UIScene en paralelo
                this.scene.start('GameScene');
                this.scene.launch('UIScene');
            });

            // Timeout de seguridad (5 segundos)
            setTimeout(() => {
                if (!this.scene.isActive('GameScene')) {
                    console.warn('⚠️ Timeout esperando ROOM_JOINED, iniciando de todas formas...');
                    this.scene.start('GameScene');
                    this.scene.launch('UIScene');
                }
            }, 5000);
        });

        zone.on('pointerover', () => {
            button.clear();
            button.fillStyle(0x66BB6A, 1);
            button.fillRoundedRect(x - 150, y - 25, 300, 50, 25);
            button.lineStyle(3, 0xFFD700, 1);
            button.strokeRoundedRect(x - 150, y - 25, 300, 50, 25);
            text.setScale(1.05);
        });

        zone.on('pointerout', () => {
            button.clear();
            button.fillStyle(0x4CAF50, 1);
            button.fillRoundedRect(x - 150, y - 25, 300, 50, 25);
            button.lineStyle(3, 0xFFD700, 1);
            button.strokeRoundedRect(x - 150, y - 25, 300, 50, 25);
            text.setScale(1);
        });
    }
}
