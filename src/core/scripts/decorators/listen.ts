import type { Nullable } from '@rotomeca/utils';
import { addConnectHook, BaseElement } from '../../../components/base/BaseElement';
import { delegate } from '../utils/eventsFunctions';
import { Log } from '../utils/Log';
import type { AcceptedFunction } from '../utils/types';

/**
 * Décorateur pour attacher automatiquement un écouteur d'événement à chaque connexion.
 * La méthode décorée doit retourner la fonction de callback ; l'écouteur est retiré à la déconnexion.
 *
 * @param eventName Nom de l'événement à écouter (ex: 'click')
 * @param option Sélecteur CSS pour le délégateur (optionnel)
 */
export function Listen(
  eventName: string,
  { selector = null }: { selector?: Nullable<string> } = {},
) {
  return function (originalMethod: AcceptedFunction, context: ClassMethodDecoratorContext) {
    if (context.kind !== 'method') {
      throw new Error('@Listen ne peut être utilisé que sur des méthodes.');
    }

    context.addInitializer(function (this: unknown) {
      if (!(this instanceof BaseElement)) {
        throw new Error(
          '@Listen ne peut être utilisé que sur une classe qui hérite de BaseElement.',
        );
      }

      addConnectHook(this, (scope) => {
        const handler: unknown = originalMethod.call(this);

        if (typeof handler !== 'function') {
          Log.warn(
            '@Listen',
            `La méthode "${String(context.name)}" n'a pas renvoyé de fonction pour l'événement "${eventName}".`,
          );
          return;
        }

        const bound = handler.bind(this);
        if (selector) scope.own(delegate(this, eventName, selector, bound));
        else scope.listen(this, eventName, bound);
      });
    });
  };
}
