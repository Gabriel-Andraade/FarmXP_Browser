
export function initResponsiveUI() {
    const config = {
        mobileBreakpoint: 480,
        ids: {
            shop: 'storeBtn',       // IDs exatos do seu HTML
            inventory: 'inventoryBtn', 
            settings: 'configBtn'
        },
        containers: {
            desktopParent: '.top-right-buttons',
            mobileStripId: 'mobile-buttons-container'
        }
    };

    // Função interna para criar o container cinza se não existir
    function createMobileStrip() {
        let strip = document.getElementById(config.containers.mobileStripId);
        if (!strip) {
            strip = document.createElement('div');
            strip.id = config.containers.mobileStripId;
            strip.className = 'mobile-button-strip';
            document.body.appendChild(strip);
        }
        return strip;
    }

    // Função interna de adaptação
    function adapt() {
        const isMobile = window.innerWidth <= config.mobileBreakpoint;
        const strip = createMobileStrip();
        const desktopParent = document.querySelector(config.containers.desktopParent);
        
        // Elementos a serem movidos
        const elements = [
            document.getElementById(config.ids.shop),
            document.getElementById(config.ids.inventory),
            document.getElementById(config.ids.settings)
        ];

        if (isMobile) {
            // MODO MOBILE: Move para o retângulo cinza
            strip.style.display = 'flex';
            elements.forEach(el => {
                if (el) strip.appendChild(el); 
            });
        } else {
            // MODO DESKTOP: Volta para a barra original
            strip.style.display = 'none';
            if (desktopParent) {
                elements.forEach(el => {
                    if (el) desktopParent.appendChild(el);
                });
            }
        }
    }

    // Inicializa
    adapt();

    // Listeners para mudanças de tela
    window.addEventListener('resize', adapt);
    window.addEventListener('orientationchange', () => {
        setTimeout(adapt, 100);
    });
}