// 📐 CONSTANTES MATEMÁTICAS INMUTABLES - CANDLE RUNNER PROTOCOL
// Basadas en la Proporción Áurea (Φ = 1.618) y Secuencia de Fibonacci

export const GOLDEN_RATIO = 1.618;

// ⏱️ TEMPORIZACIÓN DEL GAME LOOP (POR BUS, NO GLOBAL)
export const ROUND_DURATION = 30000; // 30 segundos por ronda
export const PHASE_BET_TIME = 10000; // 10s - Fase de Posicionamiento
export const PHASE_LOCK_TIME = 15000; // 15s - Fase de Lockdown
export const PHASE_RESOLVE_TIME = 5000; // 5s - Fase de Liquidación

// 🚌 MODELO "BUS CON SILLAS" - CAPACIDADES FIBONACCI
export const FIBONACCI_CAPACITIES = [2, 3, 5, 8, 13, 21, 34, 55, 89, 144]; // Secuencia permitida
export const DEFAULT_CAPACITY = 5; // Capacidad inicial por defecto
export const FILL_SPEED_THRESHOLD = 10000; // 10s - Si se llena más rápido, trigger Mitosis

// 🏛️ GESTIÓN DE SALAS (FIBONACCI SHARDING - LEGACY)
export const ROOM_MAX_CAPACITY = 987; // Número de Fibonacci para mitosis (DEPRECADO en modelo Bus)
export const SPLIT_RATIO_ALPHA = 0.618; // 61.8% del pozo va a sala Alpha
export const SPLIT_RATIO_BETA = 0.382; // 38.2% del pozo va a sala Beta

// 💰 ECONOMÍA
export const HOUSE_FEE = 0.05; // 5% Protocol Fee
export const ASH_INSURANCE_RATIO = 0.618; // 61.8% refund en Permadeath

// 🎨 SISTEMA DE SKINS (NIVELES)
export const SKIN_LEVEL_REQ = [0, 2, 3, 5, 8, 13]; // Rondas sobrevividas para subir nivel (Fibonacci)

// 🛡️ SISTEMA DE INTEGRIDAD (DURABILIDAD)
export const MAX_INTEGRITY_BASE = 100; // Integridad inicial de Skins NFT
export const INTEGRITY_LOSS_PER_DEFEAT = 10; // Daño por derrota
export const REPAIR_COST_BASE = 50; // $WICK base para reparación
export const REPAIR_COST_MULTIPLIER = 1.618; // Multiplicador Fibonacci por nivel

// 🤖 PROTOCOL DROID (DEFAULT SKIN)
export const DEFAULT_SKIN = {
  name: 'Protocol Droid',
  integrity: Infinity, // Nunca se quema
  level: 0,
  isDefault: true,
  allowedRooms: ['TRAINING', 'SATOSHI'],
  MAX_BET: 0.10 // Límite de apuesta para evitar farming masivo
};

// 🏛️ REGLAS DE ACCESO A SALAS (MODELO "BUS" - PRECIO FIJO + CAPACIDAD)
export const ROOM_ACCESS_RULES = {
  TRAINING: { allowDefault: true, minLevel: 0, ticketPrice: 0, defaultCapacity: 5 },        // Gratis (Practice Mode)
  SATOSHI: { allowDefault: true, minLevel: 0, ticketPrice: 0.10, defaultCapacity: 5 },     // $0.10 Ticket
  TRADER: { allowDefault: false, minLevel: 1, ticketPrice: 1.00, defaultCapacity: 8 },     // $1.00 Ticket
  WHALE: { allowDefault: false, minLevel: 4, ticketPrice: 10.00, defaultCapacity: 13 }      // $10.00 Ticket
};

// 🎮 ESTADOS DEL BUS (Reemplazan GAME_STATES para cada sala)
export const BUS_STATES = {
  BOARDING: 'BOARDING',        // Esperando pasajeros
  LOCKED: 'LOCKED',            // Bus lleno, puertas cerradas
  IN_PROGRESS: 'IN_PROGRESS',  // Viaje en curso (vela de 30s)
  FINISHED: 'FINISHED'         // Llegada, distribuyendo premios
};

// 🔥 ECONOMÍA $WICK
export const WICK_MINT_RATE_BASE = 10; // 10 $WICK por cada 1 USDT perdido
export const MARKETPLACE_FEE = 0.05; // 5% fee en transacciones secundarias

// 🎮 ESTADOS DEL JUEGO
export const GAME_STATES = {
  WAITING: 'WAITING',
  BETTING: 'BETTING',
  LOCKED: 'LOCKED',
  RESOLVING: 'RESOLVING'
};

// 🎯 DIRECCIONES DE APUESTA
export const BET_DIRECTIONS = {
  LONG: 'LONG',
  SHORT: 'SHORT'
};
