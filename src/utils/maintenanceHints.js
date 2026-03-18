/**
 * Returns a maintenance recommendation hint string for the given item.
 *
 * @param {string} itemKey  - One of: 'is_oil_changed' | 'is_oil_filter' | 'is_air_filter' | 'is_cabin_filter' |
 *                            'is_fuel_filter' | 'is_belt_changed' | 'is_brake_fluid_changed'
 * @param {string} vehicleType - 'Auto' | 'Moto'
 * @param {string} driveType   - vehicle.engine_drive_type (e.g. 'Zobsiksna', 'Piedziņas ķēde', …)
 * @returns {string}  Hint text, or '' if no hint is defined for this combination.
 */
export function getMaintenanceHint(itemKey, vehicleType, driveType) {
  if (itemKey === 'is_oil_changed') {
    if (vehicleType === 'Moto') {
      return 'Ieteikums: Maina vidēji ik pēc 6 000 – 10 000 km vai reizi sezonā (pirms ziemas glabāšanas vai pavasarī).';
    }
    return 'Ieteikums: Maina vidēji ik pēc 10 000 – 15 000 km (vai 1x gadā).';
  }

  if (itemKey === 'is_brake_fluid_changed') {
    return 'Ieteikums: Maina vidēji ik pēc 2 gadiem neatkarīgi no nobrauktajiem kilometriem.';
  }

  if (itemKey === 'is_oil_filter') {
    if (vehicleType === 'Moto') {
      return 'Ieteikums: Maina katrā eļļas maiņas reizē, vidēji ik pēc 6 000 – 10 000 km (vai 1x gadā).';
    }
    return 'Ieteikums: Maina katrā eļļas maiņas reizē, vidēji ik pēc 10 000 – 15 000 km (vai 1x gadā).';
  }

  if (itemKey === 'is_air_filter') {
    if (vehicleType === 'Moto') {
      return 'Ieteikums: Vizuāla pārbaude ik pēc 6000 km, maina vidēji ik pēc 12 000 – 18 000 km (vai ik pēc 2 gadiem).';
    }
    return 'Ieteikums: Maina vidēji ik pēc 20 000 – 30 000 km (vai ik pēc 2 gadiem).';
  }

  if (itemKey === 'is_cabin_filter') {
    return 'Ieteikums: Maina vidēji ik pēc 15 000 km (vai 1x gadā, ieteicams pirms vasaras sezonas).';
  }

  if (itemKey === 'is_fuel_filter') {
    return 'Ieteikums:\nDīzelim maina ik pēc 30 000 – 60 000 km.\nBenzīnam maina ik pēc 60 000 – 100 000 km.';
  }

  if (itemKey === 'is_belt_changed') {
    const driveHints = {
      'Zobsiksna': 'Ieteikums: Maina vidēji ik pēc 100 000 – 150 000 km (vai ik pēc 5 – 6 gadiem).',
      'Dzinēja ķēde': 'Ieteikums: Pārbaude servisā ik pēc 150 000 – 200 000 km.',
      'Piedziņas ķēde': 'Ieteikums: Eļļošana 500-1000 km, maina ap 20 000 km.',
      'Kardāns': 'Ieteikums: Eļļas maiņa reduktorā vidēji ik pēc 10 000 - 20 000 km (vai 1x gadā).',
      'Piedziņas siksna': 'Ieteikums: Vizuāla pārbaude ik pēc 10 000 km, maina vidēji ap 40 000 - 60 000 km (vai ik pēc 5 gadiem).',
    };
    return driveHints[driveType] ?? '';
  }

  return '';
}
