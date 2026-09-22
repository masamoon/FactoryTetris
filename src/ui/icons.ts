import { DEFINITIONS, PRODUCTS, geometry } from '../game/content';
import type { Kind, Resource } from '../game/types';

export function productIcon(resource: Resource, size = 22): string {
  const p = PRODUCTS[resource];
  const clipped = resource === 'clipped' || resource === 'combined';
  const punched = resource === 'punched' || resource === 'combined';
  const shape = clipped ? 'M3 3H15L23 11V23H3Z' : 'M3 3H23V23H3Z';
  const paths: Record<Resource, string> = Object.fromEntries(
    Object.keys(PRODUCTS).map((r) => [
      r,
      `<path d="${shape}"/>${punched ? '<circle cx="12" cy="14" r="4.5" fill="#29433e" stroke="#f7f0dd" stroke-width="1"/>' : ''}`,
    ])
  ) as Record<Resource, string>;
  return `<svg class="product-icon" width="${size}" height="${size}" viewBox="0 0 26 26" aria-label="${p.name}" role="img"><g fill="${p.color}" stroke="#29433e" stroke-width="1.6" stroke-linejoin="round">${paths[resource]}</g></svg>`;
}
export function pieceIcon(kind: Kind, size = 44, rotation = 0, mirrored = false): string {
  const d = DEFINITIONS[kind],
    g = geometry({ kind, x: 0, y: 0, rotation }),
    w = Math.max(...g.cells.map((c) => c.x)) + 1,
    h = Math.max(...g.cells.map((c) => c.y)) + 1;
  const color = '#' + d.color.toString(16).padStart(6, '0');
  return `<svg width="${size}" height="${size}" viewBox="-3 -3 ${w * 12 + 6} ${h * 12 + 6}" aria-hidden="true" style="transform:scaleX(${mirrored ? -1 : 1})">${g.cells.map((c) => `<rect x="${c.x * 12}" y="${c.y * 12 + 1}" width="11" height="11" rx="2" fill="#29433e"/><rect x="${c.x * 12}" y="${c.y * 12}" width="11" height="10" rx="2" fill="${color}"/>`).join('')}</svg>`;
}
