/**
 * @fileoverview Centralized API Endpoint Configuration for Gmail Checker.
 * Set isDev = true to use production workers (current).
 * Set isDev = false to point to a different environment (e.g., staging/local).
 *
 * Usage: window.API.<endpoint> everywhere in JS files.
 */

const isDev = false;

const authAPI = isDev ? "" : "https://netnit-auth.blacksoftlite.workers.dev";
const checkerAPI = isDev ? "" : "https://netnit-gc.blacksoftlite.workers.dev";
const supportAPI = isDev ? "" : "https://netnit-support.blacksoftlite.workers.dev";

const _ENDPOINTS = {
    // ── Auth / Profile Service (gc-server) ──────────────────────────────────
    GC_SERVER_BASE: authAPI,
    MAINTENANCE: authAPI + '/maintenance',
    EVENT_CONFIG: + '/admin/event-config',
    PROFILE: authAPI + '/profile',
    PRODUCTS: authAPI + '/products',
    CREATE_INVOICE: authAPI + '/create-invoice',
    CANCEL_INVOICE: authAPI + '/cancel-invoice',
    CLAIM_DAILY: + '/claim-daily-credits',
    TURBO_INCREMENT: authAPI + '/user/turbo-check/increment',
    TURBO_REFUND: + '/user/turbo-check/refund',

    // ── Gmail Checker Service (gmail-checker) ────────────────────────────────
    GC_CHECKER_BASE: checkerAPI,
    GENERATE_API_KEY: checkerAPI + '/generate-api-key',
    DELETE_API_KEY: checkerAPI + '/delete-api-key',
    GET_ALL_KEYS: checkerAPI + '/get-all-keys',
    GET_USAGE_STATS: checkerAPI + '/usage-stats',
    GET_USAGE_STATS_C: checkerAPI + '/usage-stats-c',

    // ── Support Service (gc-support) ────────────────────────────────────────
    GC_SUPPORT_BASE: supportAPI
};

const _ENDPOINTS_DEV = {

};

// Expose globally as window.API
window.API = _ENDPOINTS;

// --- Anti-Spam (429) Temporary Cache Interceptor ---
// Protects backend from rapid GET requests during fast navigation
(function () {
    const originalFetch = window.fetch;
    const fetchCache = new Map();
    // Cache duration in milliseconds (2.5 seconds)
    const CACHE_TTL = 2500;

    window.fetch = async function (...args) {
        const resource = args[0];
        const options = args[1] || {};

        // Only cache GET requests
        const isGet = !options.method || options.method.toUpperCase() === 'GET';

        if (isGet) {
            let urlString = '';
            if (typeof resource === 'string') {
                urlString = resource;
            } else if (resource instanceof URL) {
                urlString = resource.toString();
            } else if (resource instanceof Request) {
                if (resource.method.toUpperCase() !== 'GET') return originalFetch.apply(this, args);
                urlString = resource.url;
            }

            // Simple cache key includes URL and Authorization header (if present) to avoid token crossover
            let cacheKey = urlString;
            if (options.headers && options.headers.Authorization) {
                cacheKey += '|' + options.headers.Authorization;
            } else if (options.headers && typeof options.headers.get === 'function') {
                const authHeader = options.headers.get('Authorization');
                if (authHeader) cacheKey += '|' + authHeader;
            }

            if (cacheKey) {
                const now = Date.now();
                const cached = fetchCache.get(cacheKey);

                // Return cloned cached response if within TTL
                if (cached && (now - cached.timestamp < CACHE_TTL)) {
                    // console.log(`[Anti-Spam Cache] Serving cached: ${urlString}`);
                    return cached.response.clone();
                }

                // Proceed with actual fetch
                try {
                    const response = await originalFetch.apply(this, args);

                    // Cache only successful (200 OK) requests
                    if (response.ok) {
                        fetchCache.set(cacheKey, {
                            timestamp: now,
                            response: response.clone()
                        });
                    }

                    return response;
                } catch (error) {
                    throw error;
                }
            }
        }

        // Pass through non-GET or uncacheable requests
        return originalFetch.apply(this, args);
    };
})();
