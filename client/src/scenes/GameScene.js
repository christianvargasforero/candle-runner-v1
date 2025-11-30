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
        
        // ============================================
        // ⚙️ CONFIGURACIÓN DE FÍSICA ARCADE
        // ============================================
        
        // Configurar límites del mundo (mucho más ancho para infinitas velas)
        this.physics.world.setBounds(0, 0, 20000, 2000);
        this.physics.world.setFPS(60);
        
        // 🏗️ GRUPO FÍSICO DE VELAS (Plataformas Estáticas)
        this.candlesGroup = this.physics.add.staticGroup();
        
        // 🎯 GRUPO FÍSICO DEDICADO PARA COLISIONES (Invisible)
        this.physicsCandles = this.physics.add.staticGroup();
        
        // Mapeo: índice de vela -> objeto físico
        this.candlePhysicsBodies = new Map();
        
        // Referencia al jugador local
        this.myPlayer = null;
        
        console.log('[⚙️ PHYSICS] Sistema Arcade activado');
        
        // ============================================
        // 🎨 CONFIGURACIÓN VISUAL
        // ============================================
        
        // Configurar cámara
        this.cameras.main.setBackgroundColor(this.COLORS.BG);
        this.cameras.main.setZoom(this.zoomLevel);
        this.cameras.main.setBounds(0, 0, 20000, 2000);
        
        // Capas de profundidad
        this.bgLayer = this.add.container(0, 0).setDepth(0);
        this.gridLayer = this.add.container(0, 0).setDepth(1);
        this.candleLayer = this.add.container(0, 0).setDepth(10);
        this.lineLayer = this.add.container(0, 0).setDepth(15);
        // NO usar container para playerLayer - los sprites físicos no funcionan bien en containers
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
        // ============================================
        // 🛡️ SISTEMA DE RECUPERACIÓN DE ESTADO
        // ============================================
        
        // Solicitar estado del juego inmediatamente (proactivo)
        console.log('[🔍 RECOVERY] Solicitando estado del juego...');
        this.socket.emit('REQUEST_GAME_STATE');
        
        // CURRENT_GAME_STATE: Respuesta del servidor con estado actual
        this.socket.on('CURRENT_GAME_STATE', (data) => {
            console.log('[📦 CURRENT_GAME_STATE] Recibido:', data);
            
            if (data.status === 'IN_PROGRESS') {
                console.log('[🚨 CATCH-UP] El bus ya salió! Sincronizando...');
                
                this.busStarted = true;
                this.candleHistory = data.candleHistory || [];
                this.passengers = data.passengers || [];
                
                // Ocultar UI de espera
                this.waitPanel.setVisible(false);
                
                // Renderizar escena completa
                this.renderHolographicCandles();
                this.renderPriceLine();
                this.spawnDifferentiatedPlayers(this.passengers);
                
                console.log('[✅ CATCH-UP] Sincronización completa!');
            } else {
                console.log('[⏳ WAITING] Bus aún no inicia. Estado:', data.status);
            }
        });
        
        // BUS_START: El bus arrancó (listener normal)
        this.socket.on('BUS_START', (data) => {
            console.log('[BUS_START] Recibido:', data);
            
            // Evitar doble inicialización
            if (this.busStarted) {
                console.log('[⚠️ BUS_START] Ya iniciado, ignorando...');
                return;
            }
            
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
        // ============================================
        // 🧹 LIMPIEZA: Velas anteriores
        // ============================================
        this.candleLayer.removeAll(true);
        
        // Limpiar grupos físicos anteriores
        this.candlesGroup.clear(true, true);
        this.physicsCandles.clear(true, true);
        this.candlePhysicsBodies.clear();
        
        if (!this.candleHistory.length) return;
        
        const baseY = this.scale.height / 2 + 100;
        
        // Calcular rango de precios para normalización
        let minPrice = Infinity, maxPrice = -Infinity;
        this.candleHistory.forEach(c => {
            minPrice = Math.min(minPrice, c.low || c.close);
            maxPrice = Math.max(maxPrice, c.high || c.close);
        });
        const priceRange = maxPrice - minPrice || 1;
        
        // ============================================
        // 🏗️ SISTEMA DUAL: FÍSICA + VISUAL
        // ============================================
        this.candleHistory.forEach((candle, i) => {
            const { x, y } = this.getCandleSpot(i);
            
            // Determinar color basado en resultado
            const isLong = candle.result === 'LONG';
            const color = isLong ? this.COLORS.LONG : 
                         (candle.result === 'SHORT' ? this.COLORS.SHORT : this.COLORS.NEUTRAL);

            const bodyHeight = 80;
            
            // ============================================
            // A. CUERPO FÍSICO (Invisible) - LA PLATAFORMA REAL
            // ============================================
            const physicsBody = this.add.rectangle(x, y, this.CANDLE_WIDTH, bodyHeight, 0xffffff);
            physicsBody.setAlpha(0); // Invisible
            physicsBody.setOrigin(0.5, 0.5);
            
            // Añadir al grupo físico estático
            this.candlesGroup.add(physicsBody);
            
            // 🎯 TAMBIÉN añadir a physicsCandles para colisiones
            this.physicsCandles.add(physicsBody);
            
            // Guardar referencia
            this.candlePhysicsBodies.set(i, physicsBody);
            
            // ============================================
            // B. GRÁFICO VISUAL (Cyberpunk) - LO QUE SE VE
            // ============================================
            const candleContainer = this.createHolographicCandle(x, y, color, i === this.candleHistory.length - 1);
            this.candleLayer.add(candleContainer);
            
            // DEBUG: Mostrar hitbox (descomentar para debugging)
            // physicsBody.setAlpha(0.2);
            // physicsBody.setFillStyle(0xff0000);
        });
        
        // Centrar cámara en última vela
        const lastX = this.BASE_X + (this.candleHistory.length - 1) * this.CANDLE_SPACING;
        this.cameras.main.pan(lastX, baseY - 50, 800, 'Quad.easeOut');
        
        console.log(`[🏗️ PHYSICS] ${this.candleHistory.length} plataformas creadas`);
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
        const lastIndex = this.candleHistory.length - 1;
        const last = this.candleHistory[lastIndex];
        last.close = price;
        if (price > (last.high || price)) last.high = price;
        if (price < (last.low || price)) last.low = price;
        
        // ============================================
        // 🔄 SINCRONIZACIÓN: Actualizar cuerpo físico
        // ============================================
        const physicsBody = this.candlePhysicsBodies.get(lastIndex);
        if (physicsBody) {
            const { x, y } = this.getCandleSpot(lastIndex);
            const bodyHeight = 80; // Mantener consistente con renderHolographicCandles
            
            // Actualizar posición y tamaño del cuerpo físico
            physicsBody.setPosition(x, y);
            physicsBody.setSize(this.CANDLE_WIDTH, bodyHeight);
            
            // CRÍTICO: Refrescar física estática
            physicsBody.body.updateFromGameObject();
        }
        
        // Re-renderizar visual
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
            if (data.sprite) data.sprite.destroy();
        });
        this.playerSprites.clear();

        if (!this.candleHistory.length) return;

        const lastIndex = this.candleHistory.length - 1;
        const spot = this.getCandleSpot(lastIndex);

        // Spawn separado para local y remotos
        passengers.forEach((p, index) => {
            const id = p.odId || p.userId || p.id;
            if (!id) return;

            const isLocal = id === this.localUserId;

            if (isLocal) {
                // Jugador local: sprite con física completa
                const my = this.spawnMyPlayer(id, p, spot);
                this.playerSprites.set(id, my);
            } else {
                // Otros jugadores: sprites visuales (sin colisión)
                const other = this.spawnOtherPlayer(id, p, spot, index);
                this.playerSprites.set(id, other);
            }
        });

        // Asegurar que la cámara siga al jugador local
        const localData = this.playerSprites.get(this.localUserId);
        if (localData && localData.sprite) {
            this.cameras.main.startFollow(localData.sprite, true, 0.1, 0.1);
            console.log('[📷 CAMERA] Siguiendo jugador local');
        }
    }

    // ============================================
    // 🎮 SPAWN JUGADOR LOCAL (CON FÍSICA)
    // ============================================
    spawnMyPlayer(id, p, spot) {
        const x = spot.x;
        const y = spot.y - 60; // Spawn más alto para que caiga con gravedad
        const color = p.skinColor || 0x00fff9;
        
        // Crear sprite físico
        const sprite = this.physics.add.sprite(x, y, null);
        sprite.setDisplaySize(30, 30); // Tamaño del sprite
        sprite.setOrigin(0.5, 0.5);
        sprite.setDepth(100);
        
        // ============================================
        // ⚙️ CONFIGURACIÓN DE FÍSICA
        // ============================================
        sprite.setGravityY(800); // Gravedad fuerte
        sprite.setCollideWorldBounds(true);
        sprite.setBounce(0.2); // Pequeño rebote al aterrizar
        sprite.setFriction(0.8); // Fricción para no resbalar
        
        // ============================================
        // 🎨 VISUAL: Sprite procedural del jugador
        // ============================================
        // Crear textura procedural usando graphics temporal
        const tempGraphics = this.add.graphics();
        
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
        
        // Generar textura desde el graphics
        tempGraphics.generateTexture('playerLocal', 44, 44);
        tempGraphics.destroy();
        
        // Aplicar textura al sprite
        sprite.setTexture('playerLocal');
        
        // ============================================
        // 📛 NOMBRE Y UI
        // ============================================
        const shortName = (p.skinName || p.skin || 'You').slice(0, 8);
        const nameTag = this.add.text(0, -35, shortName, {
            font: 'bold 12px "Courier New"',
            fill: '#00fff9',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(101);
        
        sprite.setData('nameTag', nameTag);
        
        // Barra de integridad
        const integrityBar = this.add.rectangle(0, 25, 30, 4, 0x333333).setDepth(101);
        const integrityPercent = (p.integrity || 100) / (p.maxIntegrity || 100);
        const integrityFill = this.add.rectangle(
            -15, 25, 30 * integrityPercent, 4,
            integrityPercent > 0.5 ? 0x00ff88 : (integrityPercent > 0.2 ? 0xffff00 : 0xff0055)
        ).setOrigin(0, 0.5).setDepth(101);
        
        sprite.setData('integrityBar', integrityBar);
        sprite.setData('integrityFill', integrityFill);
        
        // ============================================
        // 🔗 COLISIONADOR CON VELAS
        // ============================================
        this.physics.add.collider(sprite, this.physicsCandles);
        
        // Establecer referencia global al jugador local
        this.myPlayer = sprite;
        
        console.log('[🎮 PLAYER] Jugador local spawneado con física en', x, y);
        console.log('[🔗 COLLIDER] Colisión jugador-velas activada');
        
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

    // ============================================
    // 👥 SPAWN JUGADOR REMOTO (SIN FÍSICA - Solo Visual)
    // ============================================
    spawnOtherPlayer(id, p, spot, index) {
        const column = index % 5;
        const row = Math.floor(index / 5);
        const jitter = (column - 2) * 18;
        const x = spot.x + jitter;
        const y = spot.y - 20 - row * 6;
        const color = p.skinColor || this.SKIN_COLORS[index % this.SKIN_COLORS.length];
        
        // Sprite visual simple (sin física)
        const sprite = this.add.sprite(x, y, null);
        sprite.setDisplaySize(30, 30);
        sprite.setOrigin(0.5, 0.5);
        sprite.setDepth(50);
        sprite.setAlpha(0.6); // Fantasma
        
        // Crear textura procedural única para este jugador
        const textureKey = `playerRemote_${id}`;
        const tempGraphics = this.add.graphics();
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
        const shortName = (p.skinName || p.skin || 'Anon').slice(0, 8);
        const nameTag = this.add.text(0, -35, shortName, {
            font: 'bold 12px "Courier New"',
            fill: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(51);
        
        sprite.setData('nameTag', nameTag);
        
        console.log('[👥 PLAYER] Jugador remoto spawneado:', shortName);
        
        return {
            sprite,
            nameTag,
            color,
            isLocal: false,
            odId: id
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
        
        const lastIndex = this.candleHistory.length - 1;
        const spot = this.getCandleSpot(lastIndex);
        const id = data.id || data.odId || data.userId;
        if (!id) return;

        const isLocal = id === this.localUserId;
        
        if (isLocal) {
            // Jugador local con física
            const playerData = this.spawnMyPlayer(id, data, spot);
            this.playerSprites.set(id, playerData);
        } else {
            // Jugador remoto visual
            const playerData = this.spawnOtherPlayer(id, data, spot, this.playerSprites.size);
            this.playerSprites.set(id, playerData);
        }
    }
    
    removePlayerSprite(odId) {
        const data = this.playerSprites.get(odId);
        if (data) {
            if (data.sprite) data.sprite.destroy();
            if (data.nameTag) data.nameTag.destroy();
            if (data.integrityBar) data.integrityBar.destroy();
            if (data.integrityFill) data.integrityFill.destroy();
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
            if (!data || !data.sprite) return;
            
            const sprite = data.sprite;
            
            if (s.status === 'WIN') {
                // === VICTORIA: Salto a siguiente vela ===
                if (data.isLocal) {
                    // 🎯 DESACTIVAR FÍSICA durante animación
                    if (sprite.body) sprite.body.enable = false;
                    
                    // Tween controlado (no interferencia con gravedad)
                    this.tweens.add({
                        targets: sprite,
                        x: sprite.x + this.CANDLE_SPACING,
                        y: sprite.y - 120,
                        duration: 400,
                        ease: 'Quad.easeOut',
                        onComplete: () => {
                            // Caída con rebote
                            this.tweens.add({
                                targets: sprite,
                                y: sprite.y + 120,
                                duration: 500,
                                ease: 'Bounce.easeOut',
                                onComplete: () => {
                                    // 🎯 REACTIVAR FÍSICA al aterrizar
                                    if (sprite.body) {
                                        sprite.body.enable = true;
                                        sprite.setVelocity(0, 0); // Reset velocidad
                                    }
                                }
                            });
                            
                            this.createVictoryParticles(sprite.x, sprite.y, data.color);
                            this.showFloatingText('+WIN', sprite.x, sprite.y - 50, '#00ff88');
                        }
                    });
                } else {
                    // Jugador remoto: tween visual
                    this.tweens.add({
                        targets: sprite,
                        x: sprite.x + this.CANDLE_SPACING,
                        y: sprite.y - 100,
                        duration: 500,
                        ease: 'Quad.easeOut',
                        onComplete: () => {
                            this.tweens.add({
                                targets: sprite,
                                y: sprite.y + 100,
                                duration: 400,
                                ease: 'Bounce.easeOut'
                            });
                        }
                    });
                }
                
            } else if (s.status === 'DAMAGE') {
                // === DAÑO: Glitch y avance ===
                this.createGlitchEffect(sprite);
                
                if (data.isLocal) {
                    // 🎯 DESACTIVAR FÍSICA durante animación
                    if (sprite.body) sprite.body.enable = false;
                    
                    // Tween horizontal suave
                    this.tweens.add({
                        targets: sprite,
                        x: sprite.x + this.CANDLE_SPACING,
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
                    
                    // Flash rojo en el sprite
                    this.tweens.add({
                        targets: sprite,
                        alpha: 0.3,
                        duration: 100,
                        yoyo: true,
                        repeat: 2
                    });
                } else {
                    // Jugador remoto: tween
                    this.tweens.add({
                        targets: sprite,
                        x: sprite.x + this.CANDLE_SPACING,
                        duration: 800,
                        ease: 'Cubic.easeInOut'
                    });
                }
                
                this.showFloatingText('-1 HP', sprite.x, sprite.y - 50, '#ff0055');
                
            } else if (s.status === 'BURNED') {
                // === QUEMADO: Explosión épica ===
                this.createExplosion(sprite.x, sprite.y);
                this.showFloatingText('💀 BURNED', sprite.x, sprite.y - 60, '#ff0055');
                
                // Destruir sprite
                this.time.delayedCall(500, () => {
                    if (data.nameTag) data.nameTag.destroy();
                    if (data.integrityBar) data.integrityBar.destroy();
                    if (data.integrityFill) data.integrityFill.destroy();
                    sprite.destroy();
                    
                    this.playerSprites.delete(id);
                    
                    // Si era el jugador local, mostrar Game Over
                    if (id === this.localUserId) {
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
    
    createGlitchEffect(sprite) {
        // Efecto de glitch rápido
        const originalX = sprite.x;
        
        this.tweens.add({
            targets: sprite,
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
        }
        
        // ============================================
        // 🎨 SINCRONIZACIÓN: UI sigue sprites
        // ============================================
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
        
        // ============================================
        // 🗑️ GARBAGE COLLECTION: Limpiar objetos fuera de cámara
        // ============================================
        const cameraLeft = this.cameras.main.scrollX - 500;
        
        // 1. Limpiar velas físicas antiguas
        this.candlePhysicsBodies.forEach((body, index) => {
            if (body && body.x < cameraLeft) {
                body.destroy();
                this.candlePhysicsBodies.delete(index);
            }
        });
        
        // 2. Limpiar gráficos de velas visuales
        if (this.candleLayer) {
            const candlesToRemove = [];
            this.candleLayer.list.forEach(container => {
                if (container.x < cameraLeft) {
                    candlesToRemove.push(container);
                }
            });
            candlesToRemove.forEach(c => {
                this.candleLayer.remove(c, true);
            });
        }
        
        // 3. Limpiar jugadores remotos fuera de cámara (no el local)
        this.playerSprites.forEach((data, id) => {
            if (!data.isLocal && data.sprite && data.sprite.x < cameraLeft) {
                console.log(`[🗑️ GC] Limpiando jugador remoto fuera de cámara: ${id}`);
                this.removePlayerSprite(id);
            }
        });
    }
}
