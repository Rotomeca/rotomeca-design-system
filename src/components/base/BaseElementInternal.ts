import { BaseElement } from './BaseElement';

export { BaseElementInternal };

class BaseElementInternal extends BaseElement {
  /**
   * Internals de l'élément, utilisé pour accéder aux états personnalisés.
   * @private
   */
  #_internal: ElementInternals = this.attachInternals();

  /**
   * Retourne l'objet ElementInternals associé à l'élément.
   * @protected
   */
  protected get _p_internal(): ElementInternals {
    return this.#_internal;
  }

  /**
   * Retourne l'ensemble des états personnalisés de l'élément.
   * @protected
   */
  protected get _p_states(): CustomStateSet {
    return this._p_internal.states;
  }

  /**
   * Efface tous les états personnalisés de l'élément.
   * @returns {this}
   * @protected
   */
  protected _p_clearStates(): this {
    this._p_states.clear();
    return this;
  }

  /**
   * Ajoute un état personnalisé à l'élément.
   * @param {string} state - Nom de l'état à ajouter.
   * @returns {this}
   * @protected
   */
  protected _p_addState(state: string): this {
    this._p_states.add(state);
    return this;
  }

  /**
   * Ajoute plusieurs états personnalisés à l'élément.
   * @param {string[]} states - Liste des états à ajouter.
   * @returns {this}
   * @protected
   */
  protected _p_addStates(...states: string[]): this {
    for (let index = 0, len = states.length; index < len; ++index) {
      this._p_states.add(states[index]);
    }

    return this;
  }

  /**
   * Supprime un état personnalisé de l'élément.
   * @param {string} state - Nom de l'état à supprimer.
   * @returns {this}
   * @protected
   */
  protected _p_removeState(state: string): this {
    this._p_states.delete(state);
    return this;
  }

  /**
   * Supprime plusieurs états personnalisés de l'élément.
   * @param {string[]} states - Liste des états à supprimer.
   * @returns {this}
   * @protected
   */
  protected _p_removeStates(states: string[]): this {
    for (let index = 0, len = states.length; index < len; ++index) {
      this._p_states.delete(states[index]);
    }

    return this;
  }

  /**
   * Vérifie si l'élément possède un état personnalisé donné.
   * @param {string} state - Nom de l'état à vérifier.
   * @returns {boolean}
   * @protected
   */
  protected _p_hasState(state: string): boolean {
    return this._p_states.has(state);
  }
}
