import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_DIALOG } from '../../../core/scripts/utils/tags';
import { RotomecaIconButton } from '../../atoms/icon-button/icon-button';
import { RotomecaIcon } from '../../atoms/icon/icon';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { hasContent } from '../../base/dom';
import style from './dialog.less';

export { RotomecaDialog };

const TEMPLATE = (
  <dialog id="dialog" part="dialog" aria-labelledby="title">
    <header part="header">
      <RotomecaIcon class="hicon" id="hicon" hidden />
      <h2 id="title">
        <span id="title-text"></span>
        <slot name="heading"></slot>
      </h2>
      <RotomecaIconButton id="close" icon="x" label="Fermer" />
    </header>
    <div class="body" part="body">
      <slot></slot>
    </div>
    <footer part="footer">
      <slot name="actions" id="actions"></slot>
    </footer>
  </dialog>
);

/**
 * Modale : `<dialog>` natif (`showModal` : focus piégé, Échap, top layer, fond inerte), titre, contenu
 * défilant et actions.
 *
 * @remarks
 * Animation : entrée en fondu + montée + zoom 0.97 → 1, voile `--ds-background-scrim` en fondu, sortie
 * animée (`@starting-style`, `allow-discrete`). L'élément `[autofocus]` du contenu reçoit le focus.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `heading` | texte | Titre (ou slot `heading`) ; nomme la modale. |
 * | `open` | booléen | Ouverte ; méthodes `show()`, `close(valeur)`. |
 * | `size` | `sm` 400 · `md` 560 (défaut) · `lg` 800 · `full` | Largeur. |
 * | `icon` | nom Lucide | Icône avant le titre (confirmation). |
 * | `persistent` | booléen | Ni Échap, ni clic sur le fond, ni ×. |
 * | `role` | `alertdialog` | Confirmation destructrice. |
 * | `data-close="valeur"` | sur un bouton enfant | Ferme avec cette valeur (`returnValue`). |
 *
 * @slot - Le contenu.
 * @slot heading - Titre riche (à la place de `heading`).
 * @slot actions - Boutons du pied de la modale.
 * @csspart dialog - Le `<dialog>` natif.
 * @csspart header - L'en-tête.
 * @csspart body - Le contenu défilant.
 * @csspart footer - Le pied.
 * @fires rds-dialog:open - Ouverture.
 * @fires rds-dialog:close - Fermeture ; `detail: { returnValue }`.
 * @cssstate has-actions - Des actions sont présentes.
 *
 * @example
 * ```html
 * <rds-dialog id="confirm" heading="Supprimer ce motif ?" icon="triangle-alert" size="sm" role="alertdialog">
 *   Cette action est définitive.
 *   <rds-tertiary-button slot="actions" data-close="cancel">Annuler</rds-tertiary-button>
 *   <rds-danger-button slot="actions" data-close="delete">Supprimer</rds-danger-button>
 * </rds-dialog>
 * ```
 */
@Define({ tag: TAG_DIALOG, template: TEMPLATE, styles: style })
class RotomecaDialog extends BaseElementInternal {
  /** Modale ouverte. */
  @Attr() accessor open: boolean = false;
  /** Ni Échap, ni clic sur le fond, ni bouton de fermeture. */
  @Attr() accessor persistent: boolean = false;

  static observedAttributes: string[] = ['open', 'heading', 'icon', 'size', 'persistent', 'role'];

  /** Titre de la modale. */
  get heading(): string {
    return this.stringAttribute('heading');
  }
  set heading(value: string) {
    this.setStringAttribute('heading', value || null);
  }

  /** Nom de l'icône placée avant le titre. */
  get icon(): string {
    return this.stringAttribute('icon');
  }
  set icon(value: string) {
    this.setStringAttribute('icon', value || null);
  }

  /** Valeur de la dernière fermeture. */
  get returnValue(): string {
    return this.require<HTMLDialogElement>('#dialog').returnValue;
  }

  /** Ouvre la modale. */
  show(): void {
    this.open = true;
  }

  /** Alias de {@link RotomecaDialog.show}. */
  showModal(): void {
    this.open = true;
  }

  /**
   * Ferme la modale.
   *
   * @param returnValue - Valeur transmise dans `rds-dialog:close`.
   */
  close(returnValue = ''): void {
    this.require<HTMLDialogElement>('#dialog').returnValue = returnValue;
    this.open = false;
  }

  protected onConnect(): void {
    const { resources } = this;
    const dialog = this.require<HTMLDialogElement>('#dialog');
    resources.listen(this.require('#close'), 'click', () => this.close('close'));
    resources.listen(dialog, 'cancel', (event) => {
      event.preventDefault();
      if (!this.persistent) this.close('cancel');
    });
    resources.listen(dialog, 'click', (event) => {
      if (event.target === dialog && !this.persistent) this.close('backdrop');
    });
    resources.listen(dialog, 'close', () => {
      if (this.open) this.removeAttribute('open');
    });
    // Un bouton portant `data-close` (ou `value`) ferme la modale avec cette valeur.
    resources.listen(this, 'click', (event) => {
      const button = (event.target as Element | null)?.closest?.('[data-close]');
      if (button && this.contains(button)) {
        this.close(button.getAttribute('data-close') || button.getAttribute('value') || 'close');
      }
    });
  }

  protected update(): void {
    const dialog = this.require<HTMLDialogElement>('#dialog');
    this.require('#title-text').textContent = this.heading;
    const icon = this.require('#hicon');
    icon.hidden = !this.icon;
    if (this.icon) icon.setAttribute('name', this.icon);
    this.#_refreshActions();
    if (this.getAttribute('role') === 'alertdialog') dialog.setAttribute('role', 'alertdialog');
    else dialog.removeAttribute('role');

    if (this.open && !dialog.open) {
      dialog.showModal();
      this.emit('rds-dialog:open', null);
      this.querySelector<HTMLElement>('[autofocus]')?.focus();
    } else if (!this.open && dialog.open) {
      dialog.close();
      this.emit('rds-dialog:close', { returnValue: dialog.returnValue });
    }
  }

  protected slotChanged(): void {
    this.#_refreshActions();
  }

  #_refreshActions(): void {
    if (hasContent(this.require<HTMLSlotElement>('#actions'))) this._p_addState('has-actions');
    else this._p_removeState('has-actions');
  }
}
