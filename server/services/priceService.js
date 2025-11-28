// 💲 PRICE SERVICE - Oráculo de Precios Multi-Exchange
// Conecta a Binance, Coinbase y Kraken para obtener precio promedio de BTC

import WebSocket from 'ws';

class PriceService {
    constructor() {
        // Estado de precios de cada exchange
        this.prices = {
            binance: null,
            coinbase: null,
            kraken: null
        };

        // WebSocket connections
        this.connections = {
            binance: null,
            coinbase: null,
            kraken: null
        };

        // Estado de conexión
        this.isConnected = {
            binance: false,
            coinbase: false,
            kraken: false
        };

        // Configuración de reconexión
        this.reconnectDelay = 5000; // 5 segundos
        this.reconnectAttempts = {
            binance: 0,
            coinbase: 0,
            kraken: 0
        };
        this.maxReconnectAttempts = 10;
    }

    /**
     * Inicia todas las conexiones a exchanges
     */
    start() {
        console.log('\n💲 [PRICE SERVICE] Iniciando oráculo de precios...\n');

        this.connectBinance();
        this.connectCoinbase();
        this.connectKraken();
    }

    /**
     * Conecta a Binance WebSocket
     */
    connectBinance() {
        try {
            const url = 'wss://stream.binance.com:9443/ws/btcusdt@trade';
            console.log('🔗 [BINANCE] Conectando...');

            this.connections.binance = new WebSocket(url);

            this.connections.binance.on('open', () => {
                this.isConnected.binance = true;
                this.reconnectAttempts.binance = 0;
                console.log('✅ [BINANCE] Conectado exitosamente');
            });

            this.connections.binance.on('message', (data) => {
                try {
                    const trade = JSON.parse(data);
                    this.prices.binance = parseFloat(trade.p);
                    // console.log(`💰 [BINANCE] Precio: $${this.prices.binance.toFixed(2)}`);
                } catch (error) {
                    console.error('❌ [BINANCE] Error parseando mensaje:', error.message);
                }
            });

            this.connections.binance.on('error', (error) => {
                console.error('❌ [BINANCE] Error de conexión:', error.message);
            });

            this.connections.binance.on('close', () => {
                this.isConnected.binance = false;
                this.prices.binance = null;
                console.log('⚠️  [BINANCE] Conexión cerrada');
                this.scheduleReconnect('binance');
            });

        } catch (error) {
            console.error('❌ [BINANCE] Error al conectar:', error.message);
            this.scheduleReconnect('binance');
        }
    }

    /**
     * Conecta a Coinbase WebSocket
     */
    connectCoinbase() {
        try {
            const url = 'wss://ws-feed.exchange.coinbase.com';
            console.log('🔗 [COINBASE] Conectando...');

            this.connections.coinbase = new WebSocket(url);

            this.connections.coinbase.on('open', () => {
                this.isConnected.coinbase = true;
                this.reconnectAttempts.coinbase = 0;

                // Suscribirse al ticker de BTC-USD
                const subscribeMsg = {
                    type: 'subscribe',
                    product_ids: ['BTC-USD'],
                    channels: ['ticker']
                };

                this.connections.coinbase.send(JSON.stringify(subscribeMsg));
                console.log('✅ [COINBASE] Conectado exitosamente');
            });

            this.connections.coinbase.on('message', (data) => {
                try {
                    const message = JSON.parse(data);

                    if (message.type === 'ticker' && message.price) {
                        this.prices.coinbase = parseFloat(message.price);
                        // console.log(`💰 [COINBASE] Precio: $${this.prices.coinbase.toFixed(2)}`);
                    }
                } catch (error) {
                    console.error('❌ [COINBASE] Error parseando mensaje:', error.message);
                }
            });

            this.connections.coinbase.on('error', (error) => {
                console.error('❌ [COINBASE] Error de conexión:', error.message);
            });

            this.connections.coinbase.on('close', () => {
                this.isConnected.coinbase = false;
                this.prices.coinbase = null;
                console.log('⚠️  [COINBASE] Conexión cerrada');
                this.scheduleReconnect('coinbase');
            });

        } catch (error) {
            console.error('❌ [COINBASE] Error al conectar:', error.message);
            this.scheduleReconnect('coinbase');
        }
    }

    /**
     * Conecta a Kraken WebSocket
     */
    connectKraken() {
        try {
            const url = 'wss://ws.kraken.com';
            console.log('🔗 [KRAKEN] Conectando...');

            this.connections.kraken = new WebSocket(url);

            this.connections.kraken.on('open', () => {
                this.isConnected.kraken = true;
                this.reconnectAttempts.kraken = 0;

                // Suscribirse al trade de XBT/USD
                const subscribeMsg = {
                    event: 'subscribe',
                    pair: ['XBT/USD'],
                    subscription: {
                        name: 'trade'
                    }
                };

                this.connections.kraken.send(JSON.stringify(subscribeMsg));
                console.log('✅ [KRAKEN] Conectado exitosamente');
            });

            this.connections.kraken.on('message', (data) => {
                try {
                    const message = JSON.parse(data);

                    // Kraken envía arrays para trades
                    if (Array.isArray(message) && message[1] && Array.isArray(message[1])) {
                        const trades = message[1];
                        if (trades.length > 0 && trades[0][0]) {
                            this.prices.kraken = parseFloat(trades[0][0]);
                            // console.log(`💰 [KRAKEN] Precio: $${this.prices.kraken.toFixed(2)}`);
                        }
                    }
                } catch (error) {
                    console.error('❌ [KRAKEN] Error parseando mensaje:', error.message);
                }
            });

            this.connections.kraken.on('error', (error) => {
                console.error('❌ [KRAKEN] Error de conexión:', error.message);
            });

            this.connections.kraken.on('close', () => {
                this.isConnected.kraken = false;
                this.prices.kraken = null;
                console.log('⚠️  [KRAKEN] Conexión cerrada');
                this.scheduleReconnect('kraken');
            });

        } catch (error) {
            console.error('❌ [KRAKEN] Error al conectar:', error.message);
            this.scheduleReconnect('kraken');
        }
    }

    /**
     * Programa reconexión automática
     */
    scheduleReconnect(exchange) {
        if (this.reconnectAttempts[exchange] >= this.maxReconnectAttempts) {
            console.error(`❌ [${exchange.toUpperCase()}] Máximo de intentos de reconexión alcanzado`);
            return;
        }

        this.reconnectAttempts[exchange]++;
        const delay = this.reconnectDelay * this.reconnectAttempts[exchange];

        console.log(`🔄 [${exchange.toUpperCase()}] Reconectando en ${delay / 1000}s (intento ${this.reconnectAttempts[exchange]}/${this.maxReconnectAttempts})...`);

        setTimeout(() => {
            if (exchange === 'binance') this.connectBinance();
            else if (exchange === 'coinbase') this.connectCoinbase();
            else if (exchange === 'kraken') this.connectKraken();
        }, delay);
    }

    /**
     * Obtiene el precio actual (promedio de exchanges activos)
     */
    getCurrentPrice() {
        const activePrices = [];

        if (this.prices.binance !== null) activePrices.push(this.prices.binance);
        if (this.prices.coinbase !== null) activePrices.push(this.prices.coinbase);
        if (this.prices.kraken !== null) activePrices.push(this.prices.kraken);

        if (activePrices.length === 0) {
            console.warn('⚠️  [PRICE SERVICE] No hay precios disponibles de ningún exchange');
            return null;
        }

        // Calcular promedio
        const average = activePrices.reduce((sum, price) => sum + price, 0) / activePrices.length;

        return {
            price: average,
            sources: activePrices.length,
            breakdown: {
                binance: this.prices.binance,
                coinbase: this.prices.coinbase,
                kraken: this.prices.kraken
            }
        };
    }

    /**
     * Obtiene el estado de conexión de todos los exchanges
     */
    getConnectionStatus() {
        return {
            binance: this.isConnected.binance,
            coinbase: this.isConnected.coinbase,
            kraken: this.isConnected.kraken,
            anyConnected: this.isConnected.binance || this.isConnected.coinbase || this.isConnected.kraken
        };
    }

    /**
     * Cierra todas las conexiones
     */
    stop() {
        console.log('\n🛑 [PRICE SERVICE] Cerrando conexiones...\n');

        if (this.connections.binance) this.connections.binance.close();
        if (this.connections.coinbase) this.connections.coinbase.close();
        if (this.connections.kraken) this.connections.kraken.close();
    }
}

// Exportar instancia única (Singleton)
const priceService = new PriceService();
export default priceService;
