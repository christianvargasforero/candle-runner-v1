// 📐 CONSTANTES MATEMÁTICAS INMUTABLES - CANDLE RUNNER PROTOCOL
// Basadas en la Proporción Áurea (Φ = 1.618) y Secuencia de Fibonacci

export const GOLDEN_RATIO = 1.618;

// ⏱️ TEMPORIZACIÓN DEL GAME LOOP
export const ROUND_DURATION = 30000; // 30 segundos por ronda
export const PHASE_BET_TIME = 10000; // 10s - Fase de Posicionamiento
export const PHASE_LOCK_TIME = 15000; // 15s - Fase de Lockdown
export const PHASE_RESOLVE_TIME = 5000; // 5s - Fase de Liquidación

// 🏛️ GESTIÓN DE SALAS (FIBONACCI SHARDING)
export const ROOM_MAX_CAPACITY = 987; // Número de Fibonacci para mitosis
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

// 🏛️ REGLAS DE ACCESO A SALAS
export const ROOM_ACCESS_RULES = {
  TRAINING: { allowDefault: true, minLevel: 0, minBet: 0 },
  SATOSHI: { allowDefault: true, minLevel: 0, minBet: 0.10 },
  TRADER: { allowDefault: false, minLevel: 1, minBet: 1.00 },
  WHALE: { allowDefault: false, minLevel: 4, minBet: 10.00 }
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
