# 📝 ACTUALIZACIÓN DE DOCUMENTACIÓN: Sistema de Integridad

**Fecha:** 29 de Noviembre de 2025  
**Versión:** 3.1  
**Estado:** ✅ COMPLETADO

---

## 🎯 Objetivo del Cambio

Eliminar la mecánica de **"Permadeath Instantánea"** (muerte en una sola derrota) y reemplazarla por un **Sistema de Integridad y Reparación** más sostenible y menos frustrante para los jugadores.

---

## ✅ Cambios Implementados

### 1. **Constantes Técnicas** (`shared/constants.js`)

#### **Nuevas Constantes Añadidas:**

```javascript
// 🛡️ SISTEMA DE INTEGRIDAD (DURABILIDAD)
export const MAX_INTEGRITY_BASE = 3; // Integridad inicial de Skins NFT
export const INTEGRITY_LOSS_PER_DEFEAT = 1; // Daño por derrota
export const REPAIR_COST_BASE = 50; // $WICK base para reparación
export const REPAIR_COST_MULTIPLIER = 1.618; // Multiplicador Fibonacci por nivel

// 🤖 PROTOCOL DROID (DEFAULT SKIN)
export const DEFAULT_SKIN = {
  name: 'Protocol Droid',
  integrity: Infinity, // Nunca se quema
  level: 0,
  isDefault: true,
  allowedRooms: ['TRAINING', 'SATOSHI']
};

// 🏛️ REGLAS DE ACCESO A SALAS
export const ROOM_ACCESS_RULES = {
  TRAINING: { allowDefault: true, minLevel: 0, minBet: 0 },
  SATOSHI: { allowDefault: true, minLevel: 0, minBet: 0.10 },
  TRADER: { allowDefault: false, minLevel: 1, minBet: 1.00 },
  WHALE: { allowDefault: false, minLevel: 4, minBet: 10.00 }
};
```

---

### 2. **White Paper** (`WHITE PAPER: CANDLE RUNNER.md`)

#### **Sección 5: Ecosistema de Activos Vivos - REESCRITA COMPLETAMENTE**

**Antes:**
- Muerte instantánea al perder una ronda
- Sin opción de recuperación
- Frustración alta para jugadores

**Ahora:**

#### **A. Protocol Droid (Default Skin Gratuita)**

**Características:**
- ✅ **Gratis** con cada cuenta
- ✅ **Integridad Infinita** (Nunca se quema)
- ✅ **Acceso a Salas:** Training (Gratis) y Satoshi ($0.10)
- ❌ **Restricción:** No puede entrar a Trader ($1.00+) ni Whale ($10.00+)
- 🎯 **Objetivo:** Permitir jugar siempre, incluso en bancarrota ("Farming Mode")

**Beneficio Estratégico:**
- Garantiza que ningún jugador quede completamente excluido
- Fomenta la retención a largo plazo
- Permite reconstruir capital mediante juego gratuito

#### **B. Sistema de Integridad (Durabilidad)**

**Mecánica:**
- Skins NFT tienen **Integridad** (HP): Estándar inicial **3/3**
- Al perder una ronda: **-1 Integridad**
- **Permadeath Real:** Solo cuando Integridad llega a **0**

**Ejemplo de Ciclo de Vida:**
```
Ronda 1: Derrota → 3/3 → 2/3 ⚠️
Ronda 2: Victoria → 2/3 (sin cambio)
Ronda 3: Derrota → 2/3 → 1/3 ⚠️⚠️
Ronda 4: Derrota → 1/3 → 0/3 💀 QUEMADA
```

#### **C. Mecánica de Reparación (Nuevo Token Sink)**

**Funcionalidad:**
- Gastar **$WICK** para restaurar Integridad al 100%
- Costo escala con nivel de Skin (Fibonacci)

**Fórmula de Costo:**
```
Costo = 50 $WICK × (1.618 ^ nivel)

Ejemplos:
- Nivel 1: 80.9 $WICK
- Nivel 2: 130.9 $WICK
- Nivel 3: 211.8 $WICK
- Nivel 4: 342.7 $WICK
```

**Impacto Económico:**
- ✅ Genera **quema constante** de $WICK
- ✅ Aumenta sostenibilidad del protocolo
- ✅ Crea decisiones estratégicas para jugadores

#### **D. Acceso Jerárquico Actualizado**

| Sala | Apuesta Mín | Protocol Droid | Skin NFT Nivel 0 | Skin NFT Nivel 1+ | Skin NFT Nivel 4+ |
|------|-------------|----------------|------------------|-------------------|-------------------|
| **Training** | Gratis | ✅ | ✅ | ✅ | ✅ |
| **Satoshi** | $0.10 | ✅ | ✅ | ✅ | ✅ |
| **Trader** | $1.00 | ❌ | ❌ | ✅ | ✅ |
| **Whale** | $10.00 | ❌ | ❌ | ❌ | ✅ |

---

### 3. **Project Spec** (`PROJECT_SPEC.md`)

#### **Sección 3.1: Constantes Matemáticas - ACTUALIZADA**

Añadidas todas las constantes del sistema de Integridad (igual que en `constants.js`).

#### **Sección 4.3: Economía del Token $WICK - REESCRITA**

**Nuevas Subsecciones:**

**A. Sistema de Integridad (Durabilidad de Skins)**

Lógica de `processLosers()`:
```javascript
IF skin.isDefault === true:
    LOG "Protocol Droid usado - Sin daño"
    
ELSE IF skin.isDefault === false:
    skin.integrity -= INTEGRITY_LOSS_PER_DEFEAT  // -1
    
    IF skin.integrity <= 0:
        burnSkin(skin.id)
        issueAshes(userId, skin)
    ELSE:
        UPDATE skins SET integrity = skin.integrity
        NOTIFY player: "⚠️ Skin Dañada: " + integrity + "/" + maxIntegrity
```

**B. Protocol Droid (Default Skin)**

Schema completo del Protocol Droid con todas sus propiedades.

**C. Mecánica de Reparación (Token Sink)**

Función `repairSkin(userId, skinId)` con:
- Cálculo de costo
- Verificación de saldo
- Quema de tokens
- Restauración de Integridad

**D. Seguro de Cenizas (Actualizado)**

Ahora incluye reparaciones en el cálculo de `investmentTotal`.

**E. Modelo de Datos (Skin Schema)**

```typescript
interface Skin {
  id: string;
  userId: string;
  name: string;
  level: number;
  integrity: number;      // Actual (ej. 2)
  maxIntegrity: number;   // Máximo (ej. 3)
  isDefault: boolean;     // True si es Protocol Droid
  isBurned: boolean;
  pixelData: string;
  totalInvestment: number; // Incluye reparaciones
  createdAt: Date;
  burnedAt: Date | null;
}
```

**F. Reglas de Acceso a Salas**

Función `canUserJoin()` con validación de:
- Tipo de Skin (Default vs NFT)
- Nivel de Skin
- Saldo del usuario

---

## 📊 Comparación: Antes vs Ahora

### **Sistema Anterior (Permadeath Instantánea)**

| Aspecto | Descripción |
|---------|-------------|
| **Frustración** | ❌ Alta - Pérdida total en una derrota |
| **Retención** | ❌ Baja - Jugadores sin capital quedan excluidos |
| **Token Sink** | ⚠️ Limitado - Solo compra de Lienzos |
| **Accesibilidad** | ❌ Baja - Barrera de entrada alta |

### **Sistema Nuevo (Integridad y Reparación)**

| Aspecto | Descripción |
|---------|-------------|
| **Frustración** | ✅ Baja - 3 oportunidades antes de Permadeath |
| **Retención** | ✅ Alta - Protocol Droid garantiza acceso perpetuo |
| **Token Sink** | ✅ Robusto - Reparaciones + Lienzos + Marketplace |
| **Accesibilidad** | ✅ Alta - Juego gratuito siempre disponible |

---

## 🎮 Impacto en la Experiencia del Jugador

### **Escenario 1: Jugador Nuevo (Sin Capital)**

**Antes:**
1. Pierde su primera Skin NFT
2. Queda sin activos
3. No puede jugar más → **Abandona el juego**

**Ahora:**
1. Pierde su Skin NFT
2. Usa Protocol Droid en Sala Satoshi ($0.10)
3. Acumula $WICK mediante "Proof of Loss"
4. Compra nuevo Lienzo → **Continúa jugando**

### **Escenario 2: Jugador Experimentado (Skin Nivel 4)**

**Antes:**
1. Una derrota = Pérdida de Skin valiosa
2. Frustración extrema
3. Posible abandono del juego

**Ahora:**
1. Primera derrota: 3/3 → 2/3 ⚠️
2. **Decisión Estratégica:**
   - Opción A: Reparar (342.7 $WICK) → Continuar con Skin
   - Opción B: Arriesgar → Jugar con 2/3 Integridad
   - Opción C: Vender en Marketplace → Recuperar inversión
3. Mayor control y opciones → **Mejor experiencia**

---

## 💰 Impacto Económico

### **Nuevos Sumideros de $WICK**

1. **Reparaciones** (Principal):
   - Quema constante de tokens
   - Escala con nivel (Fibonacci)
   - Incentiva juego cuidadoso

2. **Lienzos** (Existente):
   - Costo inicial de Skins

3. **Marketplace** (Existente):
   - 5% fee en transacciones

4. **Energía** (Futuro):
   - Para juego F2P con Protocol Droid

### **Proyección de Deflación**

**Antes:**
- Quema solo al morir Skin (evento raro en jugadores experimentados)

**Ahora:**
- Quema continua por reparaciones (evento frecuente)
- Mayor deflación sostenible a largo plazo

---

## 🔧 Implementación Técnica Pendiente

### **Fase 4: Betting Logic**

Implementar:
1. Modelo de datos `Skin` en base de datos
2. Función `processLosers()` con lógica de Integridad
3. Función `repairSkin()` con quema de tokens
4. Validación `canUserJoin()` en RoomManager

### **Fase 5: Economy Rules**

Implementar:
1. Sistema de $WICK Off-Chain
2. "Proof of Loss" (Minting)
3. Reparaciones (Burning)
4. Seguro de Cenizas actualizado

---

## ✅ Archivos Actualizados

```
✅ shared/constants.js              - Nuevas constantes añadidas
✅ WHITE PAPER: CANDLE RUNNER.md    - Sección 5 reescrita completamente
✅ PROJECT_SPEC.md                  - Secciones 3.1 y 4.3 actualizadas
✅ ACTUALIZACION_INTEGRIDAD.md      - Este documento
```

---

## 📝 Conclusión

La actualización del sistema de **Permadeath Instantánea** a **Sistema de Integridad y Reparación** representa una mejora significativa en:

1. ✅ **Experiencia del Jugador** - Menos frustración, más control
2. ✅ **Retención** - Protocol Droid garantiza acceso perpetuo
3. ✅ **Economía** - Reparaciones como sumidero deflacionario robusto
4. ✅ **Sostenibilidad** - Modelo económico más equilibrado

El **Protocol Droid** elimina la barrera de entrada total, mientras que el **Sistema de Integridad** mantiene la tensión y el riesgo que hacen único a Candle Runner.

**Estado:** ✅ **DOCUMENTACIÓN ACTUALIZADA - LISTO PARA IMPLEMENTACIÓN**

---

**Actualizado por:** Candle Runner Team  
**Fecha:** 29 de Noviembre de 2025  
**Versión:** 3.1
