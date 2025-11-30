// 🕯️ CANDLE SYSTEM - Sistema de Gestión de Velas y Física
// Responsabilidad: Dibujar velas holográficas y gestionar el suelo físico

export class CandleSystem {
    constructor(scene) {
        this.scene = scene;

        // Configuración visual
        this.CANDLE_SPACING = 140;
        this.CANDLE_WIDTH = 50;
        this.BASE_X = 300;

        // Coordenadas absolutas y escala de precios
        this.baseY = window.innerHeight / 2 + 100;
        this.priceScale = 300; // px range for price normalization

        // Paleta de colores
        this.COLORS = {
            LONG: 0x00ff88,      // Cyan/Verde neón
            SHORT: 0xff0055,     // Magenta/Rojo neón
            NEUTRAL: 0x888888,   // Gris
            GRID: 0x00fff9       // Cyan brillante
        };

        // Estado de velas
        this.candleHistory = [];
        this.lastHistoricalIndex = -1;
        this.liveTickerIndex = 0;

        // Estado de la vela en vivo
        this.liveStartPrice = null;
        this.liveCandleHigh = null;
        this.liveCandleLow = null;

        // Capas de renderizado
        this.candleLayer = this.scene.add.container(0, 0).setDepth(10);
        this.liveCandleLayer = this.scene.add.container(0, 0).setDepth(20);
        this.lineLayer = this.scene.add.container(0, 0).setDepth(15);

        // Graphics para vela activa
        this.liveCandleGraphics = this.scene.add.graphics();
        this.liveCandleGraphics.setDepth(21);
        this.liveCandleLayer.add(this.liveCandleGraphics);

        // Graphics para línea elástica
        this.liveLineGraphics = this.scene.add.graphics();
        this.liveLineGraphics.setDepth(16);
        this.lineLayer.add(this.liveLineGraphics);

        // ============================================
        // 🏗️ GRUPOS FÍSICOS (SOLUCIÓN AL PROBLEMA DE FLOTAR)
        // ============================================
        this.physicsGroup = this.scene.physics.add.staticGroup();
        this.candlePhysicsBodies = new Map(); // índice -> cuerpo físico invisible

        console.log('[🕯️ CandleSystem] Inicializado');
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

        // Renderizar cada vela
        this.candleHistory.forEach((candle, i) => {
            this.createCandleWithPhysics(candle, i);
        });

        // Renderizar línea de precio
        this.renderPriceLine();

        // Centrar cámara en última vela
        const lastX = this.BASE_X + (this.candleHistory.length - 1) * this.CANDLE_SPACING;
        this.scene.cameras.main.pan(lastX, this.baseY - 50, 800, 'Quad.easeOut');

        console.log(`[🏗️ CandleSystem] ${this.candleHistory.length} velas creadas`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🏗️ CREACIÓN DE VELA CON FÍSICA (DUAL SYSTEM)
    // ═══════════════════════════════════════════════════════════════

    createCandleWithPhysics(candle, index) {
        const { x, y } = this.getCandleSpot(index);

        // Determinar color
        const isLong = candle.result === 'LONG';
        const color = isLong ? this.COLORS.LONG :
            (candle.result === 'SHORT' ? this.COLORS.SHORT : this.COLORS.NEUTRAL);

        const bodyHeight = 80;

        // ============================================
        // A. CUERPO FÍSICO INVISIBLE (LA PLATAFORMA REAL)
        // ============================================
        // CRÍTICO: Este rectángulo invisible es el suelo real donde colisionan los jugadores
        const physicsBody = this.scene.add.rectangle(x, y, this.CANDLE_WIDTH, bodyHeight, 0xffffff);
        physicsBody.setAlpha(0); // INVISIBLE
        physicsBody.setOrigin(0.5, 0.5);

        // Añadir al grupo físico estático
        this.physicsGroup.add(physicsBody);

        // Guardar referencia para actualizaciones dinámicas
        this.candlePhysicsBodies.set(index, physicsBody);

        // ============================================
        // B. GRÁFICO VISUAL (LO QUE SE VE)
        // ============================================
        const candleContainer = this.createHolographicCandle(x, y, color, index === this.candleHistory.length - 1);
        this.candleLayer.add(candleContainer);

        // DEBUG: Descomentar para ver hitboxes
        // physicsBody.setAlpha(0.3);
        // physicsBody.setFillStyle(0xff0000);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎨 VELA HOLOGRÁFICA (VISUAL)
    // ═══════════════════════════════════════════════════════════════

    createHolographicCandle(x, y, color, isLive = false) {
        const container = this.scene.add.container(x, y);
        const graphics = this.scene.add.graphics();

        const width = this.CANDLE_WIDTH;
        const bodyHeight = 80;
        const wickHeight = 40;

        // Glow exterior (resplandor neón)
        graphics.fillStyle(color, 0.1);
        graphics.fillRoundedRect(-width / 2 - 8, -bodyHeight / 2 - 8, width + 16, bodyHeight + 16, 8);

        // Cuerpo holográfico (semitransparente)
        graphics.fillStyle(color, 0.2);
        graphics.fillRoundedRect(-width / 2, -bodyHeight / 2, width, bodyHeight, 4);

        // Borde neón sólido
        graphics.lineStyle(2, color, 1);
        graphics.strokeRoundedRect(-width / 2, -bodyHeight / 2, width, bodyHeight, 4);

        // Mechas (wicks)
        graphics.lineStyle(3, color, 0.8);
        graphics.lineBetween(0, -bodyHeight / 2 - wickHeight, 0, -bodyHeight / 2);
        graphics.lineBetween(0, bodyHeight / 2, 0, bodyHeight / 2 + wickHeight / 2);

        // Highlight interno (efecto cristal)
        graphics.lineStyle(1, 0xffffff, 0.3);
        graphics.lineBetween(-width / 2 + 4, -bodyHeight / 2 + 8, -width / 2 + 4, bodyHeight / 2 - 8);

        container.add(graphics);

        // Animación de pulso para vela en vivo
        if (isLive) {
            this.scene.tweens.add({
                targets: graphics,
                alpha: 0.6,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.createEnergyParticles(container, color);
        }

        return container;
    }

    createEnergyParticles(container, color) {
        for (let i = 0; i < 4; i++) {
            const particle = this.scene.add.circle(
                Phaser.Math.Between(-30, 30),
                Phaser.Math.Between(-50, 50),
                3, color, 0.6
            );
            container.add(particle);

            this.scene.tweens.add({
                targets: particle,
                y: particle.y - 30,
                alpha: 0,
                duration: 1500,
                repeat: -1,
                delay: i * 400
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔴 ACTUALIZAR VELA EN VIVO (CRÍTICO PARA FÍSICA DINÁMICA)
    // ═══════════════════════════════════════════════════════════════

    updateLiveCandle(price) {
        if (!this.candleHistory.length) return;

        const lastIndex = this.candleHistory.length - 1;
        const last = this.candleHistory[lastIndex];

        // Inicializar open si es la primera actualización
        if (!this.liveStartPrice) {
            this.liveStartPrice = last.open || price;
            this.liveCandleHigh = price;
            this.liveCandleLow = price;
        }

        // Actualizar precio actual
        last.close = price;

        // Actualizar high/low dinámicos
        if (price > this.liveCandleHigh) this.liveCandleHigh = price;
        if (price < this.liveCandleLow) this.liveCandleLow = price;

        last.high = this.liveCandleHigh;
        last.low = this.liveCandleLow;

        // Renderizar vela en tiempo real
        this.renderLiveCandleTicker(lastIndex, this.liveStartPrice, price, this.liveCandleHigh, this.liveCandleLow);

        // Actualizar línea elástica
        this.renderElasticPriceLine(lastIndex, price);

        // ============================================
        // 🔄 CRÍTICO: REDIMENSIONAR CUERPO FÍSICO
        // ============================================
        // Esto hace que el suelo suba/baje con el precio en tiempo real
        const physicsBody = this.candlePhysicsBodies.get(lastIndex);
        if (physicsBody && physicsBody.body) {
            const { x, y } = this.getCandleSpot(lastIndex);
            const bodyHeight = 80;

            // Actualizar posición y tamaño
            physicsBody.setPosition(x, y);
            physicsBody.setSize(this.CANDLE_WIDTH, bodyHeight);

            // CRÍTICO: Refrescar física estática
            physicsBody.body.updateFromGameObject();
        }

        // Ajustar cámara si es necesario
        this.adjustCameraForPrice(price);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔴 RENDERIZAR VELA EN VIVO (TICKER DINÁMICO)
    // ═══════════════════════════════════════════════════════════════

    renderLiveCandleTicker(index, open, current, high, low) {
        this.liveCandleGraphics.clear();

        // Dibujar en PRÓXIMA posición
        const x = this.BASE_X + this.liveTickerIndex * this.CANDLE_SPACING;

        // Convertir precios a coordenadas Y
        let minPrice = Infinity, maxPrice = -Infinity;
        this.candleHistory.forEach(c => {
            minPrice = Math.min(minPrice, c.low || c.close);
            maxPrice = Math.max(maxPrice, c.high || c.close);
        });
        const priceRange = Math.max(1, maxPrice - minPrice);

        const priceToY = (price) => {
            const priceNorm = (price - minPrice) / priceRange;
            return this.baseY - priceNorm * this.priceScale;
        };

        const yOpen = priceToY(open);
        const yCurrent = priceToY(current);
        const yHigh = priceToY(high);
        const yLow = priceToY(low);

        // Color dinámico
        const isGreen = current >= open;
        const color = isGreen ? this.COLORS.LONG : this.COLORS.SHORT;

        // 1. Mechas (sombras high/low)
        this.liveCandleGraphics.lineStyle(3, color, 0.6);
        this.liveCandleGraphics.lineBetween(x, yHigh, x, yLow);

        // 2. Cuerpo (open → current)
        const bodyTop = Math.min(yOpen, yCurrent);
        const bodyBottom = Math.max(yOpen, yCurrent);
        const bodyHeight = Math.max(4, bodyBottom - bodyTop);

        // Glow exterior
        this.liveCandleGraphics.fillStyle(color, 0.15);
        this.liveCandleGraphics.fillRoundedRect(
            x - this.CANDLE_WIDTH / 2 - 6,
            bodyTop - 6,
            this.CANDLE_WIDTH + 12,
            bodyHeight + 12,
            6
        );

        // Cuerpo principal
        this.liveCandleGraphics.fillStyle(color, 0.4);
        this.liveCandleGraphics.fillRoundedRect(
            x - this.CANDLE_WIDTH / 2,
            bodyTop,
            this.CANDLE_WIDTH,
            bodyHeight,
            4
        );

        // Borde sólido
        this.liveCandleGraphics.lineStyle(2, color, 1);
        this.liveCandleGraphics.strokeRoundedRect(
            x - this.CANDLE_WIDTH / 2,
            bodyTop,
            this.CANDLE_WIDTH,
            bodyHeight,
            4
        );

        // 3. Glow dot (punto brillante en precio actual)
        this.liveCandleGraphics.fillStyle(color, 0.3);
        this.liveCandleGraphics.fillCircle(x + this.CANDLE_WIDTH / 2 + 15, yCurrent, 12);

        this.liveCandleGraphics.fillStyle(color, 1);
        this.liveCandleGraphics.fillCircle(x + this.CANDLE_WIDTH / 2 + 15, yCurrent, 6);

        this.liveCandleGraphics.fillStyle(0xffffff, 0.8);
        this.liveCandleGraphics.fillCircle(x + this.CANDLE_WIDTH / 2 + 15, yCurrent, 3);

        // 4. Precio numérico
        const priceText = current.toFixed(2);
        const priceLabel = this.scene.add.text(
            x + this.CANDLE_WIDTH / 2 + 30,
            yCurrent,
            priceText,
            {
                font: 'bold 14px "Courier New"',
                fill: isGreen ? '#00ff88' : '#ff0055',
                stroke: '#000',
                strokeThickness: 3
            }
        ).setOrigin(0, 0.5).setDepth(22);

        // Autodestrucción
        this.scene.time.delayedCall(50, () => {
            if (priceLabel) priceLabel.destroy();
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 📈 LÍNEA ELÁSTICA DE PRECIO
    // ═══════════════════════════════════════════════════════════════

    renderElasticPriceLine(liveIndex, currentPrice) {
        this.liveLineGraphics.clear();

        if (this.candleHistory.length < 1) return;

        const historicalX = this.BASE_X + this.lastHistoricalIndex * this.CANDLE_SPACING;
        const liveX = this.BASE_X + this.liveTickerIndex * this.CANDLE_SPACING;

        const lastCandle = this.candleHistory[this.lastHistoricalIndex];
        if (!lastCandle) return;

        // Normalización de precios
        let minPrice = Infinity, maxPrice = -Infinity;
        this.candleHistory.forEach(c => {
            minPrice = Math.min(minPrice, c.low || c.close);
            maxPrice = Math.max(maxPrice, c.high || c.close);
        });
        const priceRange = Math.max(1, maxPrice - minPrice);

        const priceToY = (price) => {
            const priceNorm = (price - minPrice) / priceRange;
            return this.baseY - priceNorm * this.priceScale;
        };

        const historicalY = priceToY(lastCandle.close);
        const currentY = priceToY(currentPrice);

        // Color dinámico
        const isGreen = currentPrice >= lastCandle.close;
        const color = isGreen ? this.COLORS.LONG : this.COLORS.SHORT;

        // Línea animada
        this.liveLineGraphics.lineStyle(3, color, 0.8);
        this.liveLineGraphics.lineBetween(historicalX, historicalY, liveX, currentY);

        // Punto pulsante
        this.liveLineGraphics.fillStyle(color, 0.6);
        this.liveLineGraphics.fillCircle(liveX, currentY, 5);
    }

    // ═══════════════════════════════════════════════════════════════
    // 📈 LÍNEA DE PRECIO HISTÓRICA
    // ═══════════════════════════════════════════════════════════════

    renderPriceLine() {
        this.lineLayer.removeAll(true);

        if (this.candleHistory.length < 2) return;

        // Calcular rango
        let minPrice = Infinity, maxPrice = -Infinity;
        this.candleHistory.forEach(c => {
            minPrice = Math.min(minPrice, c.close);
            maxPrice = Math.max(maxPrice, c.close);
        });
        const priceRange = maxPrice - minPrice || 1;

        // Dibujar línea
        const lineGraphics = this.scene.add.graphics();
        lineGraphics.lineStyle(2, this.COLORS.GRID, 0.5);

        const points = this.candleHistory.map((c, i) => {
            const x = this.BASE_X + i * this.CANDLE_SPACING;
            const priceNorm = (c.close - minPrice) / priceRange;
            const y = this.baseY - priceNorm * 300;
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
            const dot = this.scene.add.circle(p.x, p.y, isLast ? 6 : 3, this.COLORS.GRID, isLast ? 1 : 0.5);
            this.lineLayer.add(dot);

            if (isLast) {
                this.scene.tweens.add({
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

    // ═══════════════════════════════════════════════════════════════
    // 📷 AJUSTE DE CÁMARA
    // ═══════════════════════════════════════════════════════════════

    adjustCameraForPrice(price) {
        if (!this.candleHistory.length) return;

        let minPrice = Infinity, maxPrice = -Infinity;
        this.candleHistory.forEach(c => {
            minPrice = Math.min(minPrice, c.low || c.close);
            maxPrice = Math.max(maxPrice, c.high || c.close);
        });
        const priceRange = Math.max(1, maxPrice - minPrice);
        const priceNorm = (price - minPrice) / priceRange;
        const targetY = this.baseY - priceNorm * this.priceScale;

        const currentCamY = this.scene.cameras.main.scrollY + this.scene.scale.height / 2 / this.scene.cameras.main.zoom;

        const margin = 150;
        const viewportTop = currentCamY - this.scene.scale.height / 2 / this.scene.cameras.main.zoom + margin;
        const viewportBottom = currentCamY + this.scene.scale.height / 2 / this.scene.cameras.main.zoom - margin;

        if (targetY < viewportTop || targetY > viewportBottom) {
            this.scene.cameras.main.pan(
                this.scene.cameras.main.scrollX + this.scene.scale.width / 2 / this.scene.cameras.main.zoom,
                targetY,
                300,
                'Sine.easeInOut',
                false
            );
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 📍 OBTENER POSICIÓN DE VELA (FUENTE DE VERDAD)
    // ═══════════════════════════════════════════════════════════════

    getCandleSpot(index) {
        const i = Math.max(0, Math.min(index, this.candleHistory.length - 1));
        const x = this.BASE_X + i * this.CANDLE_SPACING;

        // Normalizar precio
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
    // 🔄 RESETEAR ESTADO DE VELA EN VIVO
    // ═══════════════════════════════════════════════════════════════

    resetLiveCandle() {
        this.liveStartPrice = null;
        this.liveCandleHigh = null;
        this.liveCandleLow = null;

        if (this.liveCandleGraphics) this.liveCandleGraphics.clear();
        if (this.liveLineGraphics) this.liveLineGraphics.clear();
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎯 SOLIDIFICAR VELA EN VIVO → HISTÓRICA
    // ═══════════════════════════════════════════════════════════════

    solidifyLiveCandle(newCandleHistory) {
        this.candleHistory = newCandleHistory;

        // Actualizar índices
        this.lastHistoricalIndex = this.candleHistory.length - 1;
        this.liveTickerIndex = this.lastHistoricalIndex + 1;

        // Re-renderizar escena completa
        this.buildChart(this.candleHistory);

        console.log(`[🎯 CandleSystem] Vela solidificada. Nueva histórica: ${this.lastHistoricalIndex}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔄 UPDATE LOOP
    // ═══════════════════════════════════════════════════════════════

    update(delta) {
        // Parallax u otras animaciones si es necesario
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎯 GETTER PARA GRUPO FÍSICO
    // ═══════════════════════════════════════════════════════════════

    getPhysicsGroup() {
        return this.physicsGroup;
    }
}
