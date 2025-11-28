# 📘 WHITE PAPER: CANDLE RUNNER PROTOCOL

**Survival Trading & Decentralized Creative Economy (DCE)**  
**Versión 3.1 | Edición de Sistema de Integridad**  
**Noviembre 2025**

---

## ⚠️ AVISO LEGAL Y DESCARGO DE RESPONSABILIDAD (EXPANDIDO)

Este documento ("Whitepaper") es un compendio técnico y descriptivo del Protocolo Candle Runner. Su propósito es puramente informativo. No constituye un prospecto, una oferta de valores, una solicitud de inversión, ni asesoramiento financiero en ninguna jurisdicción. El token $WICK, en su fase actual Off-Chain, es un activo de utilidad virtual sin derechos económicos sobre la empresa matriz. La participación en las modalidades de apuesta con stablecoins (USDT/USDC) implica un alto riesgo de pérdida de capital y está destinada a usuarios en jurisdicciones donde el "Juego de Habilidad" (Skill-based Gaming) está regulado o permitido. El equipo desarrollador se reserva el derecho de modificar este documento sin previo aviso.

---

## 1. MISIÓN Y VISIÓN

### 1.1. El Problema del Mercado

El sector Play-to-Earn (P2E) ha fracasado globalmente por basarse en modelos Ponzi de inflación insostenible. Por otro lado, el trading de criptomonedas minorista sigue siendo una actividad técnica, solitaria y con barreras de entrada psicológicas altas.

### 1.2. La Tesis de Candle Runner

Creemos que la próxima frontera no es "jugar para ganar", sino "competir para sobrevivir". Candle Runner democratiza la especulación financiera de alta frecuencia convirtiéndola en una experiencia social, visual y brutalmente justa, sustentada por una economía creativa robusta.

### 1.3. Visión a 5 Años

Convertirse en el estándar global del "Arcade Financiero", evolucionando de una plataforma web a una Organización Autónoma Descentralizada (DAO) donde la comunidad posea la infraestructura y gobierne los parámetros económicos y creativos del juego.

---

## 2. ARQUITECTURA DEL JUEGO: "SURVIVAL TRADING"

### 2.1. El Motor de Decisiones Síncrono

El núcleo es un ciclo de juego de 30 segundos, sincronizado globalmente mediante servidores WebSocket distribuidos.

**Fase 1: Posicionamiento (0s - 10s)**  
El usuario analiza el mercado y compromete su capital (USDT) y su activo (Skin) en una dirección (LONG/SHORT).

**Fase 2: Lockdown & Visualización (10s - 25s)**  
Cierre criptográfico de entradas. El motor renderiza la acción del precio de Bitcoin como terreno procedural en tiempo real.

**Fase 3: Liquidación y Decisión (25s - 30s)**  
El oráculo de precios determina el resultado. Los perdedores sufren daño a su Skin. Los ganadores reciben su participación del Pozo Neto y enfrentan la "Decisión del Superviviente" (Retirar vs. Interés Compuesto).

### 2.2. Infraestructura de Oráculo de Precios (Fairness)

Para evitar la manipulación ("Wick Fishing"), el precio final no proviene de una sola fuente.

**Fuentes:** Binance, Coinbase, Kraken.  
**Algoritmo:** Se calcula un promedio ponderado en tiempo real de los 3 exchanges, descartando valores atípicos (outliers) extremos.  
**Seguridad:** La fase de "Lockdown" de 15 segundos neutraliza la ventaja de bots de arbitraje de latencia.

---

## 3. ESTRUCTURA ECONÓMICA: EL MODELO DUAL

El protocolo opera con una separación estricta entre la economía de valor real (Solvencia) y la economía de utilidad (Retención).

### 3.1. Moneda Fuerte (USDT/USDC) - El Motor de Solvencia

**Custodia (Fase 1):** Bóveda Centralizada con Dashboard de Transparencia de Reservas en tiempo real.

**Mecánica del Pozo (The Rake):**
- **Pozo Bruto** = Suma de entradas.
- **Protocol Fee** = 5% (Ingreso de la Plataforma).
- **Pozo Neto** = 95% (Propiedad exclusiva de los ganadores).

**Bote Acumulado (Rollover):** En caso de empate técnico o eliminación total, el Pozo Neto se transfiere a la siguiente ronda, actuando como catalizador viral.

### 3.2. Moneda Blanda ($WICK) - El Motor de Utilidad

WICK es el combustible de la economía creativa. En la Fase 1, es un token Off-Chain.

**Suministro:** Elástico con mecanismos deflacionarios agresivos.

**Fuentes de Emisión (Minting):**
- **Proof of Loss:** Recompensa de consuelo por pérdidas en USDT, con curva de emisión decreciente para controlar la inflación a largo plazo.
- **Activity Rewards:** Incentivos por rachas de juego y referidos.

**Sumideros de Quema (Burning):**
- **Adquisición de "Lienzos" (Canvas):** Costo inicial para crear Skins NFT.
- **Reparación de Skins:** Restaurar Integridad de Skins dañadas (Nuevo sumidero principal).
- **Tarifas de listado en el Marketplace:** 5% de transacciones secundarias.
- **Compra de Energía:** Para juego F2P con Protocol Droid.

**Suelo de Valor:** El 20% de los ingresos del Protocol Fee (USDT) se destina a un Fondo de Tesorería para respaldar el valor del ecosistema $WICK.

---

## 4. GOBERNANZA ALGORÍTMICA Y ESCALABILIDAD

Para gestionar el crecimiento masivo, el sistema utiliza leyes matemáticas universales en lugar de decisiones humanas arbitrarias.

### 4.1. Mitosis de Salas (Escalabilidad Fractal)

Las salas de juego se auto-regulan utilizando la Secuencia de Fibonacci.

**Critical Mass:** 987 Jugadores.  
**Evento:** División automática de la sala en dos nuevas instancias.  
**Proporción Áurea (Φ):** El Pozo se divide en 61.8% (Sala Alpha, alta competencia) y 38.2% (Sala Beta, entrada accesible).

### 4.2. Curvas de Recompensa y Costos

Todos los multiplicadores de rachas y los precios base del Marketplace siguen progresiones de Fibonacci, asegurando que el costo de adquisición de estatus aumente proporcionalmente al valor de la red.

---

## 5. ECOSISTEMA DE ACTIVOS VIVOS: SISTEMA DE INTEGRIDAD

Transformamos los NFTs estáticos en activos con ciclo de vida, riesgo y rendimiento, pero eliminamos la "Muerte Súbita" instantánea en favor de un sistema de durabilidad y reparación.

### 5.1. El "Protocol Droid" (Default Skin Gratuita)

**Concepto:** Todo jugador tiene un avatar por defecto gratuito que nunca se destruye.

**Características:**
- **Costo:** Gratis (Incluido con cada cuenta).
- **Integridad:** Infinita (Nunca se quema).
- **Limitación de Acceso:** Solo puede entrar a Salas "Training" (Gratis) y "Satoshi" ($0.10 min).
- **Restricción:** No puede acceder a Salas "Trader" ($1.00+) ni "Whale" ($10.00+).
- **Objetivo:** Permitir jugar siempre, incluso en bancarrota total ("Farming Mode").

**Beneficio Estratégico:**  
El Protocol Droid garantiza que ningún jugador quede completamente excluido del juego, fomentando la retención y permitiendo que los usuarios reconstruyan su capital mediante juego gratuito.

### 5.2. Ciclo de Vida de las Skins NFT

**Creación (Mint):**  
El usuario quema $WICK para adquirir un "Lienzo en Blanco" y diseña su avatar (Pixel Art de 32x32).

**Evolución (Level Up):**  
La Skin acumula experiencia (LUMEN) sobreviviendo rondas. Subir de nivel requiere pagar un "Costo de Mejora" en $WICK (escala con Fibonacci).

**Sistema de Integridad (Durabilidad):**  
Las Skins NFT tienen una barra de **Integridad** (HP) que representa su durabilidad.

- **Integridad Inicial:** 3/3 (Estándar para todas las Skins NFT).
- **Daño por Derrota:** Al perder una ronda, la Skin pierde **-1 Integridad**.
- **Permadeath Real:** Si la Integridad llega a **0**, la Skin se quema definitivamente (Burn) y otorga el "Seguro de Cenizas" (Reembolso del 61.8% del $WICK invertido).

**Ejemplo de Ciclo de Vida:**
```
Ronda 1: Derrota → Integridad: 3/3 → 2/3 ⚠️
Ronda 2: Victoria → Integridad: 2/3 (sin cambio)
Ronda 3: Derrota → Integridad: 2/3 → 1/3 ⚠️⚠️
Ronda 4: Derrota → Integridad: 1/3 → 0/3 💀 QUEMADA
```

### 5.3. Mecánica de Reparación (Nuevo Token Sink)

Los jugadores pueden gastar **$WICK** para restaurar la Integridad de su Skin al 100% **antes** de que se rompa.

**Costo de Reparación:**  
Escala con el nivel de la Skin usando la Proporción Áurea:

```
Costo = REPAIR_COST_BASE × (REPAIR_COST_MULTIPLIER ^ nivel)
Costo = 50 $WICK × (1.618 ^ nivel)

Ejemplos:
- Nivel 1: 50 × 1.618^1 = 80.9 $WICK
- Nivel 2: 50 × 1.618^2 = 130.9 $WICK
- Nivel 3: 50 × 1.618^3 = 211.8 $WICK
- Nivel 4: 50 × 1.618^4 = 342.7 $WICK
```

**Impacto Económico:**  
Este sistema genera una **quema constante de tokens $WICK**, aumentando la sostenibilidad económica del protocolo. Los jugadores con Skins de alto nivel deben decidir estratégicamente entre:
1. **Reparar:** Gastar $WICK para mantener su Skin valiosa.
2. **Arriesgar:** Continuar jugando con baja Integridad.
3. **Vender:** Transferir la Skin en el Marketplace antes de que se rompa.

### 5.4. Economía Deflacionaria "Irrompible"

El sistema de "Seguro de Cenizas" garantiza la deflación perpetua.

**Reembolso:**  
Al morir una Skin (Integridad = 0), el usuario recibe el **61.8%** del total de $WICK invertido en ella (Costo del Lienzo + Upgrades + Reparaciones).

**Resultado:**  
El **38.2%** de los tokens invertidos se eliminan permanentemente de la circulación en cada ciclo de vida, aumentando la escasez a largo plazo.

**Ejemplo:**
```
Inversión Total en Skin: 1000 $WICK
- Costo Lienzo: 200 $WICK
- Upgrades (Nivel 1→4): 500 $WICK
- Reparaciones: 300 $WICK

Al Quemarse:
- Reembolso (Cenizas): 618 $WICK (61.8%)
- Quemado Permanente: 382 $WICK (38.2%) 🔥
```

### 5.5. Acceso Jerárquico (Proof of Skin)

El acceso a las salas de mayor liquidez está restringido criptográficamente según el tipo y nivel de Skin:

| Sala | Apuesta Mín | Protocol Droid | Skin NFT Nivel 0 | Skin NFT Nivel 1+ | Skin NFT Nivel 4+ |
|------|-------------|----------------|------------------|-------------------|-------------------|
| **Training** | Gratis | ✅ | ✅ | ✅ | ✅ |
| **Satoshi** | $0.10 | ✅ | ✅ | ✅ | ✅ |
| **Trader** | $1.00 | ❌ | ❌ | ✅ | ✅ |
| **Whale** | $10.00 | ❌ | ❌ | ❌ | ✅ |

**Beneficio:**  
Esto crea un mercado secundario robusto para "Skins Veteranas" de alto nivel, ya que son el único acceso a las salas de mayor liquidez y premios.

---

## 6. HOJA DE RUTA ESTRATÉGICA (ROADMAP DETALLADO)

**Q1 2025: FASE GÉNESIS (Infraestructura)**
- Desarrollo del Motor de Juego Síncrono (Node.js/Redis).
- Implementación del Oráculo de Precios Agregado (Binance + Coinbase + Kraken).
- Lanzamiento de la Web App en Alpha Cerrada (Testnet).
- Auditoría de Seguridad del Backend.

**Q2 2025: FASE DE MERCADO (Economía Real Off-Chain)**
- Integración de Pasarela de Pagos Cripto (Depósitos USDT).
- Lanzamiento de Salas Tier 1 (Satoshi) y Tier 2 (Trader).
- Implementación del Token $WICK Off-Chain y el sistema "Proof of Loss".
- Implementación del Sistema de Integridad y Reparación.
- Beta Pública y Campaña de Adquisición de Usuarios.

**Q3 2025: FASE CREATIVA (UGC & Marketplace)**
- Lanzamiento del "Pixel Studio" (Editor in-game).
- Apertura del Marketplace P2P de Skins.
- Implementación completa del Sistema de Integridad y niveles de Skin.
- Primer Torneo Global "High Roller".

**Q4 2025 - Q1 2026: FASE DE EVOLUCIÓN (On-Chain & DAO)**
- Generación del Token $WICK en Blockchain (TGE en Solana/Base).
- Airdrop retroactivo a usuarios de la Fase Off-Chain.
- Lanzamiento del mecanismo de "Buyback & Burn" descentralizado.
- Inicio de la transición hacia una gobernanza DAO comunitaria.

---

## 7. MODELO DE NEGOCIO Y SOSTENIBILIDAD

El protocolo genera ingresos a través de flujos de caja operativos transparentes, no mediante la venta de tokens.

| Flujo de Ingreso | Descripción | Destino del Fondo |
|------------------|-------------|-------------------|
| **Protocol Fee (Game Rake)** | 5% del volumen total de apuestas en USDT. | 80% Operaciones/Beneficio, 20% Tesorería $WICK. |
| **Marketplace Fee** | 5% de todas las transacciones secundarias de Skins. | 100% Quema de $WICK (Deflación). |
| **Venta de Energía/Assets** | Ingresos directos por micro-transacciones. | 100% Operaciones. |
| **Reparaciones de Skins** | Gasto de $WICK para restaurar Integridad. | 100% Quema de $WICK (Deflación). |

---

## 8. EQUIPO Y ASESORES (TEAM)

(Esta sección se completará con los perfiles reales del equipo fundador, CTO, asesores económicos y partners tecnológicos, destacando su experiencia previa en gaming, fintech y blockchain para generar confianza institucional.)

---

## 9. CONCLUSIÓN

Candle Runner no es solo un juego; es una infraestructura financiera gamificada diseñada para resistir el paso del tiempo. Al alinear los incentivos de los jugadores, los creadores y el protocolo bajo un modelo matemático riguroso, estamos construyendo el primer deporte electrónico financiero verdaderamente sostenible.

El nuevo **Sistema de Integridad** elimina la frustración de la "Muerte Súbita" mientras mantiene la tensión y el riesgo que hacen único a Candle Runner. El **Protocol Droid** garantiza acceso perpetuo, y el sistema de **Reparación** crea un sumidero deflacionario sostenible para $WICK.

**Bienvenido a la arena.**

---

© 2025 Candle Runner Protocol. Todos los derechos reservados.