/**
 * Quantity parsing and manipulation utilities
 * Ported from GroceryList.swift
 */

/**
 * Parse a number string that may contain fractions or mixed numbers
 * Handles: "1/2", "1 1/2", "2.5", "2"
 */
export function parseNumber(str: string): number | null {
  const trimmed = str.trim();

  // Handle fractions like "1/2"
  if (trimmed.includes('/') && !trimmed.includes(' ')) {
    const parts = trimmed.split('/');
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0]);
      const denominator = parseFloat(parts[1]);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        return numerator / denominator;
      }
    }
  }

  // Handle mixed numbers like "1 1/2"
  const components = trimmed.split(' ');
  if (components.length === 2 && components[1].includes('/')) {
    const whole = parseFloat(components[0]);
    const fracParts = components[1].split('/');
    if (fracParts.length === 2) {
      const numerator = parseFloat(fracParts[0]);
      const denominator = parseFloat(fracParts[1]);
      if (!isNaN(whole) && !isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        return whole + numerator / denominator;
      }
    }
  }

  // Handle regular numbers
  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format a number as a readable string
 * Converts decimals back to fractions when appropriate
 */
export function formatNumber(num: number): string {
  // Check if it's a whole number
  if (num === Math.floor(num)) {
    return num.toString();
  }

  // Common fractions
  const fractions: Record<number, string> = {
    0.125: '1/8',
    0.25: '1/4',
    0.333: '1/3',
    0.375: '3/8',
    0.5: '1/2',
    0.625: '5/8',
    0.667: '2/3',
    0.75: '3/4',
    0.875: '7/8',
  };

  const wholePart = Math.floor(num);
  const decimalPart = num - wholePart;

  // Find closest fraction
  let closestFraction = '';
  let closestDiff = 1;

  for (const [decimal, fraction] of Object.entries(fractions)) {
    const diff = Math.abs(decimalPart - parseFloat(decimal));
    if (diff < closestDiff && diff < 0.05) {
      closestDiff = diff;
      closestFraction = fraction;
    }
  }

  if (closestFraction) {
    if (wholePart === 0) {
      return closestFraction;
    }
    return `${wholePart} ${closestFraction}`;
  }

  // Fall back to decimal with one decimal place
  return num.toFixed(1).replace(/\.0$/, '');
}

/**
 * Combine two quantity strings
 * Returns a combined string or lists both if they can't be combined
 */
export function combineQuantities(q1: string, q2: string): string {
  const n1 = parseNumber(q1);
  const n2 = parseNumber(q2);

  if (n1 !== null && n2 !== null) {
    const sum = n1 + n2;
    return formatNumber(sum);
  }

  // Can't combine numerically, just list both
  return `${q1} + ${q2}`;
}

/**
 * Scale a quantity by a multiplier (for serving size changes)
 */
export function scaleQuantity(quantity: string, multiplier: number): string {
  const num = parseNumber(quantity);

  if (num !== null) {
    return formatNumber(num * multiplier);
  }

  return quantity;
}

/**
 * Get display text for an ingredient
 */
export function formatIngredient(
  name: string,
  quantity: string | null,
  unit: string | null
): string {
  const parts: string[] = [];

  if (quantity) {
    parts.push(quantity);
  }

  if (unit) {
    parts.push(unit);
  }

  parts.push(name);

  return parts.join(' ');
}
