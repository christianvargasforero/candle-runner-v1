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

        // ============================================
        // 🎬 AMPLIFICACIÓN VISUAL (DRAMA FACTOR)
        // ============================================
        this.VISUAL_MULTIPLIER = 25; // Exagerar movimientos de precio para emoción
        this.MAX_CANDLE_HEIGHT = Math.min(300, window.innerHeight * 0.4); // Límite visual (40% pantalla)
        this.SHAKE_THRESHOLD = 2.0; // % de cambio para activar shake (reducido para menos mareo)
        this.lastPriceForShake = null;
        this.extremeForceActive = false; // Indicador de fuerza extrema

        // Paleta de colores
        this.COLORS = {
            LONG: 0x00ff88,      // Cyan/Verde neón
            SHORT: 0xff0055,     // Magenta/Rojo neón
            NEUTRAL: 0x888888,   // Gris
            GRID: 0x00fff9,      // Cyan brillante
            // Colores INTENSOS para vela en vivo
            LONG_INTENSE: 0x00ffaa,   // Verde más brillante
            SHORT_INTENSE: 0xff0077   // Rojo más brillante
        };

        // Estado de velas
        this.candleHistory = [];
        this.lastHistoricalIndex = -1;
        this.liveTickerIndex = 0;

        // Estado de la vela en vivo
        this.liveStartPrice = null;
        this.liveCandleHigh = null;
        this.liveCandleLow = null;
        this.currentPhase = 'BETTING'; // Default phase

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

        console.log('[🕯️ CandleSystem] Inicializado con VISUAL_MULTIPLIER:', this.VISUAL_MULTIPLIER);
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

        // NO panear cámara automáticamente - solo seguir al jugador
        // La cámara está configurada para seguir this.myPlayer en GameScene.spawnMyPlayer

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
    // 🔄 SET PHASE
    // ═══════════════════════════════════════════════════════════════

    setPhase(phase) {
        this.currentPhase = phase;
        // Forzar actualización visual si es necesario
        if (this.liveStartPrice !== null && this.candleHistory.length > 0) {
            const lastIndex = this.candleHistory.length - 1;
            const last = this.candleHistory[lastIndex];
            this.renderLiveCandleTicker(lastIndex, this.liveStartPrice, last.close, this.liveCandleHigh, this.liveCandleLow);
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

        // NO ajustar cámara automáticamente - solo sigue al jugador
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔴 RENDERIZAR VELA EN VIVO (TICKER DINÁMICO)
    // ═══════════════════════════════════════════════════════════════

    renderLiveCandleTicker(index, open, current, high, low) {
        this.liveCandleGraphics.clear();

        // Dibujar en PRÓXIMA posición
        const x = this.BASE_X + this.liveTickerIndex * this.CANDLE_SPACING;

        // ============================================
        // 🎬 AMPLIFICACIÓN VISUAL DRAMÁTICA
        // ============================================
        // Calcular el cambio de precio como porcentaje
        const priceChange = current - open;
        const priceChangePercent = Math.abs(priceChange / open) * 100;

        // Aplicar multiplicador visual para exagerar movimientos
        const visualPriceChange = priceChange * this.VISUAL_MULTIPLIER;

        // ============================================
        // 📊 CONVERTIR PRECIOS A COORDENADAS Y (AMPLIFICADAS)
        // ============================================
        let minPrice = Infinity, maxPrice = -Infinity;
        this.candleHistory.forEach(c => {
            minPrice = Math.min(minPrice, c.low || c.close);
            maxPrice = Math.max(maxPrice, c.high || c.close);
        });
        const priceRange = Math.max(1, maxPrice - minPrice);

        // Función auxiliar con amplificación
        const priceToY = (price) => {
            const basePrice = open; // Usar open como referencia
            const delta = (price - basePrice) * this.VISUAL_MULTIPLIER;

            // Calcular Y base del open
            const openNorm = (open - minPrice) / priceRange;
            const yBase = this.baseY - openNorm * this.priceScale;

            // Aplicar delta amplificado
            return yBase - delta;
        };

        const yOpen = priceToY(open);
        const yCurrent = priceToY(current);
        const yHigh = priceToY(high);
        const yLow = priceToY(low);

        // ============================================
        // 🎨 COLOR DINÁMICO INTENSO
        // ============================================
        const isGreen = current >= open;
        const isFlat = Math.abs(priceChange) < 0.01;

        let color, glowColor, borderColor;
        
        // TAREA 3: Visualización por Fase
        if (this.currentPhase === 'BETTING') {
            // Fase de Apuestas: Borde Blanco/Amarillo
            borderColor = 0xffff00; // Amarillo eléctrico
            color = isGreen ? this.COLORS.LONG : this.COLORS.SHORT; // Cuerpo normal
            glowColor = 0xffffff;
        } else {
            // Fase Locked/Resolving: Borde del color de la tendencia
            borderColor = isGreen ? this.COLORS.LONG_INTENSE : this.COLORS.SHORT_INTENSE;
            color = isGreen ? this.COLORS.LONG_INTENSE : this.COLORS.SHORT_INTENSE;
            glowColor = isGreen ? this.COLORS.LONG : this.COLORS.SHORT;
        }

        if (isFlat) {
            color = this.COLORS.NEUTRAL;
            glowColor = 0xffffff;
            borderColor = 0xcccccc;
        }

        // ============================================
        // 🎬 EFECTOS DRAMÁTICOS DE CÁMARA
        // ============================================
        if (this.lastPriceForShake !== null) {
            const changeFromLast = Math.abs((current - this.lastPriceForShake) / this.lastPriceForShake) * 100;

            // Shake si el cambio es significativo
            if (changeFromLast > this.SHAKE_THRESHOLD) {
                const intensity = Math.min(0.008, changeFromLast * 0.001);
                this.scene.cameras.main.shake(200, intensity);
                console.log(`[🎬 DRAMA] Shake activado! Cambio: ${changeFromLast.toFixed(2)}%`);
            }

            // Zoom out suave si la vela crece mucho
            if (priceChangePercent > 1.0 && this.scene.cameras.main.zoom > 0.7) {
                this.scene.tweens.add({
                    targets: this.scene.cameras.main,
                    zoom: this.scene.cameras.main.zoom - 0.05,
                    duration: 300,
                    ease: 'Sine.easeOut'
                });
            }
        }
        this.lastPriceForShake = current;

        // ============================================
        // 1️⃣ MECHAS (Sombras high/low) - MÁS GRUESAS
        // ============================================
        this.liveCandleGraphics.lineStyle(4, color, 0.8);
        this.liveCandleGraphics.lineBetween(x, yHigh, x, yLow);

        // ============================================
        // 2️⃣ CUERPO (open → current) - AMPLIFICADO CON CLAMPING
        // ============================================
        const bodyTop = Math.min(yOpen, yCurrent);
        const bodyBottom = Math.max(yOpen, yCurrent);
        let bodyHeight = Math.max(8, bodyBottom - bodyTop); // Mínimo 8px para visibilidad

        // 🛡️ CLAMPING: Limitar altura para evitar velas infinitas
        const isExtremeForce = bodyHeight > this.MAX_CANDLE_HEIGHT;
        if (isExtremeForce) {
            bodyHeight = this.MAX_CANDLE_HEIGHT;
            this.extremeForceActive = true;
            console.log(`[⚡ EXTREME FORCE] Vela alcanzó límite visual: ${this.MAX_CANDLE_HEIGHT}px`);
        } else {
            this.extremeForceActive = false;
        }

        // Glow exterior INTENSO (resplandor pulsante)
        const glowIntensity = isExtremeForce ? 0.4 : 0.25; // Más intenso si hay fuerza extrema
        this.liveCandleGraphics.fillStyle(glowColor, glowIntensity);
        this.liveCandleGraphics.fillRoundedRect(
            x - this.CANDLE_WIDTH / 2 - 10,
            bodyTop - 10,
            this.CANDLE_WIDTH + 20,
            bodyHeight + 20,
            8
        );

        // Cuerpo principal (MÁS OPACO para visibilidad)
        this.liveCandleGraphics.fillStyle(color, 0.6);
        this.liveCandleGraphics.fillRoundedRect(
            x - this.CANDLE_WIDTH / 2,
            bodyTop,
            this.CANDLE_WIDTH,
            bodyHeight,
            4
        );

        // Borde sólido BRILLANTE
        this.liveCandleGraphics.lineStyle(3, borderColor, 1);
        this.liveCandleGraphics.strokeRoundedRect(
            x - this.CANDLE_WIDTH / 2,
            bodyTop,
            this.CANDLE_WIDTH,
            bodyHeight,
            4
        );

        // ⚡ EFECTO DE FUERZA EXTREMA: Partículas en el borde superior
        if (isExtremeForce) {
            // Línea pulsante en el límite
            this.liveCandleGraphics.lineStyle(4, 0xffffff, 0.8);
            this.liveCandleGraphics.lineBetween(
                x - this.CANDLE_WIDTH / 2 - 15,
                bodyTop,
                x + this.CANDLE_WIDTH / 2 + 15,
                bodyTop
            );

            // Partículas de energía
            for (let i = 0; i < 3; i++) {
                const particleX = x + Phaser.Math.Between(-this.CANDLE_WIDTH / 2, this.CANDLE_WIDTH / 2);
                const particle = this.scene.add.circle(particleX, bodyTop, 3, 0xffffff, 0.9);
                particle.setDepth(25);

                this.scene.tweens.add({
                    targets: particle,
                    y: bodyTop - 30,
                    alpha: 0,
                    duration: 800,
                    delay: i * 100,
                    onComplete: () => particle.destroy()
                });
            }
        }

        // ============================================
        // 3️⃣ GLOW DOT PULSANTE (punto brillante en precio actual)
        // ============================================
        // Círculo exterior (glow grande)
        this.liveCandleGraphics.fillStyle(color, 0.4);
        this.liveCandleGraphics.fillCircle(x + this.CANDLE_WIDTH / 2 + 20, yCurrent, 16);

        // Círculo medio
        this.liveCandleGraphics.fillStyle(color, 0.8);
        this.liveCandleGraphics.fillCircle(x + this.CANDLE_WIDTH / 2 + 20, yCurrent, 10);

        // Círculo brillante
        this.liveCandleGraphics.fillStyle(color, 1);
        this.liveCandleGraphics.fillCircle(x + this.CANDLE_WIDTH / 2 + 20, yCurrent, 7);

        // Core blanco pulsante
        this.liveCandleGraphics.fillStyle(0xffffff, 1);
        this.liveCandleGraphics.fillCircle(x + this.CANDLE_WIDTH / 2 + 20, yCurrent, 4);

        // ============================================
        // 4️⃣ PRECIO NUMÉRICO CON INDICADOR DE CAMBIO
        // ============================================
        const priceText = current.toFixed(2);
        const changeText = priceChange >= 0 ? `+${priceChange.toFixed(2)}` : priceChange.toFixed(2);
        const displayText = `${priceText}\n${changeText}`;

        const priceLabel = this.scene.add.text(
            x + this.CANDLE_WIDTH / 2 + 40,
            yCurrent,
            displayText,
            {
                font: 'bold 16px "Courier New"',
                fill: isFlat ? '#ffffff' : (isGreen ? '#00ffaa' : '#ff0077'),
                stroke: '#000',
                strokeThickness: 4,
                align: 'left'
            }
        ).setOrigin(0, 0.5).setDepth(22);

        // Autodestrucción
        this.scene.time.delayedCall(50, () => {
            if (priceLabel) priceLabel.destroy();
        });

        // ============================================
        // 5️⃣ INDICADOR VISUAL DE DIRECCIÓN (Flecha)
        // ============================================
        if (!isFlat) {
            const arrowY = isGreen ? bodyTop - 20 : bodyBottom + 20;
            const arrowSymbol = isGreen ? '▲' : '▼';

            const arrow = this.scene.add.text(
                x,
                arrowY,
                arrowSymbol,
                {
                    font: 'bold 24px Arial',
                    fill: isGreen ? '#00ffaa' : '#ff0077',
                    stroke: '#000',
                    strokeThickness: 3
                }
            ).setOrigin(0.5).setDepth(22);

            // Animación de pulso
            this.scene.tweens.add({
                targets: arrow,
                scale: 1.3,
                alpha: 0.5,
                duration: 300,
                yoyo: true,
                repeat: 0,
                onComplete: () => arrow.destroy()
            });
        }
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
    // 📷 CÁMARA FIJA AL JUGADOR
    // ═══════════════════════════════════════════════════════════════
    // La cámara SOLO sigue al jugador local (configurado en GameScene)
    // NO se manipula desde CandleSystem

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
