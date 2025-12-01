// 🕯️ CANDLE SYSTEM - Professional Trading Chart (TradingView Style)
// Responsabilidad: Renderizar velas japonesas reales con auto-escalado

export class CandleSystem {
    constructor(scene) {
        this.scene = scene;

        // Configuración visual
        this.CANDLE_SPACING = 140;
        this.CANDLE_WIDTH = 50;
        this.BASE_X = 300;

        // Auto-scaling viewport
        this.viewportPadding = 0.20; // 20% margin
        this.screenHeight = window.innerHeight * 0.6; // Use 60% of screen for chart
        this.baseY = window.innerHeight / 2;

        // Paleta de colores (TradingView style)
        this.COLORS = {
            BULL: 0x00ff88,      // Green candles (Close > Open)
            BEAR: 0xff0055,      // Red candles (Close < Open)
            NEUTRAL: 0x888888,
            GRID: 0x00fff9,
            WICK: 0xcccccc,
            PRICE_LINE: 0xffaa00,
            TEXT: 0xffffff
        };

        // Estado de velas
        this.candleHistory = [];
        this.lastHistoricalIndex = -1;
        this.liveTickerIndex = 0;

        // Estado de la vela en vivo
        this.liveStartPrice = null;
        this.liveCandleHigh = null;
        this.liveCandleLow = null;
        this.currentPhase = 'BETTING';

        // Capas de renderizado
        this.candleLayer = this.scene.add.container(0, 0).setDepth(10);
        this.liveCandleLayer = this.scene.add.container(0, 0).setDepth(20);
        this.priceAxisLayer = this.scene.add.container(0, 0).setDepth(25);
        this.currentPriceLayer = this.scene.add.container(0, 0).setDepth(30);

        // Graphics para vela activa
        this.liveCandleGraphics = this.scene.add.graphics();
        this.liveCandleGraphics.setDepth(21);

        // Graphics para línea de precio actual
        this.currentPriceGraphics = this.scene.add.graphics();
        this.currentPriceGraphics.setDepth(31);

        // Grupos físicos
        this.physicsGroup = this.scene.physics.add.staticGroup();
        this.candlePhysicsBodies = new Map();

        // Current price for live updates
        this.currentLivePrice = null;

        console.log('[🕯️ CandleSystem] Inicializado con Auto-Scaling');
    }

    // ═══════════════════════════════════════════════════════════════
    // 📊 AUTO-SCALING: Calcular rango de precios visible
    // ═══════════════════════════════════════════════════════════════

    calculatePriceRange() {
        if (this.candleHistory.length === 0) {
            return { minPrice: 0, maxPrice: 100, range: 100, pixelsPerDollar: 1 };
        }

        let minPrice = Infinity;
        let maxPrice = -Infinity;

        // Incluir historial visible
        this.candleHistory.forEach(c => {
            minPrice = Math.min(minPrice, c.low || c.close);
            maxPrice = Math.max(maxPrice, c.high || c.close);
        });

        // Incluir vela en vivo
        if (this.liveCandleHigh !== null && this.liveCandleLow !== null) {
            minPrice = Math.min(minPrice, this.liveCandleLow);
            maxPrice = Math.max(maxPrice, this.liveCandleHigh);
        }

        // 20% padding arriba y abajo
        const rawRange = maxPrice - minPrice;
        const paddedRange = rawRange * (1 + this.viewportPadding * 2);
        const padding = (paddedRange - rawRange) / 2;

        minPrice = minPrice - padding;
        maxPrice = maxPrice + padding;

        const range = maxPrice - minPrice || 1; // Prevent division by zero
        const pixelsPerDollar = this.screenHeight / range;

        return { minPrice, maxPrice, range, pixelsPerDollar };
    }

    // ═══════════════════════════════════════════════════════════════
    // 📊 CONSTRUCCIÓN DEL GRÁFICO
    // ═══════════════════════════════════════════════════════════════

    buildChart(candleHistory) {
        this.candleHistory = candleHistory || [];

        // Limpiar velas anteriores
        this.candleLayer.removeAll(true);
        this.physicsGroup.clear(true, true);
        this.candlePhysicsBodies.clear();

        if (!this.candleHistory.length) return;

        // Actualizar índices
        this.lastHistoricalIndex = this.candleHistory.length - 1;
        this.liveTickerIndex = this.lastHistoricalIndex + 1;

        const { minPrice, maxPrice, pixelsPerDollar } = this.calculatePriceRange();

        // Renderizar cada vela
        this.candleHistory.forEach((candle, i) => {
            this.createCandleWithPhysics(candle, i, minPrice, pixelsPerDollar);
        });

        // Renderizar eje de precios
        this.renderPriceAxis(minPrice, maxPrice);

        console.log(`[🏗️ CandleSystem] ${this.candleHistory.length} velas creadas`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🏗️ CREACIÓN DE VELA CON FÍSICA (DUAL SYSTEM)
    // ═══════════════════════════════════════════════════════════════

    createCandleWithPhysics(candle, index, minPrice, pixelsPerDollar) {
        const x = this.BASE_X + index * this.CANDLE_SPACING;

        // Convertir precios a coordenadas Y
        const yOpen = this.priceToY(candle.open, minPrice, pixelsPerDollar);
        const yClose = this.priceToY(candle.close, minPrice, pixelsPerDollar);
        const yHigh = this.priceToY(candle.high, minPrice, pixelsPerDollar);
        const yLow = this.priceToY(candle.low, minPrice, pixelsPerDollar);

        // Determinar color (TradingView style)
        const isBull = candle.close >= candle.open;
        const color = isBull ? this.COLORS.BULL : this.COLORS.BEAR;

        // Cuerpo físico invisible (plataforma)
        const bodyHeight = 80;
        const yCenterPhysics = (yOpen + yClose) / 2;
        const physicsBody = this.scene.add.rectangle(x, yCenterPhysics, this.CANDLE_WIDTH, bodyHeight, 0xffffff);
        physicsBody.setAlpha(0);
        physicsBody.setOrigin(0.5, 0.5);
        this.physicsGroup.add(physicsBody);
        this.candlePhysicsBodies.set(index, physicsBody);

        // Gráfico visual (vela real)
        const candleContainer = this.createJapaneseCandlestick(x, yOpen, yClose, yHigh, yLow, color);
        this.candleLayer.add(candleContainer);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎨 VELA JAPONESA REAL (Professional Style)
    // ═══════════════════════════════════════════════════════════════

    createJapaneseCandlestick(x, yOpen, yClose, yHigh, yLow, color) {
        const container = this.scene.add.container(0, 0);
        const graphics = this.scene.add.graphics();

        const bodyTop = Math.min(yOpen, yClose);
        const bodyBottom = Math.max(yOpen, yClose);
        const bodyHeight = Math.max(2, bodyBottom - bodyTop); // Minimum 2px height

        // 1. Mecha (Wick) - Línea fina desde High a Low
        graphics.lineStyle(2, this.COLORS.WICK, 0.8);
        graphics.lineBetween(x, yHigh, x, yLow);

        // 2. Cuerpo (Body) - Rectángulo desde Open a Close
        // Glow exterior
        graphics.fillStyle(color, 0.15);
        graphics.fillRoundedRect(
            x - this.CANDLE_WIDTH / 2 - 4,
            bodyTop - 4,
            this.CANDLE_WIDTH + 8,
            bodyHeight + 8,
            3
        );

        // Cuerpo principal
        graphics.fillStyle(color, 0.5);
        graphics.fillRoundedRect(
            x - this.CANDLE_WIDTH / 2,
            bodyTop,
            this.CANDLE_WIDTH,
            bodyHeight,
            2
        );

        // Borde sólido
        graphics.lineStyle(2, color, 1);
        graphics.strokeRoundedRect(
            x - this.CANDLE_WIDTH / 2,
            bodyTop,
            this.CANDLE_WIDTH,
            bodyHeight,
            2
        );

        container.add(graphics);
        return container;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔄 SET PHASE
    // ═══════════════════════════════════════════════════════════════

    setPhase(phase) {
        this.currentPhase = phase;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔴 ACTUALIZAR VELA EN VIVO
    // ═══════════════════════════════════════════════════════════════

    updateLiveCandle(price) {
        if (!this.candleHistory.length) return;

        const lastIndex = this.candleHistory.length - 1;
        const last = this.candleHistory[lastIndex];

        // Inicializar precio de apertura si es null
        if (this.liveStartPrice === null) {
            this.liveStartPrice = last.close || price;
            this.liveCandleHigh = price;
            this.liveCandleLow = price;
        }

        // Actualizar precio actual y extremos
        this.currentLivePrice = price;
        if (price > this.liveCandleHigh) this.liveCandleHigh = price;
        if (price < this.liveCandleLow) this.liveCandleLow = price;

        // Actualizar datos de la última vela
        last.close = price;
        last.high = this.liveCandleHigh;
        last.low = this.liveCandleLow;

        // Renderizar vela en vivo
        this.renderLiveCandleTicker();

        // Renderizar línea de precio actual
        this.renderCurrentPriceLine(price);

        // Actualizar cuerpo físico
        const physicsBody = this.candlePhysicsBodies.get(lastIndex);
        if (physicsBody && physicsBody.body) {
            const { minPrice, pixelsPerDollar } = this.calculatePriceRange();
            const yOpen = this.priceToY(this.liveStartPrice, minPrice, pixelsPerDollar);
            const yClose = this.priceToY(price, minPrice, pixelsPerDollar);
            const yCenter = (yOpen + yClose) / 2;

            physicsBody.setPosition(this.BASE_X + this.liveTickerIndex * this.CANDLE_SPACING, yCenter);
            physicsBody.body.updateFromGameObject();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔴 RENDERIZAR VELA EN VIVO (TICKER DINÁMICO)
    // ═══════════════════════════════════════════════════════════════

    renderLiveCandleTicker() {
        this.liveCandleGraphics.clear();

        if (this.liveStartPrice === null || this.currentLivePrice === null) return;

        const x = this.BASE_X + this.liveTickerIndex * this.CANDLE_SPACING;
        const { minPrice, pixelsPerDollar } = this.calculatePriceRange();

        // Convertir precios a coordenadas Y
        const yOpen = this.priceToY(this.liveStartPrice, minPrice, pixelsPerDollar);
        const yCurrent = this.priceToY(this.currentLivePrice, minPrice, pixelsPerDollar);
        const yHigh = this.priceToY(this.liveCandleHigh, minPrice, pixelsPerDollar);
        const yLow = this.priceToY(this.liveCandleLow, minPrice, pixelsPerDollar);

        const bodyTop = Math.min(yOpen, yCurrent);
        const bodyBottom = Math.max(yOpen, yCurrent);
        const bodyHeight = Math.max(3, bodyBottom - bodyTop);

        // Determinar color
        const isBull = this.currentLivePrice >= this.liveStartPrice;
        const color = isBull ? this.COLORS.BULL : this.COLORS.BEAR;

        // Color especial en fase BETTING
        const borderColor = this.currentPhase === 'BETTING' ? 0xffff00 : color;

        // 1. Mecha
        this.liveCandleGraphics.lineStyle(3, this.COLORS.WICK, 0.9);
        this.liveCandleGraphics.lineBetween(x, yHigh, x, yLow);

        // 2. Glow exterior (pulsante)
        this.liveCandleGraphics.fillStyle(color, 0.2);
        this.liveCandleGraphics.fillRoundedRect(
            x - this.CANDLE_WIDTH / 2 - 6,
            bodyTop - 6,
            this.CANDLE_WIDTH + 12,
            bodyHeight + 12,
            4
        );

        // 3. Cuerpo principal
        this.liveCandleGraphics.fillStyle(color, 0.7);
        this.liveCandleGraphics.fillRoundedRect(
            x - this.CANDLE_WIDTH / 2,
            bodyTop,
            this.CANDLE_WIDTH,
            bodyHeight,
            2
        );

        // 4. Borde brillante
        this.liveCandleGraphics.lineStyle(3, borderColor, 1);
        this.liveCandleGraphics.strokeRoundedRect(
            x - this.CANDLE_WIDTH / 2,
            bodyTop,
            this.CANDLE_WIDTH,
            bodyHeight,
            2
        );

        // 5. Dot pulsante en precio actual
        this.liveCandleGraphics.fillStyle(color, 0.5);
        this.liveCandleGraphics.fillCircle(x + this.CANDLE_WIDTH / 2 + 15, yCurrent, 12);
        this.liveCandleGraphics.fillStyle(color, 1);
        this.liveCandleGraphics.fillCircle(x + this.CANDLE_WIDTH / 2 + 15, yCurrent, 8);
        this.liveCandleGraphics.fillStyle(0xffffff, 1);
        this.liveCandleGraphics.fillCircle(x + this.CANDLE_WIDTH / 2 + 15, yCurrent, 4);
    }

    // ═══════════════════════════════════════════════════════════════
    // 💹 LÍNEA DE PRECIO ACTUAL (Horizontal Dashed Line)
    // ═══════════════════════════════════════════════════════════════

    renderCurrentPriceLine(price) {
        this.currentPriceGraphics.clear();

        const { minPrice, pixelsPerDollar } = this.calculatePriceRange();
        const yPrice = this.priceToY(price, minPrice, pixelsPerDollar);

        const screenWidth = this.scene.scale.width;
        const isBull = price >= this.liveStartPrice;
        const color = isBull ? this.COLORS.BULL : this.COLORS.BEAR;

        // Línea punteada
        this.currentPriceGraphics.lineStyle(2, color, 0.8);
        for (let x = 0; x < screenWidth; x += 15) {
            this.currentPriceGraphics.lineBetween(x, yPrice, x + 8, yPrice);
        }

        // Etiqueta de precio en el lado derecho
        const priceLabel = this.scene.add.text(
            screenWidth - 120,
            yPrice,
            `$${price.toFixed(2)}`,
            {
                font: 'bold 16px "Courier New"',
                fill: isBull ? '#00ff88' : '#ff0055',
                backgroundColor: '#000000',
                padding: { x: 8, y: 4 }
            }
        ).setOrigin(0, 0.5).setDepth(32).setScrollFactor(0);

        // Auto-destruir en el próximo frame
        this.scene.time.delayedCall(50, () => {
            if (priceLabel) priceLabel.destroy();
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 📏 EJE DE PRECIOS (Price Axis - Right Side)
    // ═══════════════════════════════════════════════════════════════

    renderPriceAxis(minPrice, maxPrice) {
        this.priceAxisLayer.removeAll(true);

        const screenWidth = this.scene.scale.width;
        const numLabels = 8;
        const priceStep = (maxPrice - minPrice) / (numLabels - 1);

        for (let i = 0; i < numLabels; i++) {
            const price = minPrice + i * priceStep;
            const { pixelsPerDollar } = this.calculatePriceRange();
            const y = this.priceToY(price, minPrice, pixelsPerDollar);

            // Línea horizontal de grid
            const gridLine = this.scene.add.graphics();
            gridLine.lineStyle(1, this.COLORS.GRID, 0.1);
            gridLine.lineBetween(0, y, screenWidth, y);
            gridLine.setScrollFactor(0);
            this.priceAxisLayer.add(gridLine);

            // Etiqueta de precio
            const label = this.scene.add.text(
                screenWidth - 100,
                y,
                `$${price.toFixed(2)}`,
                {
                    font: '12px "Courier New"',
                    fill: '#888888',
                    backgroundColor: '#0a0a12',
                    padding: { x: 6, y: 2 }
                }
            ).setOrigin(0, 0.5).setScrollFactor(0);

            this.priceAxisLayer.add(label);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🧮 HELPER: Convertir precio a coordenada Y
    // ═══════════════════════════════════════════════════════════════

    priceToY(price, minPrice, pixelsPerDollar) {
        const priceNorm = (price - minPrice) * pixelsPerDollar;
        return this.baseY + this.screenHeight / 2 - priceNorm;
    }

    // ═══════════════════════════════════════════════════════════════
    // 📍 OBTENER POSICIÓN DE VELA
    // ═══════════════════════════════════════════════════════════════

    getCandleSpot(index) {
        const i = Math.max(0, Math.min(index, this.candleHistory.length - 1));
        const x = this.BASE_X + i * this.CANDLE_SPACING;

        const { minPrice, pixelsPerDollar } = this.calculatePriceRange();
        const candle = this.candleHistory[i];
        const price = candle.close || candle.open;
        const y = this.priceToY(price, minPrice, pixelsPerDollar) - 40; // Top of candle body

        return { x, y };
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔄 RESETEAR ESTADO DE VELA EN VIVO
    // ═══════════════════════════════════════════════════════════════

    resetLiveCandle() {
        this.liveStartPrice = null;
        this.liveCandleHigh = null;
        this.liveCandleLow = null;
        this.currentLivePrice = null;

        if (this.liveCandleGraphics) this.liveCandleGraphics.clear();
        if (this.currentPriceGraphics) this.currentPriceGraphics.clear();
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎯 SOLIDIFICAR VELA EN VIVO → HISTÓRICA
    // ═══════════════════════════════════════════════════════════════

    solidifyLiveCandle(newCandleHistory) {
        this.candleHistory = newCandleHistory;
        this.lastHistoricalIndex = this.candleHistory.length - 1;
        this.liveTickerIndex = this.lastHistoricalIndex + 1;
        this.buildChart(this.candleHistory);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔄 UPDATE LOOP
    // ═══════════════════════════════════════════════════════════════

    update(delta) {
        // Update price axis if needed
        if (this.candleHistory.length > 0) {
            const { minPrice, maxPrice } = this.calculatePriceRange();
            // Re-render axis occasionally (could be throttled)
            // this.renderPriceAxis(minPrice, maxPrice);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎯 GETTER PARA GRUPO FÍSICO
    // ═══════════════════════════════════════════════════════════════

    getPhysicsGroup() {
        return this.physicsGroup;
    }
}
