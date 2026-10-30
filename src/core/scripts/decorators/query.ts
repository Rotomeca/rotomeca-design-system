import { BaseElement } from '../../../components/base/BaseElement';

/**
 * @Query : Accesseur en lecture seule retournant le premier élément correspondant au sélecteur.
 *
 * @param selector - Sélecteur CSS.
 * @param options.cache - Garde l'élément trouvé tant qu'il est connecté (défaut : `true`).
 * @param options.shadowRoot - Cherche dans la racine de rendu plutôt que dans le Light DOM (défaut : `true`).
 */
export function Query(selector: string, options?: { cache?: boolean; shadowRoot?: boolean }) {
  const { cache = true, shadowRoot = true } = options || {};

  return function <E extends HTMLElement, V extends Element | null>(
    _target: ClassAccessorDecoratorTarget<E, V>,
    context: ClassAccessorDecoratorContext<E, V>,
  ): ClassAccessorDecoratorResult<E, V> {
    // Symbole unique par champ : pas de collision avec d'autres classes ou librairies.
    const cacheKey = Symbol(String(context.name));

    return {
      get(this: E): V {
        const store = this as E & { [cacheKey]?: V };
        const cached = store[cacheKey];
        // Un élément retiré du DOM (rendu reconstruit) invalide le cache.
        if (cache && cached?.isConnected) return cached;

        const root = shadowRoot
          ? this instanceof BaseElement
            ? this.renderRoot
            : (this.shadowRoot ?? this)
          : this;
        const result = root.querySelector(selector) as V;

        if (cache && result) store[cacheKey] = result;
        return result;
      },
    };
  };
}
