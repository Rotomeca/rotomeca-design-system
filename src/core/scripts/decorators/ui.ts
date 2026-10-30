import { BaseElement } from '../../../components/base/BaseElement';

/**
 * @UI : Accesseur en lecture seule retournant un objet dont chaque clé résout paresseusement
 * son sélecteur dans la racine de rendu.
 *
 * @param selectorMap - Sélecteur CSS par clé.
 * @param options.shadowRoot - Cherche dans la racine de rendu plutôt que dans le Light DOM (défaut : `true`).
 */
export function UI<K extends string>(
  selectorMap: Record<K, string>,
  options?: { shadowRoot?: boolean },
) {
  const { shadowRoot = true } = options || {};

  return function <T extends HTMLElement, V extends Record<K, Element | null>>(
    _target: ClassAccessorDecoratorTarget<T, V>,
    context: ClassAccessorDecoratorContext<T, V>,
  ): ClassAccessorDecoratorResult<T, V> {
    // Symbole pour stocker l'objet UI une fois créé
    const uiCacheKey = Symbol(String(context.name));

    return {
      get(this: T): V {
        const store = this as T & { [uiCacheKey]?: V };
        if (store[uiCacheKey]) return store[uiCacheKey];

        const root = shadowRoot
          ? this instanceof BaseElement
            ? this.renderRoot
            : (this.shadowRoot ?? this)
          : this;

        const uiObject = {} as V;
        // Cache granulaire : un élément retiré du DOM est recherché à nouveau.
        const domCache = new Map<string, Element | null>();

        for (const [key, selector] of Object.entries<string>(selectorMap)) {
          Object.defineProperty(uiObject, key, {
            configurable: true,
            enumerable: true,
            get: () => {
              const cached = domCache.get(key);
              if (cached?.isConnected) return cached;

              const element = root.querySelector(selector);
              domCache.set(key, element);
              return element;
            },
            // Permet d'écraser manuellement si besoin
            set: (value: Element | null) => {
              domCache.set(key, value);
            },
          });
        }

        store[uiCacheKey] = uiObject;
        return uiObject;
      },
    };
  };
}
