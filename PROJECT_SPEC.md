📂 PROYECTO: CANDLE RUNNER - ESPECIFICACIÓN TÉCNICA MAESTRA
Rol de la IA: Eres un Ingeniero Full-Stack Senior experto en desarrollo de juegos en tiempo real, arquitecturas escalables y economía de tokens. Tu tarea es generar el código base para "Candle Runner" siguiendo estrictamente estas directrices.

1. STACK TECNOLÓGICO (Obligatorio)
Entorno: Node.js (v20+).

Lenguaje: TypeScript (recomendado para tipado estricto) o JavaScript ES6+.

Backend: Express.js + Socket.io (WebSockets).

Base de Datos en Memoria (Hot Data): Redis (para estado del juego, colas de mensajes y gestión de salas).

Base de Datos Persistente (Cold Data): PostgreSQL (o Supabase) para usuarios, balances y skins.

Frontend: HTML5 + Phaser 3 (Motor de juego) + TailwindCSS (UI Overlay).

API Externa: Binance WebSocket API (para precio BTC/USDT).

2. ARQUITECTURA DEL DIRECTORIO
Genera la estructura de carpetas de la siguiente manera:

Plaintext

/candle-runner
  /client (Frontend)
    /assets (sprites, sounds)
    /src
      /scenes
        - BootScene.js
        - MenuScene.js
        - GameScene.js (Lógica principal Phaser)
        - UIOverlay.js (React/HTML logic)
      - main.js
      - socketController.js
  /server (Backend)
    /config (redis, db connections)
    /controllers (gameLogic, economy)
    /models (User, Skin, Transaction)
    /services
      - binanceService.js (Oráculo)
      - roomManager.js (Mitosis Fibonacci)
      - gameLoop.js (El reloj de 30s)
    - server.js
  /shared
    - constants.js (Reglas matemáticas compartidas)
3. LÓGICA DEL MOTOR DE JUEGO (BACKEND)
3.1. Constantes Matemáticas
Define un archivo constants.js con estos valores inmutables:

JavaScript

export const GOLDEN_RATIO = 1.618;
export const ROUND_DURATION = 30000; // 30 segundos
export const PHASE_BET_TIME = 10000; // 10s
export const PHASE_LOCK_TIME = 15000; // 15s
export const PHASE_RESOLVE_TIME = 5000; // 5s

export const ROOM_MAX_CAPACITY = 987; // Fibonacci
export const SPLIT_RATIO_ALPHA = 0.618; // 61.8% del pozo
export const HOUSE_FEE = 0.05; // 5%

export const SKIN_LEVEL_REQ = [0, 2, 3, 5, 8, 13]; // Rondas para subir nivel
3.2. La Máquina de Estados (Game Loop)
Implementa un GameLoop en el servidor que corra independientemente de los usuarios.

Variable: gameState (enum: WAITING, BETTING, LOCKED, RESOLVING).

Sincronización: El servidor emite socket.emit('SYNC_TIME', { phase, timeLeft, serverTime }) cada segundo.

3.3. Gestión de Salas (Room Sharding)
El RoomManager debe monitorear connectedUsers en cada sala.

Lógica de Mitosis:

IF room.users >= 987:

PAUSE room entry.

CREATE room_alpha (High Tier) & room_beta (Low Tier).

MOVE usuarios con skinLevel >= 4 a Alpha.

MOVE resto a Beta.

SPLIT accumulatedPot usando SPLIT_RATIO_ALPHA.

4. SISTEMA ECONÓMICO (CRÍTICO)
4.1. Flujo de Apuesta (USDT - Simulado en BD)
Al recibir evento PLACE_BET:

Verificar saldo USDT en DB.

Deducir monto.

Añadir a currentRoundPool.

Marcar usuario como isActive: true.

4.2. Resolución de Ronda
Al finalizar el tiempo (t=30s):

Comparar startPrice vs endPrice.

Determinar ganadores (LONG vs SHORT).

Cálculo del Pozo:

GrossPool = Suma de apuestas.

NetPool = GrossPool * (1 - HOUSE_FEE).

Fee = GrossPool * HOUSE_FEE.

Distribución:

IF winners > 0: Repartir NetPool equitativamente entre ganadores.

IF winners == 0 OR Draw: Mover NetPool a nextRoundPot (Rollover).

4.3. Economía del Token $WICK (Off-Chain)
Implementar función processLosers(losersArray):

Por cada perdedor:

Calcular mintAmount = betAmount * 10 (Base rate).

Actualizar saldo $WICK en DB.

Mecánica Permadeath (Quema de Skin):

Identificar la Skin usada.

UPDATE skins SET is_burned = TRUE WHERE id = skinId.

Seguro de Cenizas:

Calcular investmentTotal (Costo lienzo + upgrades).

refundAmount = investmentTotal * 0.618.

Acreditar refundAmount en $WICK al usuario.

5. FRONTEND (PHASER 3)
5.1. Escena de Juego (GameScene)
WebSocket Listeners:

PRICE_UPDATE: Recibe precio BTC. Dibuja línea/vela en tiempo real.

GAME_STATE: Cambia UI (Verde -> Rojo -> Dorado).

RESULT: Muestra animación de Victoria o Caída al vacío.

Lógica de Gráfico:

No usar librerías de charts. Dibujar rectángulos y líneas usando this.add.graphics() de Phaser para que los personajes puedan colisionar con ellos (físicas Arcade).

UI Overlay:

HTML sobre el Canvas para los botones de "APOSTAR", "RETIRAR" y el "TIMER".

Debe ser responsive para móvil.

5.2. Editor de Píxeles (Canvas)
Crear una rejilla de 32x32 interactiva.

Output: Generar un Base64 o JSON Array de colores.

Guardar en DB como atributo de la Skin.

6. SEGURIDAD Y ANTI-CHEAT
Validación de Servidor: Nunca confíes en el cliente. Si el cliente envía "Gané", ignóralo. El servidor decide quién ganó basado en su propia data de precios.

Lockdown Estricto: Si llega una apuesta en el segundo 11 (Fase Lockdown), recházala en el backend aunque el frontend tenga lag.

Rate Limiting: Usa Redis para limitar la cantidad de apuestas por socket/IP.

7. PASOS PARA EL DESARROLLO (INSTRUCCIONES PARA LA IA)
Sigue este orden para generar el código:

Fase 1: Skeleton. Crea el servidor Express básico y la conexión WebSocket. Configura el GameLoop de 30 segundos que imprima en consola los cambios de estado.

Fase 2: Binance Integration. Conecta el WebSocket de Binance y haz que el servidor transmita el precio a los clientes conectados.

Fase 3: Phaser Basic. Crea el cliente que dibuje una caja (vela) que sube o baja según el dato del servidor.

Fase 4: Betting Logic. Implementa la base de datos simulada (JSON o SQLite por ahora) para manejar saldos y apuestas.

Fase 5: Economy Rules. Implementa la lógica de fees, reparto de premios y minado de $WICK.