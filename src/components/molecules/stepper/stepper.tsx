import { Define } from '../../../core/scripts/decorators';
import { TAG_STEPPER } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './stepper.less';

export { RotomecaStepper };

const TEMPLATE = (
  <div part="stepper">
    <p class="count" id="count"></p>
    <p class="title" id="title"></p>
    <div class="bars" id="bars" aria-hidden="true"></div>
    <p class="next" id="next"></p>
  </div>
);

/**
 * Indicateur d'étapes pour un parcours en plusieurs écrans : « Étape 2 sur 4 », titre de l'étape,
 * barre segmentée, étape suivante.
 *
 * @remarks
 * Le segment de l'étape atteinte se remplit en `scaleX`. `role="group"` avec un nom accessible
 * qui reprend l'étape courante.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `steps` | `Informations\|Teintes\|Motifs` | Titres des étapes, séparés par `\|`. |
 * | `total` | nombre | Nombre d'étapes si `steps` est absent. |
 * | `current` | nombre (1) | Étape courante (à partir de 1). |
 *
 * @csspart stepper - Le conteneur.
 *
 * @example
 * ```html
 * <rds-stepper current="2" steps="Informations|Teintes|Motifs|Validation"></rds-stepper>
 * ```
 */
@Define({ tag: TAG_STEPPER, template: TEMPLATE, styles: style })
class RotomecaStepper extends BaseElementInternal {
  static observedAttributes: string[] = ['current', 'steps', 'total'];

  /** Étape courante (à partir de 1). */
  get current(): number {
    return this.numberAttribute('current', 1) || 1;
  }
  set current(value: number) {
    this.setStringAttribute('current', value);
  }

  /** Titres des étapes, séparés par `|`. */
  get steps(): string {
    return this.stringAttribute('steps');
  }
  set steps(value: string) {
    this.setStringAttribute('steps', value || null);
  }

  /** Nombre d'étapes sans titres. */
  get total(): number {
    return this.numberAttribute('total', 1);
  }
  set total(value: number) {
    this.setStringAttribute('total', value);
  }

  protected update(): void {
    const steps = this.steps
      .split('|')
      .map((step) => step.trim())
      .filter(Boolean);
    const count = steps.length || this.total || 1;
    const current = Math.max(1, Math.min(count, this.current));
    this.setCSSProperty('--_n', String(count));
    this.require('#count').textContent = `Étape ${current} sur ${count}`;
    this.require('#title').textContent = steps[current - 1] ?? '';

    const bars = this.require('#bars');
    if (bars.childElementCount !== count) {
      bars.replaceChildren(
        ...Array.from({ length: count }, () => {
          const bar = document.createElement('span');
          bar.className = 'bar';
          return bar;
        }),
      );
    }
    [...bars.children].forEach((bar, index) => {
      bar.toggleAttribute('data-done', index < current - 1);
      bar.toggleAttribute('data-current', index === current - 1);
    });

    const next = this.require('#next');
    next.replaceChildren();
    if (steps[current]) {
      const title = document.createElement('b');
      title.textContent = steps[current];
      next.append('Étape suivante : ', title);
    }
    this._p_internal.role = 'group';
    this._p_internal.ariaLabel = `Étape ${current} sur ${count}${steps[current - 1] ? ` : ${steps[current - 1]}` : ''}`;
  }
}
