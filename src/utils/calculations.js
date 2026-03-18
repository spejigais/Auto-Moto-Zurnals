import { format, addMonths, differenceInDays } from 'date-fns';

// remainingDays: precise days left (from differenceInDays) — used for accurate % thresholds
export function calculateAlertColor(remainingKm, remainingDays, intervalKm, intervalMonths, vehicleType) {
  // Red: Deadline exceeded (<= 0)
  if (remainingKm <= 0 || remainingDays <= 0) {
    return 'error.main';
  }

  // 10% threshold in days (30.44 avg days/month)
  const dayThreshold = intervalMonths * 30.44 * 0.1;
  // 10% threshold in km
  const kmThreshold = intervalKm * 0.1;

  let isOrange = false;

  if (vehicleType === 'Auto') {
    // Auto: 10% rule for days; 10% rule OR 1000 km floor for km
    isOrange = remainingDays <= dayThreshold || remainingKm <= Math.max(kmThreshold, 1000);
  } else if (vehicleType === 'Moto') {
    // Moto: strict 10% rule for both dimensions
    isOrange = remainingDays <= dayThreshold || remainingKm <= kmThreshold;
  }

  if (isOrange) {
    return 'warning.main';
  }

  return 'text.primary';
}

export function calculateMetrics(vehicle, logs) {
  // 1. Current Odometer (Always find max mileage)
  let currentOdometer = 0;
  if (logs && logs.length > 0) {
    currentOdometer = Math.max(...logs.map(l => l.mileage));
  }

  // 2. Formatting helper for time remainders — always returns precise days for threshold math
  const formatTimeRemaining = (lastDate, intervalMonths) => {
    if (!lastDate || !intervalMonths) return { str: 'Nav datu', days: 0 };
    const targetDate = addMonths(new Date(lastDate), intervalMonths);
    const today = new Date();
    const daysRemaining = differenceInDays(targetDate, today);

    // Always show days if <= 30 (covers exactly-30 and overdue/negative cases)
    if (daysRemaining <= 30) {
      return { str: `${daysRemaining} d.`, days: daysRemaining };
    }
    // Use rounded division to avoid "0 mēn." from integer-month flooring
    const monthsDisplay = Math.round(daysRemaining / 30.44);
    return { str: `${monthsDisplay} mēn.`, days: daysRemaining };
  };

  // Sort logs by date DESC to ensure we find the LATEST relevant log
  const sortedLogs = logs ? [...logs].sort((a, b) => new Date(b.date) - new Date(a.date) || b.mileage - a.mileage) : [];

  // --- OIL METRICS ---
  const oilLogs = sortedLogs.filter(log => log.is_oil_changed);
  const isOilIntervalSet = (vehicle.oil_interval_km || 0) > 0 && (vehicle.oil_interval_months || 0) > 0;

  let oilRemainingStr = 'Nav datu';
  let oilColor = 'text.primary';
  let oilStatus = 'missingData';

  if (oilLogs.length > 0 && isOilIntervalSet) {
    const lastOilLog = oilLogs[0];
    if (lastOilLog.mileage != null && lastOilLog.date != null) {
      oilStatus = 'ok';
      const oilDistanceRemaining = (lastOilLog.mileage + vehicle.oil_interval_km) - currentOdometer;
      const oilTime = formatTimeRemaining(lastOilLog.date, vehicle.oil_interval_months);
      oilRemainingStr = `${oilDistanceRemaining} km / ${oilTime.str}`;
      oilColor = calculateAlertColor(oilDistanceRemaining, oilTime.days, vehicle.oil_interval_km, vehicle.oil_interval_months, vehicle.type);
    }
  }

  // --- DRIVE SYSTEM (BELT) METRICS ---
  const beltLogs = sortedLogs.filter(log => log.is_belt_changed);
  const isBeltIntervalSet = (vehicle.belt_interval_km || 0) > 0 && (vehicle.belt_interval_months || 0) > 0;

  let beltRemainingStr = 'Nav datu';
  let beltColor = 'text.primary';
  let beltStatus = 'missingData';

  if (beltLogs.length > 0 && isBeltIntervalSet) {
    const lastBeltLog = beltLogs[0];
    if (lastBeltLog.mileage != null && lastBeltLog.date != null) {
      beltStatus = 'ok';
      const beltDistanceRemaining = (lastBeltLog.mileage + vehicle.belt_interval_km) - currentOdometer;
      const beltTime = formatTimeRemaining(lastBeltLog.date, vehicle.belt_interval_months);
      beltRemainingStr = `${beltDistanceRemaining} km / ${beltTime.str}`;
      beltColor = calculateAlertColor(beltDistanceRemaining, beltTime.days, vehicle.belt_interval_km, vehicle.belt_interval_months, vehicle.type);
    }
  }

  return {
    currentOdometer,
    oilRemainingStr,
    beltRemainingStr,
    oilColor,
    beltColor,
    oilStatus,
    beltStatus
  };
}
