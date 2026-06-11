/**
 * @fileoverview Centralized API Endpoint Configuration for Gmail Checker.
 * Set isDev = true to use production workers (current).
 * Set isDev = false to point to a different environment (e.g., staging/local).
 *
 * Usage: window.API.<endpoint> everywhere in JS files.
 */

const isDev = false;

const _ENDPOINTS_PROD = {
    // ── Auth / Profile Service (gc-server) ──────────────────────────────────
    GC_SERVER_BASE: 'https://gc-server.blacksoftchild.workers.dev',
    MAINTENANCE: 'https://gc-server.blacksoftchild.workers.dev/maintenance',
    EVENT_CONFIG: 'https://gc-server.blacksoftchild.workers.dev/admin/event-config',
    PROFILE: 'https://gc-server.blacksoftchild.workers.dev/profile',
    PRODUCTS: 'https://gc-server.blacksoftchild.workers.dev/products',
    CREATE_INVOICE: 'https://gc-server.blacksoftchild.workers.dev/create-invoice',
    CANCEL_INVOICE: 'https://gc-server.blacksoftchild.workers.dev/cancel-invoice',
    CLAIM_DAILY: 'https://gc-server.blacksoftchild.workers.dev/claim-daily-credits',
    TURBO_INCREMENT: 'https://gc-server.blacksoftchild.workers.dev/user/turbo-check/increment',
    TURBO_REFUND: 'https://gc-server.blacksoftchild.workers.dev/user/turbo-check/refund',

    // ── Gmail Checker Service (gmail-checker) ────────────────────────────────
    GC_CHECKER_BASE: 'https://gmail-checker.blacksoftchild.workers.dev',
    GENERATE_API_KEY: 'https://gmail-checker.blacksoftchild.workers.dev/generate-api-key',
    DELETE_API_KEY: 'https://gmail-checker.blacksoftchild.workers.dev/delete-api-key',
    GET_ALL_KEYS: 'https://gmail-checker.blacksoftchild.workers.dev/get-all-keys',
    GET_USAGE_STATS: 'https://gmail-checker.blacksoftchild.workers.dev/usage-stats',
    GET_USAGE_STATS_C: 'https://gmail-checker.blacksoftchild.workers.dev/usage-stats-c',

    // ── Support Service (gc-support) ────────────────────────────────────────
    GC_SUPPORT_BASE: 'https://gc-support.blacksoftchild.workers.dev',
};

const _ENDPOINTS_DEV = {

};

// Expose globally as window.API
window.API = isDev ? _ENDPOINTS_DEV : _ENDPOINTS_PROD;
