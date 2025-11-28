// 🎮 GAME LOOP - Motor de Juego Síncrono de 30 Segundos
// Este módulo controla el ciclo de vida de cada ronda del juego

import {
    ROUND_DURATION,
    PHASE_BET_TIME,
    PHASE_LOCK_TIME,
    PHASE_RESOLVE_TIME,
    GAME_STATES
} from '../../shared/constants.js';

class GameLoop {
    constructor(io) {
        this.io = io; // Socket.io instance
        this.currentState = GAME_STATES.WAITING;
        this.roundNumber = 0;
        this.startTime = null;
        this.phaseStartTime = null;
        this.timeElapsed = 0;
        this.syncInterval = null; // Intervalo para SYNC_TIME

        // Datos de la ronda actual
        this.currentRound = {
            startPrice: null,
            endPrice: null,
            bets: [],
            totalPool: 0
        };
    }

    /**
     * Inicia el Game Loop infinito
     */
    start() {
        console.log('🚀 [GAME LOOP] Iniciando motor de juego...\n');
        this.startSyncTimer();
        this.runRound();
    }

    /**
     * Inicia el temporizador de sincronización (SYNC_TIME cada segundo)
     */
    startSyncTimer() {
        // Emitir SYNC_TIME cada 1 segundo a todos los clientes
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

            this.io.emit('SYNC_TIME', {
                state: this.currentState,
                roundNumber: this.roundNumber,
                timeLeft: timeLeft,
                serverTime: now,
                phaseElapsed: phaseElapsed
            });
        }, 1000);

        console.log('⏰ [SYNC] Temporizador de sincronización iniciado (1s interval)\n');
    }

    /**
     * Ejecuta una ronda completa de 30 segundos con manejo robusto de errores
     */
    async runRound() {
        this.roundNumber++;
        this.startTime = Date.now();

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎯 RONDA #${this.roundNumber} INICIADA`);
        console.log(`${'='.repeat(60)}\n`);

        try {
            // FASE 1: BETTING (0s - 10s)
            await this.phaseBetting();

            // FASE 2: LOCKED (10s - 25s)
            await this.phaseLocked();

            // FASE 3: RESOLVING (25s - 30s)
            await this.phaseResolving();

        } catch (error) {
            console.error('❌ [ERROR] Error crítico en Game Loop:', error);
            console.error('📊 Stack trace:', error.stack);

            // Emitir error a clientes (opcional, para debugging)
            this.io.emit('GAME_ERROR', {
                message: 'Error en el servidor. Reiniciando ronda...',
                roundNumber: this.roundNumber,
                timestamp: Date.now()
            });

        } finally {
            // SIEMPRE ejecutar cleanup y continuar, incluso si hay error
            this.resetRound();

            // Pequeña pausa antes de la siguiente ronda en caso de error
            await this.wait(1000);

            // Ejecutar siguiente ronda
            this.runRound();
        }
    }

    /**
     * FASE 1: Posicionamiento (0s - 10s)
     * Los jugadores pueden realizar apuestas
     */
    async phaseBetting() {
        this.currentState = GAME_STATES.BETTING;
        this.phaseStartTime = Date.now();

        console.log('🟢 [FASE 1] BETTING - Posicionamiento Abierto');
        console.log(`⏱️  Duración: ${PHASE_BET_TIME / 1000}s`);
        console.log(`📊 Estado: Aceptando apuestas LONG/SHORT\n`);

        // Emitir estado a todos los clientes conectados
        this.io.emit('GAME_STATE', {
            state: this.currentState,
            roundNumber: this.roundNumber,
            timeLeft: PHASE_BET_TIME,
            serverTime: Date.now()
        });

        // Simular el paso del tiempo
        await this.wait(PHASE_BET_TIME);

        const elapsed = Date.now() - this.phaseStartTime;
        console.log(`✅ Fase BETTING completada (${elapsed}ms)\n`);
    }

    /**
     * FASE 2: Lockdown (10s - 25s)
     * No se aceptan más apuestas, visualización del precio
     */
    async phaseLocked() {
        this.currentState = GAME_STATES.LOCKED;
        this.phaseStartTime = Date.now();

        console.log('🔴 [FASE 2] LOCKED - Cierre Criptográfico');
        console.log(`⏱️  Duración: ${PHASE_LOCK_TIME / 1000}s`);
        console.log(`🔒 Estado: Apuestas cerradas, renderizando precio\n`);

        this.io.emit('GAME_STATE', {
            state: this.currentState,
            roundNumber: this.roundNumber,
            timeLeft: PHASE_LOCK_TIME,
            serverTime: Date.now()
        });

        // Aquí se renderizará el precio de Bitcoin en tiempo real
        await this.wait(PHASE_LOCK_TIME);

        const elapsed = Date.now() - this.phaseStartTime;
        console.log(`✅ Fase LOCKED completada (${elapsed}ms)\n`);
    }

    /**
     * FASE 3: Resolución (25s - 30s)
     * Determinar ganadores y liquidar perdedores
     */
    async phaseResolving() {
        this.currentState = GAME_STATES.RESOLVING;
        this.phaseStartTime = Date.now();

        console.log('🟡 [FASE 3] RESOLVING - Liquidación');
        console.log(`⏱️  Duración: ${PHASE_RESOLVE_TIME / 1000}s`);
        console.log(`⚖️  Estado: Calculando ganadores y distribuyendo premios\n`);

        this.io.emit('GAME_STATE', {
            state: this.currentState,
            roundNumber: this.roundNumber,
            timeLeft: PHASE_RESOLVE_TIME,
            serverTime: Date.now()
        });

        // Aquí se calculará el resultado basado en startPrice vs endPrice
        await this.resolveRound();

        await this.wait(PHASE_RESOLVE_TIME);

        const elapsed = Date.now() - this.phaseStartTime;
        console.log(`✅ Fase RESOLVING completada (${elapsed}ms)\n`);
    }

    /**
     * Resuelve la ronda actual (placeholder para Fase 2)
     */
    async resolveRound() {
        // TODO: Implementar en Fase 2 con integración de Binance
        console.log('📈 Precio Inicial: [Pendiente integración Binance]');
        console.log('📉 Precio Final: [Pendiente integración Binance]');
        console.log('🏆 Ganadores: [Pendiente lógica de apuestas]');
        console.log('💰 Pozo Total: 0 USDT');
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

export default GameLoop;
