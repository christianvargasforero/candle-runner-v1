// 🚌 BUS LOBBY - Funciones globales para mostrar/ocultar el lobby
// Este archivo proporciona funcionalidad básica para el lobby de buses

// Variable para almacenar el socket
let lobbySocket = null;
let lobbyInitialized = false;

// Función de inicialización que debe ser llamada con el socket
window.initializeLobby = function(socket) {
    if (lobbyInitialized) {
        console.warn('[LOBBY] ⚠️ Lobby ya inicializado');
        return;
    }
    
    if (!socket) {
        console.error('[LOBBY] ❌ Socket no proporcionado a initializeLobby');
        return;
    }
    
    lobbySocket = socket;
    lobbyInitialized = true;
    
    console.log('[LOBBY] ✅ Lobby inicializado con socket');
    
    // Configurar listener para lista de buses
    lobbySocket.on('ROOM_LIST', (data) => {
        console.log('[LOBBY] 🚌 Buses disponibles recibidos:', data);
        
        // Renderizar la lista de buses en la UI
        if (data.rooms) {
            renderBusList(data.rooms);
        }
    });
};

// Función para mostrar el lobby de buses
window.showBusLobby = function() {
    console.log('[LOBBY] 📋 Mostrando lobby de buses');
    
    if (!lobbyInitialized || !lobbySocket) {
        console.error('[LOBBY] ❌ Lobby no inicializado o socket no disponible');
        return;
    }
    
    // Mostrar overlay
    const lobbyElement = document.getElementById('bus-lobby');
    if (lobbyElement) {
        lobbyElement.classList.remove('hidden');
        console.log('[LOBBY] ✅ Overlay de lobby mostrado');
    }
    
    // Solicitar lista de buses disponibles
    lobbySocket.emit('REQUEST_ROOM_LIST');
    console.log('[LOBBY] 📡 Solicitando lista de buses...');
};

window.hideBusLobby = function() {
    console.log('[LOBBY] 🚪 Ocultando lobby de buses');
    const lobbyElement = document.getElementById('bus-lobby');
    if (lobbyElement) {
        lobbyElement.classList.add('hidden');
    }
};

// Función para renderizar la lista de buses
function renderBusList(buses) {
    const busList = document.getElementById('bus-list');
    if (!busList) return;
    
    if (!buses || buses.length === 0) {
        busList.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">❌ No hay buses disponibles</p>';
        return;
    }
    
    busList.innerHTML = buses.map(bus => `
        <div style="background: rgba(0, 255, 249, 0.05); border: 1px solid #00fff9; padding: 15px; margin-bottom: 10px; cursor: pointer; transition: all 0.3s;" 
             onmouseover="this.style.background='rgba(0, 255, 249, 0.15)'" 
             onmouseout="this.style.background='rgba(0, 255, 249, 0.05)'"
             onclick="window.joinBus('${bus.id}')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="color: #00fff9; margin: 0 0 5px 0;">${bus.name}</h3>
                    <p style="color: #888; margin: 0; font-size: 0.9rem;">
                        👥 ${bus.occupancy}/${bus.capacity} | 
                        🎫 $${bus.ticketPrice} | 
                        ${bus.status === 'BOARDING' ? '🟢 Embarcando' : '🔴 En Juego'}
                    </p>
                </div>
                ${bus.status === 'BOARDING' && bus.occupancy < bus.capacity ? 
                    '<button style="padding: 10px 20px; background: #00fff9; color: #000; border: none; font-weight: bold; cursor: pointer;">➡️ UNIRSE</button>' : 
                    '<span style="color: #ff0066;">❌ LLENO</span>'
                }
            </div>
        </div>
    `).join('');
    
    console.log('[LOBBY] ✅ Lista de buses renderizada:', buses.length, 'buses');
}

// Función para unirse a un bus
window.joinBus = function(busId) {
    console.log('[LOBBY] 🎫 Intentando unirse al bus:', busId);
    if (lobbySocket) {
        lobbySocket.emit('JOIN_ROOM', { roomId: busId });
    }
};

// Verificar si el lobby está listo
window.isLobbyReady = function() {
    return lobbyInitialized && lobbySocket !== null;
};
