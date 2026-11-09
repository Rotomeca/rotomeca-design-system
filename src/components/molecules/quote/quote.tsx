import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_QUOTE } from '../../../core/scripts/utils/tags';
import { RotomecaIcon } from '../../atoms/icon/icon';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './quote.less';

export { RotomecaQuote };

const TEMPLATE = (
  <figure part="figure">
    <RotomecaIcon class="mark" name="quote" />
    <blockquote id="bq">
      <slot></slot>
    </blockquote>
    <figcaption>
      <slot name="avatar"></slot>
      <span class="who">
        <span class="author" id="author"></span>
        <span class="source" id="source"></span>
      </span>
    </figcaption>
  </figure>
);

/**
 * Citation : texte mis en exergue, auteur, source (liée si `cite`) et avatar optionnel.
 *
 * @remarks
 * Rendu sémantique `<figure>` / `<blockquote cite>` / `<figcaption>`.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `author` | texte | Auteur. |
 * | `source` | texte | Source (lien si `cite`). |
 * | `cite` | URL | URL de la source. |
 * | `size` | `sm` | Version compacte. |
 * | slot `avatar` | `rds-avatar` | Avatar de l'auteur. |
 *
 * @slot - La citation.
 * @slot avatar - Avatar de l'auteur.
 * @csspart figure - Le conteneur.
 * @cssstate has-caption - Auteur ou source présents.
 *
 * @example
 * ```html
 * <rds-quote author="Équipe Rotomeca" source="Charte de conception">Des couches simples, posées avec soin.</rds-quote>
 * ```
 */
@Define({ tag: TAG_QUOTE, template: TEMPLATE, styles: style })
class RotomecaQuote extends BaseElementInternal {
  /** Taille : `sm` pour une version compacte. */
  @Attr() accessor size: string = '';

  static observedAttributes: string[] = ['author', 'source', 'cite'];

  /** Auteur de la citation. */
  get author(): string {
    return this.stringAttribute('author');
  }
  set author(value: string) {
    this.setStringAttribute('author', value || null);
  }

  /** Source de la citation. */
  get source(): string {
    return this.stringAttribute('source');
  }
  set source(value: string) {
    this.setStringAttribute('source', value || null);
  }

  /** URL de la source. */
  get cite(): string {
    return this.stringAttribute('cite');
  }
  set cite(value: string) {
    this.setStringAttribute('cite', value || null);
  }

  protected update(): void {
    const { author, source, cite } = this;
    this.require('#author').textContent = author;
    const target = this.require('#source');
    target.textContent = '';
    if (source) {
      if (cite) {
        const link = document.createElement('a');
        link.href = cite;
        link.textContent = source;
        target.append(link);
      } else target.textContent = source;
    }
    const quote = this.require('#bq');
    if (cite) quote.setAttribute('cite', cite);
    else quote.removeAttribute('cite');
    if (author || source) this._p_addState('has-caption');
    else this._p_removeState('has-caption');
  }
}
