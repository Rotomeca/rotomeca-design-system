import type { BaseElement } from '../../../components/base/BaseElement';
import type { AcceptedFunction } from '../utils/types';

/**
 * Décorateur de classe : marque le composant comme se redessinant en entier
 * (`static updateAll = true`) à chaque mise à jour.
 *
 * @remarks
 * {@link BaseElement} planifie déjà `update` à chaque changement d'attribut observé ;
 * le drapeau sert aux classes dérivées pour ignorer {@link UpdateContext.attributes}
 * et reconstruire tout le rendu.
 *
 * @example
 * ```tsx
 * @Define({ ... })
 * @UpdateAll()
 * export class MyComponent extends BaseElement {}
 * ```
 */
export function UpdateAll() {
  return function (_target: AcceptedFunction, context: ClassDecoratorContext) {
    if (context.kind !== 'class') {
      throw new Error('@UpdateAll ne peut être utilisé que sur une classe.');
    }

    context.addInitializer(function () {
      (this as unknown as typeof BaseElement).updateAll = true;
    });
  };
}
