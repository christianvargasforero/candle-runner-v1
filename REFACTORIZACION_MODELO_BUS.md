# 🚌 REFACTORIZACIÓN COMPLETADA: MODELO "BUS" - SISTEMA DE TICKETS FIJOS

**Fecha:** 2025-11-29  
**Objetivo:** Alinear la implementación del juego con el Whitepaper, transformando el sistema de apuestas variables a un modelo de "Salas con Precios Fijos" (Modelo BUS).

---

## 📋 CAMBIOS REALIZADOS

### 1️⃣ **Backend: Constantes (`shared/constants.js`)**

#### ✅ Cambios:
- **ANTES:** `ROOM_ACCESS_RULES` tenía `minBet` (monto mínimo de apuesta).
- **AHORA:** `ROOM_ACCESS_RULES` tiene `ticketPrice` (precio fijo del ticket).

```javascript
// ✅ NUEVO MODELO
export const ROOM_ACCESS_RULES = {
  TRAINING: { allowDefault: true, minLevel: 0, ticketPrice: 0 },        // Gratis
  SATOSHI: { allowDefault: true, minLevel: 0, ticketPrice: 0.10 },     // $0.10
  TRADER: { allowDefault: false, minLevel: 1, ticketPrice: 1.00 },     // $1.00
  WHALE: { allowDefault: false, minLevel: 4, ticketPrice: 10.00 }      // $10.00
};
```

---

### 2️⃣ **Backend: Room Manager (`server/services/roomManager.js`)**

#### ✅ Cambios:

1. **Creación de Salas Estáticas:**
   - Se eliminó la creación bajo demanda.
   - Ahora se crean **4 salas fijas** al inicio del servidor:
     - `room_training` (Gratis)
     - `room_satoshi` ($0.10)
     - `room_trader` ($1.00)
     - `room_whale` ($10.00)

2. **Nueva propiedad `ticketPrice`:**
   - Cada sala ahora tiene un `ticketPrice` fijo.
   - El ID de la sala es ahora `room_<nombre>` en lugar de `room_1`, `room_2`, etc.

3. **Validación de Acceso:**
   - Cambió de validar `user.balanceUSDT < rules.minBet`
   - A validar `user.balanceUSDT < room.ticketPrice`

```javascript
// ✅ NUEVO CONSTRUCTOR
constructor() {
    this.rooms = new Map();
    this.nextRoomId = 1;

    // 🚌 MODELO "BUS": Crear salas estáticas con precios de ticket fijos
    this.createRoom('TRAINING', 0, 0);       // Gratis
    this.createRoom('SATOSHI', 0, 0.10);     // $0.10 ticket
    this.createRoom('TRADER', 0, 1.00);      // $1.00 ticket
    this.createRoom('WHALE', 0, 10.00);      // $10.00 ticket
}
```

---

### 3️⃣ **Backend: Game Loop (`server/services/gameLoop.js`)**

#### ✅ Cambios:

1. **Inyección de `roomManager`:**
   - `GameLoop` ahora recibe `roomManager` en su constructor.
   - Esto permite acceder a la sala del usuario y obtener el `ticketPrice`.

2. **Método `handleBet()` Refactorizado:**
   - **ANTES:** `handleBet(socketId, amount, direction)`
   - **AHORA:** `handleBet(socketId, direction)`
   
   **El servidor YA NO confía en el `amount` enviado por el cliente.**

3. **Nuevo método `getRoomByUserId()`:**
   - Obtiene la sala donde está el usuario actualmente.

4. **Validaciones Añadidas:**
   - Se valida que el usuario esté en una sala (`user.currentRoom`).
   - Se obtiene el precio del ticket desde la sala.

```javascript
// ✅ NUEVA FIRMA
async handleBet(socketId, direction) {
    // 🚌 Validar que el usuario esté en una sala
    if (!user.currentRoom) {
        return { success: false, error: 'Debes unirte a una sala primero' };
    }

    // 🎟️ OBTENER EL PRECIO DEL TICKET DE LA SALA (NO del cliente)
    const room = this.getRoomByUserId(socketId);
    const amount = room.ticketPrice; // 🔐 El servidor DICTA el precio
    
    // ... resto de lógica
}
```

---

### 4️⃣ **Backend: Server (`server/server.js`)**

#### ✅ Cambios:

1. **Eliminada la auto-asignación de sala:**
   - **ANTES:** Al conectarse, el usuario se unía automáticamente a la primera sala.
   - **AHORA:** El usuario NO entra a ninguna sala. Debe elegir explícitamente.

2. **Nuevo evento `JOIN_ROOM`:**
   - El cliente emite `JOIN_ROOM` con `{ roomName: 'SATOSHI' }`
   - El servidor valida y une al usuario a esa sala.
   - Responde con `ROOM_JOINED` incluyendo el `ticketPrice`.

3. **Evento `PLACE_BET` Simplificado:**
   - **ANTES:** Recibía `{ amount, direction }`
   - **AHORA:** Solo recibe `{ direction }`
   - El servidor llama a `gameLoop.handleBet(socketId, direction)` sin `amount`.

```javascript
// ✅ NUEVO EVENTO JOIN_ROOM
socket.on('JOIN_ROOM', async (data) => {
    const { roomName } = data;
    const roomId = `room_${roomName.toLowerCase()}`;
    
    const result = await roomManager.addUserToRoom(socket.id, roomId);
    
    if (result.success) {
        user.currentRoom = roomId;
        socket.join(roomId);
        
        socket.emit('ROOM_JOINED', {
            roomId,
            roomName,
            ticketPrice: roomManager.getRoom(roomId).ticketPrice
        });
    }
});

// ✅ PLACE_BET SIMPLIFICADO
socket.on('PLACE_BET', async (data) => {
    const { direction } = data; // Solo dirección
    const result = await gameLoop.handleBet(socket.id, direction);
    
    if (result.success) {
        socket.emit('BET_CONFIRMED', {
            amount: result.amount, // El servidor devuelve el amount
            direction,
            balance: result.balance
        });
    }
});
```

---

### 5️⃣ **Frontend: Menu Scene (`client/src/scenes/MenuScene.js`)**

#### ✅ Cambios:

1. **Actualización de descripciones:**
   - Las salas ahora muestran claramente el precio del ticket.
   - Ejemplo: `"Ticket: $0.10"` en lugar de `"Min: $0.10 • Casual"`

2. **Emisión de `JOIN_ROOM`:**
   - Al hacer clic en "ENTRAR AL JUEGO", se emite `JOIN_ROOM` con la sala seleccionada.
   - Se espera la confirmación `ROOM_JOINED` antes de cambiar de escena.

```javascript
// ✅ NUEVAS DESCRIPCIONES
const rooms = [
    { key: 'TRAINING', name: '🎓 Training', color: 0x4CAF50, desc: 'Gratis • Practice' },
    { key: 'SATOSHI', name: '🪙 Satoshi Pit', color: 0x2196F3, desc: 'Ticket: $0.10' },
    { key: 'TRADER', name: '📈 Trader Lounge', color: 0xFF9800, desc: 'Ticket: $1.00 • Nivel 1+' },
    { key: 'WHALE', name: '🐋 Whale Club', color: 0xE91E63, desc: 'Ticket: $10.00 • Nivel 4+' }
];

// ✅ EMISIÓN DE JOIN_ROOM
zone.on('pointerdown', () => {
    this.socket.emit('JOIN_ROOM', { roomName: this.selectedRoom });
    
    this.socket.once('ROOM_JOINED', (data) => {
        this.registry.set('ticketPrice', data.ticketPrice);
        this.scene.start('GameScene');
        this.scene.launch('UIScene');
    });
});
```

---

### 6️⃣ **Frontend: UI Scene (`client/src/scenes/UIScene.js`)**

#### ✅ Cambios:

1. **Eliminación de Selector de Monto:**
   - **ELIMINADO:** `this.selectedAmount`
   - **ELIMINADO:** Botones de monto rápido ($0.01, $0.05, $0.10)
   - **ELIMINADO:** Método `createAmountButton()`

2. **Nuevo Display de Ticket:**
   - Se muestra claramente: `🎟️ TICKET: $0.10`
   - Se actualiza dinámicamente al cambiar de sala.

3. **Botones Simplificados:**
   - **ANTES:** "LONG ▲" / "SHORT ▼"
   - **AHORA:** "COMPRAR ▲" / "COMPRAR ▼"

4. **Método `placeBet()` Simplificado:**
   - Solo envía `{ direction }` sin `amount`.

```javascript
// ✅ NUEVO PANEL DE APUESTAS
createBettingPanel() {
    // Mostrar precio del ticket
    const ticketPrice = this.registry.get('ticketPrice') || 0;
    this.ticketPriceText = this.add.text(0, -50, `🎟️ TICKET: $${ticketPrice.toFixed(2)}`, {
        font: 'bold 20px Courier New',
        fill: '#00ffff'
    });

    // Botones simplificados
    this.btnLong = this.createButton(-110, 20, 'COMPRAR ▲', 0x00ff00, () => this.placeBet('LONG'));
    this.btnShort = this.createButton(110, 20, 'COMPRAR ▼', 0xff0000, () => this.placeBet('SHORT'));
}

// ✅ PLACE BET SIMPLIFICADO
placeBet(direction) {
    if (!this.canBet) return;
    this.socket.emit('PLACE_BET', { direction }); // Solo dirección
}
```

---

## 🎯 RESUMEN DE BENEFICIOS

### ✅ Seguridad
- **Antimanipulación:** El cliente YA NO puede enviar un monto arbitrario.
- **Control del Servidor:** El precio lo dicta la sala, no el usuario.

### ✅ Simplicidad
- **UX Simplificada:** El usuario solo elige LONG o SHORT, no el monto.
- **Menos Decisiones:** Más fácil para nuevos jugadores.

### ✅ Alineación con Whitepaper
- **Modelo BUS:** Ahora el juego funciona como un sistema de transporte:
  1. Eliges un "Bus" (Sala).
  2. Pagas el "Ticket" (Precio fijo).
  3. Apuestas LONG o SHORT.

### ✅ Escalabilidad
- **Salas Estáticas:** Fácil añadir nuevas salas en el futuro.
- **IDs Predecibles:** `room_satoshi`, `room_trader`, etc.

---

## 🧪 TESTING RECOMENDADO

### Backend
```bash
# 1. Verificar que las 4 salas se crean al inicio
curl http://localhost:3000/api/rooms

# 2. Conectar un usuario y verificar JOIN_ROOM
# (Usar cliente de Socket.io o frontend)

# 3. Verificar que PLACE_BET sin amount funciona
```

### Frontend
1. **Menú:**
   - Verificar que se muestran las 4 salas con sus precios.
   - Seleccionar cada sala y verificar que se une correctamente.

2. **UI:**
   - Verificar que NO aparecen botones de selección de monto.
   - Verificar que el precio del ticket se muestra correctamente.
   - Hacer una apuesta y verificar que se descuenta el monto correcto.

---

## 📊 PRÓXIMOS PASOS

### 1. Lógica de Estado (Jugador vs Espectador)
- Implementar `isPlayer` (true solo si ha apostado en la ronda actual).
- Visual: Personaje transparente si es espectador, corriendo si es jugador.
- Al perder, volver a modo espectador (bajar del bus).

### 2. Persistencia de Sala
- Guardar `user.currentRoom` en DynamoDB/Redis.
- Al reconectar, restaurar la sala del usuario.

### 3. UI de Cambio de Sala
- Permitir cambiar de sala sin salir del juego.
- Botón "Cambiar Sala" en UIScene.

### 4. Validación Adicional
- Verificar que el usuario no pueda apostar si no está en una sala.
- Mensaje claro: "Debes unirte a una sala primero".

---

## 🔥 CONCLUSIÓN

La refactorización está **100% completa** y alineada con el Whitepaper. El juego ahora funciona bajo el **Modelo BUS**:

- ✅ Salas con precios fijos.
- ✅ El servidor dicta el precio del ticket.
- ✅ El cliente solo elige la dirección (LONG/SHORT).
- ✅ Interfaz simplificada y clara.

**El código está listo para testing y validación.**

---

**Firma:** Antigravity AI - Lead Game Designer & Backend Architect  
**Fecha:** 2025-11-29
