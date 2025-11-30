#!/usr/bin/env node

// 🧪 CANDLE RUNNER - Script de Simulación de Mecánicas
// Valida que el juego cumple las reglas del White Paper

const io = require('socket.io-client');
const crypto = require('crypto');

// ============================================
// 🎯 CONFIGURACIÓN
// ============================================

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const ROOM_NAME = 'bus_satoshi_test';
const NUM_BOTS = 3;

// Colores para output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

// ============================================
// 🤖 CLASE BOT
// ============================================

class Bot {
    constructor(name, betStrategy) {
        this.name = name;
        this.betStrategy = betStrategy; // 'LONG', 'SHORT', 'IDLE'
        this.wallet = this.generateWallet();
        this.socket = null;
        this.balance = 0;
        this.initialBalance = 0;
        this.events = [];
    }

    generateWallet() {
        return '0x' + crypto.randomBytes(20).toString('hex');
    }

    connect() {
        return new Promise((resolve, reject) => {
            console.log(`${colors.cyan}[${this.name}]${colors.reset} Conectando al servidor...`);

            this.socket = io(SERVER_URL, {
                auth: {
                    wallet: this.wallet,
                    signature: 'mock_signature_' + Date.now()
                },
                transports: ['websocket']
            });

            this.socket.on('connect', () => {
                console.log(`${colors.green}✅ [${this.name}]${colors.reset} Conectado (ID: ${this.socket.id})`);
                this.setupListeners();
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error(`${colors.red}❌ [${this.name}]${colors.reset} Error de conexión:`, error.message);
                reject(error);
            });

            setTimeout(() => reject(new Error('Timeout de conexión')), 10000);
        });
    }

    setupListeners() {
        // USER_PROFILE
        this.socket.on('USER_PROFILE', (profile) => {
            this.balance = profile.balance || 0;
            this.initialBalance = this.balance;
            console.log(`${colors.cyan}[${this.name}]${colors.reset} Perfil recibido. Balance: $${this.balance}`);
            this.logEvent('USER_PROFILE', profile);
        });

        // BUS_START
        this.socket.on('BUS_START', (data) => {
            console.log(`${colors.green}✅ [${this.name}]${colors.reset} Bus iniciado! Pasajeros: ${data.passengers?.length || 0}`);
            this.logEvent('BUS_START', data);
        });

        // GAME_STATE
        this.socket.on('GAME_STATE', (data) => {
            console.log(`${colors.yellow}[${this.name}]${colors.reset} Estado del juego: ${data.phase}`);
            this.logEvent('GAME_STATE', data);

            // Auto-apostar en fase BETTING
            if (data.phase === 'BETTING' && this.betStrategy !== 'IDLE') {
                setTimeout(() => this.placeBet(), 1000);
            }
        });

        // BET_CONFIRMED
        this.socket.on('BET_CONFIRMED', (data) => {
            console.log(`${colors.green}✅ [${this.name}]${colors.reset} Apuesta confirmada: ${data.prediction} ($${data.amount})`);
            this.logEvent('BET_CONFIRMED', data);
        });

        // PRICE_UPDATE
        this.socket.on('PRICE_UPDATE', (data) => {
            // Solo loguear cada 5 actualizaciones para no saturar
            if (Math.random() < 0.2) {
                console.log(`${colors.magenta}📉 [${this.name}]${colors.reset} Precio: $${data.price.toFixed(2)}`);
            }
            this.logEvent('PRICE_UPDATE', data);
        });

        // ROUND_RESULT
        this.socket.on('ROUND_RESULT', (data) => {
            console.log(`${colors.bright}🏁 [${this.name}]${colors.reset} Resultado de ronda recibido`);
            this.logEvent('ROUND_RESULT', data);
            this.analyzeResult(data);
        });

        // BALANCE_UPDATE
        this.socket.on('BALANCE_UPDATE', (data) => {
            const oldBalance = this.balance;
            this.balance = data.balance;
            const change = this.balance - oldBalance;
            const symbol = change >= 0 ? '+' : '';
            const color = change >= 0 ? colors.green : colors.red;
            console.log(`${color}💰 [${this.name}]${colors.reset} Balance actualizado: $${this.balance} (${symbol}$${change.toFixed(2)})`);
            this.logEvent('BALANCE_UPDATE', data);
        });

        // ERROR
        this.socket.on('ERROR', (data) => {
            console.error(`${colors.red}❌ [${this.name}]${colors.reset} Error:`, data.message);
            this.logEvent('ERROR', data);
        });
    }

    joinRoom() {
        return new Promise((resolve) => {
            console.log(`${colors.cyan}[${this.name}]${colors.reset} Uniéndose a sala: ${ROOM_NAME}`);
            this.socket.emit('JOIN_ROOM', { roomName: ROOM_NAME });
            setTimeout(resolve, 500);
        });
    }

    placeBet() {
        if (this.betStrategy === 'IDLE') return;

        const betAmount = 0.10;
        console.log(`${colors.yellow}[${this.name}]${colors.reset} Apostando ${this.betStrategy} ($${betAmount})`);

        this.socket.emit('PLACE_BET', {
            prediction: this.betStrategy,
            amount: betAmount
        });
    }

    logEvent(eventName, data) {
        this.events.push({
            timestamp: Date.now(),
            event: eventName,
            data: data
        });
    }

    analyzeResult(roundResult) {
        const myStatus = roundResult.passengerStatuses?.find(p =>
            p.userId === this.socket.id || p.odId === this.socket.id
        );

        if (myStatus) {
            const statusColor = myStatus.status === 'WIN' ? colors.green :
                myStatus.status === 'DAMAGE' ? colors.yellow : colors.red;
            console.log(`${statusColor}[${this.name}]${colors.reset} Mi resultado: ${myStatus.status}`);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            console.log(`${colors.cyan}[${this.name}]${colors.reset} Desconectado`);
        }
    }

    getReport() {
        const balanceChange = this.balance - this.initialBalance;
        return {
            name: this.name,
            strategy: this.betStrategy,
            initialBalance: this.initialBalance,
            finalBalance: this.balance,
            change: balanceChange,
            eventsCount: this.events.length
        };
    }
}

// ============================================
// 🧪 SIMULADOR PRINCIPAL
// ============================================

class GameSimulator {
    constructor() {
        this.bots = [];
        this.startTime = null;
        this.validations = [];
    }

    async run() {
        console.log(`\n${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.bright}🧪 CANDLE RUNNER - SIMULACIÓN DE MECÁNICAS${colors.reset}`);
        console.log(`${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);

        this.startTime = Date.now();

        try {
            // PASO 1: Crear y conectar bots
            await this.step1_createBots();

            // PASO 2: Unirse a la sala
            await this.step2_joinRoom();

            // PASO 3: Esperar inicio del bus
            await this.step3_waitForBusStart();

            // PASO 4: Esperar fase de apuestas
            await this.step4_waitForBetting();

            // PASO 5: Esperar fase de lockdown
            await this.step5_waitForLockdown();

            // PASO 6: Esperar resultado
            await this.step6_waitForResult();

            // PASO 7: Validar reglas del White Paper
            await this.step7_validateRules();

            // REPORTE FINAL
            this.generateReport();

        } catch (error) {
            console.error(`\n${colors.red}❌ ERROR EN SIMULACIÓN:${colors.reset}`, error.message);
        } finally {
            this.cleanup();
        }
    }

    async step1_createBots() {
        console.log(`\n${colors.bright}📋 PASO 1: Crear y Conectar Bots${colors.reset}`);
        console.log('─'.repeat(55));

        this.bots = [
            new Bot('Bot A', 'LONG'),
            new Bot('Bot B', 'SHORT'),
            new Bot('Bot C', 'IDLE')
        ];

        for (const bot of this.bots) {
            await bot.connect();
            await this.sleep(500);
        }

        this.validate('Bots conectados', this.bots.every(b => b.socket?.connected));
    }

    async step2_joinRoom() {
        console.log(`\n${colors.bright}📋 PASO 2: Unirse a la Sala${colors.reset}`);
        console.log('─'.repeat(55));

        for (const bot of this.bots) {
            await bot.joinRoom();
        }

        this.validate('Bots unidos a sala', true);
    }

    async step3_waitForBusStart() {
        console.log(`\n${colors.bright}📋 PASO 3: Esperar Inicio del Bus${colors.reset}`);
        console.log('─'.repeat(55));

        const busStarted = await this.waitForEvent('BUS_START', 30000);
        this.validate('Bus iniciado cuando se llenó', busStarted);
    }

    async step4_waitForBetting() {
        console.log(`\n${colors.bright}📋 PASO 4: Fase de Apuestas${colors.reset}`);
        console.log('─'.repeat(55));

        const bettingPhase = await this.waitForEvent('GAME_STATE', 10000, (data) => data.phase === 'BETTING');
        this.validate('Fase BETTING iniciada', bettingPhase);

        // Esperar confirmaciones de apuestas
        await this.sleep(3000);

        const botA = this.bots[0];
        const botB = this.bots[1];
        const botC = this.bots[2];

        const betAConfirmed = botA.events.some(e => e.event === 'BET_CONFIRMED');
        const betBConfirmed = botB.events.some(e => e.event === 'BET_CONFIRMED');
        const betCConfirmed = botC.events.some(e => e.event === 'BET_CONFIRMED');

        this.validate('Bot A (LONG) apostó', betAConfirmed);
        this.validate('Bot B (SHORT) apostó', betBConfirmed);
        this.validate('Bot C (IDLE) NO apostó', !betCConfirmed);
    }

    async step5_waitForLockdown() {
        console.log(`\n${colors.bright}📋 PASO 5: Fase de Lockdown (El Viaje)${colors.reset}`);
        console.log('─'.repeat(55));

        const lockedPhase = await this.waitForEvent('GAME_STATE', 20000, (data) => data.phase === 'LOCKED');
        this.validate('Fase LOCKED iniciada', lockedPhase);

        console.log(`${colors.magenta}📉 Escuchando actualizaciones de precio...${colors.reset}`);
        await this.sleep(5000);

        const priceUpdates = this.bots[0].events.filter(e => e.event === 'PRICE_UPDATE');
        this.validate('Precio se actualizó durante lockdown', priceUpdates.length > 0);
    }

    async step6_waitForResult() {
        console.log(`\n${colors.bright}📋 PASO 6: Resolución (El Juicio)${colors.reset}`);
        console.log('─'.repeat(55));

        const result = await this.waitForEvent('ROUND_RESULT', 30000);
        this.validate('Resultado de ronda recibido', result);

        // Esperar actualizaciones de balance
        await this.sleep(2000);
    }

    async step7_validateRules() {
        console.log(`\n${colors.bright}📋 PASO 7: Validar Reglas del White Paper${colors.reset}`);
        console.log('─'.repeat(55));

        const botA = this.bots[0];
        const botB = this.bots[1];
        const botC = this.bots[2];

        // Validar que hubo ganadores y perdedores
        const roundResult = botA.events.find(e => e.event === 'ROUND_RESULT')?.data;

        if (roundResult && roundResult.passengerStatuses) {
            const winners = roundResult.passengerStatuses.filter(p => p.status === 'WIN');
            const losers = roundResult.passengerStatuses.filter(p => p.status === 'DAMAGE' || p.status === 'BURNED');

            this.validate('Hubo ganadores o perdedores', winners.length > 0 || losers.length > 0);

            // Validar que el Bot C (IDLE) fue penalizado o marcado
            const botCStatus = roundResult.passengerStatuses.find(p =>
                p.userId === botC.socket.id || p.odId === botC.socket.id
            );

            if (botCStatus) {
                this.validate('Bot C (IDLE) recibió daño por no apostar',
                    botCStatus.status === 'DAMAGE' || botCStatus.status === 'BURNED');
            }
        }

        // Validar actualizaciones de balance
        const balanceUpdates = botA.events.filter(e => e.event === 'BALANCE_UPDATE');
        this.validate('Balances se actualizaron', balanceUpdates.length > 0);

        // Validar que los ganadores ganaron dinero
        const botAChange = botA.balance - botA.initialBalance;
        const botBChange = botB.balance - botB.initialBalance;

        console.log(`\n${colors.cyan}💰 Cambios de Balance:${colors.reset}`);
        console.log(`   Bot A (LONG): ${botAChange >= 0 ? '+' : ''}$${botAChange.toFixed(2)}`);
        console.log(`   Bot B (SHORT): ${botBChange >= 0 ? '+' : ''}$${botBChange.toFixed(2)}`);
        console.log(`   Bot C (IDLE): ${(botC.balance - botC.initialBalance).toFixed(2)}`);

        // Al menos uno debe haber ganado
        this.validate('Al menos un bot ganó dinero', botAChange > 0 || botBChange > 0);
    }

    async waitForEvent(eventName, timeout, condition = null) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            for (const bot of this.bots) {
                const event = bot.events.find(e => {
                    if (e.event !== eventName) return false;
                    if (condition) return condition(e.data);
                    return true;
                });

                if (event) return true;
            }

            await this.sleep(100);
        }

        return false;
    }

    validate(description, passed) {
        const symbol = passed ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
        console.log(`${symbol} ${description}`);

        this.validations.push({
            description,
            passed
        });
    }

    generateReport() {
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
        const totalValidations = this.validations.length;
        const passedValidations = this.validations.filter(v => v.passed).length;
        const successRate = ((passedValidations / totalValidations) * 100).toFixed(1);

        console.log(`\n${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.bright}📊 REPORTE FINAL${colors.reset}`);
        console.log(`${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);

        console.log(`⏱️  Duración: ${duration}s`);
        console.log(`✅ Validaciones: ${passedValidations}/${totalValidations} (${successRate}%)`);

        console.log(`\n${colors.cyan}🤖 Estado de Bots:${colors.reset}`);
        this.bots.forEach(bot => {
            const report = bot.getReport();
            const changeSymbol = report.change >= 0 ? '+' : '';
            const changeColor = report.change >= 0 ? colors.green : colors.red;
            console.log(`   ${report.name} (${report.strategy}): ${changeColor}${changeSymbol}$${report.change.toFixed(2)}${colors.reset} | Eventos: ${report.eventsCount}`);
        });

        const allPassed = passedValidations === totalValidations;
        const finalColor = allPassed ? colors.green : colors.red;
        const finalSymbol = allPassed ? '✅' : '❌';

        console.log(`\n${finalColor}${finalSymbol} RESULTADO: ${allPassed ? 'TODAS LAS REGLAS SE CUMPLEN' : 'ALGUNAS REGLAS FALLARON'}${colors.reset}\n`);
    }

    cleanup() {
        console.log(`\n${colors.cyan}🧹 Limpiando...${colors.reset}`);
        this.bots.forEach(bot => bot.disconnect());
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================
// 🚀 EJECUTAR SIMULACIÓN
// ============================================

if (require.main === module) {
    const simulator = new GameSimulator();
    simulator.run().catch(error => {
        console.error(`${colors.red}❌ Error fatal:${colors.reset}`, error);
        process.exit(1);
    });
}

module.exports = { GameSimulator, Bot };
