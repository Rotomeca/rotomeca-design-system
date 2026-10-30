import { BaseElement, type StyleSource } from '../../../components/base/BaseElement';
import type { AcceptedFunction } from '../utils/types';
import { Log } from '../utils/Log';

type Style = StyleSource | readonly StyleSource[];

/**
 * Options de configuration pour le décorateur `@Define`.
 */
export interface DefineOptions {
  /**
   * Le nom du tag HTML du Web Component (ex: 'ds-button').
   * Écrase `static tagName` de la classe.
   */
  tag?: string;

  /**
   * La vue JSX (chaîne HTML) ou un noeud DOM.
   * Compilée en `HTMLTemplateElement` une seule fois à la définition de la classe.
   */
  template?: string | Node;

  /**
   * Les styles CSS du composant (CSS compilé, ou `CSSStyleSheet`).
   * Un import `.less` fournit directement une chaîne CSS.
   */
  styles?: Style;
}

/**
 * Décorateur de classe pour définir un Web Component dérivé de {@link BaseElement}.
 *
 * Il gère automatiquement :
 * 1. La définition de `static tagName`.
 * 2. La création du template (`static template`), une seule fois.
 * 3. La définition des styles (`static styles`).
 * 4. L'enregistrement du Custom Element via {@link BaseElement.define}.
 *
 * @remarks
 * À placer **au-dessus** des autres décorateurs de classe (`@Observe`, `@Light`, `@UpdateAll`) :
 * les décorateurs s'appliquent de bas en haut, et `observedAttributes` ainsi que `shadowOptions`
 * doivent être posés avant l'enregistrement.
 *
 * @param options Les options de configuration (tag, template, styles)
 * @example
 * ```tsx
 * @Define({ tag: 'my-component', template: <div class="box"><slot /></div>, styles })
 * @Observe('label')
 * export class MyComponent extends BaseElement {}
 * ```
 */
export function Define(options: DefineOptions = {}) {
  return function (target: AcceptedFunction, context: ClassDecoratorContext) {
    if (context.kind !== 'class') {
      throw new Error('@Define ne peut être utilisé que sur une classe.');
    }
    if (!(target.prototype instanceof BaseElement)) {
      throw new Error('@Define ne peut être utilisé que sur une classe qui hérite de BaseElement.');
    }

    context.addInitializer(function () {
      const clazz = this as unknown as typeof BaseElement;

      if (options.tag) clazz.tagName = options.tag;

      if (!clazz.tagName) {
        Log.warn(
          '@Define',
          `La classe ${String(context.name)} n'a pas de tag défini (ni via options, ni via static tagName).`,
        );
        return;
      }

      if (options.template !== undefined) {
        const template = document.createElement('template');
        if (typeof options.template === 'string') template.innerHTML = options.template;
        else template.content.appendChild(options.template);
        clazz.template = template;
      }

      if (options.styles !== undefined) {
        clazz.styles = (
          Array.isArray(options.styles) ? options.styles : [options.styles]
        ) as readonly StyleSource[];
      }

      clazz.define();
    });
  };
}
