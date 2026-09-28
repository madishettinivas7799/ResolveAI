/**
 * ResolveAI Asynchronous & Reliability Utilities
 * Provides promise timeout guards and Express async error wrappers.
 */

/**
 * Wraps a promise with an enforced timeout.
 * If the promise does not resolve within `ms` milliseconds, it rejects with `errorCode`.
 */
export function withTimeout(promise, ms, errorCode = "UPSTREAM_TIMEOUT", errorMessage = "Operation timed out") {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => {
        const err = new Error(errorMessage);
        err.code = errorCode;
        err.status = 504;
        reject(err);
      }, ms);
      timer.unref?.();
    })
  ]);
}

/**
 * Express async route handler wrapper to safely catch rejected promises
 * and pass them to the centralized error middleware.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
