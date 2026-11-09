import { Attr, Define } from '../../../core/scripts/decorators';
import { reducedMotion } from '../../../core/scripts/utils/motion';
import { TAG_ALERT } from '../../../core/scripts/utils/tags';
import { RotomecaIconButton } from '../../atoms/icon-button/icon-button';
import { RotomecaIcon } from '../../atoms/icon/icon';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { hasContent } from '../../base/dom';
import style from './alert.less';

export { RotomecaAlert };
export type { AlertType };

/** Type d'une alerte. */
type AlertType = 'info' | 'success' | 'warning' | 'error';

/** Icône par défaut de chaque type. */
const ALERT_ICONS: Readonly<Record<AlertType, string>> = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  error: 'circle-alert',
};

const TEMPLATE = (
  <div class="alert" part="alert">
    <RotomecaIcon class="icon" id="icon" />
    <div class="body">
      <div class="title" id="title">
        <span id="title-text"></span>
        <slot name="title" id="title-slot"></slot>
      </div>
      <div class="text">
        <slot></slot>
      </div>
      <div class="actions">
        <slot name="actions" id="actions"></slot>
      </div>
    </div>
    <RotomecaIconButton id="close" icon="x" size="sm" label="Fermer" />
  </div>
);

/**
 * Alerte : message d'information, de succès, d'avertissement ou d'erreur, avec titre, actions et fermeture.
 *
 * @remarks
 * Toujours un texte qui dit quoi faire ; jamais la couleur seule.
 * `role="alert"` pour `error` et `warning` (annonce immédiate), `role="status"` sinon.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `type` | `info` (défaut) · `success` · `warning` · `error` | Couleurs `--ds-background-tone-*` et icône. |
 * | `heading` | texte | Titre (ou slot `title`). |
 * | `dismissible` | booléen | Bouton Fermer ; événement annulable `rds-alert:close`, puis `hidden`. |
 * | `close-label` | texte (défaut « Fermer ») | Nom accessible du bouton de fermeture. |
 * | `variant` | `banner` | Bandeau sans arrondi, en haut de page. |
 * | `size` | `sm` | Alerte compacte. |
 * | `icon` | nom Lucide | Remplace l'icône du type. |
 *
 * Animation : disparition en fondu + glissement de 6 px.
 *
 * @slot - Le message.
 * @slot title - Titre riche (à la place de `heading`).
 * @slot actions - Boutons liés à l'alerte.
 * @csspart alert - Le conteneur.
 * @fires rds-alert:close - Fermeture demandée (annulable).
 * @cssstate has-title - Un titre est présent.
 * @cssstate has-actions - Des actions sont présentes.
 *
 * @example
 * ```html
 * <rds-alert type="success" heading="Motif enregistré" dismissible>Il apparaît dans la galerie.</rds-alert>
 * ```
 */
@Define({ tag: TAG_ALERT, template: TEMPLATE, styles: style })
class RotomecaAlert extends BaseElementInternal {
  /** Type de l'alerte. */
  @Attr() accessor type: AlertType = 'info';
  /** Affiche le bouton de fermeture. */
  @Attr() accessor dismissible: boolean = false;

  static observedAttributes: string[] = ['heading', 'icon', 'close-label'];

  /** Titre de l'alerte. */
  get heading(): string {
    return this.stringAttribute('heading');
  }
  set heading(value: string) {
    this.setStringAttribute('heading', value || null);
  }

  /** Nom de l'icône remplaçant celle du type. */
  get icon(): string {
    return this.stringAttribute('icon');
  }
  set icon(value: string) {
    this.setStringAttribute('icon', value || null);
  }

  /** Ferme l'alerte (annulable via `rds-alert:close`). */
  close(): void {
    if (!this.emit('rds-alert:close', null, { cancelable: true })) return;
    const done = (): void => {
      this.hidden = true;
    };
    if (reducedMotion()) {
      done();
      return;
    }
    this.require('.alert').animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(-6px)' },
      ],
      { duration: 200, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)' },
    ).onfinish = done;
  }

  protected onConnect(): void {
    this.resources.listen(this.require('#close'), 'click', () => this.close());
  }

  protected update(): void {
    const type: AlertType = this.type in ALERT_ICONS ? this.type : 'info';
    this.require('.alert').dataset.type = type;
    this.require('#icon').setAttribute('name', this.icon || ALERT_ICONS[type]);
    this.require('#title-text').textContent = this.heading;
    this.#_refreshSlots();
    this._p_internal.role = type === 'error' || type === 'warning' ? 'alert' : 'status';
    this.require('#close').setAttribute('label', this.stringAttribute('close-label') || 'Fermer');
  }

  protected slotChanged(): void {
    this.#_refreshSlots();
  }

  #_refreshSlots(): void {
    const title = !!this.heading || hasContent(this.require<HTMLSlotElement>('#title-slot'));
    if (title) this._p_addState('has-title');
    else this._p_removeState('has-title');
    if (hasContent(this.require<HTMLSlotElement>('#actions'))) this._p_addState('has-actions');
    else this._p_removeState('has-actions');
  }
}
