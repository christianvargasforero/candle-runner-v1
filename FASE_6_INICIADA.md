# 💾 FASE 6 INICIADA: Persistencia de Datos

**Fecha:** 29 de Noviembre de 2025
**Estado:** 🚧 EN PROGRESO

---

## 🛠️ Cambios Realizados

### 1. Configuración de Base de Datos (PostgreSQL + Prisma)
- **Schema:** Definido en `prisma/schema.prisma` con modelos:
    - `User`: Balance USDT/WICK, Wallet.
    - `Skin`: Integridad, Nivel, Inversión, Estado (Quemado).
    - `Transaction`: Historial de apuestas y pagos.
- **Cliente:** Configurado en `server/config/prisma.js`.

### 2. Configuración de Redis
- **Cliente:** Configurado en `server/config/redis.js` para gestión de estado en tiempo real.

### 3. Refactorización de Servicios (Persistencia)
- **UserManager:**
    - `createUser` ahora es asíncrono.
    - Recupera usuarios de la BD por ID (si se provee) o crea nuevos.
    - Mantiene una caché en memoria (`Map`) para acceso rápido durante el juego.
- **User Model:**
    - Métodos `withdraw` y `deposit` ahora son asíncronos y guardan en BD.
    - Vinculación con `Skin` persistente.
- **Skin Model:**
    - Métodos `takeDamage` y `repair` ahora son asíncronos y guardan en BD.
- **GameLoop:**
    - Actualizado para manejar operaciones asíncronas (`await user.withdraw`, etc.).
    - Preparado para integración con Redis.

## ⚠️ Pasos Pendientes (Manuales)

1.  **Instalar Dependencias:**
    ```bash
    npm install prisma @prisma/client
    ```
2.  **Iniciar Base de Datos:**
    Asegúrate de tener PostgreSQL corriendo y configura `DATABASE_URL` en `.env`.
3.  **Migrar Esquema:**
    ```bash
    npx prisma migrate dev --name init
    ```
4.  **Generar Cliente:**
    ```bash
    npx prisma generate
    ```

---

**Siguiente Paso:** Implementar recuperación de estado con Redis en caso de reinicio del servidor.
