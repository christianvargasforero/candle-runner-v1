// 🚌 GAME LOOP - Motor de Juego por Bus (Instancias Múltiples)
// Cada bus tiene su propio ciclo de juego de 30 segundos

import {
    ROUND_DURATION,
    PHASE_BET_TIME,
    PHASE_LOCK_TIME,
    PHASE_RESOLVE_TIME,
    GAME_STATES,
    BUS_STATES,
    INTEGRITY_LOSS_PER_DEFEAT,
    ASH_INSURANCE_RATIO,
    DEFAULT_SKIN
} from '../../shared/constants.js';

import priceService from './priceService.js';
import { userManager } from './userManager.js';
import redisClient, { safeRedisSet, safeRedisGet } from '../config/redis.js';

/**
 * 🚌 BusGameLoop - Instancia de juego para un bus específico
 * Cada bus opera independientemente con su propio temporizador
 */
class BusGameLoop {
    /**
     * Limpia recursos y timers al finalizar el ciclo del bus
     */
    cleanup() {
        this.stopSyncTimer();

        // Limpiar intervalo de streaming de precios si existe
        if (this.priceStreamInterval) {
            clearInterval(this.priceStreamInterval);
            this.priceStreamInterval = null;
        }

        console.log(`🧹 [BUS LOOP] Cleanup ejecutado para bus ${this.room.id}`);
    }
    constructor(io, room, roomManager) {
        this.io = io;
        this.room = room; // Referencia al Room/Bus
        this.roomManager = roomManager;
        this.currentState = GAME_STATES.BETTING;
        this.roundNumber = 1;
        this.startTime = null;
        this.phaseStartTime = null;
        this.syncInterval = null;

        // Datos de la ronda
        this.currentRound = {
            startPrice: null,
            endPrice: null,
            bets: [],
            totalPool: 0
        };

        // Estadísticas
        this.stats = {
            revenue: 0,
            treasury: 0,
            burned: 0
        };

        // Historial de velas (el mapa)
        this.candleHistory = [];
        this.initCandleHistory();

        console.log(`🚌 [BUS LOOP] Instancia creada para bus ${room.id}`);
        
        // 🛡️ Flag para sistema de recuperación de estado
        this.busStarted = false;
    }

    /**
     * 🛡️ Obtiene el estado actual de los pasajeros del bus
     * Usado para sincronizar jugadores que se conectan tarde
     */
    getBusPassengersState() {
        const passengers = [];
        
        for (const [socketId, userId] of this.room.users.entries()) {
            const user = userManager.getUser(socketId);
            if (user) {
                passengers.push({
                    odId: socketId,
                    userId: user.id,
                    skinId: user.activeSkin?.id ?? 'default',
                    skinName: user.activeSkin?.name ?? 'Protocol Droid',
                    skinColor: user.activeSkin?.color ?? 0x00fff9,
                    skinLevel: user.activeSkin?.level ?? 0,
                    integrity: user.activeSkin?.currentIntegrity ?? 100,
                    maxIntegrity: user.activeSkin?.maxIntegrity ?? 100,
                    isBurned: user.activeSkin?.isBurned ?? false
                });
            }
        }
        
        return passengers;
    }

    /** Inicializa el historial de velas con 20 velas base (ficticias) */
    initCandleHistory() {
        let price = 90000;
        for (let i = 0; i < 20; i++) {
            const open = price;
            const change = (Math.random() - 0.5) * 200; // +/- $100
            const close = open + change;
            const high = Math.max(open, close) + Math.random() * 50;
            const low = Math.min(open, close) - Math.random() * 50;
            const result = close > open ? 'LONG' : (close < open ? 'SHORT' : 'DRAW');
            this.candleHistory.push({ open, close, high, low, result });
            price = close;
        }
    }
    /**
     * Recupera el estado persistente del bus desde Redis (acumulado, etc)
     */
    async recoverState() {
        // 🏆 HEREDAR JACKPOT DEL ROOM (proviene del tier)
        if (this.room.pot && this.room.pot > 0) {
            this.accumulatedPot = this.room.pot;
            console.log(`🏆 [JACKPOT] Bus hereda $${this.accumulatedPot.toFixed(2)} del tier ${this.room.tier}`);
        } else {
            // Fallback: Intentar recuperar de Redis
            const key = `bus:${this.room.id}:accumulatedPot`;
            const value = await safeRedisGet(key);
            if (value !== null) {
                this.accumulatedPot = parseFloat(value);
                if (isNaN(this.accumulatedPot)) this.accumulatedPot = 0;
            } else {
                this.accumulatedPot = 0;
            }
        }
        
        // Asegurar que rolloverCount esté inicializado
        this.rolloverCount = this.rolloverCount || 0;
    }

    /**
     * Inicia el ciclo de juego para este bus
     */
    async startBus() {
        this.startTime = Date.now();
        this.room.status = BUS_STATES.IN_PROGRESS;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 BUS ${this.room.id} - PARTIDA INICIADA`);
        console.log(`   Pasajeros: ${this.room.users.size}/${this.room.capacity}`);
        console.log(`   Pozo Total: $${this.room.ticketPrice * this.room.users.size}`);
        console.log(`${'='.repeat(60)}\n`);

        // 👫 EMITIR EVENTO BUS_START con lista de pasajeros y estado de integridad + skinId
        const passengerStates = [];
        
        // Iterar por socketId para obtener datos completos
        for (const [socketId, usId] of this.room.users.entries()) {
            const user = userManager.getUser(socketId);
            if (user) {
                passengerStates.push({
                    odId: socketId,
                    skinId: user.activeSkin?.id ?? 'default',
                    skinName: user.activeSkin?.name ?? 'Protocol Droid',
                    skinColor: user.activeSkin?.color ?? 0x00fff9, // Color neón por defecto
                    skinLevel: user.activeSkin?.level ?? 0,
                    integrity: user.activeSkin?.currentIntegrity ?? 100,
                    maxIntegrity: user.activeSkin?.maxIntegrity ?? 100,
                    isBurned: user.activeSkin?.isBurned ?? false
                });
            }
        }

        // 🚨 CRÍTICO: Emitir a la SALA DE SOCKET.IO, no a sockets individuales
        // Esto garantiza que todos los jugadores en la sala reciban el evento
        console.log(`🚀 [BUS START] Emitiendo a sala ${this.room.id} con ${passengerStates.length} pasajeros`);
        console.log(`📋 [DEBUG] Pasajeros:`, passengerStates.map(p => `${p.odId?.slice(-4)} (${p.skinName})`).join(', '));
        
        // 🛡️ Marcar bus como iniciado (para sistema de recuperación)
        this.busStarted = true;
        
        this.io.to(this.room.id).emit('BUS_START', {
            busId: this.room.id,
            candleHistory: this.candleHistory,
            passengers: passengerStates,
            ticketPrice: this.room.ticketPrice
        });
        
        console.log(`✅ [BUS START] Evento emitido a sala ${this.room.id}`);

        // Iniciar sincronización
        this.startSyncTimer();
        // Recuperar estado persistente (acumulado, etc)
        await this.recoverState();

        try {
            // FASE 1: BETTING (0s - 10s)
            await this.phaseBetting();

            // FASE 2: LOCKED (10s - 25s)
            await this.phaseLocked();

            // FASE 3: RESOLVING (25s - 30s)
            await this.phaseResolving();

        } catch (error) {
            console.error(`❌ [BUS ${this.room.id}] Error en Game Loop:`, error);
        } finally {
            // 🏆 TRANSFERIR ROLLOVER AL TIER (si hay dinero acumulado)
            if (this.accumulatedPot > 0 && this.roomManager) {
                const tier = this.room.tier;
                console.log(`🏆 [BUS END] Transfiriendo $${this.accumulatedPot.toFixed(2)} al tier ${tier}`);
                this.roomManager.addRollover(tier, this.accumulatedPot);
            }
            
            // Cleanup
            this.cleanup();
        }
    }

    /**
     * Emite SYNC_TIME a los usuarios de este bus
     */
    startSyncTimer() {
        this.syncInterval = setInterval(() => {
            const now = Date.now();
            const phaseElapsed = this.phaseStartTime ? now - this.phaseStartTime : 0;

            let phaseDuration = 0;
            switch (this.currentState) {
                case GAME_STATES.BETTING:
                    phaseDuration = PHASE_BET_TIME;
                    break;
                case GAME_STATES.LOCKED:
                    phaseDuration = PHASE_LOCK_TIME;
                    break;
                case GAME_STATES.RESOLVING:
                    phaseDuration = PHASE_RESOLVE_TIME;
                    break;
            }

            const timeLeft = Math.max(0, phaseDuration - phaseElapsed);

            // Emitir solo a los usuarios de este bus
            for (const socketId of this.room.users.keys()) {
                this.io.to(socketId).emit('SYNC_TIME', {
                    state: this.currentState,
                    roundNumber: this.roundNumber,
                    timeLeft: timeLeft,
                    serverTime: now,
                    roomId: this.room.id
                });
            }
        }, 1000);
    }

    /**
     * Detiene el temporizador de sincronización
     */
    stopSyncTimer() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }



    /**
     * FASE 1: Posicionamiento (0s - 10s)
     */
    async phaseBetting() {
        this.currentState = GAME_STATES.BETTING;
        this.phaseStartTime = Date.now();

        console.log(`🟢 [BUS ${this.room.id}] FASE 1 - BETTING (${PHASE_BET_TIME / 1000}s)`);

        // Emitir estado solo a usuarios de este bus
        for (const socketId of this.room.users.keys()) {
            this.io.to(socketId).emit('GAME_STATE', {
                state: this.currentState,
                roundNumber: this.roundNumber,
                timeLeft: PHASE_BET_TIME,
                serverTime: Date.now(),
                roomId: this.room.id
            });
        }

        await this.wait(PHASE_BET_TIME);
        console.log(`✅ [BUS ${this.room.id}] BETTING completada\n`);
    }

    /**
     * FASE 2: Lockdown (10s - 25s)
     */
    async phaseLocked() {
        this.currentState = GAME_STATES.LOCKED;
        this.phaseStartTime = Date.now();

        // Capturar precio de entrada
        const priceData = priceService.getCurrentPrice();
        if (priceData) {
            this.currentRound.startPrice = priceData.price;
            console.log(`🔴 [BUS ${this.room.id}] FASE 2 - LOCKED`);
            console.log(`   Precio Entrada: $${this.currentRound.startPrice.toFixed(2)}\n`);
        }

        // Emitir estado
        for (const socketId of this.room.users.keys()) {
            this.io.to(socketId).emit('GAME_STATE', {
                state: this.currentState,
                roundNumber: this.roundNumber,
                timeLeft: PHASE_LOCK_TIME,
                serverTime: Date.now(),
                startPrice: this.currentRound.startPrice,
                roomId: this.room.id
            });
        }

        // 🎯 STREAMING DE PRECIOS EN TIEMPO REAL
        // Emitir actualizaciones de precio cada 500ms para sincronizar la vela
        this.priceStreamInterval = setInterval(() => {
            const currentPriceData = priceService.getCurrentPrice();
            if (currentPriceData) {
                // Emitir a todos los pasajeros del bus
                this.io.to(this.room.id).emit('PRICE_UPDATE', {
                    price: currentPriceData.price,
                    timestamp: Date.now()
                });
            }
        }, 500);

        await this.wait(PHASE_LOCK_TIME);

        // 🧹 LIMPIAR INTERVALO AL TERMINAR LA FASE
        if (this.priceStreamInterval) {
            clearInterval(this.priceStreamInterval);
            this.priceStreamInterval = null;
            console.log(`✅ [BUS ${this.room.id}] Price streaming detenido`);
        }

        console.log(`✅ [BUS ${this.room.id}] LOCKED completada\n`);
    }

    /**
     * FASE 3: Resolución (25s - 30s)
     */
    async phaseResolving() {
        this.currentState = GAME_STATES.RESOLVING;
        this.phaseStartTime = Date.now();

        console.log(`🟡 [BUS ${this.room.id}] FASE 3 - RESOLVING`);

        // Emitir estado
        for (const socketId of this.room.users.keys()) {
            this.io.to(socketId).emit('GAME_STATE', {
                state: this.currentState,
                roundNumber: this.roundNumber,
                timeLeft: PHASE_RESOLVE_TIME,
                serverTime: Date.now(),
                roomId: this.room.id
            });
        }

        // Resolver resultado
        await this.resolveRound();

        await this.wait(PHASE_RESOLVE_TIME);
        console.log(`✅ [BUS ${this.room.id}] RESOLVING completada\n`);
    }

    /**
     * Resuelve la ronda y distribuye premios para este bus
     */
    async resolveRound() {
        // Capturar precio final
        const priceData = priceService.getCurrentPrice();

        if (priceData) {
            this.currentRound.endPrice = priceData.price;
        } else {
            console.warn('⚠️  [RESOLVING] No se pudo obtener precio final');
            this.currentRound.endPrice = null;
        }

        // Determinar resultado solo si tenemos ambos precios
        let result = 'DRAW';
        let priceChange = 0;
        let priceChangePercent = 0;

        if (this.currentRound.startPrice && this.currentRound.endPrice) {
            priceChange = this.currentRound.endPrice - this.currentRound.startPrice;
            priceChangePercent = (priceChange / this.currentRound.startPrice) * 100;

            if (this.currentRound.endPrice > this.currentRound.startPrice) {
                result = 'LONG';
            } else if (this.currentRound.endPrice < this.currentRound.startPrice) {
                result = 'SHORT';
            } else {
                result = 'DRAW';
            }

            // Logs detallados
            console.log('📊 [RESULTADO DE LA RONDA]');
            console.log(`📈 Precio Inicial: $${this.currentRound.startPrice.toFixed(2)}`);
            console.log(`📉 Precio Final: $${this.currentRound.endPrice.toFixed(2)}`);
            console.log(`📊 Cambio: ${priceChange >= 0 ? '+' : ''}$${priceChange.toFixed(2)} (${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(4)}%)`);
            console.log(`🏆 Ganador: ${result}`);
            console.log(`💰 Pozo Total: ${this.currentRound.totalPool} USDT`);
        } else {
            console.warn('⚠️  [RESOLVING] No se pudo determinar ganador (precios faltantes)');
        }

        // Guardar resultado
        this.currentRound.result = result;
        this.currentRound.priceChange = priceChange;
        this.currentRound.priceChangePercent = priceChangePercent;

        // Actualizar historial de velas
        const open = this.currentRound.startPrice;
        const close = this.currentRound.endPrice;
        const high = Math.max(open, close) + Math.random() * 50;
        const low = Math.min(open, close) - Math.random() * 50;
        this.candleHistory.push({ open, close, high, low, result });
        if (this.candleHistory.length > 20) this.candleHistory.shift();

        // --- LÓGICA DE DISTRIBUCIÓN DE PREMIOS ---
        let winners = [];
        let winAmountPerUser = 0;
        let houseFee = 0;
        let netPool = 0;

        if (result !== 'DRAW') {
            // Filtrar ganadores
            winners = this.currentRound.bets.filter(bet => bet.direction === result);

            // Calcular Pozo
            const roundPool = this.currentRound.totalPool;
            const totalPot = roundPool + this.accumulatedPot;

            if (winners.length > 0 && totalPot > 0) {
                // Hay ganadores: Distribuir premio
                houseFee = totalPot * 0.05; // 5% Fee
                this.stats.revenue += houseFee;
                this.stats.treasury += houseFee * 0.20;

                netPool = totalPot - houseFee;

                // Prorrata basada en la apuesta
                const totalWinningBetAmount = winners.reduce((sum, bet) => sum + bet.amount, 0);

                // Validar que el totalWinningBetAmount sea válido
                if (totalWinningBetAmount > 0 && !isNaN(netPool)) {
                    // Optimización: Pagos en paralelo
                    await Promise.all(winners.map(async (bet) => {
                        const user = userManager.getUser(bet.socketId);
                        if (user) {
                            // Calcular parte proporcional del premio
                            const share = bet.amount / totalWinningBetAmount;
                            const prize = netPool * share;
                            // Validar premio
                            const safePrize = isNaN(prize) || !isFinite(prize) ? 0 : prize;

                            // Devolver la apuesta original + ganancia
                            await user.deposit(safePrize, 'WIN');

                            console.log(`💰 [WINNER] ${user.id} gana $${safePrize.toFixed(2)}`);

                            this.io.emit('ADMIN_LOG', {
                                type: 'WIN',
                                user: user.id,
                                detail: `$${safePrize.toFixed(2)}`,
                                isWhale: safePrize >= 100
                            });

                            // Notificar al usuario
                            this.io.to(bet.socketId).emit('BET_RESULT', {
                                won: true,
                                amount: safePrize,
                                balance: user.balanceUSDT,
                                isSoleWinner: winners.length === 1 // 🏆 Flag para indicar si ganó todo el pozo
                            });
                            // Emitir perfil actualizado
                            this.io.to(bet.socketId).emit('USER_PROFILE', user.getProfile());
                            // Notificar si ganó el bote mayor
                            if (!this.stats.biggestWin || safePrize > this.stats.biggestWin.amount) {
                                this.stats.biggestWin = { userId: user.id, amount: safePrize, round: this.roundNumber, bus: this.room.id };
                                this.io.to(bet.socketId).emit('BIG_POT_WIN', {
                                    message: `¡FELICIDADES! Has ganado el mayor bote histórico de este bus: $${safePrize.toFixed(2)} 🎉`,
                                    amount: safePrize,
                                    round: this.roundNumber,
                                    bus: this.room.id
                                });
                            }
                        }
                    }));
                } else {
                    console.warn('❌ [PAYOUT] Error: totalWinningBetAmount o netPool inválido. No se distribuyen premios.');
                }

                // Resetear bote acumulado y contador
                this.accumulatedPot = 0;
                this.rolloverCount = 0;
                console.log(`💸 [PAYOUT] Se distribuyeron $${netPool.toFixed(2)} entre ${winners.length} ganadores. Fee: $${houseFee.toFixed(2)}`);

            } else {
                // No hay ganadores (todos perdieron): Rollover
                this.accumulatedPot = (this.accumulatedPot || 0) + roundPool;
                // Persistir accumulatedPot en Redis (seguro)
                await safeRedisSet(`bus:${this.room.id}:accumulatedPot`, this.accumulatedPot.toString());
                this.rolloverCount = (this.rolloverCount || 0) + 1;

                console.log(`🔄 [ROLLOVER] Sin ganadores. Pozo acumulado: $${this.accumulatedPot.toFixed(2)} (Racha: ${this.rolloverCount})`);

                // Regla de Dispersión (3 rondas consecutivas sin ganadores)
                if (this.rolloverCount >= 3) {
                    const treasuryShare = this.accumulatedPot * 0.5;
                    this.accumulatedPot -= treasuryShare;
                    this.stats.treasury += treasuryShare; // Add to treasury stats
                    this.rolloverCount = 0; // Resetear contador tras dispersión

                    console.log(`💸 [DISPERSION] Dispersión de Bote: $${treasuryShare.toFixed(2)} a Tesorería por inactividad.`);
                }
            }
        } else {
            // EMPATE (DRAW): Devolver apuestas (Refund)
            console.log('⚖️ [REFUND] Empate. Devolviendo apuestas...');
            this.currentRound.bets.forEach(bet => {
                const user = userManager.getUser(bet.socketId);
                if (user) {
                    user.deposit(bet.amount);
                    this.io.to(bet.socketId).emit('BET_RESULT', {
                        won: false,
                        refund: true,
                        amount: bet.amount,
                        balance: user.balanceUSDT
                    });
                    // Emitir perfil actualizado
                    this.io.to(bet.socketId).emit('USER_PROFILE', user.getProfile());
                }
            });
        }

        // Notificar a perdedores
        // Notificar a perdedores y aplicar daño a la Integridad
        const losers = this.currentRound.bets.filter(bet => bet.direction !== result && result !== 'DRAW');
        for (const bet of losers) {
            const user = userManager.getUser(bet.socketId);
            if (user) {
                // Aplicar daño a la skin
                const burned = await user.activeSkin.takeDamage(INTEGRITY_LOSS_PER_DEFEAT);
                let refundAmount = 0;

                if (burned) {
                    this.stats.burned++;
                    this.io.emit('ADMIN_LOG', { type: 'BURN', user: user.id, detail: 'SKIN DESTROYED' });

                    // Seguro de Cenizas: Reembolso parcial de la inversión en la skin
                    refundAmount = user.activeSkin.totalInvestment * ASH_INSURANCE_RATIO;
                    user.balanceWICK += refundAmount; // TODO: Persist WICK

                    console.log(`🔥 [BURN] Skin de usuario ${user.id} ha sido destruida!`);
                    console.log(`🛡️ [INSURANCE] Reembolso de cenizas: ${refundAmount.toFixed(2)} $WICK`);
                }

                this.io.to(bet.socketId).emit('BET_RESULT', {
                    won: false,
                    amount: 0,
                    balance: user.balanceUSDT,
                    skinUpdate: {
                        integrity: user.activeSkin.currentIntegrity,
                        maxIntegrity: user.activeSkin.maxIntegrity,
                        isBurned: user.activeSkin.isBurned
                    },
                    refundAmount: refundAmount
                });
                // Emitir perfil actualizado
                this.io.to(bet.socketId).emit('USER_PROFILE', user.getProfile());

                // Sacar al perdedor de la sala/bus
                if (user.currentRoom && this.roomManager) {
                    this.roomManager.removeUserFromRoom(bet.socketId, user.currentRoom);
                }
            }
        }

        // Emitir resultado a todos los clientes, incluyendo status de cada pasajero
        const passengerStatuses = [];
        for (const bet of this.currentRound.bets) {
            const user = userManager.getUser(bet.socketId);
            if (user) {
                let status = 'DAMAGE';
                if (bet.direction === result) status = 'WIN';
                if (user.activeSkin.isBurned) status = 'BURNED';
                passengerStatuses.push({
                    userId: user.id,
                    status,
                    integrity: user.activeSkin.currentIntegrity,
                    isBurned: user.activeSkin.isBurned
                });
            }
        }
        this.io.emit('ROUND_RESULT', {
            roundNumber: this.roundNumber,
            startPrice: this.currentRound.startPrice,
            endPrice: this.currentRound.endPrice,
            result: result,
            priceChange: priceChange,
            priceChangePercent: priceChangePercent,
            totalPool: this.currentRound.totalPool,
            accumulatedPot: this.accumulatedPot,
            winnersCount: winners.length,
            timestamp: Date.now(),
            candleHistory: this.candleHistory,
            passengerStatuses
        });
    }

    /**
     * Obtiene estadísticas consolidadas para el Admin Dashboard
     */
    getAdminStats(roomManager) {
        // Count long/short bets
        const longBets = this.currentRound.bets.filter(b => b.direction === 'LONG').length;
        const shortBets = this.currentRound.bets.filter(b => b.direction === 'SHORT').length;

        // Calculate time left
        const now = Date.now();
        const phaseElapsed = this.phaseStartTime ? now - this.phaseStartTime : 0;
        const phaseDuration = this.getPhaseDuration(this.currentState);
        const timeLeft = Math.max(0, phaseDuration - phaseElapsed);

        // Get current price safely
        const priceData = priceService.getCurrentPrice();

        return {
            financials: this.stats,
            usersCount: roomManager ? roomManager.getTotalPlayers() : userManager.users.size,
            round: {
                number: this.roundNumber,
                state: this.currentState,
                timeLeft: timeLeft,
                startPrice: this.currentRound.startPrice,
                currentPrice: priceData ? priceData.price : null,
                bets: {
                    long: longBets,
                    short: shortBets
                }
            }
        };
    }

    /**
     * 🎟️ Procesa la compra de un ticket (apuesta con precio fijo)
     * @param {string} socketId 
     * @param {string} direction 'LONG' | 'SHORT'
     */
    async handleBet(socketId, direction) {
        // 1. Validar Fase
        if (this.currentState !== GAME_STATES.BETTING) {
            return { success: false, error: 'Las apuestas están cerradas' };
        }

        // 2. Validar Usuario
        const user = userManager.getUser(socketId);
        if (!user) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        // 🚌 2.1 Validar que el usuario esté en una sala
        if (!user.currentRoom) {
            return { success: false, error: 'Debes unirte a una sala primero' };
        }

        // 🎟️ 2.2 OBTENER EL PRECIO DEL TICKET DE LA SALA (NO del cliente)
        // Esto es CRUCIAL para evitar manipulación del monto
        const room = this.getRoomByUserId(socketId);
        if (!room) {
            return { success: false, error: 'Sala no encontrada' };
        }

        const amount = room.ticketPrice; // 🔐 El servidor DICTA el precio
        console.log(`🎟️ [TICKET] Usuario ${user.id} intenta comprar ticket de $${amount} (${room.name})`);

        // 2.3 Validar Integridad de Skin (Zombie Skin Check)
        if (user.activeSkin.isBurned) {
            return { success: false, error: 'Skin destruida. Repara o cambia a Droid.' };
        }

        // 2.4 Restricciones Protocol Droid (Anti-Farming)
        if (user.activeSkin.isDefault && amount > 0.10) {
            return { success: false, error: "Droid limitado a salas de máximo $0.10" };
        }

        // 3. Verificar si ya apostó en esta ronda
        const existingBetIndex = this.currentRound.bets.findIndex(b => b.socketId === socketId);

        if (existingBetIndex !== -1) {
            // Ya apostó - Reembolsar apuesta anterior
            const oldBet = this.currentRound.bets[existingBetIndex];
            await user.deposit(oldBet.amount, 'REFUND');
            this.currentRound.totalPool -= oldBet.amount;

            console.log(`🔄 [CHANGE BET] ${user.id} cambió de ${oldBet.direction} a ${direction}`);

            // Eliminar apuesta anterior
            this.currentRound.bets.splice(existingBetIndex, 1);
        }

        // 4. Validar Saldo (usando precio del ticket de la sala)
        if (!user.hasBalance(amount)) {
            return { success: false, error: `Saldo insuficiente. Ticket: $${amount.toFixed(2)}` };
        }

        // 5. Ejecutar Nueva Apuesta
        if (await user.withdraw(amount, 'BET')) {
            const bet = {
                userId: user.id,
                socketId: socketId,
                amount: amount,
                direction: direction,
                timestamp: Date.now()
            };

            this.currentRound.bets.push(bet);
            this.currentRound.totalPool += amount;

            console.log(`💵 [BET] ${user.id} apostó $${amount} a ${direction} en ${room.name}`);

            // Admin Log
            this.io.emit('ADMIN_LOG', {
                type: 'BET',
                user: user.id,
                detail: `${direction} $${amount.toFixed(2)} [${room.name}]`,
                isWhale: amount >= 100
            });

            return { success: true, balance: user.balanceUSDT, amount: amount };
        }

        return { success: false, error: 'Error al procesar la apuesta' };
    }

    /**
     * Obtiene la sala donde está un usuario
     * @param {string} socketId 
     */
    getRoomByUserId(socketId) {
        const user = userManager.getUser(socketId);
        if (!user || !user.currentRoom) return null;

        // Necesitamos acceso a roomManager aquí
        // Lo haremos mediante inyección o singleton
        // Por ahora asumimos que está disponible

        // NOTA: Necesitaremos pasar roomManager al constructor de GameLoop
        // Para este MVP, lo simulamos con una referencia temporal
        if (!this.roomManager) {
            console.error('❌ [ERROR] roomManager no disponible en GameLoop');
            return null;
        }

        return this.roomManager.getRoom(user.currentRoom);
    }

    /**
     * Resetea los datos de la ronda
     */
    resetRound() {
        this.currentRound = {
            startPrice: null,
            endPrice: null,
            bets: [],
            totalPool: 0
        };

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🔄 Ronda #${this.roundNumber} finalizada. Preparando siguiente...`);
        console.log(`${'='.repeat(60)}\n`);
    }

    /**
     * Utilidad para esperar un tiempo determinado
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }



    /**
     * Obtiene el estado actual del juego
     */
    getState() {
        return {
            state: this.currentState,
            roundNumber: this.roundNumber,
            timeElapsed: Date.now() - this.startTime,
            currentRound: this.currentRound
        };
    }
}

/**
 * 🎮 GameLoop - Clase de compatibilidad (Wrapper temporal)
 * Mantiene la API existente mientras migramos al modelo Bus
 */
class GameLoop extends BusGameLoop {
    constructor(io, roomManager = null) {
        // Crear un room ficticio para compatibilidad
        const dummyRoom = {
            id: 'legacy_room',
            name: 'LEGACY',
            ticketPrice: 0.10,
            capacity: 5,
            users: new Map(),
            status: BUS_STATES.BOARDING
        };

        super(io, dummyRoom, roomManager);

        console.log('⚠️  [LEGACY MODE] GameLoop iniciado en modo compatibilidad');
        console.log('   Recomendación: Migrar a GameLoopManager');
    }

    /**
     * Método legacy para iniciar el loop
     */
    async start() {
        console.log('🚀 [LEGACY LOOP] Iniciando en modo singleton...\n');
        // Por ahora, simplemente esperar
        // TODO: Implementar GameLoopManager completo
    }

    /**
     * Método auxiliar para calcular duración de fase
     */
    getPhaseDuration(phase) {
        switch (phase) {
            case GAME_STATES.BETTING: return PHASE_BET_TIME;
            case GAME_STATES.LOCKED: return PHASE_LOCK_TIME;
            case GAME_STATES.RESOLVING: return PHASE_RESOLVE_TIME;
            default: return 0;
        }
    }

    /**
     * Método legacy para manejar apuestas
     * Redirige la apuesta a la instancia correcta del BusGameLoop
     */
    async handleBet(socketId, direction) {
        const user = userManager.getUser(socketId);
        if (!user) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        if (!user.currentRoom) {
            return { success: false, error: 'No estás en ningún bus' };
        }

        // Obtener la sala y su instancia de juego
        const room = this.roomManager.getRoom(user.currentRoom);
        if (!room || !room.gameLoopInstance) {
            return { success: false, error: 'Bus no activo o inválido' };
        }

        // Delegar la apuesta a la instancia específica del bus
        return await room.gameLoopInstance.handleBet(socketId, direction);
    }
}

export default GameLoop;
export { BusGameLoop };
