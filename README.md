# 🕯️ Candle Runner Protocol

**Survival Trading & Decentralized Creative Economy (DCE)**

Versión 1.0 - Fase 1: Skeleton

---

## 📋 Descripción

Candle Runner es un protocolo de "Arcade Financiero" que transforma el trading de criptomonedas en una experiencia social, visual y competitiva. Los jugadores apuestan USDT en la dirección del precio de Bitcoin (LONG/SHORT) en ciclos de 30 segundos, arriesgando sus activos digitales (Skins) en un sistema de "Permadeath".

## 🏗️ Arquitectura

### Stack Tecnológico

- **Backend**: Node.js + Express.js + Socket.io
- **Base de Datos (Hot)**: Redis *(Fase 2)*
- **Base de Datos (Cold)**: PostgreSQL *(Fase 4)*
- **Frontend**: HTML5 + Phaser 3 *(Fase 3)*
- **Oráculo**: Binance WebSocket API *(Fase 2)*

### Estructura del Proyecto

```
/candle-runner-v1
├── /client              # Frontend
│   ├── /assets          # Sprites, sonidos
│   ├── /src             # Código fuente cliente
│   │   └── /scenes      # Escenas Phaser
│   └── index.html       # Cliente básico
├── /server              # Backend
│   ├── /config          # Configuraciones
│   ├── /controllers     # Controladores de lógica
│   ├── /models          # Modelos de datos
│   ├── /services        # Servicios principales
│   │   ├── gameLoop.js      # Motor de juego de 30s
│   │   ├── roomManager.js   # Gestión de salas
│   │   └── binanceService.js *(Fase 2)*
│   └── server.js        # Servidor principal
└── /shared              # Código compartido
    └── constants.js     # Constantes matemáticas
```

## 🎮 Motor de Juego (Game Loop)

El núcleo del sistema es un ciclo síncrono de **30 segundos** dividido en 3 fases:

### Fase 1: BETTING (0s - 10s)
- ✅ Los jugadores pueden realizar apuestas LONG/SHORT
- ✅ Comprometen capital (USDT) y activo (Skin)

### Fase 2: LOCKED (10s - 25s)
- 🔒 Cierre criptográfico de entradas
- 📊 Renderizado del precio de Bitcoin en tiempo real

### Fase 3: RESOLVING (25s - 30s)
- ⚖️ El oráculo determina el resultado
- 💰 Distribución de premios a ganadores
- 🔥 Liquidación de perdedores (Permadeath)

## 🏛️ Gestión de Salas (Mitosis Fibonacci)

Las salas se auto-regulan usando la **Secuencia de Fibonacci**:

- **Capacidad Crítica**: 987 jugadores
- **División Automática**: Cuando se alcanza el límite
  - **Sala Alpha** (High Tier): 61.8% del pozo - Requiere Skin Level ≥ 4
  - **Sala Beta** (Low Tier): 38.2% del pozo - Acceso abierto

## 💰 Economía Dual

### Moneda Fuerte (USDT/USDC)
- Apuestas y premios en valor real
- Protocol Fee: 5%
- Pozo Neto: 95% para ganadores

### Moneda Blanda ($WICK)
- Token de utilidad off-chain *(Fase 5: On-chain)*
- **Minting**: 10 $WICK por cada 1 USDT perdido
- **Burning**: Compra de Lienzos, upgrades, marketplace fees
- **Seguro de Cenizas**: 61.8% refund en Permadeath

## 🚀 Instalación y Uso

### Requisitos Previos

- Node.js v20+
- npm o yarn

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd candle-runner-v1

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

### Ejecución

```bash
# Modo desarrollo (con auto-reload)
npm run dev

# Modo producción
npm start
```

### Acceso

- **Dashboard**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Game State**: http://localhost:3000/api/game/state
- **Rooms Info**: http://localhost:3000/api/rooms

## 📡 API WebSocket

### Eventos del Servidor → Cliente

```javascript
// Estado del juego
socket.on('GAME_STATE', (data) => {
  // data: { state, roundNumber, timeLeft, serverTime }
});

// Sincronización de tiempo
socket.on('SYNC_TIME', (data) => {
  // data: { phase, timeLeft, serverTime }
});
```

### Eventos del Cliente → Servidor

```javascript
// Realizar apuesta (Fase 4)
socket.emit('PLACE_BET', {
  amount: 10,
  direction: 'LONG' // o 'SHORT'
});
```

## 📊 Constantes Matemáticas

Todas las mecánicas del juego están basadas en la **Proporción Áurea (Φ = 1.618)** y la **Secuencia de Fibonacci**:

```javascript
GOLDEN_RATIO = 1.618
ROUND_DURATION = 30000ms
ROOM_MAX_CAPACITY = 987
SPLIT_RATIO_ALPHA = 0.618 (61.8%)
HOUSE_FEE = 0.05 (5%)
ASH_INSURANCE_RATIO = 0.618 (61.8%)
SKIN_LEVEL_REQ = [0, 2, 3, 5, 8, 13] // Fibonacci
```

## 🗺️ Roadmap de Desarrollo

- [x] **Fase 1: Skeleton** - Estructura base + Game Loop
- [ ] **Fase 2: Binance Integration** - Oráculo de precios
- [ ] **Fase 3: Phaser Basic** - Cliente con gráficos
- [ ] **Fase 4: Betting Logic** - Sistema de apuestas
- [ ] **Fase 5: Economy Rules** - Economía $WICK + Permadeath

## 🔒 Seguridad

- ✅ Validación de servidor (nunca confiar en el cliente)
- ✅ Lockdown estricto de apuestas
- 🔜 Rate limiting con Redis
- 🔜 Oráculo multi-fuente (Binance, Coinbase, Kraken)

## 📄 Licencia

ISC

---

**© 2025 Candle Runner Protocol**  
*Bienvenido a la arena.*
