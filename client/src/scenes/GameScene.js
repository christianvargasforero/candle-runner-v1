// 🎮 NEON TRADER - Cyberpunk Chart Race Engine
// Velas holográficas, skins diferenciadas, entorno vivo

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // Estado del juego
        this.busStarted = false;
        this.candleHistory = [];
        this.playerSprites = new Map(); // odId -> { sprite, nameTag, skinColor }
        this.localUserId = null;
        this.passengers = [];
        
        // Configuración visual
        this.CANDLE_SPACING = 140;
        this.CANDLE_WIDTH = 50;
        this.BASE_X = 300;
        // Coordenadas absolutas y escala de precios (fuente de verdad)
        this.baseY = window.innerHeight / 2 + 100;
        this.priceScale = 300; // px range for price normalization (used in getCandleSpot)
        
        // Paleta Neon Cyberpunk
        this.COLORS = {
            LONG: 0x00ff88,      // Cyan/Verde neón
            SHORT: 0xff0055,     // Magenta/Rojo neón
            NEUTRAL: 0x888888,   // Gris
            GRID: 0x00fff9,      // Cyan brillante
            BG: 0x0a0a12,        // Fondo oscuro azulado
            GLOW_LONG: 0x00ff88,
            GLOW_SHORT: 0xff0055
        };
        
        // Colores para skins (diferenciación de jugadores)
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
        
        // Zoom responsivo
        this.zoomLevel = window.innerWidth < 480 ? 0.55 : 0.85;
        
        // Parallax
        this.gridScrollX = 0;
    }

    preload() {
        // Sin assets externos - todo se genera proceduralmente
    }

    create() {
        console.log('[🎮 NEON TRADER] Escena iniciada');
        
        // Configurar mundo
        this.cameras.main.setBackgroundColor(this.COLORS.BG);
        this.cameras.main.setZoom(this.zoomLevel);
        
        // Capas de profundidad
        this.bgLayer = this.add.container(0, 0).setDepth(0);
        this.gridLayer = this.add.container(0, 0).setDepth(1);
        this.candleLayer = this.add.container(0, 0).setDepth(10);
        this.lineLayer = this.add.container(0, 0).setDepth(15);
        this.playerLayer = this.add.container(0, 0).setDepth(50);
        this.uiLayer = this.add.container(0, 0).setDepth(100);
        
        // Crear fondo con parallax animado
        this.createAnimatedBackground();
        
        // Crear grid cyberpunk
        this.createNeonGrid();
        
        // Post-processing
        this.createPostProcessing();
        
        // UI de espera
        this.createWaitingUI();
        
        // Socket
        this.socket = window.globalSocket;
        this.setupSocketListeners();
        
        // Obtener userId local
        this.socket.on('USER_PROFILE', (profile) => {
            if (!this.localUserId) {
                this.localUserId = profile.id;
                console.log('[LOCAL USER]', this.localUserId);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎨 BACKGROUND & GRID
    // ═══════════════════════════════════════════════════════════════
    
    createAnimatedBackground() {
        // Fondo con gradiente radial simulado
        const bgWidth = 5000;
        const bgHeight = 1500;
        
        // Base oscura
        const bg = this.add.rectangle(bgWidth/2, bgHeight/2, bgWidth, bgHeight, this.COLORS.BG);
        this.bgLayer.add(bg);
        
        // Gradiente central (glow)
        const centerGlow = this.add.circle(bgWidth/2, bgHeight/2, 600, 0x001122, 0.5);
        centerGlow.setBlendMode(Phaser.BlendModes.ADD);
        this.bgLayer.add(centerGlow);
    }
    
    createNeonGrid() {
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.setScrollFactor(0.3); // Parallax lento
        
        const gridWidth = 3000;
        const gridHeight = 1500;
        const cellSize = 60;
        
        // Líneas verticales
        this.gridGraphics.lineStyle(1, this.COLORS.GRID, 0.08);
        for (let x = 0; x < gridWidth; x += cellSize) {
            this.gridGraphics.lineBetween(x, 0, x, gridHeight);
        }
        
        // Líneas horizontales
        for (let y = 0; y < gridHeight; y += cellSize) {
            this.gridGraphics.lineBetween(0, y, gridWidth, y);
        }
        
        // Líneas más brillantes cada 5 celdas
        this.gridGraphics.lineStyle(1, this.COLORS.GRID, 0.2);
        for (let x = 0; x < gridWidth; x += cellSize * 5) {
            this.gridGraphics.lineBetween(x, 0, x, gridHeight);
        }
        for (let y = 0; y < gridHeight; y += cellSize * 5) {
            this.gridGraphics.lineBetween(0, y, gridWidth, y);
        }
        
        this.gridLayer.add(this.gridGraphics);
    }
    
    createPostProcessing() {
        // Scanlines
        const scanlines = this.add.graphics();
        scanlines.setScrollFactor(0).setDepth(1000);
        
        for (let y = 0; y < this.scale.height; y += 3) {
            scanlines.lineStyle(1, 0x000000, 0.15);
            scanlines.lineBetween(0, y, this.scale.width, y);
        }
        
        // Vignette corners
        const vignetteSize = 300;
        const corners = [
            { x: 0, y: 0 },
            { x: this.scale.width, y: 0 },
            { x: 0, y: this.scale.height },
            { x: this.scale.width, y: this.scale.height }
        ];
        
        corners.forEach(corner => {
            const vignette = this.add.circle(corner.x, corner.y, vignetteSize, 0x000000, 0.6);
            vignette.setScrollFactor(0).setDepth(999);
            vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);
        });
    }
    
    createWaitingUI() {
        // Panel de espera
        this.waitPanel = this.add.container(this.scale.width / 2, 100);
        this.waitPanel.setScrollFactor(0).setDepth(200);
        
        // Fondo del panel
        const panelBg = this.add.rectangle(0, 0, 500, 80, 0x000000, 0.7);
        panelBg.setStrokeStyle(2, this.COLORS.GRID, 0.8);
        this.waitPanel.add(panelBg);
        
        // Texto parpadeante
        this.waitText = this.add.text(0, 0, '[ WAITING FOR PASSENGERS ]', {
            font: 'bold 24px "Courier New"',
            fill: '#00fff9',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.waitPanel.add(this.waitText);
        
        // Animación de parpadeo
        this.tweens.add({
            targets: this.waitText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔌 SOCKET LISTENERS
    // ═══════════════════════════════════════════════════════════════
    
    setupSocketListeners() {
        // BUS_START: El bus arrancó
        this.socket.on('BUS_START', (data) => {
            console.log('[BUS_START] Recibido:', data);
            
            this.busStarted = true;
            this.candleHistory = data.candleHistory || [];
            this.passengers = data.passengers || [];
            
            console.log('[BUS_START] ' + this.candleHistory.length + ' velas, ' + this.passengers.length + ' pasajeros');
            
            // Ocultar UI de espera
            this.waitPanel.setVisible(false);
            
            // Renderizar escena
            this.renderHolographicCandles();
            this.renderPriceLine();
            // Usar sistema de coordenadas absolutas ancladas
            this.spawnDifferentiatedPlayers(this.passengers);
        });
        
        // PRICE_UPDATE: Precio en tiempo real
        this.socket.on('PRICE_UPDATE', (data) => {
            this.updateLiveCandle(data.price);
        });
        
        // ROUND_RESULT: Resultado de la ronda
        this.socket.on('ROUND_RESULT', (data) => {
            console.log('[ROUND_RESULT]', data);
            
            if (data.candleHistory) {
                this.candleHistory = data.candleHistory;
                this.renderHolographicCandles();
                this.renderPriceLine();
            }
            
            if (data.passengerStatuses) {
                this.animatePlayerResults(data.passengerStatuses);
            }
        });
        
        // PLAYER_JOINED: Nuevo jugador se une
        this.socket.on('PLAYER_JOINED', (data) => {
            console.log('[PLAYER_JOINED]', data);
            this.addPlayerSprite(data);
        });
        
        // PLAYER_LEFT: Jugador se va
        this.socket.on('PLAYER_LEFT', (data) => {
            console.log('[PLAYER_LEFT]', data);
            this.removePlayerSprite(data.id);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🕯️ VELAS HOLOGRÁFICAS (Estilo Neon)
    // ═══════════════════════════════════════════════════════════════
    
    renderHolographicCandles() {
        // Limpiar velas anteriores
        this.candleLayer.removeAll(true);
        
        if (!this.candleHistory.length) return;
        
        const baseY = this.scale.height / 2 + 100;
        
        // Calcular rango de precios para normalización
        let minPrice = Infinity, maxPrice = -Infinity;
        this.candleHistory.forEach(c => {
            minPrice = Math.min(minPrice, c.low || c.close);
            maxPrice = Math.max(maxPrice, c.high || c.close);
        });
        const priceRange = maxPrice - minPrice || 1;
        
        // Dibujar cada vela usando el helper getCandleSpot
        this.candleHistory.forEach((candle, i) => {
            const { x, y } = this.getCandleSpot(i);
            // Determinar color basado en resultado (SERVIDOR = VERDAD)
            const isLong = candle.result === 'LONG';
            const color = isLong ? this.COLORS.LONG : 
                         (candle.result === 'SHORT' ? this.COLORS.SHORT : this.COLORS.NEUTRAL);

            // Crear vela holográfica
            const candleContainer = this.createHolographicCandle(x, y, color, i === this.candleHistory.length - 1);
            this.candleLayer.add(candleContainer);
        });
        
        // Centrar cámara en última vela
        const lastX = this.BASE_X + (this.candleHistory.length - 1) * this.CANDLE_SPACING;
        this.cameras.main.pan(lastX, baseY - 50, 800, 'Quad.easeOut');
    }
    
    createHolographicCandle(x, y, color, isLive = false) {
        const container = this.add.container(x, y);
        const graphics = this.add.graphics();
        
        const width = this.CANDLE_WIDTH;
        const bodyHeight = 80;
        const wickHeight = 40;
        
        // === GLOW EXTERIOR (Simula resplandor neón) ===
        graphics.fillStyle(color, 0.1);
        graphics.fillRoundedRect(-width/2 - 8, -bodyHeight/2 - 8, width + 16, bodyHeight + 16, 8);
        
        // === CUERPO HOLOGRÁFICO (Semitransparente) ===
        graphics.fillStyle(color, 0.2);
        graphics.fillRoundedRect(-width/2, -bodyHeight/2, width, bodyHeight, 4);
        
        // === BORDE NEÓN SÓLIDO ===
        graphics.lineStyle(2, color, 1);
        graphics.strokeRoundedRect(-width/2, -bodyHeight/2, width, bodyHeight, 4);
        
        // === WICK (Mecha) ===
        graphics.lineStyle(3, color, 0.8);
        graphics.lineBetween(0, -bodyHeight/2 - wickHeight, 0, -bodyHeight/2);
        graphics.lineBetween(0, bodyHeight/2, 0, bodyHeight/2 + wickHeight/2);
        
        // === HIGHLIGHT INTERNO (efecto cristal) ===
        graphics.lineStyle(1, 0xffffff, 0.3);
        graphics.lineBetween(-width/2 + 4, -bodyHeight/2 + 8, -width/2 + 4, bodyHeight/2 - 8);
        
        container.add(graphics);
        
        // Si es la vela en vivo, añadir animación de pulso
        if (isLive) {
            this.tweens.add({
                targets: graphics,
                alpha: 0.6,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            // Partículas de energía
            this.createEnergyParticles(container, color);
        }
        
        return container;
    }
    
    createEnergyParticles(container, color) {
        // Partículas flotantes alrededor de la vela en vivo
        for (let i = 0; i < 4; i++) {
            const particle = this.add.circle(
                Phaser.Math.Between(-30, 30),
                Phaser.Math.Between(-50, 50),
                3, color, 0.6
            );
            container.add(particle);
            
            this.tweens.add({
                targets: particle,
                y: particle.y - 30,
                alpha: 0,
                duration: 1500,
                repeat: -1,
                delay: i * 400
            });
        }
    }
    
    updateLiveCandle(price) {
        if (!this.candleHistory.length) return;
        
        // Actualizar última vela
        const last = this.candleHistory[this.candleHistory.length - 1];
        last.close = price;
        if (price > (last.high || price)) last.high = price;
        if (price < (last.low || price)) last.low = price;
        
        // Re-renderizar
        this.renderHolographicCandles();
        this.renderPriceLine();
    }

    // ═══════════════════════════════════════════════════════════════
    // 📈 LÍNEA DE PRECIO (Chart Line)
    // ═══════════════════════════════════════════════════════════════
    
    renderPriceLine() {
        this.lineLayer.removeAll(true);
        
        if (this.candleHistory.length < 2) return;
        
        const baseY = this.scale.height / 2 + 100;
        
        // Calcular rango
        let minPrice = Infinity, maxPrice = -Infinity;
        this.candleHistory.forEach(c => {
            minPrice = Math.min(minPrice, c.close);
            maxPrice = Math.max(maxPrice, c.close);
        });
        const priceRange = maxPrice - minPrice || 1;
        
        // Dibujar línea conectando cierres
        const lineGraphics = this.add.graphics();
        lineGraphics.lineStyle(2, this.COLORS.GRID, 0.5);
        
        const points = this.candleHistory.map((c, i) => {
            const x = this.BASE_X + i * this.CANDLE_SPACING;
            const priceNorm = (c.close - minPrice) / priceRange;
            const y = baseY - priceNorm * 300;
            return { x, y };
        });
        
        // Dibujar path
        lineGraphics.beginPath();
        lineGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            lineGraphics.lineTo(points[i].x, points[i].y);
        }
        lineGraphics.strokePath();
        
        // Puntos en cada cierre
        points.forEach((p, i) => {
            const isLast = i === points.length - 1;
            const dot = this.add.circle(p.x, p.y, isLast ? 6 : 3, this.COLORS.GRID, isLast ? 1 : 0.5);
            this.lineLayer.add(dot);
            
            if (isLast) {
                // Pulso en el último punto
                this.tweens.add({
                    targets: dot,
                    scale: 1.5,
                    alpha: 0.5,
                    duration: 800,
                    yoyo: true,
                    repeat: -1
                });
            }
        });
        
        this.lineLayer.add(lineGraphics);
    }

    // Fuente de verdad para la posición "encima" de una vela
    getCandleSpot(index) {
        // Índice seguro
        const i = Math.max(0, Math.min(index, this.candleHistory.length - 1));
        const x = this.BASE_X + i * this.CANDLE_SPACING;

        // Normalizar precio para trasladarlo a Y
        let minPrice = Infinity, maxPrice = -Infinity;
        this.candleHistory.forEach(c => {
            minPrice = Math.min(minPrice, c.low || c.close);
            maxPrice = Math.max(maxPrice, c.high || c.close);
        });
        const priceRange = Math.max(1, maxPrice - minPrice);

        const price = this.candleHistory[i].close || (minPrice + priceRange / 2);
        const priceNorm = (price - minPrice) / priceRange;
        const y = this.baseY - priceNorm * this.priceScale;

        return { x, y };
    }

    // ═══════════════════════════════════════════════════════════════
    // 👥 JUGADORES DIFERENCIADOS
    // ═══════════════════════════════════════════════════════════════
    
    spawnDifferentiatedPlayers(passengers) {
        // Limpiar sprites previos
        this.playerSprites.forEach(data => {
            if (data.container) data.container.destroy();
        });
        this.playerSprites.clear();
        this.playerLayer.removeAll(true);

        if (!this.candleHistory.length) return;

        const lastIndex = this.candleHistory.length - 1;
        const spot = this.getCandleSpot(lastIndex);

        // Spawn separado para local y remotos (evita superposición)
        passengers.forEach((p, index) => {
            const id = p.odId || p.userId || p.id;
            if (!id) return;

            const isLocal = id === this.localUserId;

            if (isLocal) {
                // Jugador local: posicion precisa sobre la vela y cámara inmediata
                const my = this.spawnMyPlayer(id, p, spot);
                this.playerSprites.set(id, my);
            } else {
                // Otros jugadores: evitar overlap con offset aleatorio
                const other = this.spawnOtherPlayer(id, p, spot, index);
                this.playerSprites.set(id, other);
            }
        });

        // Asegurar que la cámara siga al local si existe
        const localData = this.playerSprites.get(this.localUserId);
        if (localData && localData.container) {
            this.cameras.main.startFollow(localData.container, true, 0.12, 0.12);
        }
    }

    // Posicionar y crear jugador local exactamente sobre la vela
    spawnMyPlayer(id, p, spot) {
        const x = spot.x;
        const y = spot.y - 20; // encima de la vela
        const color = p.skinColor || 0x00fff9;
        const data = this.createPlayerSprite(x, y, color, { odId: id, skinName: p.skinName || p.skin || 'You', integrity: p.integrity, maxIntegrity: p.maxIntegrity }, true);
        // Force follow immediately
        if (data && data.container) {
            this.cameras.main.startFollow(data.container, true, 0.12, 0.12);
        }
        return data;
    }

    // Posicionar y crear jugador remoto con pequeño offset para evitar superposición
    spawnOtherPlayer(id, p, spot, index) {
        // Offset en X determinista por índice para estabilidad en todos los clientes
        const column = index % 5;
        const row = Math.floor(index / 5);
        const jitter = (column - 2) * 18 + (Math.random() * 10 - 5); // -41 .. +41 approx
        const x = spot.x + jitter;
        const y = spot.y - 20 - row * 6; // pequeño apilado si muchos
        const color = p.skinColor || this.SKIN_COLORS[index % this.SKIN_COLORS.length];
        const data = this.createPlayerSprite(x, y, color, { odId: id, skinName: p.skinName || p.skin || 'Anon', integrity: p.integrity, maxIntegrity: p.maxIntegrity }, false);
        // Fantasma
        if (data && data.container) {
            data.container.setAlpha(0.55);
        }
        return data;
    }
    
    createPlayerSprite(x, y, color, data, isLocal) {
        const container = this.add.container(x, y);
        container.setDepth(isLocal ? 100 : 50);
        
        // === CUERPO (Círculo neón con glow) ===
        // Glow
        const glow = this.add.circle(0, 0, 22, color, 0.3);
        container.add(glow);
        
        // Cuerpo principal
        const body = this.add.circle(0, 0, 15, color, isLocal ? 1 : 0.6);
        container.add(body);
        
        // Borde
        const border = this.add.circle(0, 0, 15, color, 0);
        border.setStrokeStyle(2, isLocal ? 0xffffff : color, 1);
        container.add(border);
        
        // Core brillante
        const core = this.add.circle(0, -3, 5, 0xffffff, 0.5);
        container.add(core);
        
        // === NOMBRE FLOTANTE ===
        const shortName = (data.skinName || 'Anon').slice(0, 8);
        const nameTag = this.add.text(0, -35, shortName, {
            font: 'bold 12px "Courier New"',
            fill: isLocal ? '#00fff9' : '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);
        container.add(nameTag);
        
        // === INDICADOR DE INTEGRIDAD ===
        const integrityBar = this.add.rectangle(0, 25, 30, 4, 0x333333);
        container.add(integrityBar);
        
        const integrityPercent = (data.integrity || 100) / (data.maxIntegrity || 100);
        const integrityFill = this.add.rectangle(
            -15 + (30 * integrityPercent) / 2, 25,
            30 * integrityPercent, 4,
            integrityPercent > 0.5 ? 0x00ff88 : (integrityPercent > 0.2 ? 0xffff00 : 0xff0055)
        );
        integrityFill.setOrigin(0, 0.5);
        integrityFill.x = -15;
        container.add(integrityFill);
        
        // Animación de flotar para el jugador local
        if (isLocal) {
            this.tweens.add({
                targets: container,
                y: y - 5,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            // Partículas de estela
            this.time.addEvent({
                delay: 200,
                callback: () => this.createTrailParticle(container.x, container.y + 15, color),
                loop: true
            });
        }
        
        this.playerLayer.add(container);
        
        return {
            container,
            body,
            glow,
            nameTag,
            color,
            isLocal,
            odId: data.odId
        };
    }
    
    createTrailParticle(x, y, color) {
        const particle = this.add.circle(x, y, 4, color, 0.5);
        particle.setDepth(40);
        
        this.tweens.add({
            targets: particle,
            y: y + 30,
            alpha: 0,
            scale: 0.3,
            duration: 600,
            onComplete: () => particle.destroy()
        });
    }
    
    addPlayerSprite(data) {
        if (!this.candleHistory.length) return;
        
        const lastCandleX = this.BASE_X + (this.candleHistory.length - 1) * this.CANDLE_SPACING;
        const y = this.scale.height / 2 - 80;
        const id = data.id || data.odId || data.userId;
        if (!id) return;

        const color = data.skinColor || this.SKIN_COLORS[this.playerSprites.size % this.SKIN_COLORS.length];
        const isLocal = id === this.localUserId;

        const playerData = this.createPlayerSprite(lastCandleX, y, color, {
            odId: id,
            skinName: data.skin || data.skinName,
            integrity: data.integrity || 100,
            maxIntegrity: data.maxIntegrity || 100
        }, isLocal);

        this.playerSprites.set(id, playerData);
    }
    
    removePlayerSprite(odId) {
        const data = this.playerSprites.get(odId);
        if (data) {
            if (data.container) data.container.destroy();
            this.playerSprites.delete(odId);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎬 ANIMACIONES DE RESULTADO
    // ═══════════════════════════════════════════════════════════════
    
    animatePlayerResults(statuses) {
        statuses.forEach(s => {
            const id = s.odId || s.userId || s.id;
            const data = this.playerSprites.get(id);
            if (!data || !data.container) return;
            
            const container = data.container;
            
            if (s.status === 'WIN') {
                // === VICTORIA: Salto triunfante ===
                this.tweens.add({
                    targets: container,
                    x: container.x + this.CANDLE_SPACING,
                    y: container.y - 100,
                    duration: 500,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                        this.tweens.add({
                            targets: container,
                            y: container.y + 100,
                            duration: 400,
                            ease: 'Bounce.easeOut'
                        });
                        this.createVictoryParticles(container.x, container.y, data.color);
                        this.showFloatingText('+WIN', container.x, container.y - 50, '#00ff88');
                    }
                });
                
            } else if (s.status === 'DAMAGE') {
                // === DAÑO: Glitch y deslizamiento ===
                this.createGlitchEffect(container);
                
                this.tweens.add({
                    targets: container,
                    x: container.x + this.CANDLE_SPACING,
                    duration: 800,
                    ease: 'Cubic.easeInOut',
                    onStart: () => {
                        // Cambiar color temporalmente a rojo
                        if (data.body) data.body.setFillStyle(0xff0055);
                        this.showFloatingText('-1 HP', container.x, container.y - 50, '#ff0055');
                    },
                    onComplete: () => {
                        // Restaurar color
                        if (data.body) data.body.setFillStyle(data.color, data.isLocal ? 1 : 0.6);
                    }
                });
                
            } else if (s.status === 'BURNED') {
                // === QUEMADO: Explosión épica ===
                this.createExplosion(container.x, container.y);
                this.showFloatingText('💀 BURNED', container.x, container.y - 60, '#ff0055');
                
                // Destruir sprite
                this.time.delayedCall(500, () => {
                    container.destroy();
                    this.playerSprites.delete(s.odId);
                    
                    // Si era el jugador local, mostrar Game Over
                    if (s.odId === this.localUserId) {
                        this.cameras.main.stopFollow();
                        this.showGameOver();
                    }
                });
            }
        });
    }
    
    createVictoryParticles(x, y, color) {
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const distance = 50;
            
            const particle = this.add.circle(x, y, 5, color, 0.8);
            particle.setDepth(60);
            
            this.tweens.add({
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
    
    createGlitchEffect(container) {
        // Efecto de glitch rápido
        const originalX = container.x;
        
        this.tweens.add({
            targets: container,
            x: originalX + Phaser.Math.Between(-10, 10),
            duration: 50,
            yoyo: true,
            repeat: 5
        });
    }
    
    createExplosion(x, y) {
        // Onda expansiva
        const shockwave = this.add.circle(x, y, 10, 0xff0055, 0.8);
        shockwave.setDepth(70);
        
        this.tweens.add({
            targets: shockwave,
            scale: 8,
            alpha: 0,
            duration: 600,
            onComplete: () => shockwave.destroy()
        });
        
        // Partículas de explosión
        for (let i = 0; i < 25; i++) {
            const particle = this.add.circle(x, y, Phaser.Math.Between(3, 8), 
                Phaser.Math.RND.pick([0xff0055, 0xff6600, 0xffff00]), 0.9);
            particle.setDepth(65);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Phaser.Math.Between(80, 200);
            
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                duration: Phaser.Math.Between(400, 800),
                onComplete: () => particle.destroy()
            });
        }
        
        // Screen shake
        this.cameras.main.shake(300, 0.01);
    }
    
    showFloatingText(text, x, y, color) {
        color = color || '#fff';
        const t = this.add.text(x, y, text, {
            font: 'bold 28px "Courier New"',
            fill: color,
            stroke: '#000',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(500);
        
        this.tweens.add({
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
        // Panel de Game Over
        const panel = this.add.container(this.scale.width / 2, this.scale.height / 2);
        panel.setScrollFactor(0).setDepth(2000);
        
        // Fondo oscuro
        const bg = this.add.rectangle(0, 0, 500, 250, 0x000000, 0.9);
        bg.setStrokeStyle(3, 0xff0055);
        panel.add(bg);
        
        // Título
        const title = this.add.text(0, -60, '[ 💀 SKIN BURNED 💀 ]', {
            font: 'bold 36px "Courier New"',
            fill: '#ff0055',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);
        panel.add(title);
        
        // Subtítulo
        const subtitle = this.add.text(0, 10, 'GAME OVER', {
            font: 'bold 48px "Courier New"',
            fill: '#ffffff',
            stroke: '#ff0055',
            strokeThickness: 6
        }).setOrigin(0.5);
        panel.add(subtitle);
        
        // Instrucción
        const instruction = this.add.text(0, 80, 'Repair your skin to continue', {
            font: '18px "Courier New"',
            fill: '#888888'
        }).setOrigin(0.5);
        panel.add(instruction);
        
        // Animación de pulso
        this.tweens.add({
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
    
    update(time, delta) {
        // Parallax del grid
        if (this.gridGraphics) {
            this.gridScrollX += delta * 0.01;
            // El scrollFactor ya maneja el parallax
        }
    }
}
