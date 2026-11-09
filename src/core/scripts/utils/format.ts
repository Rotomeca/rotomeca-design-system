/**
 * Formate une taille en octets de façon lisible (o, Ko, Mo, Go).
 *
 * @param bytes - Taille en octets.
 * @returns Taille formatée, ex. « 1,5 Mo ».
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const units = ['Ko', 'Mo', 'Go'];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit++;
  } while (value >= 1024 && unit < units.length - 1);
  return `${new Intl.NumberFormat('fr', { maximumFractionDigits: 1 }).format(value)} ${units[unit]}`;
}
