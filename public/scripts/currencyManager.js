import { GAME_BALANCE } from './constants.js';

/**
 * Sistema de gerenciamento de moeda do jogo
 * Responsável por controlar ganhos, gastos, saldo e histórico de transações
 * Emite eventos personalizados quando o saldo é alterado
 * @class CurrencyManager
 */
export class CurrencyManager {
    /**
     * Construtor do gerenciador de moeda
     * Inicializa o saldo inicial e o histórico de transações
     */
    constructor() {
        this.initialMoney = GAME_BALANCE.ECONOMY.INITIAL_MONEY;
        this.currentMoney = this.initialMoney;
        this.transactionHistory = [];
        this.init();
    }

    /**
     * Inicializa o sistema de moeda
     * Reseta o saldo para o valor inicial e notifica mudanças
     * @returns {void}
     */
    init() {
        this.currentMoney = this.initialMoney;
        this._notifyChange();
    }

    /**
     * Retorna o saldo atual de dinheiro
     * @returns {number} Quantidade atual de dinheiro
     */
    getMoney() {
        return this.currentMoney;
    }

    /**
     * Adiciona dinheiro ao saldo do jogador
     * Registra a transação no histórico e emite evento de mudança
     * @param {number} amount - Quantidade de dinheiro a ser adicionada (deve ser positiva)
     * @param {string} [source='unknown'] - Origem do dinheiro (venda, recompensa, etc)
     * @returns {boolean} True se a operação foi bem-sucedida, false se a quantidade for inválida
     */
    earn(amount, source = "unknown") {
        if (amount <= 0) return false;

        const oldBalance = this.currentMoney;
        this.currentMoney += amount;

        this._addTransaction('earn', amount, source, oldBalance);
        this._notifyChange();

        return true;
    }

    /**
     * Remove dinheiro do saldo do jogador
     * Verifica se há saldo suficiente antes de realizar a operação
     * Registra a transação no histórico e emite evento de mudança
     * @param {number} amount - Quantidade de dinheiro a ser removida (deve ser positiva)
     * @param {string} [item='unknown'] - Descrição do item/serviço comprado
     * @returns {boolean} True se a operação foi bem-sucedida, false se a quantidade for inválida ou saldo insuficiente
     */
    spend(amount, item = "unknown") {
        if (amount <= 0) return false;
        if (this.currentMoney < amount) return false;

        const oldBalance = this.currentMoney;
        this.currentMoney -= amount;

        this._addTransaction('spend', amount, item, oldBalance);
        this._notifyChange();

        return true;
    }

    /**
     * Reseta o saldo para o valor inicial definido
     * Útil para reiniciar o jogo ou resetar o estado do jogador
     * @returns {boolean} True sempre (operação sempre bem-sucedida)
     */
    reset() {
        this.currentMoney = this.initialMoney;
        this._notifyChange();
        return true;
    }

    /**
     * Verifica se o jogador possui saldo suficiente para uma compra
     * @param {number} amount - Quantidade de dinheiro necessária
     * @returns {boolean} True se o saldo é suficiente, false caso contrário
     */
    canAfford(amount) {
        return this.currentMoney >= amount;
    }

    /**
     * Define o valor inicial e atual do saldo
     * Útil para configurar o saldo inicial ao começar um novo jogo
     * @param {number} amount - Novo valor inicial de dinheiro
     * @returns {void}
     */
    setInitialAmount(amount) {
        this.initialMoney = amount;
        this.currentMoney = amount;
        this._notifyChange();
    }

    /**
     * Retorna o histórico completo de transações
     * Limitado às últimas 100 transações
     * @returns {Array<Object>} Array de objetos de transação
     */
    getTransactionHistory() {
        return this.transactionHistory;
    }

    /**
     * Registra uma transação no histórico
     * Mantém apenas as últimas 100 transações (remove as mais antigas)
     * @private
     * @param {string} type - Tipo da transação ('earn' ou 'spend')
     * @param {number} amount - Valor da transação
     * @param {string} description - Descrição da transação (origem ou item)
     * @param {number} oldBalance - Saldo anterior à transação
     * @returns {void}
     */
    _addTransaction(type, amount, description, oldBalance) {
        this.transactionHistory.push({
            type,
            amount,
            description,
            oldBalance,
            newBalance: this.currentMoney,
            timestamp: new Date().toISOString()
        });

        if (this.transactionHistory.length > GAME_BALANCE.ECONOMY.MAX_TRANSACTION_HISTORY) {
            this.transactionHistory.shift();
        }
    }

    /**
     * Dispara evento customizado quando o dinheiro muda
     * Emite evento 'moneyChanged' com detalhes da mudança
     * Outros sistemas podem escutar este evento para atualizar UI ou reagir a mudanças
     * @private
     * @returns {void}
     * @fires document#moneyChanged
     */
    _notifyChange() {
        document.dispatchEvent(new CustomEvent('moneyChanged', {
            detail: {
                money: this.currentMoney,
                oldMoney: this._lastAmount || 0,
                difference: this.currentMoney - (this._lastAmount || 0)
            }
        }));
        this._lastAmount = this.currentMoney;
    }
}

/**
 * Evento disparado quando o saldo de dinheiro muda
 * @event document#moneyChanged
 * @type {CustomEvent}
 * @property {Object} detail - Detalhes da mudança
 * @property {number} detail.money - Novo saldo
 * @property {number} detail.oldMoney - Saldo anterior
 * @property {number} detail.difference - Diferença entre saldos (positiva para ganho, negativa para gasto)
 */

// Instancia e exporta o gerenciador de moeda
export const currencyManager = new CurrencyManager();
window.currencyManager = currencyManager;