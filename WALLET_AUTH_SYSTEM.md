# 🦊 SISTEMA DE AUTENTICACIÓN CON WALLET SIMULADA - IMPLEMENTADO

## 📋 Problema Resuelto

**❌ ANTES**: Los usuarios perdían su saldo y progreso al recargar la página porque se creaba un usuario nuevo por cada conexión de socket. No había persistencia de identidad.

**✅ AHORA**: Sistema completo de autenticación con wallet simulada que persiste el progreso del usuario.

---

## 🛠️ ARQUITECTURA IMPLEMENTADA

```
CLIENTE                          SERVIDOR
   ↓                                ↓
[CARGA PÁGINA]                 [ESPERANDO]
   ↓                                ↓
[PANTALLA LOGIN]                    
   ↓                                
[CLIC "CONNECT WALLET"]             
   ↓                                
[GENERAR/RECUPERAR WALLET]          
   ↓                                
[GUARDAR EN LOCALSTORAGE]           
   ↓                                
[CONECTAR SOCKET con auth]          
   ├─ { wallet: "0x123..." } ────→  
                                    ↓
                            [LEER wallet del handshake]
                                    ↓
                            [BUSCAR usuario en DB]
                                    ↓
                                SI EXISTE?
                            /              \
                          SI                NO
                          ↓                 ↓
                  [RESTAURAR]          [CREAR CON]
                  [SALDO REAL]         [1000 USDT]
                          \              /
                           \            /
                            ↓          ↓
                        [EMITIR AUTH_SUCCESS]
                                    ↓
   ←────────────────────────────────┘
   ↓
[OCULTAR LOGIN]
   ↓
[MOSTRAR JUEGO]
   ↓
✅ AUTENTICADO
```

---

## 📁 ARCHIVOS MODIFICADOS

### **1. Backend**

#### `prisma/schema.prisma`:
```prisma
model User {
  id            String   @id @default(uuid())
  walletAddress String?  @unique  ← YA EXISTÍA
  balanceUSDT   Float    @default(1000)
  balanceWICK   Float    @default(0)
  // ...
}
```
**Estado**: ✅ El campo ya existía, no requiere migración

---

#### `server/services/userManager.js`:

**Cambios:**
```javascript
// ANTES:
async createUser(socketId, existingUserId = null) {
    // Buscaba por ID opcional...
}

// AHORA:
async createUser(socketId, walletAddress) {
    if (!walletAddress) {
        throw new Error('Wallet address is required');
    }

    // 🔍 BUSCAR USUARIO POR WALLET ADDRESS
    dbUser = await prisma.user.findUnique({
        where: { walletAddress },
        include: { skins: true }
    });

    if (!dbUser) {
        // 🆕 CREAR NUEVO USUARIO CON WELCOME BONUS
        dbUser = await prisma.user.create({
            data: {
                walletAddress: walletAddress,
                balanceUSDT: 1000, // 🎁 Welcome Bonus
                balanceWICK: 0,
                // ...
            }
        });
    } else {
        // 🔄 USUARIO EXISTENTE - RESTAURAR SESIÓN
        // Cargar saldo desde DB
    }
}
```

**Beneficios:**
- ✅ Búsqueda por `walletAddress` (único)
- ✅ Creación solo si no existe
- ✅ Bonus de 1,000 USDT para nuevos usuarios
- ✅ Logs informativos del saldo actual

---

#### `server/server.js`:

**Cambios en Handshake:**
```javascript
io.on('connection', async (socket) => {
    console.log(`👤 [PLAYER] Conectado: ${socket.id}`);

    // 🦊 LEER WALLET ADDRESS DEL HANDSHAKE
    const walletAddress = socket.handshake.auth.wallet;

    // 🛡️ VALIDACIÓN: Si no hay wallet, desconectar
    if (!walletAddress) {
        console.warn(`⚠️ [AUTH] Socket ${socket.id} sin wallet - DESCONECTANDO`);
        socket.emit('AUTH_ERROR', { message: 'Wallet address required.' });
        socket.disconnect();
        return;
    }

    try {
        // 🔐 CREAR O RECUPERAR USUARIO POR WALLET
        const user = await userManager.createUser(socket.id, walletAddress);

        // ✅ AUTENTICACIÓN EXITOSA
        socket.emit('AUTH_SUCCESS', { 
            userId: user.id,
            wallet: walletAddress 
        });

        // Enviar perfil con saldo desde DB
        socket.emit('USER_PROFILE', user.getProfile());

        console.log(`✅ [AUTH] Usuario autenticado: ${user.id} (${walletAddress})`);

    } catch (error) {
        console.error(`❌ [AUTH] Error:`, error);
        socket.emit('AUTH_ERROR', { message: 'Authentication failed.' });
        socket.disconnect();
    }
});
```

**Nuevos Eventos Emitidos:**
- ✅ `AUTH_SUCCESS` - Autenticación exitosa
- ✅ `AUTH_ERROR` - Error de autenticación

---

### **2. Frontend**

#### `client/index.html`:

##### **A) HTML - Overlay de Login:**

```html
<body>
    <!-- 🦊 PANTALLA DE LOGIN (WALLET) -->
    <div id="login-overlay">
        <div class="login-container">
            <div class="login-logo">🕯️</div>
            <h1 class="login-title">CANDLE RUNNER</h1>
            <p class="login-subtitle">Survival Trading Platform</p>
            
            <button class="connect-wallet-btn" id="connect-wallet-btn">
                <i class="fa-solid fa-wallet"></i> CONNECT METAMASK (SIMULATOR)
            </button>
            
            <div class="login-info">
                <strong>🎁 Welcome Bonus:</strong> New players receive 1,000 USDT<br>
                <strong>🔒 Security:</strong> Simulated wallet - No real funds required<br>
                <strong>💾 Persistence:</strong> Your progress is saved automatically
            </div>
        </div>
    </div>

    <div id="game-container">
        <!-- Phaser canvas -->
    </div>
</body>
```

##### **B) CSS - Diseño Cyberpunk (~150 líneas):**

```css
#login-overlay {
    position: fixed;
    z-index: 99999;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
    /* Overlay completo */
}

.login-container {
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #00fff9;
    box-shadow: 0 0 50px rgba(0, 255, 249, 0.3);
    /* Borde neón animado */
}

.connect-wallet-btn {
    background: linear-gradient(135deg, #00fff9 0%, #00bfff 100%);
    /* Botón con gradiente y efecto ripple */
}

/* Animaciones: float, pulse-line, spin */
```

**Features del Diseño:**
- ✅ Logo flotante con animación
- ✅ Botón con efecto ripple al hover
- ✅ Estado de loading con spinner
- ✅ Información de bienvenida clara

##### **C) JavaScript - Lógica de Login:**

```javascript
const STORAGE_KEY = 'candle_runner_wallet';

// Función para generar wallet ficticia
function generateWallet() {
    const randomHex = () => Math.floor(Math.random() * 16).toString(16);
    let wallet = '0x';
    for (let i = 0; i < 40; i++) {
        wallet += randomHex();
    }
    return wallet;
}

// Función para conectar wallet
async function connectWallet() {
    // Mostrar loading
    connectBtn.classList.add('loading');
    connectBtn.innerHTML = '<i class="fa-solid fa-spinner"></i> CONNECTING...';

    // Verificar si ya hay una wallet guardada
    let wallet = localStorage.getItem(STORAGE_KEY);

    if (!wallet) {
        // Generar nueva wallet
        wallet = generateWallet();
        localStorage.setItem(STORAGE_KEY, wallet);
        console.log('🎁 [WALLET] Nueva wallet generada:', wallet);
    } else {
        console.log('🔄 [WALLET] Wallet recuperada:', wallet);
    }

    // Conectar socket con autenticación
    window.globalSocket = io({
        auth: {
            wallet: wallet
        }
    });

    // Escuchar eventos de autenticación
    window.globalSocket.on('AUTH_SUCCESS', (data) => {
        // Ocultar login overlay
        loginOverlay.classList.add('hidden');
        
        // Mostrar mensaje de bienvenida
        const isNewUser = !localStorage.getItem(`${STORAGE_KEY}_seen`);
        if (isNewUser) {
            showToast('🎁 Welcome! You received 1,000 USDT bonus!', 'success');
            localStorage.setItem(`${STORAGE_KEY}_seen`, 'true');
        } else {
            showToast('✅ Welcome back, trader!', 'success');
        }
    });

    window.globalSocket.on('AUTH_ERROR', (data) => {
        alert('Authentication failed: ' + data.message);
    });
}
```

**Características:**
- ✅ Genera wallet en formato `0x...` (40 caracteres hex)
- ✅ Guarda en `localStorage` automáticamente
- ✅ Detecta usuarios nuevos vs. recurrentes
- ✅ Mensajes diferenciados de bienvenida
---

#### `client/src/main.js`:

**Cambios:**
```javascript
// ANTES:
const globalSocket = io(); // Se conectaba automáticamente

// AHORA:
// ⚠️ IMPORTANTE: El socket se crea en index.html DESPUÉS del login
console.log('[MAIN] Socket será creado después del login con wallet...');

// El socket se expondrá como window.globalSocket desde index.html
```

**Beneficio**: No hay conexiones sin autenticación

---

## 🔐 FLUJO DE AUTENTICACIÓN COMPLETO

### Primera Vez (Usuario Nuevo):

```
1. Usuario carga la página
   ↓
2. Ve overlay de login
   ↓
3. Clic en "CONNECT WALLET"
   ↓
4. Se genera `0x123abc...` (40 caracteres random)
   ↓
5. Se guarda en localStorage
   ↓
6. Socket conecta con auth: { wallet: "0x123abc..." }
   ↓
7. Servidor busca en DB → NO EXISTE
   ↓
8. Servidor CREA usuario con:
   - walletAddress: "0x123abc..."
   - balanceUSDT: 1000
   - balanceWICK: 0
   - Skin inicial: PROTOCOL_DROID
   ↓
9. Servidor emite AUTH_SUCCESS
   ↓
10. Cliente oculta login
    ↓
11. Cliente muestra: "🎁 Welcome! You received 1,000 USDT bonus!"
    ↓
✅ USUARIO JUGANDO
```

---

### Usuario Recurrente (Recarga Página):

```
1. Usuario recarga la página
   ↓
2. Ve overlay de login
   ↓
3. Clic en "CONNECT WALLET"
   ↓
4. Se recupera `0x123abc...` de localStorage
   ↓
5. Socket conecta con auth: { wallet: "0x123abc..." }
   ↓
6. Servidor busca en DB → SÍ EXISTE
   ↓
7. Servidor RESTAURA usuario:
   - Lee balanceUSDT desde DB (ej: 850.50)
   - Lee balanceWICK desde DB (ej: 120)
   - Carga skins reales
   ↓
8. Servidor emite AUTH_SUCCESS
   ↓
9. Cliente oculta login
   ↓
10. Cliente muestra: "✅ Welcome back, trader!"
    ↓
11. Dashboard muestra saldo REAL desde DB
    ↓
✅ PROGRESO RESTAURADO
```

---

## 🎁 WELCOME BONUS

### Nuevos Usuarios Reciben:
- ✅ **1,000 USDT** automáticamente
- ✅ **1 Skin Inicial**: PROTOCOL_DROID (100/100 integrity)
- ✅ **Mensaje de bienvenida** personalizado

### Usuarios Recurrentes:
- ✅ **Saldo real** desde la base de datos
- ✅ **Skins reales** con integridad actual
- ✅ **Progreso completo** preservado

---

## 💾 PERSISTENCIA

### LocalStorage:
```javascript
{
    "candle_runner_wallet": "0x123abc...",
    "candle_runner_wallet_seen": "true"
}
```

### Base de Datos (PostgreSQL):
```sql
-- Tabla: User
id: uuid
walletAddress: "0x123abc..." (UNIQUE)
balanceUSDT: 850.50
balanceWICK: 120
createdAt: "2025-11-30T00:00:00Z"
updatedAt: "2025-11-30T01:00:00Z"

-- Tabla: Skin (relacionada)
userId: uuid (FK)
type: "PROTOCOL_DROID"
integrity: 75
maxIntegrity: 100
isBurned: false
```

---

## 🧪 TESTING

### Escenarios de Prueba:

#### 1. **Usuario Nuevo**:
```bash
# Borrar localStorage
localStorage.clear()

# Recargar página
# Clic en "CONNECT WALLET"
# ✅ Debe mostrar: "🎁 Welcome! You received 1,000 USDT bonus!"
# ✅ Dashboard debe mostrar: $1,000.00 USDT
```

#### 2. **Usuario Recurrente**:
```bash
# Jugar varias rondas (ganar/perder)
# Recargar página
# Clic en "CONNECT WALLET"
# ✅ Debe mostrar: "✅ Welcome back, trader!"
# ✅ Dashboard debe mostrar saldo actualizado (ej: $850.50)
```

#### 3. **Sin Wallet (Seguridad)**:
```bash
# En consola del navegador:
localStorage.removeItem('candle_runner_wallet')

# Intentar conectar socket manualmente sin wallet:
io().connect()

# ✅ Servidor debe desconectar inmediatamente
# ✅ Console debe mostrar: "⚠️ Socket sin wallet - DESCONECTANDO"
```

#### 4. **Múltiples Wallets** (Simular varios usuarios):
```bash
# Usuario 1:
localStorage.setItem('candle_runner_wallet', '0xAAA...')
# Conectar → Debe crear/restaurar usuario A

# Usuario 2 (nueva pestaña):
localStorage.setItem('candle_runner_wallet', '0xBBB...')
# Conectar → Debe crear/restaurar usuario B

# ✅ Cada wallet tiene su propio progreso independiente
```

---

## 🎯 CHECKLIST DE IMPLEMENTACIÓN

| Componente | Estado | Descripción |
|------------|--------|-------------|
| ✅ Schema Prisma | LISTO | Campo `walletAddress` ya existía |
| ✅ UserManager | MODIFICADO | Búsqueda por wallet |
| ✅ Server.js | MODIFICADO | Handshake con wallet auth |
| ✅ Login Overlay | CREADO | HTML + CSS cyberpunk |
| ✅ Lógica Wallet | CREADA | Generación/recuperación |
| ✅ Socket Auth | IMPLEMENTADO | Auth en handshake |
| ✅ Main.js | MODIFICADO | No auto-conecta |
| ✅ Welcome Bonus | IMPLEMENTADO | 1,000 USDT |
| ✅ Persistencia | FUNCIONAL | localStorage + DB |
| ✅ Mensajes | IMPLEMENTADOS | Nuevo vs. recurrente |

---

## 🔒 SEGURIDAD

### Validaciones Implementadas:

1. ✅ **Wallet requerida**: Socket se desconecta si no hay wallet
2. ✅ **Wallet única**: `@unique` en schema → No duplicados
3. ✅ **Try-catch**: Errores de DB manejados correctamente
4. ✅ **Auth events**: Cliente recibe confirmación de auth
5. ✅ **Logs informativos**: Auditoría en consola del servidor

---

## 🚀 BENEFICIOS FINALES

### Antes ❌:
- Usuario pierde todo al recargar
- No hay identidad persistente
- Testing difícil (usuarios duplicados)
- Saldo siempre reseteado

### Ahora ✅:
- **Progreso persistente** entre sesiones
- **Identidad única** por wallet
- **Welcome bonus** para nuevos usuarios
- **Saldo real** desde base de datos
- **UX mejorada** con pantalla de login
- **Testing fácil** con múltiples wallets
- **Logs claros** para debugging

---

## 📝 NOTAS ADICIONALES

### Para Producción Futura:

1. **Integración Web3 Real**:
   - Reemplazar `generateWallet()` con `window.ethereum.request({ method: 'eth_requestAccounts' })`
   - Verificar firma del usuario para autenticación real

2. **Tiers de Welcome Bonus**:
   - Podrías dar diferentes bonos según el tier del primer bus

3. **Referral System**:
   - Añadir campo `refCode` en User
   - Bonus adicional por referidos

4. **Analytics**:
   - Track wallets únicas diarias
   - Tasa de retención por wallet

---

**Estado**: ✅ **SISTEMA COMPLETO IMPLEMENTADO**  
**Fecha**: 2025-11-30  
**Versión**: 1.3.0 - Wallet Authentication System
