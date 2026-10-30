import { Log } from '../utils/Log';
import type { AcceptedAny } from '../utils/types';

/** Tous les endroits où le décorateur peut être posé. */
type GenericContext =
  | ClassDecoratorContext
  | ClassMethodDecoratorContext
  | ClassGetterDecoratorContext
  | ClassSetterDecoratorContext
  | ClassFieldDecoratorContext
  | ClassAccessorDecoratorContext;

const LABELS: Record<GenericContext['kind'], string> = {
  class: 'La classe',
  method: 'La méthode',
  getter: 'Le getter',
  setter: 'Le setter',
  field: 'Le champ',
  accessor: "L'accesseur",
};

/**
 * @NonStd : Signale un élément comme non standard (avertissement, ou erreur si `fatal`).
 *
 * @param reason - Raison affichée dans le message.
 * @param fatal - Lève une erreur au lieu d'un avertissement.
 */
export function NonStd(reason?: string, fatal: boolean = false) {
  return function (_value: AcceptedAny, context: GenericContext) {
    const name = String(context.name);
    const message = `${LABELS[context.kind] ?? "L'élément"} '${name}' est non standard${reason ? ` : ${reason}` : ''}.`;

    // Classe : à la définition ; membre : à la création de l'instance.
    context.addInitializer(function () {
      if (fatal) throw new Error(message);
      Log.warn(name, message);
    });
  };
}
