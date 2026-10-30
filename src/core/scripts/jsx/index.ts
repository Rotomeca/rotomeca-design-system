import { EMPTY_STRING } from '@rotomeca/utils';
import type { AcceptedAny } from '../utils/types';

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Props d'un élément JSX. */
type Props = Record<string, AcceptedAny> | null | undefined;

/** Composant fonction : reçoit ses props et ses enfants, retourne du HTML. */
type Component = (props: Record<string, AcceptedAny>) => string;

/** Classe de Custom Element exposant son nom de balise (ex. `BaseElement`). */
type ElementClass = { tagName: string };

/**
 * Fabrique JSX : produit une chaîne HTML.
 *
 * @param tag - Nom de balise, composant fonction, ou classe de Custom Element (`static tagName`).
 * @param props - Propriétés ; `children` est ignoré si des enfants sont passés en argument.
 * @param argsChildren - Enfants (chaînes, tableaux, `null`/booléens ignorés).
 * @returns Le HTML correspondant.
 */
export function h(
  tag: string | Component | ElementClass,
  props: Props,
  ...argsChildren: AcceptedAny[]
): string {
  let name: string;

  if (typeof tag === 'function') {
    const tagName = (tag as Partial<ElementClass>).tagName;
    if (typeof tagName === 'string') {
      if (!tagName) throw new Error(`[jsx] La classe ${tag.name} n'a pas de static tagName.`);
      name = tagName;
    } else {
      const children = argsChildren.length ? argsChildren : (props?.children ?? []);
      return (tag as Component)({ ...props, children });
    }
  } else name = tag as string;

  let attrs = EMPTY_STRING;
  if (props) {
    for (const key in props) {
      const value = props[key];

      if (key === 'children' || value == null || value === false) continue;

      const attrName = key === 'className' ? 'class' : key;

      if (key === 'style' && typeof value === 'object') {
        let styleStr = EMPTY_STRING;
        for (const sKey in value) styleStr += `${sKey}:${value[sKey]};`;
        attrs += ` ${attrName}="${styleStr}"`;
      } else if (value === true) {
        attrs += ` ${attrName}`;
      } else {
        attrs += ` ${attrName}="${value}"`;
      }
    }
  }

  const open = `<${name}${attrs}>`;
  if (VOID_TAGS.has(name)) return open;

  const rawChildren = argsChildren.length > 0 ? argsChildren : props?.children;
  return `${open}${renderChildren(rawChildren)}</${name}>`;
}

/** Rend récursivement les enfants en chaîne. */
function renderChildren(child: AcceptedAny): string {
  if (child == null || child === false || child === true) return EMPTY_STRING;

  if (Array.isArray(child)) {
    let str = EMPTY_STRING;
    for (const item of child) str += renderChildren(item);
    return str;
  }

  return String(child);
}

/** Fragment JSX : rend uniquement ses enfants. */
export const Fragment = (props: { children?: AcceptedAny }): string =>
  props.children ? renderChildren(props.children) : EMPTY_STRING;
