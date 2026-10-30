import type { AcceptedAny, AcceptedFunction } from '../utils/types';

type Value = string | number | boolean;

/** Applique un attribut ; `true` donne un attribut vide, `false` le retire. */
function setAttribute(element: HTMLElement, name: string, value: Value): void {
  if (value === false) element.removeAttribute(name);
  else element.setAttribute(name, value === true ? '' : String(value));
}

/**
 * @SetAttr : Ajoute un attribut avec une valeur fixe à l'élément, après l'appel de la méthode.
 *
 * @param attributeName Nom de l'attribut à ajouter.
 * @param value Valeur de l'attribut à définir.
 */
export function SetAttr(attributeName: string, value: Value) {
  return function (originalMethod: AcceptedFunction, context: ClassMethodDecoratorContext) {
    if (context.kind !== 'method') {
      throw new Error('@SetAttr ne peut être utilisé que sur des méthodes.');
    }

    return function (this: HTMLElement, ...args: AcceptedAny[]) {
      const result = originalMethod.apply(this, args);
      setAttribute(this, attributeName, value);
      return result;
    };
  };
}

/**
 * @SetAttrs : Ajoute plusieurs attributs à l'élément, avant l'appel de la méthode.
 *
 * @param attribs Attributs à définir, indexés par nom.
 */
export function SetAttrs(attribs: Record<string, Value>) {
  return function (originalMethod: AcceptedFunction, context: ClassMethodDecoratorContext) {
    if (context.kind !== 'method') {
      throw new Error('@SetAttrs ne peut être utilisé que sur des méthodes.');
    }

    return function (this: HTMLElement, ...args: AcceptedAny[]) {
      for (const [key, value] of Object.entries(attribs)) setAttribute(this, key, value);
      return originalMethod.apply(this, args);
    };
  };
}

/**
 * @InitAttr : Définit un attribut après l'appel de la méthode, seulement s'il est absent.
 *
 * @param attributeName Nom de l'attribut.
 * @param value Valeur par défaut.
 */
export function InitAttr(attributeName: string, value: Value) {
  return function (originalMethod: AcceptedFunction, context: ClassMethodDecoratorContext) {
    if (context.kind !== 'method') {
      throw new Error('@InitAttr ne peut être utilisé que sur des méthodes.');
    }

    return function (this: HTMLElement, ...args: AcceptedAny[]) {
      const result = originalMethod.apply(this, args);
      if (!this.hasAttribute(attributeName)) setAttribute(this, attributeName, value);
      return result;
    };
  };
}
