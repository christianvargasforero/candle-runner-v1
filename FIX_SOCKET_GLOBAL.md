# 🔧 FIX: Socket Global Compartido

**Fecha:** 2025-11-29  
**Problema:** Error "Debes unirte a una sala primero" al intentar apostar  
**Causa Raíz:** Cada escena de Phaser creaba su propia conexión de socket

---

## 🐛 PROBLEMA IDENTIFICADO

### Síntoma
Cuando el usuario intentaba hacer una apuesta (LONG/SHORT), recibía el error:
```
❌ [ERROR] {message: 'Debes unirte a una sala primero'}
```

A pesar de que los logs mostraban:
```
✅ [MENU] Unido a sala: TRAINING | Ticket: $0
```

### Causa Raíz

**Cada escena de Phaser creaba su propio socket:**

1. `MenuScene` creaba un socket: `this.socket = io()`
2. Ese socket se unía a la sala con `JOIN_ROOM`
3. El servidor registraba: `Socket ABC123 → room_training`

4. Luego se cambiaba a `GameScene` y `UIScene`
5. **Cada una creaba un NUEVO socket**: `this.socket = io()`
6. Nuevos sockets: `XYZ789` y `DEF456`

7. Cuando `UIScene` enviaba `PLACE_BET`:
   - Lo enviaba con el socket `DEF456`
   - Pero ese socket NUNCA se unió a ninguna sala
   - Por eso el servidor decía "Debes unirte a una sala primero"

**Diagrama del problema:**
```
MenuScene (Socket A) → JOIN_ROOM ✅
  ↓ (change scene)
GameScene (Socket B nuevo) → ❌ No está en sala
UIScene   (Socket C nuevo) → PLACE_BET ❌ "Debes unirte a sala"
```

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Concepto
Crear **UN SOLO socket global** que se comparte entre **TODAS** las escenas de Phaser.

### Cambios Realizados

#### 1. `client/src/main.js` - Socket Global
```javascript
// Crear socket global ANTES de inicializar Phaser
const globalSocket = io();
window.globalSocket = globalSocket;
window.socket = globalSocket; // Alias para fácil acceso

globalSocket.on('connect', () => {
    console.log(`🟢 [SOCKET GLOBAL] Conectado: ${globalSocket.id}`);
});
```

#### 2. `MenuScene.js` - Usar Socket Global
**ANTES:**
```javascript
this.socket = io(); // ❌ Creaba nuevo socket
```

**AHORA:**
```javascript
this.socket = window.globalSocket; // ✅ Reutiliza socket global
```

**Cambios adicionales:**
- Verifica si el socket ya está conectado (`socket.connected`)
- NO desconecta el socket al salir (es compartido)
- Solo remueve listeners específicos con `socket.off()`

#### 3. `GameScene.js` - Usar Socket Global
**ANTES:**
```javascript
this.socket = io(); // ❌ Creaba nuevo socket
```

**AHORA:**
```javascript
this.socket = window.globalSocket; // ✅ Reutiliza socket global
```

#### 4. `UIScene.js` - Usar Socket Global
**ANTES:**
```javascript
this.socket = io(); // ❌ Creaba nuevo socket
this.socket.disconnect(); // En WITHDRAW_SUCCESS
```

**AHORA:**
```javascript
this.socket = window.globalSocket; // ✅ Reutiliza socket global
// ✅ NO desconecta el socket compartido
```

---

## 🎯 RESULTADO

Ahora todas las escenas usan **EL MISMO socket** con **EL MISMO socketId**:

```
MAIN crea Socket Global (ID: ABC123)
  ↓
MenuScene (usa ABC123) → JOIN_ROOM ✅
  ↓ (change scene)
GameScene (usa ABC123) → Mantiene sala ✅
UIScene   (usa ABC123) → PLACE_BET ✅ Funciona!
```

### Ventajas

✅ **Consistencia de Estado:** El usuario mantiene su sala al cambiar de escena  
✅ **Una Sola Conexión:** Menos overhead de red  
✅ **Sincronización:** Todos los listeners reciben los mismos eventos  
✅ **Debugging Fácil:** Solo un socketId para rastrear

---

## 🧪 TESTING

### Verificación Manual
1. Abrir el juego en el navegador
2. Abrir la consola del navegador
3. Verificar que solo se crea UN socket:
   ```
   🔌 [MAIN] Creando socket global...
   🟢 [SOCKET GLOBAL] Conectado: ABC123
   ```

4. En MenuScene, seleccionar una sala:
   ```
   ✅ [MENU] Unido a sala: SATOSHI | Ticket: $0.1
   ```

5. Al iniciar el juego, verificar que el socketId es el mismo
6. Hacer una apuesta LONG o SHORT
7. **Debe funcionar sin errores** ✅

### Comandos de Testing
```javascript
// En la consola del navegador:
console.log('Socket ID:', window.globalSocket.id);
console.log('Connected:', window.globalSocket.connected);

// Ver todos los listeners registrados
console.log('Listeners:', window.globalSocket._callbacks);
```

---

## 📝 NOTAS IMPORTANTES

### ⚠️ Limpieza de Listeners
Cada escena debe remover sus listeners específicos al salir para evitar duplicados:

```javascript
// En el evento 'shutdown' de cada escena
this.events.on('shutdown', () => {
    this.socket.off('ROOM_COUNTS_UPDATE'); // Remover solo los listeners de esta escena
});
```

### 🔄 Reconexión Automática
Socket.io maneja la reconexión automáticamente. Si el servidor se reinicia, el socket se reconectará automáticamente.

### 🐛 Debugging
Para ver todos los eventos del socket:
```javascript
window.globalSocket.onAny((event, ...args) => {
    console.log(`📡 [SOCKET] ${event}:`, args);
});
```

---

## 🎉 CONCLUSIÓN

El problema está **completamente resuelto**. Ahora:

1. ✅ Solo hay UN socket global
2. ✅ Todas las escenas lo comparten
3. ✅ El usuario mantiene su sala al cambiar de escena
4. ✅ Las apuestas funcionan correctamente

**El flujo del Modelo BUS funciona al 100%** 🚌

---

**Firma:** Antigravity AI - Lead Game Designer & Backend Architect  
**Fecha:** 2025-11-29
