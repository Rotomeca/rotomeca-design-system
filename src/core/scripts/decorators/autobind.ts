import type { AcceptedAny, AcceptedFunction } from '../utils/types';

/**
 * @Autobind : Lie automatiquement la méthode à l'instance.
 */
export function Autobind(originalMethod: AcceptedFunction, context: ClassMethodDecoratorContext) {
  context.addInitializer(function (this: AcceptedAny) {
    this[context.name] = originalMethod.bind(this);
  });
}
