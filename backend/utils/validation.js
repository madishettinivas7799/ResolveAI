/**
 * ResolveAI Input Validation Utilities
 * Centralized, safe, lightweight validators for API requests.
 */

/**
 * Checks if a value is a plain object (not null, not array)
 */
export function isPlainObject(val) {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

/**
 * Validates route parameter IDs (e.g. INC-1001)
 * Must be 1-50 characters: alphanumeric, hyphens, and underscores only.
 */
export function isValidId(id) {
  if (!id || typeof id !== "string") return false;
  const trimmed = id.trim();
  if (trimmed.length === 0 || trimmed.length > 50) return false;
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

/**
 * Validates a number is finite, not NaN, and within optional bounds.
 */
export function isValidNumber(val, { min = -Infinity, max = Infinity, integer = false } = {}) {
  if (typeof val !== "number" || Number.isNaN(val) || !Number.isFinite(val)) {
    return false;
  }
  if (integer && !Number.isInteger(val)) {
    return false;
  }
  return val >= min && val <= max;
}

/**
 * Standard structured validation error response
 */
export function validationError(res, message, status = 400) {
  return res.status(status).json({
    success: false,
    error: message,
    code: "VALIDATION_ERROR"
  });
}
