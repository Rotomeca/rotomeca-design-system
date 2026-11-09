import { adoptGlobalStyle } from '../../../core/scripts/utils/globalStyle';
import { supportsPopover } from '../../../core/scripts/utils/layer';
import { TAG_TOAST } from '../../../core/scripts/utils/tags';
import type { RotomecaToast, ToastType } from './toast';
import toasterStyle from './toaster.less';

export { getToaster, toast };
export type { ToastOptions };

/** Options de {@link toast}. */
interface ToastOptions {
  /** Texte de la notification. */
  message: string;
  /** Type : icône et niveau d'annonce. */
  type?: ToastType;
  /** Nom de l'icône Lucide remplaçant celle du type. */
  icon?: string;
  /** Libellé du bouton d'action. */
  action?: string;
  /** Durée en ms (5000 par défaut, `0` : jusqu'à fermeture). */
  duration?: number;
  /** Appelée au clic sur le bouton d'action. */
  onAction?: () => void;
}

const TOASTER_KEY = 'rds-toaster';

let toaster: HTMLElement | null = null;

/** Conteneur des notifications, créé à la demande dans le top layer. */
function getToaster(): HTMLElement {
  if (toaster?.isConnected) return toaster;
  const host = document.createElement('div');
  host.className = 'rds-toaster';
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('role', 'region');
  host.setAttribute('aria-label', 'Notifications');
  adoptGlobalStyle(TOASTER_KEY, toasterStyle);
  if (supportsPopover) host.setAttribute('popover', 'manual');
  document.body.append(host);
  if (supportsPopover) host.showPopover();
  toaster = host;
  return host;
}

/**
 * Affiche une notification.
 *
 * @param options - Texte seul, ou options complètes.
 * @returns L'élément `rds-toast` créé.
 *
 * @example
 * ```ts
 * toast('Enregistré');
 * toast({ message: 'Motif supprimé.', type: 'success', action: 'Annuler', onAction: restore });
 * ```
 */
function toast(options: string | ToastOptions): RotomecaToast {
  const config: ToastOptions = typeof options === 'string' ? { message: options } : options;
  const element = document.createElement(TAG_TOAST) as RotomecaToast;
  if (config.type) element.setAttribute('type', config.type);
  if (config.icon) element.setAttribute('icon', config.icon);
  if (config.action) element.setAttribute('action', config.action);
  element.setAttribute('duration', String(config.duration ?? 5000));
  element.textContent = config.message;
  if (config.onAction) element.addEventListener('rds-toast:action', config.onAction);

  const host = getToaster();
  // Le conteneur est ré-ouvert pour repasser au-dessus d'une modale déjà ouverte.
  if (supportsPopover) {
    host.hidePopover();
    host.showPopover();
  }
  host.append(element);
  return element;
}
