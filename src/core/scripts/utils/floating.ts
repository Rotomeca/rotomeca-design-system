/** Position d'un élément flottant : `côté` ou `côté-alignement`. */
export type Placement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end';

type Side = 'top' | 'bottom' | 'left' | 'right';

const OPPOSITE: Readonly<Record<Side, Side>> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/** Marge minimale conservée entre l'élément flottant et le bord de la fenêtre, en pixels. */
const VIEWPORT_MARGIN = 8;

/**
 * Place un élément flottant (`position: fixed`) autour d'une ancre.
 *
 * @remarks
 * Le côté est inversé s'il manque de la place et que le côté opposé en offre davantage ;
 * l'élément reste ensuite dans la fenêtre. Le côté retenu est exposé via `data-side`.
 *
 * @param element - Élément à positionner.
 * @param anchor - Élément servant d'ancre.
 * @param placement - Côté et alignement souhaités.
 * @param gap - Distance entre l'ancre et l'élément, en pixels.
 */
export function placeFloating(
  element: HTMLElement,
  anchor: Element,
  placement: Placement = 'bottom-start',
  gap = 8,
): void {
  const a = anchor.getBoundingClientRect();
  const f = element.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const [rawSide, align = 'center'] = placement.split('-') as [Side, string?];
  let side: Side = rawSide;
  const room: Record<Side, number> = {
    top: a.top,
    bottom: vh - a.bottom,
    left: a.left,
    right: vw - a.right,
  };
  const need = side === 'top' || side === 'bottom' ? f.height + gap : f.width + gap;
  if (room[side] < need && room[OPPOSITE[side]] > room[side]) side = OPPOSITE[side];

  let x: number;
  let y: number;
  if (side === 'top' || side === 'bottom') {
    y = side === 'top' ? a.top - gap - f.height : a.bottom + gap;
    x =
      align === 'start'
        ? a.left
        : align === 'end'
          ? a.right - f.width
          : a.left + (a.width - f.width) / 2;
  } else {
    x = side === 'left' ? a.left - gap - f.width : a.right + gap;
    y =
      align === 'start'
        ? a.top
        : align === 'end'
          ? a.bottom - f.height
          : a.top + (a.height - f.height) / 2;
  }
  element.style.left = `${Math.round(Math.max(VIEWPORT_MARGIN, Math.min(x, vw - f.width - VIEWPORT_MARGIN)))}px`;
  element.style.top = `${Math.round(Math.max(VIEWPORT_MARGIN, Math.min(y, vh - f.height - VIEWPORT_MARGIN)))}px`;
  element.dataset.side = side;
}
