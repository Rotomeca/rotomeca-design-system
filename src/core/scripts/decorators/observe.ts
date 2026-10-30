import type { BaseElement } from '../../../components/base/BaseElement';
import type { AcceptedFunction } from '../utils/types';

type ObserveReturn = (target: AcceptedFunction, context: ClassDecoratorContext) => void;

/**
 * Décorateur de classe déclarant les attributs HTML à observer.
 *
 * Les attributs sont ajoutés à `static observedAttributes`, en conservant ceux hérités
 * (ex. `BaseFormElement`).
 *
 * @remarks
 * À placer sous `@Define` : `observedAttributes` est lu à l'enregistrement de l'élément.
 *
 * @param attribsToObserve1 - Premier attribut à observer.
 * @param attribsToObserve - Autres attributs à observer.
 * @throws {Error} Si le décorateur est appliqué hors d'une classe.
 *
 * @example
 * ```ts
 * @Define({ tag: 'my-input' })
 * @Observe('disabled', 'value', 'theme')
 * class MyInput extends BaseElement {}
 * ```
 */
export function Observe(
  attribsToObserve1: string,
  ...attribsToObserve: ReadonlyArray<string>
): ObserveReturn;
export function Observe(attribs: ReadonlyArray<string>): ObserveReturn;
export function Observe(
  attribsToObserve1: string | ReadonlyArray<string>,
  ...attribsToObserve: ReadonlyArray<string>
): ObserveReturn {
  const attributes =
    typeof attribsToObserve1 === 'string'
      ? [attribsToObserve1, ...attribsToObserve]
      : [...attribsToObserve1];

  return function (_target: AcceptedFunction, context: ClassDecoratorContext) {
    if (context.kind !== 'class') {
      throw new Error('@Observe ne peut être utilisé que sur une classe.');
    }

    context.addInitializer(function () {
      const clazz = this as unknown as typeof BaseElement;
      clazz.observedAttributes = [...new Set([...clazz.observedAttributes, ...attributes])];
    });
  };
}
