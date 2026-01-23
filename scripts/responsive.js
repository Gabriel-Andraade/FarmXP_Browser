/**
 * @file responsive.js - Responsive UI Manager
 * @description Handles responsive layout adaptations for mobile and desktop screens.
 * Manages the repositioning of UI buttons between desktop and mobile layouts
 * based on screen width breakpoints.
 *
 * @module Responsive
 * @author FarmXP Team
 *
 * @example
 * // Initialize responsive UI on game start
 * import { initResponsiveUI } from './responsive.js';
 * initResponsiveUI();
 */

/**
 * Initializes responsive UI behavior
 * Sets up listeners for window resize and orientation changes
 * Moves buttons between desktop and mobile containers based on screen width
 *
 * @function initResponsiveUI
 * @returns {void}
 *
 * @example
 * // Call once during game initialization
 * initResponsiveUI();
 */
export function initResponsiveUI() {
    /**
     * Configuration for responsive behavior
     * @type {Object}
     */
    const config = {
        /** Screen width threshold for mobile layout (pixels) */
        mobileBreakpoint: 480,
        /** Element IDs for buttons to reposition */
        ids: {
            shop: 'storeBtn',           // Shop button ID
            inventory: 'inventoryBtn',   // Inventory button ID
            settings: 'configBtn'        // Settings button ID
        },
        /** Container selectors/IDs for button placement */
        containers: {
            desktopParent: '.top-right-buttons',     // Desktop container selector
            mobileStripId: 'mobile-buttons-container' // Mobile strip element ID
        }
    };

    /**
     * Creates the mobile button strip container if it doesn't exist
     * @returns {HTMLElement} The mobile strip container element
     */
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

    /**
     * Adapts the UI layout based on current window width
     * Moves buttons to mobile strip when below breakpoint, or back to desktop container
     * @returns {void}
     */
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

    // Run initial adaptation on load
    adapt();

    // Set up event listeners for screen changes
    // Resize: handles window size changes on desktop
    window.addEventListener('resize', adapt);

    // Orientation change: handles mobile device rotation
    // Uses setTimeout to wait for the new dimensions to be available
    window.addEventListener('orientationchange', () => {
        setTimeout(adapt, 100);
    });
}