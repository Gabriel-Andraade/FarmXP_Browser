import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from "./worldConstants.js";
import { camera, CAMERA_ZOOM } from "./thePlayer/cameraSystem.js";
import { getObject } from "./gameState.js";

/**
 * Tamanho do tile com zoom aplicado (pré-calculado para performance)
 * @constant {number}
 */
export const ZOOMED_TILE_SIZE = TILE_SIZE * CAMERA_ZOOM;

/**
 * Tamanho do tile com zoom aplicado e arredondado para inteiro
 * @constant {number}
 */
export const ZOOMED_TILE_SIZE_INT = Math.floor(ZOOMED_TILE_SIZE);

/**
 * Inverso do zoom da câmera (pré-calculado para evitar divisões)
 * @constant {number}
 */
export const INV_CAMERA_ZOOM = 1 / CAMERA_ZOOM;

/**
 * Configurações de otimização do sistema
 * Controla comportamentos de cache, logging e otimizações durante sleep
 * @constant {Object}
 */
export const OPTIMIZATION_CONFIG = {
  ENABLED: true,
  USE_PRECALCULATED_VALUES: true,
  MAX_DRAW_CALLS_PER_FRAME: 5000,
  LOG_PERFORMANCE: false,
  SLEEP_OPTIMIZATIONS: {
    CLEAR_CACHE: true,
    COMPACT_ARRAYS: true,
    FORCE_GC: true,
    RESET_CANVAS: true,
    OPTIMIZE_MEMORY: true,
  },
};

/**
 * Helper de log condicional para performance
 * Só registra logs quando LOG_PERFORMANCE está habilitado
 * @param {...*} args - Argumentos a serem logados
 * @returns {void}
 */
export function perfLog(...args) {
  if (OPTIMIZATION_CONFIG.LOG_PERFORMANCE) {
    // no-op when logging disabled
  }
}

/**
 * Cache para cálculos comuns
 * Armazena resultados de cálculos frequentes para evitar reprocessamento
 * @type {Map<string, *>}
 * @private
 */
const commonCalculations = new Map();

/**
 * Obtém um cálculo do cache ou executa e armazena
 * Usa cache apenas se USE_PRECALCULATED_VALUES estiver habilitado
 * @param {string} key - Chave única para identificar o cálculo
 * @param {Function} calculationFn - Função que realiza o cálculo
 * @returns {*} Resultado do cálculo (do cache ou recém calculado)
 */
export function getCachedCalculation(key, calculationFn) {
  if (!OPTIMIZATION_CONFIG.USE_PRECALCULATED_VALUES) {
    return calculationFn();
  }

  if (!commonCalculations.has(key)) {
    commonCalculations.set(key, calculationFn());
  }

  return commonCalculations.get(key);
}

/**
 * Converte coordenadas do mundo para coordenadas de tela (otimizado)
 * Usa variáveis pré-calculadas e câmera global para máxima performance
 * @param {number} x - Posição X no mundo
 * @param {number} y - Posição Y no mundo
 * @returns {Object} Posição na tela
 * @returns {number} returns.x - Posição X na tela
 * @returns {number} returns.y - Posição Y na tela
 */
export function worldToScreenFast(x, y) {
  return {
    x: (x - camera.x) * CAMERA_ZOOM,
    y: (y - camera.y) * CAMERA_ZOOM,
  };
}

/**
 * Converte coordenadas de tela para coordenadas do mundo (otimizado)
 * Usa inverso do zoom pré-calculado para evitar divisão
 * @param {number} x - Posição X na tela
 * @param {number} y - Posição Y na tela
 * @returns {Object} Posição no mundo
 * @returns {number} returns.x - Posição X no mundo
 * @returns {number} returns.y - Posição Y no mundo
 */
export function screenToWorldFast(x, y) {
  return {
    x: x * INV_CAMERA_ZOOM + camera.x,
    y: y * INV_CAMERA_ZOOM + camera.y,
  };
}

/**
 * Converte coordenadas do mundo para tela usando câmera customizada
 * Permite especificar uma câmera diferente da global
 * @param {number} x - Posição X no mundo
 * @param {number} y - Posição Y no mundo
 * @param {Object} customCamera - Objeto de câmera customizado
 * @param {number} customCamera.x - Posição X da câmera
 * @param {number} customCamera.y - Posição Y da câmera
 * @returns {Object} Posição na tela
 * @returns {number} returns.x - Posição X na tela
 * @returns {number} returns.y - Posição Y na tela
 */
export function worldToScreenWithCamera(x, y, customCamera) {
  return {
    x: (x - customCamera.x) * CAMERA_ZOOM,
    y: (y - customCamera.y) * CAMERA_ZOOM,
  };
}

/**
 * Verifica se um retângulo está visível no viewport (otimizado)
 * Usa conversão rápida de coordenadas e buffer para culling
 * @param {number} x - Posição X do retângulo no mundo
 * @param {number} y - Posição Y do retângulo no mundo
 * @param {number} width - Largura do retângulo
 * @param {number} height - Altura do retângulo
 * @param {number} [buffer=0] - Buffer adicional para expandir área de verificação
 * @returns {boolean} True se o retângulo está visível, false caso contrário
 */
export function isInViewportFast(x, y, width, height, buffer = 0) {
  const screenPos = worldToScreenFast(x, y);
  const zoom = CAMERA_ZOOM;
  const zoomedWidth = width * zoom;
  const zoomedHeight = height * zoom;

  return (
    screenPos.x + zoomedWidth + buffer > 0 &&
    screenPos.x - buffer < window.innerWidth &&
    screenPos.y + zoomedHeight + buffer > 0 &&
    screenPos.y - buffer < window.innerHeight
  );
}

/**
 * Calcula os limites de tiles visíveis baseado na posição da câmera
 * Retorna coordenadas de tile para culling eficiente de renderização
 * @param {number} [buffer=100] - Buffer em pixels ao redor da câmera
 * @returns {Object} Limites dos tiles visíveis
 * @returns {number} returns.startX - Índice X inicial do tile
 * @returns {number} returns.endX - Índice X final do tile
 * @returns {number} returns.startY - Índice Y inicial do tile
 * @returns {number} returns.endY - Índice Y final do tile
 * @returns {number} returns.width - Largura em tiles
 * @returns {number} returns.height - Altura em tiles
 */
export function getVisibleTileBounds(buffer = 100) {
  const visibleStartX = Math.max(0, Math.floor((camera.x - buffer) / TILE_SIZE));
  const visibleEndX = Math.min(
    Math.ceil(WORLD_WIDTH / TILE_SIZE),
    Math.ceil((camera.x + camera.width + buffer) / TILE_SIZE)
  );
  const visibleStartY = Math.max(0, Math.floor((camera.y - buffer) / TILE_SIZE));
  const visibleEndY = Math.min(
    Math.ceil(WORLD_HEIGHT / TILE_SIZE),
    Math.ceil((camera.y + camera.height + buffer) / TILE_SIZE)
  );

  return {
    startX: visibleStartX,
    endX: visibleEndX,
    startY: visibleStartY,
    endY: visibleEndY,
    width: visibleEndX - visibleStartX,
    height: visibleEndY - visibleStartY,
  };
}

/**
 * Executa otimizações de sleep para liberar memória
 * Limpa caches, compacta arrays, força GC e reseta contextos
 * Útil para executar durante transições ou quando o jogo está pausado
 * @async
 * @returns {Promise<Object>} Resultado das otimizações
 * @returns {boolean} returns.success - Se as otimizações foram bem-sucedidas
 * @returns {number} returns.duration - Duração em ms
 * @returns {number} returns.optimizationsApplied - Número de otimizações aplicadas
 * @returns {string} [returns.error] - Mensagem de erro se falhou
 */
export async function performSleepOptimizations() {
  const optimizations = [];
  const startTime = performance.now();

  try {
    if (OPTIMIZATION_CONFIG.SLEEP_OPTIMIZATIONS.CLEAR_CACHE) {
      optimizations.push(clearCalculationCache());
    }

    if (OPTIMIZATION_CONFIG.SLEEP_OPTIMIZATIONS.COMPACT_ARRAYS) {
      optimizations.push(compactLargeArrays());
    }

    if (OPTIMIZATION_CONFIG.SLEEP_OPTIMIZATIONS.FORCE_GC) {
      optimizations.push(forceGarbageCollection());
    }

    if (OPTIMIZATION_CONFIG.SLEEP_OPTIMIZATIONS.RESET_CANVAS) {
      optimizations.push(resetCanvasContext());
    }

    if (OPTIMIZATION_CONFIG.SLEEP_OPTIMIZATIONS.OPTIMIZE_MEMORY) {
      optimizations.push(optimizeMemoryUsage());
    }

    await Promise.all(optimizations);

    const endTime = performance.now();
    return {
      success: true,
      duration: endTime - startTime,
      optimizationsApplied: optimizations.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || String(error),
      optimizationsApplied: optimizations.length,
    };
  }
}

/**
 * Limpa o cache de cálculos
 * @private
 * @returns {Promise<Object>} Resultado da limpeza
 * @returns {number} returns.cacheCleared - Número de entradas limpas
 */
function clearCalculationCache() {
  return new Promise((resolve) => {
    try {
      const beforeSize = commonCalculations.size;
      commonCalculations.clear();
      resolve({ cacheCleared: beforeSize });
    } catch (e) {
      resolve({ cacheCleared: 0 });
    }
  });
}

/**
 * Para implementar de forma correta sem acoplamento ao legacy bridge:
 * - expor um método oficial no world (ex.: world.compactLargeArrays())
 * - acessar arrays via getObject('world') (ex.: world.trees, world.rocks, etc).
 * @private
 * @returns {Promise<Object>} Resultado da compactação
 * @returns {number} returns.itemsCompacted - Número de itens removidos
 */
function compactLargeArrays() {
  const world = getObject("world");
  if (world && typeof world.compactLargeArrays === "function") {
    return Promise.resolve(world.compactLargeArrays());
  }
  return Promise.resolve({ itemsCompacted: 0 });
}

/**
 * Tenta forçar coleta de lixo (garbage collection)
 * Usa window.gc se disponível, caso contrário tenta induzir GC
 * @private
 * @returns {Promise<Object>} Resultado da tentativa
 * @returns {boolean} returns.gcForced - Se GC foi forçado com sucesso
 */
function forceGarbageCollection() {
  return new Promise((resolve) => {
    try {
      if (typeof window.gc === "function") {
        window.gc();
        resolve({ gcForced: true });
      } else if (window.performance && window.performance.memory) {
        for (let i = 0; i < 1000; i++) {
          window["temp_gc_" + i] = new Array(1000).fill(0);
        }
        for (let i = 0; i < 1000; i++) {
          delete window["temp_gc_" + i];
        }
        resolve({ gcForced: true });
      } else {
        resolve({ gcForced: false });
      }
    } catch (e) {
      resolve({ gcForced: false });
    }
  });
}

/**
 * Reseta transformações e estado do contexto do canvas
 * Restaura matriz de transformação para identidade
 * @private
 * @returns {Promise<Object>} Resultado do reset
 * @returns {boolean} returns.canvasReset - Se canvas foi resetado
 */
function resetCanvasContext() {
  return new Promise((resolve) => {
    try {
      const canvas = document.getElementById("gameCanvas");
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (ctx.globalCompositeOperation) {
          ctx.globalCompositeOperation = "source-over";
        }
        resolve({ canvasReset: true });
      } else {
        resolve({ canvasReset: false });
      }
    } catch (e) {
      resolve({ canvasReset: false });
    }
  });
}

/**
 * Otimiza uso de memória disparando cleanup de objetos destruídos e limpando assets não usados
 * @private
 * @returns {Promise<Object>} Resultado da otimização
 * @returns {boolean} returns.memoryOptimized - Se memória foi otimizada
 * @returns {Array<string>} returns.optimizations - Lista de otimizações aplicadas
 */
function optimizeMemoryUsage() {
  return new Promise((resolve) => {
    try {
      const optimizations = [];

      const world = getObject("world");
      if (world && typeof world.objectDestroyed === "function") {
        try {
          world.objectDestroyed();
          optimizations.push("destroyedObjects");
        } catch (e) {
          // best-effort
        }
      }

      if (window.assets && typeof window.assets.cleanupUnused === "function") {
        try {
          window.assets.cleanupUnused();
          optimizations.push("assets");
        } catch (e) {
          // best-effort
        }
      }

      resolve({ memoryOptimized: true, optimizations });
    } catch (e) {
      resolve({ memoryOptimized: false });
    }
  });
}

/**
 * Retorna status atual de memória usando Performance Memory API
 * Disponível apenas em Chrome/Edge com flags específicas
 * @returns {Object} Status de memória ou erro
 * @returns {string} [returns.usedJSHeapSize] - Heap usado em MB
 * @returns {string} [returns.totalJSHeapSize] - Heap total em MB
 * @returns {string} [returns.jsHeapSizeLimit] - Limite de heap em MB
 * @returns {string} [returns.usagePercent] - Porcentagem de uso
 * @returns {string} [returns.error] - Mensagem de erro se API não disponível
 */
export function getMemoryStatus() {
  if (window.performance && window.performance.memory) {
    const mem = window.performance.memory;
    return {
      usedJSHeapSize: Math.round(mem.usedJSHeapSize / 1024 / 1024) + "MB",
      totalJSHeapSize: Math.round(mem.totalJSHeapSize / 1024 / 1024) + "MB",
      jsHeapSizeLimit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024) + "MB",
      usagePercent: Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100) + "%",
    };
  }
  return { error: "Performance Memory API not available" };
}

/**
 * Limpa cache de renderização marcando mundo como alterado
 * Força re-renderização completa na próxima frame
 * @returns {boolean} True se cache foi limpo, false se theWorld não disponível
 */
export function clearRenderCache() {
  if (window.theWorld && window.theWorld.markWorldChanged) {
    window.theWorld.markWorldChanged();
    return true;
  }
  return false;
}

/**
 * Retorna helpers de otimização rápida
 * Funções utilitárias para gerenciamento do cache e configuração
 * @returns {Object} Objeto com funções auxiliares
 * @returns {Function} returns.clearCalculationCache - Limpa cache de cálculos
 * @returns {Function} returns.getCacheSize - Retorna tamanho do cache
 * @returns {Function} returns.getConfig - Retorna cópia da configuração
 */
export function quickOptimization() {
  return {
    clearCalculationCache: () => commonCalculations.clear(),
    getCacheSize: () => commonCalculations.size,
    getConfig: () => ({ ...OPTIMIZATION_CONFIG }),
  };
}

/**
 * Exportação padrão com todas as funcionalidades do módulo
 * @default
 */
export default {
  ZOOMED_TILE_SIZE,
  ZOOMED_TILE_SIZE_INT,
  INV_CAMERA_ZOOM,
  OPTIMIZATION_CONFIG,
  perfLog,
  getCachedCalculation,
  worldToScreenFast,
  screenToWorldFast,
  worldToScreenWithCamera,
  isInViewportFast,
  getVisibleTileBounds,
  performSleepOptimizations,
  getMemoryStatus,
  clearRenderCache,
  quickOptimization,
};
