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
    PROFILE: 'https://gc-server.blacksoftchild.workers.dev/profile',
    PRODUCTS: 'https://gc-server.blacksoftchild.workers.dev/products',
    CREATE_INVOICE: 'https://gc-server.blacksoftchild.workers.dev/create-invoice',
    CANCEL_INVOICE: 'https://gc-server.blacksoftchild.workers.dev/cancel-invoice',
    CLAIM_TRIAL: 'https://gc-server.blacksoftchild.workers.dev/claim-trial',

    // ── Gmail Checker Service (gmail-checker) ────────────────────────────────
    GC_CHECKER_BASE: 'https://gmail-checker.blacksoftchild.workers.dev',
    GENERATE_API_KEY: 'https://gmail-checker.blacksoftchild.workers.dev/generate-api-key',
    DELETE_API_KEY: 'https://gmail-checker.blacksoftchild.workers.dev/delete-api-key',
    GET_ALL_KEYS: 'https://gmail-checker.blacksoftchild.workers.dev/get-all-keys',
    GET_API_KEYS: 'https://gmail-checker.blacksoftchild.workers.dev/get-api-keys',
    BIND_IP: 'https://gmail-checker.blacksoftchild.workers.dev/bind-ip',
    UNBIND_IP: 'https://gmail-checker.blacksoftchild.workers.dev/unbind-ip',
    GET_IP_WHITELIST: 'https://gmail-checker.blacksoftchild.workers.dev/get-ip-whitelist',
    BIND_DOMAIN: 'https://gmail-checker.blacksoftchild.workers.dev/bind-domain',
    UNBIND_DOMAIN: 'https://gmail-checker.blacksoftchild.workers.dev/unbind-domain',
    GET_DOMAIN_WL: 'https://gmail-checker.blacksoftchild.workers.dev/get-domain-whitelist',
    CHECK1: 'https://gmail-checker.blacksoftchild.workers.dev/check1',
    CHECK2: 'https://gmail-checker.blacksoftchild.workers.dev/check2',
    FAST_CHECK1: 'https://gmail-checker.blacksoftchild.workers.dev/fast-check1',
    FAST_CHECK2: 'https://gmail-checker.blacksoftchild.workers.dev/fast-check2',
    AUTH_CHECK1: 'https://gmail-checker.blacksoftchild.workers.dev/auth-check1',
    AUTH_CHECK2: 'https://gmail-checker.blacksoftchild.workers.dev/auth-check2',
    AUTH_FAST_CHECK1: 'https://gmail-checker.blacksoftchild.workers.dev/auth-fast-check1',
    AUTH_FAST_CHECK2: 'https://gmail-checker.blacksoftchild.workers.dev/auth-fast-check2',
    GET_USAGE_STATS: 'https://gmail-checker.blacksoftchild.workers.dev/usage-stats',
    GET_USAGE_STATS_C: 'https://gmail-checker.blacksoftchild.workers.dev/usage-stats-c',

    // ── Support Service (gc-support) ────────────────────────────────────────
    GC_SUPPORT_BASE: 'https://gc-support.blacksoftchild.workers.dev',
};

const _ENDPOINTS_DEV = {
    // ── Auth / Profile Service (gc-server) ──────────────────────────────────
    GC_SERVER_BASE: 'https://sanbox-gc-server.blacksoftchild.workers.dev',
    PROFILE: 'https://sanbox-gc-server.blacksoftchild.workers.dev/profile',
    PRODUCTS: 'https://sanbox-gc-server.blacksoftchild.workers.dev/products',
    CREATE_INVOICE: 'https://sanbox-gc-server.blacksoftchild.workers.dev/create-invoice',
    CANCEL_INVOICE: 'https://sanbox-gc-server.blacksoftchild.workers.dev/cancel-invoice',
    CLAIM_TRIAL: 'https://sanbox-gc-server.blacksoftchild.workers.dev/claim-trial',

    // ── Gmail Checker Service (gmail-checker) ────────────────────────────────
    GC_CHECKER_BASE: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev',
    GENERATE_API_KEY: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/generate-api-key',
    DELETE_API_KEY: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/delete-api-key',
    GET_ALL_KEYS: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/get-all-keys',
    GET_API_KEYS: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/get-api-keys',
    BIND_IP: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/bind-ip',
    UNBIND_IP: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/unbind-ip',
    GET_IP_WHITELIST: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/get-ip-whitelist',
    BIND_DOMAIN: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/bind-domain',
    UNBIND_DOMAIN: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/unbind-domain',
    GET_DOMAIN_WL: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/get-domain-whitelist',
    CHECK1: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/check1',
    CHECK2: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/check2',
    FAST_CHECK1: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/fast-check1',
    FAST_CHECK2: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/fast-check2',
    AUTH_CHECK1: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/auth-check1',
    AUTH_CHECK2: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/auth-check2',
    AUTH_FAST_CHECK1: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/auth-fast-check1',
    AUTH_FAST_CHECK2: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/auth-fast-check2',
    GET_USAGE_STATS: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/usage-stats',
    GET_USAGE_STATS_C: 'https://sanbox-gmail-checker.blacksoftchild.workers.dev/usage-stats-c',

    // ── Support Service (gc-support) ────────────────────────────────────────
    GC_SUPPORT_BASE: 'https://sanbox-gc-support.blacksoftchild.workers.dev',
};

// Expose globally as window.API
window.API = isDev ? _ENDPOINTS_DEV : _ENDPOINTS_PROD;
