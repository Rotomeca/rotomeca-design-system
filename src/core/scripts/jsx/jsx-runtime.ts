import { h, Fragment } from './index';
import type { AcceptedAny } from '../utils/types';

/**
 * Runtime JSX automatique (`jsx: "react-jsx"`) : `jsx(type, props, key)`.
 * Les enfants sont dans `props.children` ; `key` n'a pas de sens pour du HTML en chaîne.
 */
export function jsx(type: Parameters<typeof h>[0], props: Record<string, AcceptedAny>): string {
  return h(type, props);
}

export { jsx as jsxs, jsx as jsxDEV, Fragment };

// eslint-disable-next-line @typescript-eslint/no-namespace -- le runtime JSX exige un namespace
export namespace JSX {
  /** Toute expression JSX retourne une chaîne HTML. */
  export type Element = string;

  export interface IntrinsicElements {
    // Accepte n'importe quelle balise HTML ou Custom Element
    [elemName: string]: AcceptedAny;
  }

  export interface ElementChildrenAttribute {
    children: unknown;
  }
}
