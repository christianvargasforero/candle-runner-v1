// 🚀 BOOT SCENE - Carga de Assets y Preparación
// Esta escena carga todos los recursos necesarios antes de iniciar el juego

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Crear barra de carga visual
        this.createLoadingBar();

        // Por ahora no cargamos assets externos (usaremos primitivos)
        // En el futuro aquí cargaríamos:
        // this.load.image('player', 'assets/player.png');
        // this.load.spritesheet('candle', 'assets/candle.png', { frameWidth: 32, frameHeight: 64 });
        // this.load.audio('win', 'assets/sounds/win.mp3');

        console.log('🚀 [BOOT] Cargando assets...');
    }

    create() {
        console.log('✅ [BOOT] Assets cargados. Generando texturas...');

        // Generar textura para el JUGADOR (Sprite)
        const playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        playerGraphics.fillStyle(0x00ff88, 1);
        playerGraphics.fillRect(0, 0, 40, 60);
        // Ojo: un pequeño detalle para saber frente
        playerGraphics.fillStyle(0x000000, 1);
        playerGraphics.fillRect(25, 10, 10, 10); // Ojo
        playerGraphics.generateTexture('playerTexture', 40, 60);

        // Generar textura para el SUELO (TileSprite)
        const groundGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        groundGraphics.fillStyle(0x1a1a2e, 1);
        groundGraphics.fillRect(0, 0, 64, 64);
        // Detalles del suelo (líneas de grid)
        groundGraphics.lineStyle(2, 0x00ff88, 0.3);
        groundGraphics.strokeRect(0, 0, 64, 64);
        groundGraphics.generateTexture('groundTexture', 64, 64);

        // Generar textura para PARTÍCULAS (Dust)
        const particleGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        particleGraphics.fillStyle(0xffffff, 1);
        particleGraphics.fillCircle(4, 4, 4);
        particleGraphics.generateTexture('particleTexture', 8, 8);

        console.log('✅ [BOOT] Texturas generadas. Iniciando juego...');

        // Iniciar la escena principal del juego
        this.scene.start('GameScene');

        // Iniciar la escena de UI en paralelo
        this.scene.launch('UIScene');
    }

    createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Texto de carga
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Cargando...', {
            font: '20px Courier New',
            fill: '#00ff88'
        });
        loadingText.setOrigin(0.5, 0.5);

        // Barra de progreso
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2, 320, 50);

        // Actualizar barra de progreso
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ff88, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 + 10, 300 * value, 30);
        });

        // Limpiar al completar
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });
    }
}
