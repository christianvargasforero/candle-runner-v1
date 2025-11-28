# 📤 Instrucciones para Subir a GitHub

## ✅ Estado Actual

El repositorio Git local ya está inicializado y el primer commit está hecho:

```bash
✅ git init
✅ git add .
✅ git commit -m "🕯️ Fase 1 Completada: Skeleton..."
```

---

## 🔐 Paso 1: Crear Repositorio Privado en GitHub

1. Ve a GitHub: https://github.com/new

2. Configura el repositorio:
   - **Repository name:** `candle-runner-v1` (o el nombre que prefieras)
   - **Description:** "Candle Runner Protocol - Survival Trading & Creative Economy"
   - **Visibility:** ✅ **Private** (marcar como privado)
   - **NO** inicialices con README, .gitignore o license (ya los tenemos)

3. Haz clic en **"Create repository"**

---

## 🔗 Paso 2: Conectar Repositorio Local con GitHub

Una vez creado el repositorio en GitHub, ejecuta estos comandos en la terminal:

### Opción A: Si tu usuario de GitHub es conocido

```bash
# Reemplaza 'TU_USUARIO' con tu nombre de usuario de GitHub
git remote add origin https://github.com/TU_USUARIO/candle-runner-v1.git

# O si prefieres SSH (recomendado si tienes SSH keys configuradas)
git remote add origin git@github.com:TU_USUARIO/candle-runner-v1.git
```

### Opción B: Copia el comando que GitHub te muestra

GitHub te mostrará algo como:

```bash
git remote add origin https://github.com/TU_USUARIO/candle-runner-v1.git
git branch -M main
git push -u origin main
```

---

## 🚀 Paso 3: Subir el Código

```bash
# Asegurarte de estar en la rama main
git branch -M main

# Subir el código a GitHub
git push -u origin main
```

Si es la primera vez que usas GitHub desde esta máquina, te pedirá autenticación:
- **Usuario:** Tu nombre de usuario de GitHub
- **Contraseña:** Usa un **Personal Access Token** (no tu contraseña normal)

### 🔑 Crear Personal Access Token (si es necesario)

1. Ve a: https://github.com/settings/tokens
2. Click en "Generate new token" → "Generate new token (classic)"
3. Nombre: "Candle Runner Development"
4. Scopes: Marca **repo** (acceso completo a repositorios privados)
5. Click "Generate token"
6. **COPIA EL TOKEN** (solo se muestra una vez)
7. Usa este token como contraseña cuando Git te lo pida

---

## 📋 Resumen de Comandos

```bash
# 1. Añadir remote (reemplaza TU_USUARIO)
git remote add origin https://github.com/TU_USUARIO/candle-runner-v1.git

# 2. Renombrar rama a main
git branch -M main

# 3. Subir código
git push -u origin main
```

---

## ✅ Verificación

Una vez subido, deberías ver en GitHub:

- ✅ 12 archivos
- ✅ Repositorio marcado como **Private**
- ✅ README.md visible con la documentación
- ✅ Estructura de carpetas completa
- ✅ Commit inicial: "🕯️ Fase 1 Completada: Skeleton..."

---

## 🔒 Archivos Protegidos

El archivo `.env` **NO** se subirá a GitHub porque está en `.gitignore`. Esto es correcto para proteger tus variables de entorno.

Si colaboras con otros desarrolladores, comparte el `.env` de forma segura (no por GitHub).

---

## 🆘 Solución de Problemas

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/TU_USUARIO/candle-runner-v1.git
```

### Error: "Authentication failed"
- Asegúrate de usar un Personal Access Token, no tu contraseña
- Verifica que el token tenga permisos de **repo**

### Error: "Permission denied (publickey)"
- Si usas SSH, asegúrate de tener tu SSH key configurada en GitHub
- O usa HTTPS en su lugar

---

## 📝 Próximos Commits

Para futuros cambios:

```bash
# 1. Ver cambios
git status

# 2. Añadir archivos modificados
git add .

# 3. Hacer commit
git commit -m "Descripción del cambio"

# 4. Subir a GitHub
git push
```

---

**¿Necesitas ayuda con algún paso? ¡Avísame!** 🕯️
