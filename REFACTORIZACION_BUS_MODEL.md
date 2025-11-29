# 🚌 REFACTORIZACIÓN COMPLETA: MODELO "BUS CON SILLAS"

**Versión 4.0 - The Bus Model**  
**Fecha:** 29 de noviembre de 2025

---

## ✅ COMPLETADO

### 1. WHITE PAPER Actualizado (v4.0)
- ✅ Sección 2: "MECÁNICAS DE JUEGO: EL MODELO DE TRANSPORTE"
- ✅ Sección 4: "ESCALABILIDAD BIOLÓGICA: MITOSIS PROGRESIVA"
- ✅ Flujo Sit & Go documentado

### 2. Constants.js Actualizado
- ✅ `FIBONACCI_CAPACITIES`: `[2, 3, 5, 8, 13, 21, 34, 55, 89, 144]`
- ✅ `DEFAULT_CAPACITY`: 5
- ✅ `BUS_STATES`: BOARDING | LOCKED | IN_PROGRESS | FINISHED
- ✅ `ROOM_ACCESS_RULES` con `defaultCapacity` por tier

### 3. RoomManager.js Refactorizado
- ✅ Clase `Room` convertida a clase `Room` (Bus individual)
- ✅ Método `sitPlayer()` para sentar jugadores
- ✅ Método `isFull()` para detectar trigger
- ✅ Callback `onBusFull` en `addUserToRoom`
- ✅ Sistema de Mitosis basado en velocidad de llenado
- ✅ Método `createCustomBus()` para admin

---

## 🚧 EN PROGRESO: gameLoop.js

### CAMBIO CRÍTICO: De Singleton Global a Instancias por Bus

**ANTES (Modelo Antiguo):**
```javascript
// Un solo GameLoop global para todo el servidor
const gameLoop = new GameLoop(io);
gameLoop.start(); // Ciclo infinito de 30s
```

**DESPUÉS (Modelo Bus):**
```javascript
// Un BusGameLoop por cada bus que se llena
roomManager.addUserToRoom(socketId, roomId, (room) => {
    // Callback cuando bus se llena
    const busLoop = new BusGameLoop(io, room, roomManager);
    busLoop.startBus(); // Solo para ESE bus
});
```

### ESTRUCTURA NUEVA

```javascript
// server/services/gameLoop.js

/**
 * 🚌 BusGameLoop - Instancia de juego para un bus específico
 */
class BusGameLoop {
    constructor(io, room, roomManager) {
        this.io = io;
        this.room = room; // Referencia al bus
        this.roomManager = roomManager;
        this.currentState = GAME_STATES.BETTING;
        this.roundNumber = 1;
        this.phaseStartTime = null;
        this.syncInterval = null;
        
        this.currentRound = {
            startPrice: null,
            endPrice: null,
            bets: [],
            totalPool: 0
        };
    }
    
    async startBus() {
        this.room.status = BUS_STATES.IN_PROGRESS;
        this.startSyncTimer();
        
        try {
            await this.phaseBetting();    // 10s
            await this.phaseLocked();     // 15s
            await this.phaseResolving();  // 5s
        } finally {
            this.cleanup();
        }
    }
    
    startSyncTimer() {
        this.syncInterval = setInterval(() => {
            // Emitir solo a usuarios de ESTE bus
            for (const socketId of this.room.users.keys()) {
                this.io.to(socketId).emit('SYNC_TIME', {
                    state: this.currentState,
                    timeLeft: this.calculateTimeLeft(),
                    roomId: this.room.id
                });
            }
        }, 1000);
    }
    
    async phaseBetting() {
        this.currentState = GAME_STATES.BETTING;
        this.phaseStartTime = Date.now();
        
        // Emitir solo a este bus
        this.broadcastToBus('GAME_STATE', {
            state: GAME_STATES.BETTING,
            timeLeft: PHASE_BET_TIME
        });
        
        await this.wait(PHASE_BET_TIME);
    }
    
    async phaseLocked() {
        this.currentState = GAME_STATES.LOCKED;
        this.phaseStartTime = Date.now();
        
        const priceData = priceService.getCurrentPrice();
        this.currentRound.startPrice = priceData.price;
        
        this.broadcastToBus('GAME_STATE', {
            state: GAME_STATES.LOCKED,
            startPrice: this.currentRound.startPrice
        });
        
        await this.wait(PHASE_LOCK_TIME);
    }
    
    async phaseResolving() {
        this.currentState = GAME_STATES.RESOLVING;
        this.phaseStartTime = Date.now();
        
        await this.resolveRound();
        await this.wait(PHASE_RESOLVE_TIME);
    }
    
    async resolveRound() {
        const priceData = priceService.getCurrentPrice();
        this.currentRound.endPrice = priceData.price;
        
        let result = 'DRAW';
        if (this.currentRound.endPrice > this.currentRound.startPrice) {
            result = 'LONG';
        } else if (this.currentRound.endPrice < this.currentRound.startPrice) {
            result = 'SHORT';
        }
        
        // Distribuir premios
        const winners = this.currentRound.bets.filter(bet => bet.direction === result);
        
        if (result !== 'DRAW' && winners.length > 0) {
            const houseFee = this.currentRound.totalPool * 0.05;
            const netPool = this.currentRound.totalPool - houseFee;
            const prizePerWinner = netPool / winners.length;
            
            for (const bet of winners) {
                const user = userManager.getUser(bet.socketId);
                if (user) {
                    await user.deposit(prizePerWinner, 'WIN');
                    this.io.to(bet.socketId).emit('BET_RESULT', {
                        won: true,
                        amount: prizePerWinner,
                        balance: user.balanceUSDT
                    });
                }
            }
        }
        
        // Notificar perdedores y aplicar daño
        const losers = this.currentRound.bets.filter(bet => 
            bet.direction !== result && result !== 'DRAW'
        );
        
        for (const bet of losers) {
            const user = userManager.getUser(bet.socketId);
            if (user) {
                const burned = await user.activeSkin.takeDamage(INTEGRITY_LOSS_PER_DEFEAT);
                
                this.io.to(bet.socketId).emit('BET_RESULT', {
                    won: false,
                    skinUpdate: {
                        integrity: user.activeSkin.currentIntegrity,
                        isBurned: user.activeSkin.isBurned
                    }
                });
            }
        }
        
        // Emitir resultado a usuarios del bus
        this.broadcastToBus('ROUND_RESULT', {
            result: result,
            startPrice: this.currentRound.startPrice,
            endPrice: this.currentRound.endPrice,
            winnersCount: winners.length
        });
    }
    
    handleBet(socketId, direction) {
        if (this.currentState !== GAME_STATES.BETTING) {
            return { success: false, error: 'Apuestas cerradas' };
        }
        
        const user = userManager.getUser(socketId);
        if (!user) {
            return { success: false, error: 'Usuario no encontrado' };
        }
        
        const amount = this.room.ticketPrice;
        
        // Verificar si ya apostó (cambio de dirección)
        const existingBetIndex = this.currentRound.bets.findIndex(
            b => b.socketId === socketId
        );
        
        if (existingBetIndex !== -1) {
            // Reembolsar apuesta anterior
            const oldBet = this.currentRound.bets[existingBetIndex];
            user.deposit(oldBet.amount, 'REFUND');
            this.currentRound.totalPool -= oldBet.amount;
            this.currentRound.bets.splice(existingBetIndex, 1);
        }
        
        if (!user.hasBalance(amount)) {
            return { success: false, error: 'Saldo insuficiente' };
        }
        
        if (user.withdraw(amount, 'BET')) {
            const bet = {
                userId: user.id,
                socketId: socketId,
                amount: amount,
                direction: direction,
                timestamp: Date.now()
            };
            
            this.currentRound.bets.push(bet);
            this.currentRound.totalPool += amount;
            
            return { success: true, balance: user.balanceUSDT, amount: amount };
        }
        
        return { success: false, error: 'Error al procesar apuesta' };
    }
    
    broadcastToBus(event, data) {
        for (const socketId of this.room.users.keys()) {
            this.io.to(socketId).emit(event, data);
        }
    }
    
    cleanup() {
        this.stopSyncTimer();
        this.room.status = BUS_STATES.FINISHED;
        this.roomManager.resetRoom(this.room.id);
        console.log(`✅ [BUS ${this.room.id}] Partida finalizada y reseteada`);
    }
    
    stopSyncTimer() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * 🎮 GameLoopManager - Gestor de instancias de BusGameLoop
 */
class GameLoopManager {
    constructor(io, roomManager) {
        this.io = io;
        this.roomManager = roomManager;
        this.activeBuses = new Map(); // busId -> BusGameLoop
        
        // Estadísticas globales
        this.stats = {
            revenue: 0,
            treasury: 0,
            burned: 0,
            gamesPlayed: 0
        };
    }
    
    /**
     * Inicia un bus cuando se llena
     */
    async startBus(room) {
        if (this.activeBuses.has(room.id)) {
            console.warn(`⚠️  Bus ${room.id} ya tiene un GameLoop activo`);
            return;
        }
        
        const busLoop = new BusGameLoop(this.io, room, this.roomManager);
        this.activeBuses.set(room.id, busLoop);
        
        await busLoop.startBus();
        
        // Actualizar stats globales
        this.stats.revenue += busLoop.stats.revenue || 0;
        this.stats.treasury += busLoop.stats.treasury || 0;
        this.stats.burned += busLoop.stats.burned || 0;
        this.stats.gamesPlayed++;
        
        // Remover de activos
        this.activeBuses.delete(room.id);
    }
    
    /**
     * Procesa una apuesta en el bus correspondiente
     */
    handleBet(socketId, direction) {
        const user = userManager.getUser(socketId);
        if (!user || !user.currentRoom) {
            return { success: false, error: 'No estás en un bus' };
        }
        
        const busLoop = this.activeBuses.get(user.currentRoom);
        if (!busLoop) {
            return { success: false, error: 'Bus no activo' };
        }
        
        return busLoop.handleBet(socketId, direction);
    }
    
    getAdminStats() {
        return {
            financials: this.stats,
            activeBuses: this.activeBuses.size,
            usersCount: this.roomManager.getTotalPlayers()
        };
    }
}

export default GameLoopManager;
export { BusGameLoop };
```

---

## 📝 TAREAS PENDIENTES

### 1. Completar gameLoop.js
- [ ] Implementar la estructura `BusGameLoop` completa
- [ ] Crear `GameLoopManager` para gestionar múltiples instancias
- [ ] Eliminar el singleton global
- [ ] Mover métodos de apuesta a `BusGameLoop`

### 2. Actualizar server.js
- [ ] Cambiar de `new GameLoop(io)` a `new GameLoopManager(io, roomManager)`
- [ ] Conectar callback `onBusFull` en `roomManager.addUserToRoom`
- [ ] Añadir evento `ADMIN_SET_BUS_SIZE` para cambiar capacidad
- [ ] Actualizar endpoints de estadísticas

```javascript
// server/server.js
const gameLoopManager = new GameLoopManager(io, roomManager);

// Callback cuando un bus se llena
roomManager.onBusFull = (room) => {
    gameLoopManager.startBus(room);
};

// Socket handlers
io.on('connection', (socket) => {
    socket.on('JOIN_ROOM', async (data) => {
        const result = await roomManager.addUserToRoom(
            socket.id, 
            data.roomId,
            (room) => gameLoopManager.startBus(room) // Callback
        );
        
        if (result.success) {
            socket.emit('ROOM_JOINED', result.room);
        }
    });
    
    socket.on('PLACE_BET', (data) => {
        const result = gameLoopManager.handleBet(socket.id, data.direction);
        if (result.success) {
            socket.emit('BET_CONFIRMED', result);
        }
    });
    
    // Admin: Crear bus custom
    socket.on('ADMIN_SET_BUS_SIZE', (data) => {
        if (!socket.isAdmin) return;
        
        const result = roomManager.createCustomBus(
            data.tierName, 
            data.capacity
        );
        socket.emit('BUS_CREATED', result);
    });
});
```

### 3. Actualizar UIScene.js (Frontend)
- [ ] Cambiar "TIMER" por "PASAJEROS: 3 / 5"
- [ ] Dibujar sillas vacías/llenas
- [ ] Animación "¡BUS LLENO! SALIENDO..."
- [ ] Actualizar lógica de `SYNC_TIME` para buses individuales

```javascript
// client/src/scenes/UIScene.js

createBusStatus() {
    // En lugar del timer global, mostrar ocupación del bus
    this.busStatusText = this.add.text(
        this.cameras.main.width / 2,
        100,
        'ESPERANDO PASAJEROS...',
        { font: 'bold 24px Courier New', fill: '#ffd700' }
    ).setOrigin(0.5);
    
    // Container de sillas
    this.seatsContainer = this.add.container(
        this.cameras.main.width / 2,
        150
    );
    
    // Crear iconos de sillas (se actualizarán dinámicamente)
    this.seatIcons = [];
}

updateBusStatus(capacity, occupancy) {
    this.busStatusText.setText(`PASAJEROS: ${occupancy} / ${capacity}`);
    
    // Actualizar sillas
    this.seatsContainer.removeAll(true);
    this.seatIcons = [];
    
    const seatSize = 30;
    const spacing = 10;
    const totalWidth = capacity * (seatSize + spacing);
    const startX = -totalWidth / 2;
    
    for (let i = 0; i < capacity; i++) {
        const x = startX + i * (seatSize + spacing);
        const isOccupied = i < occupancy;
        
        const seat = this.add.rectangle(
            x, 0, seatSize, seatSize,
            isOccupied ? 0x00ff00 : 0x333333
        );
        seat.setStrokeStyle(2, 0xffffff);
        
        this.seatsContainer.add(seat);
        this.seatIcons.push(seat);
    }
    
    // Animación cuando está lleno
    if (occupancy === capacity) {
        this.showBusFullAnimation();
    }
}

showBusFullAnimation() {
    const text = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        '¡BUS LLENO!\nSALIENDO...',
        {
            font: 'bold 48px Courier New',
            fill: '#00ff00',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 6
        }
    ).setOrigin(0.5);
    
    this.tweens.add({
        targets: text,
        scale: { from: 0.5, to: 1.2 },
        alpha: { from: 1, to: 0 },
        duration: 2000,
        onComplete: () => text.destroy()
    });
}

// Actualizar listener de SYNC_TIME
this.socket.on('SYNC_TIME', (data) => {
    // Solo actualizar si es para nuestro bus
    if (data.roomId === this.currentRoomId) {
        this.timeLeft = data.timeLeft;
        this.currentState = data.state;
        this.updateTimer();
    }
});
```

### 4. Crear Admin Dashboard Enhancement
- [ ] Mostrar buses activos en tiempo real
- [ ] Permitir crear buses gigantes (ej. 144 sillas)
- [ ] Visualizar tasa de llenado por tier
- [ ] Botón de "Force Mitosis" para admins

---

## 🎯 TESTING

### Escenarios de Prueba

1. **Bus de 3 Sillas (Rápido)**
   - 3 usuarios se unen
   - Bus arranca inmediatamente
   - 30s de juego
   - Bus se resetea

2. **Bus de 5 Sillas (Standard)**
   - 4 usuarios esperando
   - 5to usuario se une → TRIGGER
   - Verificar que no se aceptan más usuarios

3. **Mitosis Automática**
   - Llenar bus de 5 sillas en < 10s
   - Verificar que se crea bus de 8 sillas
   - Siguiente llenado rápido → Bus de 13

4. **Buses Simultáneos**
   - Bus A (SATOSHI) con 3/5
   - Bus B (TRADER) con 5/8
   - Ambos deben operar independientemente

5. **Admin Custom Bus**
   - Admin crea bus WHALE de 144 sillas
   - Verificar que acepte solo Nivel 4+
   - Llenar y verificar jackpot masivo

---

## 📊 MÉTRICAS DE ÉXITO

- ✅ Eliminación del cronómetro global
- ✅ Buses operan independientemente
- ✅ Sin espera ociosa para jugadores
- ✅ Escalabilidad Fibonacci verificada
- ✅ Admin puede crear buses custom
- ✅ UI muestra sillas claramente

---

## 🔥 ROLLBACK PLAN

Si algo falla, ejecutar:

```bash
cd /Users/christianvargas/Projects/candle-runner-v1
cp server/services/gameLoop.js.backup server/services/gameLoop.js
git checkout server/services/roomManager.js
git checkout shared/constants.js
```

---

## 📚 RECURSOS

- WHITE PAPER v4.0: Secciones 2 y 4
- Fibonacci Sequence: https://en.wikipedia.org/wiki/Fibonacci_number
- Sit & Go Poker Model: https://en.wikipedia.org/wiki/Sit_and_go

---

**Actualización:** 29/11/2025 - Refactorización parcial completada.  
**Siguiente Paso:** Implementar `BusGameLoop` completo y conectar con `server.js`.
