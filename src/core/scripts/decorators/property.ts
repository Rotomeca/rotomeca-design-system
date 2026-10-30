import type { ValueOf } from '../utils/types';

export const PropertyMode = {
  default: 'rw',
  readonly: 'readonly',
  init: 'init',
} as const;
export type PropertyMode = ValueOf<typeof PropertyMode>;

export interface PropertyOptions {
  /**
   * Mode d'accès au setter :
   * - 'rw' (Read/Write) : Comportement par défaut { get; set; }
   * - 'readonly' : Setter désactivé après initialisation { get; }
   * - 'init' : Assignable une seule fois (ou null -> value) { get; init; }
   * @default 'rw'
   */
  mode?: PropertyMode;

  /**
   * Déclenche `requestUpdate('property')` lors du changement de valeur ?
   * @default false
   */
  reactive?: boolean;
}

/** Élément pouvant planifier une mise à jour (ex. `BaseElement`). */
type Updatable = { requestUpdate?: (reason?: string) => unknown };

/**
 * @Property Gère la réactivité et les droits d'accès des Auto-Accessors.
 * Simule les comportements C# { get; set; }, { get; init; } et { get; }.
 */
export function Property(options: PropertyOptions = {}) {
  const { mode = PropertyMode.default, reactive = false } = options;

  return function <This, Value>(
    target: ClassAccessorDecoratorTarget<This, Value>,
    context: ClassAccessorDecoratorContext<This, Value>,
  ): ClassAccessorDecoratorResult<This, Value> {
    const name = String(context.name);

    return {
      // L'initialisation (`accessor x = 10`) passe par init(), pas par set().
      init(initialValue: Value): Value {
        return initialValue;
      },

      get(this: This): Value {
        return target.get.call(this);
      },

      set(this: This, newValue: Value) {
        const oldValue = target.get.call(this);

        if (mode === 'readonly') {
          throw new Error(`[Property] '${name}' is ReadOnly ({ get; }).`);
        }

        // { get; init; } : assignable tant que la valeur courante est undefined/null.
        if (mode === 'init' && oldValue !== undefined && oldValue !== null) {
          throw new Error(`[Property] '${name}' is InitOnly ({ get; init; }).`);
        }

        if (oldValue === newValue) return;

        target.set.call(this, newValue);

        if (reactive) (this as Updatable).requestUpdate?.('property');
      },
    };
  };
}
