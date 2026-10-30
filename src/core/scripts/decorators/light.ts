import { BaseElement } from '../../../components/base/BaseElement';
import type { AcceptedFunction } from '../utils/types';

/**
 * @Light : Passe le composant en Light DOM (`static shadowOptions = null`).
 *
 * @remarks
 * À placer sous `@Define`, qui enregistre l'élément.
 */
export function Light() {
  return function (target: AcceptedFunction, context: ClassDecoratorContext) {
    if (context.kind !== 'class') {
      throw new Error('@Light ne peut être utilisé que sur une classe.');
    }

    if (!(target.prototype instanceof BaseElement))
      throw new Error('@Light ne peut être utilisé que sur une classe qui hérite de BaseElement.');

    context.addInitializer(function () {
      (this as unknown as typeof BaseElement).shadowOptions = null;
    });
  };
}
