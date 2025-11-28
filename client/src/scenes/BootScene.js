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
        console.log('✅ [BOOT] Assets cargados. Iniciando juego...');

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
