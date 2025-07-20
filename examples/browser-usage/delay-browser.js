// Browser-compatible version of @oxog/delay for demo purposes
// This is a simplified version for demonstration

// Basic delay implementation
function createBasicDelay(ms, options = {}) {
    return new Promise((resolve, reject) => {
        const { signal, onProgress, progressInterval = 100 } = options;

        if (signal?.aborted) {
            reject(new Error('Delay was aborted'));
            return;
        }

        if (ms === 0) {
            resolve();
            return;
        }

        const startTime = performance.now();
        let timeoutId;
        let progressIntervalId;
        let isResolved = false;

        const cleanup = () => {
            clearTimeout(timeoutId);
            if (progressIntervalId) clearInterval(progressIntervalId);
        };

        const handleAbort = () => {
            if (!isResolved) {
                isResolved = true;
                cleanup();
                reject(new Error('Delay was cancelled'));
            }
        };

        const handleResolve = () => {
            if (!isResolved) {
                isResolved = true;
                cleanup();
                signal?.removeEventListener('abort', handleAbort);
                resolve();
            }
        };

        signal?.addEventListener('abort', handleAbort);

        if (onProgress && ms > progressInterval) {
            const updateProgress = () => {
                if (!isResolved) {
                    const elapsed = performance.now() - startTime;
                    const clampedElapsed = Math.min(elapsed, ms);
                    onProgress(clampedElapsed, ms);
                }
            };

            progressIntervalId = setInterval(updateProgress, progressInterval);
            updateProgress(); // Initial call
        }

        timeoutId = setTimeout(handleResolve, ms);
    });
}

// Time parsing utility
function parseTimeString(timeString) {
    if (typeof timeString !== 'string') {
        throw new Error('Time string must be a string');
    }

    const cleaned = timeString.trim().toLowerCase();
    
    // Handle pure numbers (assume milliseconds)
    if (/^\d+(\.\d+)?$/.test(cleaned)) {
        return parseFloat(cleaned);
    }

    const pattern = /(\d+(?:\.\d+)?)\s*([a-z]+)/g;
    const matches = [...cleaned.matchAll(pattern)];

    if (matches.length === 0) {
        throw new Error(`Invalid time string format: ${timeString}`);
    }

    let totalMs = 0;
    const timeUnits = {
        ms: 1, milliseconds: 1, millisecond: 1,
        s: 1000, sec: 1000, second: 1000, seconds: 1000,
        m: 60000, min: 60000, minute: 60000, minutes: 60000,
        h: 3600000, hr: 3600000, hour: 3600000, hours: 3600000,
        d: 86400000, day: 86400000, days: 86400000
    };

    for (const match of matches) {
        const value = parseFloat(match[1]);
        const unitStr = match[2];
        const multiplier = timeUnits[unitStr];
        
        if (!multiplier) {
            throw new Error(`Unknown time unit: ${unitStr}`);
        }

        totalMs += value * multiplier;
    }

    return totalMs;
}

// Cancellable delay implementation
function createCancellableDelay(ms, options = {}) {
    const controller = new AbortController();
    let isCancelled = false;

    const delayPromise = createBasicDelay(ms, {
        ...options,
        signal: controller.signal,
    });

    const cancellablePromise = Object.assign(delayPromise, {
        cancel() {
            if (!isCancelled) {
                isCancelled = true;
                controller.abort();
            }
        },

        isCancelled() {
            return isCancelled;
        },
    });

    if (options.signal?.aborted) {
        isCancelled = true;
    }

    options.signal?.addEventListener('abort', () => {
        isCancelled = true;
    });

    return cancellablePromise;
}

// Retry implementation
async function retryDelay(fn, options) {
    const { attempts, delay: delayMs, backoff = 'linear', onRetry } = options;
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const result = await fn();
            return result;
        } catch (error) {
            lastError = error;

            if (attempt === attempts) {
                throw new Error(`Retry exhausted after ${attempts} attempts: ${error.message}`);
            }

            if (onRetry) {
                onRetry(error, attempt);
            }

            // Calculate delay for next attempt
            let nextDelay = delayMs;
            if (backoff === 'exponential') {
                nextDelay = delayMs * Math.pow(2, attempt - 1);
            } else if (backoff === 'linear') {
                nextDelay = delayMs * attempt;
            }

            if (nextDelay > 0) {
                await createBasicDelay(nextDelay);
            }
        }
    }

    throw lastError;
}

// Throttle implementation
function throttle(fn, ms, options = {}) {
    const { leading = true, trailing = true } = options;
    let lastCallTime = 0;
    let lastInvokeTime = 0;
    let timerId;
    let lastArgs;
    let result;

    function invokeFunc(time) {
        lastInvokeTime = time;
        result = fn.apply(this, lastArgs);
        return result;
    }

    function shouldInvoke(time) {
        const timeSinceLastCall = time - lastCallTime;
        return lastCallTime === 0 || timeSinceLastCall >= ms;
    }

    function throttled(...args) {
        const time = Date.now();
        lastArgs = args;
        lastCallTime = time;

        if (shouldInvoke(time)) {
            if (timerId === undefined) {
                if (leading) {
                    return invokeFunc(time);
                }
                timerId = setTimeout(() => {
                    if (trailing) {
                        invokeFunc(Date.now());
                    }
                    timerId = undefined;
                }, ms);
            }
        } else {
            if (timerId === undefined) {
                timerId = setTimeout(() => {
                    if (trailing) {
                        invokeFunc(Date.now());
                    }
                    timerId = undefined;
                }, ms - (time - lastInvokeTime));
            }
        }
        return result;
    }

    throttled.cancel = function() {
        if (timerId !== undefined) {
            clearTimeout(timerId);
            timerId = undefined;
        }
    };

    return throttled;
}

// Debounce implementation
function debounce(fn, ms, options = {}) {
    const { leading = false, trailing = true } = options;
    let timerId;
    let lastArgs;
    let result;

    function invokeFunc() {
        result = fn.apply(this, lastArgs);
        return result;
    }

    function debounced(...args) {
        lastArgs = args;

        if (timerId) {
            clearTimeout(timerId);
        }

        if (leading && timerId === undefined) {
            result = invokeFunc();
        }

        timerId = setTimeout(() => {
            if (trailing) {
                invokeFunc();
            }
            timerId = undefined;
        }, ms);

        return result;
    }

    debounced.cancel = function() {
        if (timerId !== undefined) {
            clearTimeout(timerId);
            timerId = undefined;
        }
    };

    debounced.flush = function() {
        if (timerId !== undefined) {
            clearTimeout(timerId);
            result = invokeFunc();
            timerId = undefined;
        }
        return result;
    };

    return debounced;
}

// Browser-specific utilities
function nextFrame() {
    if (typeof requestAnimationFrame === 'undefined') {
        throw new Error('requestAnimationFrame is not available in this environment');
    }

    return new Promise(resolve => {
        requestAnimationFrame(resolve);
    });
}

// Main delay object
const delay = Object.assign(
    // Main function
    (ms, options) => createBasicDelay(ms, options),
    {
        // Time unit methods
        ms: (milliseconds, options) => createBasicDelay(milliseconds, options),
        seconds: (seconds, options) => createBasicDelay(seconds * 1000, options),
        minutes: (minutes, options) => createBasicDelay(minutes * 60 * 1000, options),
        hours: (hours, options) => createBasicDelay(hours * 60 * 60 * 1000, options),
        days: (days, options) => createBasicDelay(days * 24 * 60 * 60 * 1000, options),

        // Human-friendly syntax
        for: (timeString, options) => {
            const ms = parseTimeString(timeString);
            return createBasicDelay(ms, options);
        },

        // Cancellable delays
        cancellable: (ms, options) => createCancellableDelay(ms, options),

        // Retry mechanism
        retry: (fn, options) => retryDelay(fn, options),

        // Rate limiting
        throttle: (fn, ms, options) => throttle(fn, ms, options),
        debounce: (fn, ms, options) => debounce(fn, ms, options),

        // Browser utilities
        nextFrame: () => nextFrame(),
    }
);

export default delay;