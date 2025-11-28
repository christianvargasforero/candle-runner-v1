#!/bin/bash

# 🕯️ Script para Subir Candle Runner a GitHub
# Ejecuta este script después de crear el repositorio en GitHub

echo "🕯️ Candle Runner - Subiendo a GitHub..."
echo ""

# Paso 1: Renombrar rama a main
echo "📝 Paso 1: Renombrando rama a 'main'..."
git branch -M main

# Paso 2: Añadir remote (REEMPLAZA 'TU_USUARIO' con tu usuario de GitHub)
echo "🔗 Paso 2: Añadiendo remote..."
echo "⚠️  IMPORTANTE: Reemplaza 'TU_USUARIO' con tu nombre de usuario de GitHub"
echo ""
echo "Opción A - HTTPS (recomendado):"
echo "git remote add origin https://github.com/TU_USUARIO/candle-runner-v1.git"
echo ""
echo "Opción B - SSH (si tienes SSH keys configuradas):"
echo "git remote add origin git@github.com:TU_USUARIO/candle-runner-v1.git"
echo ""
read -p "Presiona Enter después de ejecutar uno de los comandos anteriores..."

# Paso 3: Verificar remote
echo ""
echo "🔍 Verificando remote..."
git remote -v

# Paso 4: Subir código
echo ""
echo "🚀 Paso 3: Subiendo código a GitHub..."
git push -u origin main

echo ""
echo "✅ ¡Listo! Tu código está en GitHub"
echo "📊 Verifica en: https://github.com/TU_USUARIO/candle-runner-v1"
