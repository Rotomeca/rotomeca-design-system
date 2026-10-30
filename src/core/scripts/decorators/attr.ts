import { EMPTY_STRING } from '@rotomeca/utils';
import type { AcceptedAny } from '../utils/types';

/**
 * Convertit la valeur brute d'un attribut : `''`/`'true'` → `true`, absent → `false`,
 * numérique → nombre, sinon la chaîne.
 */
function parseAttribute(raw: string | null): string | number | boolean {
  if (raw === EMPTY_STRING || raw === 'true') return true;
  if (raw === null) return false;
  const num = Number(raw);
  return Number.isNaN(num) ? raw : num;
}

/**
 * @Attr : Synchronise une propriété (auto-accessor) avec un attribut HTML.
 * Gère dynamiquement les types string, boolean et number.
 *
 * @remarks
 * Si l'attribut est absent, le getter renvoie la valeur initiale de l'accessor.
 * Limite : un booléen dont la valeur initiale est `true` ne peut pas être désactivé en
 * retirant l'attribut (la valeur initiale est alors renvoyée).
 *
 * @param attributeName - Nom de l'attribut (par défaut le nom de la propriété).
 */
export function Attr(attributeName?: string) {
  return function <This extends HTMLElement, Value>(
    target: ClassAccessorDecoratorTarget<This, Value>,
    context: ClassAccessorDecoratorContext<This, Value>,
  ): ClassAccessorDecoratorResult<This, Value> {
    const attrName = attributeName || String(context.name);

    return {
      get(this: This): Value {
        const raw = this.getAttribute(attrName);
        if (raw === null) return target.get.call(this);
        return parseAttribute(raw) as AcceptedAny;
      },
      set(this: This, value: Value) {
        if (value === null || value === undefined || value === false) {
          this.removeAttribute(attrName);
        } else {
          // Booléen `true` : attribut vide (pattern HTML standard)
          this.setAttribute(attrName, value === true ? EMPTY_STRING : String(value));
        }
      },
    };
  };
}

type DataAccessorCallback = <This extends HTMLElement, Value>(
  _target: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>,
) => ClassAccessorDecoratorResult<This, Value>;

export function Data(name: string, options: { setter?: boolean }): DataAccessorCallback;
export function Data(options: { setter?: boolean }): DataAccessorCallback;
export function Data(name: string): DataAccessorCallback;
export function Data(): DataAccessorCallback;
export function Data(
  nameOrOptions?: string | { setter?: boolean },
  maybeOptions?: { setter?: boolean },
): DataAccessorCallback {
  let attributeName: string | undefined;
  let setter = true;

  if (typeof nameOrOptions === 'string') {
    attributeName = nameOrOptions;
    setter = maybeOptions?.setter ?? true;
  } else if (typeof nameOrOptions === 'object') {
    setter = nameOrOptions.setter ?? true;
  }

  return function <This extends HTMLElement, Value>(
    target: ClassAccessorDecoratorTarget<This, Value>,
    context: ClassAccessorDecoratorContext<This, Value>,
  ): ClassAccessorDecoratorResult<This, Value> {
    // Nettoyage du nom (ex: #_icon devient icon)
    const autoName = String(context.name).replace(/^[#_]+/, '');
    const domAttrName = `data-${attributeName || autoName}`;

    return {
      get(this: This): Value {
        const raw = this.getAttribute(domAttrName);
        if (raw === null) return target.get.call(this);
        return parseAttribute(raw) as AcceptedAny;
      },
      set(this: This, value: Value) {
        if (!setter) return;
        if (value === null || value === undefined || value === false)
          this.removeAttribute(domAttrName);
        else this.setAttribute(domAttrName, value === true ? EMPTY_STRING : String(value));
      },
    };
  };
}

/**
 * Option pour Data pour indiquer qu'un accessor ne devrait pas avoir de setter.
 *
 * @example
 * ```typescript
 * @Data(NO_SETTER)
 * accessor #_label!: string;
 * ```
 */
export const NO_SETTER = { setter: false };
