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
