import { Attr, Define } from '../../../core/scripts/decorators';
import { reducedMotion } from '../../../core/scripts/utils/motion';
import { TAG_TOAST } from '../../../core/scripts/utils/tags';
import { RotomecaIcon } from '../../atoms/icon/icon';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './toast.less';

export { RotomecaToast };
export type { ToastType };

/** Type d'une notification. */
type ToastType = '' | 'info' | 'success' | 'warning' | 'error';

/** Icône par défaut de chaque type. */
const TOAST_ICONS: Readonly<Record<string, string>> = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  error: 'circle-alert',
};

/** Durée de la sortie, en ms (alignée sur `--ds-duration-medium`). */
const LEAVE_DELAY = 220;

const TEMPLATE = (
  <div class="toast" part="toast">
    <RotomecaIcon class="icon" id="icon" hidden />
    <div class="msg">
      <slot></slot>
    </div>
    <button class="action" id="action" type="button" hidden></button>
    <button class="close" id="close" type="button" aria-label="Fermer">
      <RotomecaIcon name="x" />
    </button>
  </div>
);

/**
 * Notification éphémère (snackbar), empilée en bas à droite au-dessus de tout (top layer).
 *
 * @remarks
 * Utiliser plutôt l'API `toast()`. Le minuteur se met en pause au survol et au focus.
 * Un message court, sans information indispensable (il disparaît) ; une erreur bloquante va dans
 * une `rds-alert`. Animation : entrée par le bas en fondu, sortie vers la droite.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `type` | `info` · `success` · `warning` · `error` | Icône ; `error` est annoncé immédiatement (`role="alert"`). |
 * | `icon` | nom Lucide | Remplace l'icône du type. |
 * | `action` | texte | Bouton d'action (« Annuler »). |
 * | `duration` | ms (5000) | `0` : reste affiché jusqu'à fermeture. |
 *
 * @slot - Le message.
 * @csspart toast - Le conteneur.
 * @fires rds-toast:action - Clic sur le bouton d'action.
 * @fires rds-toast:close - Fermeture.
 * @cssstate leaving - Animation de sortie en cours.
 *
 * @example
 * ```ts
 * toast({ message: 'Motif supprimé.', type: 'success', action: 'Annuler', onAction: restore });
 * ```
 */
@Define({ tag: TAG_TOAST, template: TEMPLATE, styles: style })
class RotomecaToast extends BaseElementInternal {
  /** Type de la notification. */
  @Attr() accessor type: ToastType = '';
  /** Durée d'affichage en ms (`0` : jusqu'à fermeture). */
  @Attr() accessor duration: number = 5000;

  static observedAttributes: string[] = ['icon', 'action'];

  #_timer = 0;
  #_remaining = 0;
  #_start = 0;

  /** Nom de l'icône remplaçant celle du type. */
  get icon(): string {
    return this.stringAttribute('icon');
  }
  set icon(value: string) {
    this.setStringAttribute('icon', value || null);
  }

  /** Libellé du bouton d'action. */
  get action(): string {
    return this.stringAttribute('action');
  }
  set action(value: string) {
    this.setStringAttribute('action', value || null);
  }

  /** Ferme la notification (animation de sortie, puis retrait du DOM). */
  dismiss(): void {
    clearTimeout(this.#_timer);
    this.emit('rds-toast:close', null);
    if (reducedMotion()) {
      this.remove();
      return;
    }
    this._p_addState('leaving');
    setTimeout(() => this.remove(), LEAVE_DELAY);
  }

  protected onConnect(): void {
    const { resources } = this;
    resources.listen(this.require('#close'), 'click', () => this.dismiss());
    resources.listen(this.require('#action'), 'click', () => {
      this.emit('rds-toast:action', null);
      this.dismiss();
    });
    resources.listen(this, 'pointerenter', () => this.#_pause());
    resources.listen(this, 'pointerleave', () => this.#_resume());
    resources.listen(this, 'focusin', () => this.#_pause());
    resources.listen(this, 'focusout', () => this.#_resume());
    this.#_remaining = Number(this.duration);
    this.#_resume();
  }

  protected onDisconnect(): void {
    clearTimeout(this.#_timer);
  }

  protected update(): void {
    const iconName = this.icon || TOAST_ICONS[this.type] || '';
    const icon = this.require('#icon');
    icon.hidden = !iconName;
    if (iconName) icon.setAttribute('name', iconName);

    const action = this.require('#action');
    action.hidden = !this.action;
    action.textContent = this.action;
    this._p_internal.role = this.type === 'error' ? 'alert' : 'status';
  }

  #_pause(): void {
    clearTimeout(this.#_timer);
    if (this.#_start) this.#_remaining -= Date.now() - this.#_start;
    this.#_start = 0;
  }

  #_resume(): void {
    if (!(this.#_remaining > 0)) return;
    this.#_start = Date.now();
    clearTimeout(this.#_timer);
    this.#_timer = window.setTimeout(() => this.dismiss(), this.#_remaining);
  }
}
