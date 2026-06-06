/**
 * =========================================================================
 * Fetch & Fill (FnF) v2.5.0 - A Modern Vanilla JS SPA Toolkit
 * =========================================================================
 * @license MIT
 * @author Mbah Babat / SIGMA CODER
 * @version 2.5.0
 * @see {@link https://github.com/sigma-coder/fnf} - Source Repository
 *
 * A powerful, lightweight, and zero-dependency toolkit for building
 * modern Single Page Applications (SPAs) with pure Vanilla JavaScript.
 * No frameworks, no bundlers, no external dependencies — just performance.
 *
 * Designed for developers who want full control without the bloat,
 * FnF enables seamless SPA navigation, dynamic content loading, and SEO-friendly
 * routing with intelligent fallbacks and robust error recovery.
 *
 * ========================================================================
 * 🔑 KEY FEATURES
 * ========================================================================
 *
 * - **SPA Navigation Engine**
 *   - Adaptive routing: supports both Clean URLs (`/about`) and Query Strings (`?page=about`).
 *   - Dynamic routes with parameters (e.g., `/blog/:slug`, `/user/:id`).
 *   - Automatic URL normalization and history management.
 *
 * - **Intelligent Content Loading**
 *   - `FnFLoad`: Fetch, sanitize, cache, and inject HTML, JSON, or plain text.
 *   - Supports `dataType: 'html' | 'json' | 'text'` with flexible rendering.
 *   - Set JSON values to element properties or attributes via `jsonProperty`.
 *
 * - **Smart Caching System**
 *   - Three-tier caching: `memory`, `session`, and persistent `slug` cache.
 *   - Auto-expiry: 5min (memory), 30min (session), 24h (slug).
 *   - Cache key normalization and corruption recovery.
 *
 * - **Hybrid Security & Sanitization**
 *   - Uses DOMPurify when available.
 *   - Secure fallback sanitizer for script/iframe/event stripping.
 *   - Optional script execution with reinitialization strategies:
 *     - `'wrap'`: Wrap in IIFE (recommended)
 *     - `'execute'`: Run directly
 *     - `'preserve'`: Clone original
 *
 * - **Anti-Loop & Shell Detection**
 *   - Prevents infinite loops by detecting:
 *     - `<meta name="fnf-redirect-shell">` (404 page returned as content)
 *     - `<meta name="fnf-root-shell">` (main app shell loaded as content)
 *   - Triggers proper error handling instead of cascading failures.
 *
 * - **Dynamic Head Management**
 *   - `FnFReplaceHeadContent`: Replace `<head>` with full deduplication.
 *   - Preserves critical tags: charset, viewport, base, structured data.
 *   - Smart updates for meta tags (title, og:, twitter:, robots, etc.).
 *   - Adds `meta[name="fragment"][content="!"]` for bot compatibility.
 *   - Caches head state for faster rehydration.
 *
 * - **Developer Tooling & Lifecycle**
 *   - Rich custom events: `fetchandfill:start`, `success`, `error`, `cachehit`, etc.
 *   - Global event: `fnf:content-rendered` (bubbles + composed).
 *   - Configurable lazy loading with IntersectionObserver.
 *   - Automatic cleanup on `popstate`, `pagehide`, `visibilitychange`.
 *
 * - **SEO-Optimized Routing**
 *   - `FnFRouter`: Resolves routes from query or clean URLs.
 *   - Generates SEO-friendly slugs from page titles or content.
 *   - Caches slugs for 24 hours to avoid redundant fetches.
 *   - Supports route prefixes (e.g., `/blog/...`) and custom params.
 *
 * - **Dynamic Navigation Manager**
 *   - `FnFNavigationManager`: Auto-generates nav menus from route config.
 *   - Lazy-hydration of link `href`s for performance.
 *   - Supports per-route and per-page buttons.
 *   - Auto-sets `active` class based on current route.
 *
 * - **Robust Error Handling**
 *   - Automatic fallback to `FnF404.html` and `FnF500.html`.
 *   - Built-in error UI (no external file needed) with 404/500/403 support.
 *   - Classifies errors: NOT_FOUND, SERVER_ERROR, PERMISSION_DENIED, GENERIC.
 *   - Prevents fallback recursion.
 *
 * - **Performance Optimizations**
 *   - Lazy loading for offscreen content.
 *   - Lazy-hydration for navigation links.
 *   - Exponential backoff retry on fetch failure.
 *   - Race-condition-proof lifecycle with `FnFCleanupAll`.
 *
 * - **Code & Content Safety**
 *   - Escapes `<code>` blocks to prevent misrendering.
 *   - Validates CSS selectors before use.
 *   - Escapes HTML in dynamic UI (e.g., error messages).
 *
 * ========================================================================
 * 📦 PUBLIC API
 * ========================================================================
 *
 * - `FnFLoad(src, target, options)` — Core content loader.
 * - `FnFRouter(config)` — SPA routing engine.
 * - `FnFNavigationManager(router, options)` — Dynamic nav generator.
 * - `FnFGenerateSlug(str)` — Convert text to URL-safe slug.
 * - `FnFCheckCleanUrlSupport()` — Detect clean URL capability.
 * - `FnFConfigureLazyLoading(options)` — Tune lazy behavior.
 * - `FnFCleanupAll()` — Abort all active requests.
 * - `FnFReplaceHeadContent(newHead, src, dispatchEvent)` — Head replacer.
 *
 * ========================================================================
 * 🧪 BROWSER SUPPORT
 * ========================================================================
 *
 * - Chrome, Firefox, Safari, Edge (latest)
 * - IntersectionObserver required for lazy features (polyfill recommended for older browsers)
 * - DOMPurify recommended for full sanitization (optional)
 *
 * ========================================================================
 * 🚀 GETTING STARTED
 * ========================================================================
 *
 * 1. Include FnF script in your HTML:
 *   
 *    <script type="module" src="fnf.js"></script>
 *  
 *
 * 2. Configure lazy loading (optional):
 *  
 *    FnFConfigureLazyLoading({ margin: '100px', threshold: 0.1 });
 * 
 *
 * 3. Use FnFLoad to load content:
 *  
 *    FnFLoad('/pages/about.html', '#main', {
 *   
 *    });
 *
 *
 * 4. Set up routing:
 *
 *    const router = new FnFRouter({
 *      routes: [...],
 *      basePath: '/'
 *    });
 *    router.start({ onNavigate: handleNavigation });
 *
 *
 * 5. Generate navigation:
 *
 *    const navManager = new FnFNavigationManager(router, { ... });
 *    navManager.mountAll({ navClass: 'navbar' });
 *   
 */


/**
 * @fileoverview
 * 
 * ============================================================================
 * FETCH & FILL (FnF) v2.5.0 - Server Configuration Guide
 * ============================================================================
 * 
 * To ensure seamless SPA navigation with clean URLs and robust fallbacks,
 * your server must be properly configured to support FnF's hybrid routing system.
 * 
 * This toolkit relies on client-side routing but requires specific server behavior
 * to handle dynamic routes, error recovery, and clean URL detection.
 * 
 * Below is the **production-ready server configuration** for common environments.
 * 
 * @summary Server setup guide for SPA routing, clean URLs, and loop prevention.
 * 
 * @tutorial server-configuration
 * 
 * @author Mbah Babat / SIGMA CODER
 * @version 2.5.0
 * @license MIT
 * 
 * ============================================================================
 * KEY SERVER REQUIREMENTS
 * ============================================================================
 * 
 * | Feature                      		| Required | Purpose                                  	|
 * |------------------------------------|-----------|------------------------------------------	|
 * | `index.html` fallback        		| ✅ Yes   	| SPA routing for clean URLs               	|
 * | Direct `.html` access        		| ✅ Yes   	| Load `FnF404.html`, `FnF500.html` directly|
 * | `X-Clean-URL` header         		| ✅ Yes   	| Fast clean URL detection                 	|
 * | `/.well-known/fnf-clean-url` 		| ✅ Yes   	| Universal clean URL support check        	|
 * | `meta[name="fnf-redirect-shell"]` 	| ✅ Yes	| Prevent infinite redirect loops       	|
 * | `path` query param handling  		| ✅ Yes   	| Recover original path after 404 redirect 	|
 * 
 * ============================================================================
 * SUPPORTED ENVIRONMENTS
 * ============================================================================
 * 
 * 1. Apache (.htaccess)
 * 2. Nginx
 * 3. Node.js (Express)
 * 4. Vercel (vercel.json)
 * 5. Netlify (netlify.toml)
 * 6. Static Hosting (GitHub Pages, Cloudflare Pages)
 * 
 * ============================================================================
 * FINAL NOTES
 * ============================================================================
 * 
 * - No server-side routing needed — FnF handles everything client-side.
 * - Error pages are fetched dynamically — no server redirects.
 * - Clean URLs are optional — fallback to query strings if unsupported.
 * - This setup prevents infinite loops via meta tags and smart redirect logic.
 * 
 * For full documentation, see: {@link https://github.com/sigma-coder/fnf}
 */

/**
 * @tutorial server-configuration
 * 
 * ============================================================================
 * 1. APACHE (.htaccess)
 * ============================================================================
 * 
 * Use this `.htaccess` to enable SPA routing while preserving access to error pages.
 * 
 * 
 * # =========================================================================
 * # FETCH & FILL (FnF) v2.5.0 - Apache Configuration
 * # =========================================================================
 * # Serves index.html for all dynamic routes.
 * # Allows direct access to .html files (e.g., FnF404.html).
 * # Adds clean URL support hint via header.
 * # =========================================================================
 * 
 * RewriteEngine On
 * RewriteBase /yourAppPath/
 * 
 * # 1. Skip existing files and directories
 * RewriteCond %{REQUEST_FILENAME} !-f
 * RewriteCond %{REQUEST_FILENAME} !-d
 * 
 * # 2. Exclude .html files from rewrite to allow direct access
 * RewriteCond %{REQUEST_URI} !\\.(html|htm)$ [NC]
 * 
 * # 3. Route all other requests to index.html
 * RewriteRule ^(.*)$ index.html [L]
 * 
 * # 4. (Optional) Allow access to internal assets
 * <FilesMatch "\\.(js|css|txt|map)$">
 *     Require all granted
 * </FilesMatch>
 * 
 * # 5. (Optional) Signal clean URL support to FnFCheckCleanUrlSupport()
 * <IfModule mod_headers.c>
 *     Header always set X-Clean-URL "supported"
 * </IfModule>
 * 
 * 
 * > Replace `/yourAppPath/` with your actual app path.
 */

/**
 * @tutorial server-configuration
 * 
 * ============================================================================
 * 2. NGINX
 * ============================================================================
 * 
 * 
 * server {
 *     listen 80;
 *     server_name example.com;
 *     root /var/www/fnf;
 *     index index.html;
 * 
 *     # SPA Routing: fallback to index.html
 *     location / {
 *         try_files $uri $uri/ /index.html;
 *     }
 * 
 *     # Allow direct access to HTML files
 *     location ~* \\.(html|htm)$ {
 *         try_files $uri =404;
 *     }
 * 
 *     # Cache static assets
 *     location ~* \\.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
 *         expires 1y;
 *         add_header Cache-Control "public, immutable";
 *     }
 * 
 *     # Signal clean URL support
 *     location = /.well-known/fnf-clean-url {
 *         add_header X-Clean-URL "supported";
 *         return 200 "";
 *     }
 * }
 *
 * 
 * > Replace `root` and `server_name` with your values.
 */

/**
 * @tutorial server-configuration
 * 
 * ============================================================================
 * 3. NODE.JS (EXPRESS)
 * ============================================================================
 * 
 * 
 * const express = require('express');
 * const path = require('path');
 * const app = express();
 * const PORT = 3000;
 * 
 * // Serve static files from 'public' folder
 * app.use(express.static(path.join(__dirname, 'public')));
 * 
 * // Allow direct access to error pages
 * app.get('/FnF404.html', (req, res) => {
 *   res.sendFile(path.join(__dirname, 'public', 'FnF404.html'));
 * });
 * 
 * app.get('/FnF500.html', (req, res) => {
 *   res.sendFile(path.join(__dirname, 'public', 'FnF500.html'));
 * });
 * 
 * // SPA fallback: all other routes → index.html
 * app.get('*', (req, res) => {
 *   res.sendFile(path.join(__dirname, 'public', 'index.html'));
 * });
 * 
 * // Endpoint for clean URL detection
 * app.head('/.well-known/fnf-clean-url', (req, res) => {
 *   res.set('X-Clean-URL', 'supported').send();
 * });
 * 
 * app.listen(PORT, () => {
 *   console.log(`FnF Server running on http://localhost:${PORT}`);
 * });
 * 
 * 
 * > Run with: `node server.js`
 */

/**
 * @tutorial server-configuration
 * 
 * ============================================================================
 * 4. VERCEL (vercel.json)
 * ============================================================================
 * 
 * 
 * {
 *   "routes": [
 *     {
 *       "src": "/\\.well-known/fnf-clean-url",
 *       "headers": {
 *         "X-Clean-URL": "supported"
 *       },
 *       "dest": "/api/empty"
 *     },
 *     {
 *       "src": "/(FnF404|FnF500)\\.html",
 *       "dest": "/$1.html"
 *     },
 *     {
 *       "src": "/(.*)",
 *       "dest": "/index.html"
 *     }
 *   ]
 * }
 * 
 * 
 * > And create `api/empty.js`:
 * 
 * export default (req, res) => res.status(200).end();
 * 
 */

/**
 * @tutorial server-configuration
 * 
 * ============================================================================
 * 5. NETLIFY (netlify.toml)
 * ============================================================================
 * 
 * 
 * [[redirects]]
 *   from = "/\\.well-known/fnf-clean-url"
 *   to = "/empty.html"
 *   status = 200
 *   headers = { X-Clean-URL = "supported" }
 * 
 * [[redirects]]
 *   from = "/FnF404.html"
 *   to = "/FnF404.html"
 *   status = 200
 * 
 * [[redirects]]
 *   from = "/FnF500.html"
 *   to = "/FnF500.html"
 *   status = 200
 * 
 * [[redirects]]
 *   from = "/*"
 *   to = "/index.html"
 *   status = 200
 * 
 * 
 * > And create `empty.html` (empty file).
 */

/**
 * @tutorial server-configuration
 * 
 * ============================================================================
 * 6. STATIC HOSTING (e.g., GitHub Pages, Cloudflare Pages)
 * ============================================================================
 * 
 * Create `404.html` as a universal redirector to prevent infinite loops.
 * 
 * 
 * <!DOCTYPE html>
 * <html>
 * <head>
 *   <meta charset="UTF-8">
 *   <!-- UNIQUE IDENTIFIER TO PREVENT LOOP -->
 *   <meta name="fnf-redirect-shell">
 * 
 *   <script type="text/javascript">
 *     // --- IMPROVED REDIRECT SCRIPT ---
 * 
 *     // 1. Define your SPA's base path
 *     const basePath = '/old/fetchAndFill/uji/';
 * 
 *     // 2. Get the originally requested path
 *     const originalFullPath = window.location.pathname;
 * 
 *     // 3. Extract the relative path (remove basePath)
 *     const relativePath = originalFullPath.startsWith(basePath)
 *       ? originalFullPath.substring(basePath.length)
 *       : originalFullPath;
 * 
 *     // 4. Preserve query and hash
 *     const originalQuery = window.location.search;
 *     const originalHash = window.location.hash;
 * 
 *     // 5. Build redirect URL with clean path as parameter
 *     const redirectUrl = new URL('index.html', window.location.origin + basePath).href +
 *                         `?path=${encodeURIComponent(relativePath)}` +
 *                         originalQuery +
 *                         originalHash;
 * 
 *     // 6. Redirect without polluting history
 *     window.location.replace(redirectUrl);
 *   </script>
 * </head>
 * <body>
 *   <p>If you are not redirected automatically, something went wrong.</p>
 * </body>
 * </html>
 * 
 * 
 * > Save as `404.html` at the root of your site.
 * 
 * ============================================================================
 * RECOVER REDIRECTED PATH IN SPA
 * ============================================================================
 * 
 * Add this script to `index.html` to restore the correct URL after redirect.
 * 
 * ```js
 * // --- RECOVER REDIRECTED PATH IN SPA ---
 * const urlParams = new URLSearchParams(window.location.search);
 * const redirectedPath = urlParams.get('path');
 * const basePath = '/old/fetchAndFill/uji/';
 * 
 * if (redirectedPath) {
 *     // Reconstruct the clean URL
 *     const newUrl = new URL(redirectedPath, window.location.origin + basePath).href;
 *     // Update browser URL without reloading
 *     history.replaceState(null, '', newUrl);
 * }
 * ```
 * 
 * > This ensures the SPA router sees the correct path and loads the intended content.
 */

/**
 * @fileoverview
 * 
 * ============================================================================
 * FETCH & FILL (FnF) v2.5.0 - Minimal Initialization Template
 * ============================================================================
 * 
 * This is the minimal bootstrapping code required to initialize the FnF SPA toolkit.
 * 
 * - Modular route configuration . You can also export and import routes, e.g. : export {routes1}; , then import,  import {routes1} from '/yourBasePath/routes/route1.js';
 * - Router setup with clean URL detection
 * - Navigation manager integration
 * - Dynamic content loading with error handling
 * - 404 redirect recovery
 * 
 * const BASE_PATH = '/yourBasePath/'; //Replace `/yourBasePath/` with your actual app path.
 *
 * import { FnFRouter, FnFLoad, FnFNavigationManager, FnFCheckCleanUrlSupport, FnFCleanupAll } from '/yourBasePath/FnF.js';// Replace `/yourBasePath/` with your actual app path.
 *
 *const routes1 = [
 *  {
 *    name: 'pages',
 *    slugParam: 'page',
 *    slugPrefix: 'page',
 *    slugSource: 'title', // Generate slug from page title
 *    nav_container: '#main-nav', // Navigation container
 *    FnFRoot: true, // Set as default route
 *    pages: [
 *      {
 *        id: 'home',
 *        name: 'Home Page',
 *        src: 'content/pages/home.html'
 *      },
 *      {
 *        id: 'help',
 *        name: 'Help Center',
 *        src: 'content/pages/help.html'
 *      },
 *      {
 *        id: 'about',
 *        name: 'About Us',
 *        src: 'content/pages/about.html'
 *      },
 *      {
 *        id: 'contact',
 *        name: 'Contact Us',
 *        src: 'content/pages/contact.html'
 *      }
 *    ]
 *  }
 *];
 *
 * const routes2 = [
 *  {
 *    name: 'tools',
 *    slugParam: 'tool',
 *    slugPrefix: 'tool',
 *    slugSource: 'h1', // Generate slug from <h1> content
 *    nav_container: '#toolNav',
 *    pages: [
 *      {
 *        id: 'calculator',
 *        name: 'My Calculator',
 *        src: 'content/tools/calculator.html',
 *        button_container: '#calculator-link' // Standalone button
 *      },
 *      {
 *        id: 'calendar',
 *        name: 'My Calendar',
 *        src: 'content/tools/calendar.html',
 *        srcSelector: '.calendar-body' // Load only specific part
 *      },
 *      {
 *        id: 'stopwatch',
 *        name: 'My Stopwatch',
 *        src: 'content/tools/stopwatch.html'
 *      }
 *    ]
 *  }
 *];
 *
 *const routes3 = [
 *  {
 *    name: 'articles',
 *    slugParam: 'article',
 *    slugPrefix: 'article',
 *    slugSource: 'title',
 *    nav_container: '#articleNav',
 *    pages: [
 *      {
 *        id: 'SinglePageApplication',
 *        name: 'Single-page Application',
 *        src: 'https://en.wikipedia.org/wiki/Single-page_application' // External page
 *      },
 *      {
 *        id: 'SinglePageApplicationSelector',
 *        name: 'SPA Wiki',
 *        src: 'https://en.wikipedia.org/wiki/Single-page_application',
 *        srcSelector: '#bodyContent' // Extract only main content
 *      }
 *    ]
 *  }
 *];
 *
 *const routes4 = [
 *  {
 *    name: 'user_profile',
 *    slugParam: 'profile',
 *    slugPrefix: 'profile',
 *    slugSource: 'path', // Use path pattern for dynamic routes
 *    pages: [
 *      {
 *        id: 'user_profile',
 *        src: 'profile.html',
 *        path: ':userId' // Dynamic route: /profile/123
 *      }
 *    ]
 *  },
 *  {
 *    name: 'user_post',
 *    slugParam: 'profile',
 *    slugPrefix: 'profile',
 *    slugSource: 'path',
 *    pages: [
 *      {
 *        id: 'user_post',
 *        src: 'post.html',
 *        path: ':userId/posts/:postId' // Multi-param: /profile/123/posts/456
 *      }
 *    ]
 *  },
 *  {
 *    name: 'user_settings',
 *    slugParam: 'profile',
 *    slugPrefix: 'profile',
 *    slugSource: 'path',
 *    pages: [
 *      {
 *        id: 'user_settings',
 *        src: 'settings.html',
 *        path: ':userId/profile-settings' // /profile/123/profile-settings
 *      }
 *    ]
 *  }
 *];
 *
 * // Combine all routes
 *const routes = [...routes1, ...routes2, ...routes3, ...routes4];
 *
 *
 *const BASE_PATH = '/yourBasePath/'; // Change this to your app's base path
 *
 * =============================
 * GLOBAL INSTANCES
 *=============================
 *
 *let router;
 *
 *
 *let navManager;
 * =============================
 * CONTENT LOADER
 * =============================
 *function loadContent(src, userOptions = {}) {
 *  return new Promise((resolve, reject) => {
 *    FnFCleanupAll();
 *    const options = {
 *      basePath: BASE_PATH,
 *      onSuccess: resolve,
 *      onError: (detail) => reject(detail.error),
 *      ...userOptions
 *    };
 *    FnFLoad(src, '#FnFRoot', options);
 *  });
 *}
 * =============================
 * BOOTSTRAP FUNCTION
 * =============================
 *async function bootstrapApp() {
 *  console.log("🚀 Bootstrapping FnF Application...");
 *  
 *  const isCleanUrlSupported = await FnFCheckCleanUrlSupport();
 *  
 *  router = new FnFRouter({
 *    routes,
 *    basePath: BASE_PATH
 *  });
 *  
 *  navManager = new FnFNavigationManager(router, {
 *    routes,
 *    basePath: BASE_PATH,
 *    isCleanUrlSupported
 *  });
 *  
 *  navManager.mountAll({
 *    navClass: 'nav-menu',
 *    itemClass: 'nav-item',
 *    linkClass: 'nav-link',
 *    buttonClass: 'nav-button'
 *  });
 *
 *  // Recover from 404 redirect
 *  const urlParams = new URLSearchParams(window.location.search);
 *  const redirectedPath = urlParams.get('path');
 *  if (redirectedPath) {
 *    const newUrl = new URL(redirectedPath, window.location.origin + BASE_PATH).href;
 *    history.replaceState(null, '', newUrl);
 *  }
 *
 *  // Start routing
 *  router.start({
 *    onNavigate: async () => {
 *      let routeResult;
 *      try {
 *        routeResult = await router.resolveCurrentRoute();
 *        const loadOptions = {};
 *        if (routeResult.pageObj && routeResult.pageObj.srcSelector) {
 *          loadOptions.srcSelector = routeResult.pageObj.srcSelector;
 *        }
 *        await loadContent(routeResult.src, loadOptions);
 *      } catch (error) {
 *        console.warn(`FnF: Navigation failed (${error.message}). Initiating 404 sequence.`);
 *      }
 *   }
 *  });
 *
 *  console.log("✅ Application Ready!");
 *}
 *
 * =============================
 * START THE APP
 * =============================
 *bootstrapApp();
 *
 */

console.log(`
%cFnF v2.5.0 %c- The Vanilla JS Powerhouse
%c▲ Built with pure JavaScript. No framework. No bundle. Just speed.
`, 'color: #ff6b6b; font-weight: bold', 'color: #4ecdc4', 'color: #a0a0a0');


/**
 * ====================================================================
 * GLOBAL STATE & CONFIGURATION
 * ====================================================================
 * These variables and constants are used throughout the FnF module.
 */

// In-memory cache for fetch responses.
const fetchCache = new Map();
// Prefix for all custom events dispatched by the library.
const EVENT_PREFIX = 'fetchandfill:';
// A global Set to track all active loader instances for easy cleanup.
const activeLoaders = new Set();
// Global cache for the clean URL detection result to prevent redundant requests.
let _isCleanUrlSupported = null;


/**
 * ====================================================================
 * GLOBAL CACHE SYSTEM
 * ====================================================================
 */
const CACHE_EXPIRY = {
	MEMORY: 5 * 60 * 1000, // 5 menit
	SESSION: 30 * 60 * 1000, // 30 menit
	SLUG: 24 * 60 * 60 * 1000 // 24 jam
};


/**
 * Stores data in a persistent, type-based cache with timestamp.
 * Supports three storage layers: memory (Map), session (sessionStorage), and slug (localStorage).
 *
 * @param {string} key - Unique identifier for the cached data.
 * @param {*} data - The data to cache (string, object, etc.).
 * @param {'memory'|'session'|'slug'} [type='memory'] - Cache storage type:
 * - 'memory': Short-term, in-memory (Map), cleared on page reload.
 * - 'session': Medium-term, sessionStorage, cleared on tab close.
 * - 'slug': Long-term, localStorage, persists for 24h (used for SEO slugs).
 *
 * @example
 * setCache('page:/about', '<p>About us</p>', 'memory');
 * setCache('slug:blog-post-1', 'this-is-my-post', 'slug');
 */
function setCache(key, data, type = 'memory') {
	const entry = {
		data,
		timestamp: Date.now()
	};

	if (type === 'memory') {
		fetchCache.set(key, entry);
	} else if (type === 'session') {
		sessionStorage.setItem(key, JSON.stringify(entry));
	} else if (type === 'slug') {
		const slugCache = JSON.parse(localStorage.getItem('fnf_slug_cache') || '{"data":{}}');
		slugCache.data[key] = entry;
		localStorage.setItem('fnf_slug_cache', JSON.stringify(slugCache));
	}
}


/**
 * Retrieves data from cache if it exists and hasn't expired.
 * Automatically validates expiry based on cache type and clears expired entries.
 *
 * @param {string} key - Key used to retrieve the cached data.
 * @param {'memory'|'session'|'slug'} [type='memory'] - Cache storage type to check.
 * @returns {*} The cached data if valid; `null` if not found or expired.
 *
 * @description
 * Expiry times:
 * - memory: 5 minutes
 * - session: 30 minutes
 * - slug: 24 hours
 *
 * If cache is corrupted (e.g., invalid JSON), it's automatically cleared.
 *
 * @example
 * const content = getCache('page:/about', 'memory');
 * if (content) console.log('Loaded from cache');
 */
function getCache(key, type = 'memory') {
	try {
		let entry;

		if (type === 'memory') {
			entry = fetchCache.get(key);
		} else if (type === 'session') {
			const cached = sessionStorage.getItem(key);
			entry = cached ? JSON.parse(cached) : null;
		} else if (type === 'slug') {
			const slugCache = JSON.parse(localStorage.getItem('fnf_slug_cache') || '{"data":{}}');
			entry = slugCache.data[key] || null;
		}

		if (!entry) return null;

		// Periksa expiry berdasarkan tipe cache
		const expiry = CACHE_EXPIRY[type.toUpperCase()];
		if (expiry && Date.now() - entry.timestamp < expiry) {
			return entry.data;
		}

		// Hapus jika expired
		if (type === 'memory') {
			fetchCache.delete(key);
		} else if (type === 'session') {
			sessionStorage.removeItem(key);
		} else if (type === 'slug') {
			const slugCache = JSON.parse(localStorage.getItem('fnf_slug_cache') || '{"data":{}}');
			delete slugCache.data[key];
			localStorage.setItem('fnf_slug_cache', JSON.stringify(slugCache));
		}
		return null;
	} catch (e) {
		if (type === 'slug') {
			try {
				localStorage.removeItem('fnf_slug_cache');
			} catch (storageErr) {
				console.warn('FnF: Failed to reset slug cache', storageErr);
			}
		}
		console.warn(`FnF: Cache retrieval error for ${key} (${type})`, e);
		return null;
	}
}


/**
 * ====================================================================
 * LIFECYCLE & AUTO-CLEANUP MANAGEMENT
 * ====================================================================
 * Functions to handle the SPA lifecycle and prevent memory leaks
 * by automatically cleaning up listeners and observers.
 */

/**
 * Aborts all active FnF loaders. This is crucial for preventing race
 * conditions during SPA navigation by ensuring no outdated or redundant
 * fetch operations continue after a route change.
 *
 * This function is typically called automatically during SPA navigation,
 * but can also be invoked manually in edge cases.
 *
 * @public
 * @function FnFCleanupAll
 * @returns {void}
 *
 * @example
 * // Manually clean up all active requests
 * FnFCleanupAll();
 */
function FnFCleanupAll() {
	activeLoaders.forEach(loader => loader.abort());
	activeLoaders.clear();
}


/**
 * Sets up automatic cleanup of active requests during SPA navigation.
 * It patches the browser's `history.pushState` and `history.replaceState`
 * methods to dispatch a custom `spa-navigate` event, which triggers cleanup.
 *
 * Also listens to `popstate` and `spa-navigate` events to ensure proper
 * lifecycle management across history changes.
 *
 * @private
 * @function setupSPACleanup
 * @returns {void}
 *
 * @listens window:popstate
 * @listens window:spa-navigate
 * @fires spa-navigate - Dispatched when navigation occurs via history API.
 *
 * @description
 * If patching history fails (e.g., in restricted environments), falls back
 * to cleaning up on `load` event as a safety net.
 */
function setupSPACleanup() {
	try {
		const originalPushState = history.pushState;
		const originalReplaceState = history.replaceState;
		const onNavigate = () => window.dispatchEvent(new Event('spa-navigate'));

		history.pushState = function () {
			originalPushState.apply(this, arguments);
			onNavigate();
		};
		history.replaceState = function () {
			originalReplaceState.apply(this, arguments);
			onNavigate();
		};
		window.addEventListener('popstate', onNavigate);
		window.addEventListener('spa-navigate', FnFCleanupAll);
	} catch (error) {
		console.error('FnF: SPA cleanup setup failed:', error);
		// Fallback for environments where history patching is not possible.
		window.addEventListener('load', FnFCleanupAll);
	}
}


/**
 * Sets up cleanup listeners for window-level lifecycle events to prevent
 * memory leaks from dangling requests or observers when the user leaves
 * the page or hides the tab.
 *
 * Ensures that all active FnF loaders are aborted in time-sensitive scenarios.
 *
 * @private
 * @function setupWindowCleanup
 * @returns {void}
 *
 * @listens window:beforeunload - Cleanup just before page unloads.
 * @listens window:pagehide - For faster unload detection in modern browsers.
 * @listens document:visibilitychange - Abort if tab becomes hidden.
 */

function setupWindowCleanup() {
	window.addEventListener('beforeunload', FnFCleanupAll);
	window.addEventListener('pagehide', FnFCleanupAll);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			FnFCleanupAll();
		}
	});
}

// Automatically initialize cleanup listeners in a browser environment.
if (typeof window !== 'undefined') {
	setupSPACleanup();
	setupWindowCleanup();
}

/**
 * ====================================================================
 * UTILITY & CONFIGURATION FUNCTIONS
 * ====================================================================
 * Public helper functions for common tasks and configuration.
 */

// Default configuration for the lazy loading feature.
const lazyConfig = {
	enabled: true,
	margin: '200px',
	threshold: 0.01,
	disableForAboveFold: true
};


/**
 * Configures the global lazy loading behavior for all FnFLoad instances.
 * @public
 * @param {object} [options={}] - Configuration options.
 * @param {boolean} [options.enabled] - Enable or disable lazy loading.
 * @param {string} [options.margin] - Root margin for the IntersectionObserver (e.g., '200px').
 * @param {number} [options.threshold] - Intersection threshold (0.0 to 1.0).
 * @param {boolean} [options.disableForAboveFold] - If true, immediately load content that is already in the viewport.
 */
function FnFConfigureLazyLoading(options = {}) {
	Object.assign(lazyConfig, options);
}


/**
 * Determines whether a given DOM element is currently visible in the viewport.
 *
 * Useful for implementing lazy loading, animations, or conditional rendering.
 *
 * @public
 * @function isElementInViewport
 * @param {Element} el - The DOM element to check.
 * @returns {boolean} `true` if the element is at least partially in the viewport.
 *
 * @throws {TypeError} If `el` is not a valid DOM element.
 *
 * @example
 * if (isElementInViewport(document.getElementById('hero'))) {
 *   console.log('Hero section is visible');
 * }
 */
function isElementInViewport(el) {
	const rect = el.getBoundingClientRect();
	return (
		rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
		rect.bottom >= 0 &&
		rect.left <= (window.innerWidth || document.documentElement.clientWidth) &&
		rect.right >= 0
	);
}


/**
 * Replaces the current document <head> with a new one, preserving critical elements
 * and intelligently deduplicating tags to prevent conflicts. Supports dynamic meta
 * updates, structured data preservation, and bot compatibility.
 *
 * Designed for SPA navigation to maintain SEO, social sharing, and theme integrity.
 *
 * @public
 * @function FnFReplaceHeadContent
 * @param {HTMLHeadElement} newHead - The new <head> element to apply (usually from fetched page).
 * @param {string} src - Source identifier (e.g., URL of the loaded page) used for caching.
 * @param {function} [dispatchEvent] - Optional callback to dispatch custom events with details.
 *
 * @description
 * Key features:
 * - ✅ **Cache-aware**: Uses memory cache (`head:${src}`) to avoid redundant parsing.
 * - ✅ **Preserves critical tags**: charset, viewport, base, and structured data (JSON-LD).
 * - ✅ **Deduplication**: Prevents duplicate links/styles/meta by key-based hashing.
 * - ✅ **Dynamic meta updates**: Updates title, og:, twitter:, robots, theme-color, etc.
 * - ✅ **Bot compatibility**: Adds `<meta name="fragment" content="!">` for crawlers.
 * - ✅ **Error recovery**: Falls back to original head on failure.
 * - ✅ **Performance**: Uses `createDocumentFragment` and `cloneNode` for safe DOM ops.
 *
 * Emits events if `dispatchEvent` is provided:
 * - `head-replaced`: On success, includes duration and head snapshot.
 * - `head-replace-error`: On failure, includes error message.
 *
 * @fires head-replaced - When head is successfully replaced.
 * @fires head-replace-error - When head replacement fails.
 *
 * @example
 * FnFReplaceHeadContent(fetchedHead, '/about', (event, detail) => {
 *   console.log(`Head updated in ${detail.duration}ms`);
 * });
 */
function FnFReplaceHeadContent(newHead, src, dispatchEvent) {
	// Phase 0: Prep work
	const originalHead = document.head.cloneNode(true);
	const startTime = performance.now();
	const cacheKey = `head:${src}`;

	const cachedHead = getCache(cacheKey, 'memory');

	if (cachedHead) {
		try {
			const fragment = document.createDocumentFragment();
			const headClone = cachedHead.cloneNode(true);

			while (headClone.firstChild) {
				fragment.appendChild(headClone.firstChild);
			}

			document.head.replaceChildren(fragment);
			_restoreCriticalElements(document.head, originalHead);

			const duration = performance.now() - startTime;

			if (typeof dispatchEvent === 'function') {
				dispatchEvent('head-replaced', {
					src,
					duration,
					fromCache: true
				});
			}
			return;
		} catch (e) {
			console.warn('FnF: Failed to restore head from cache', e);
		}
	}

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(newHead.outerHTML, 'text/html');
		newHead = doc.head;

		// Phase 1: Critical preservation
		const preservedSelectors = [
			'meta[charset]',
			'meta[http-equiv="Content-Type" i]',
			'meta[name="viewport" i]',
			'base',
			'base[href]'
		];

		const preservedElements = new Map();
		preservedSelectors.forEach(selector => {
			const el = document.head.querySelector(selector);
			if (el) preservedElements.set(selector, el.cloneNode(true));
		});

		// Phase 2: Structured data preservation
		const jsonLdScripts = [];
		document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
			jsonLdScripts.push(script.cloneNode(true));
		});

		// Phase 3: Link and style handling - NEW!
		const existingLinks = new Map();
		document.querySelectorAll('link').forEach(link => {
			const key = link.rel + ':' + (link.href || '');
			existingLinks.set(key, link.cloneNode(true));
		});

		const existingStyles = [];
		document.querySelectorAll('style').forEach(style => {
			existingStyles.push(style.cloneNode(true));
		});

		// Phase 4: Pre-process new head
		const newChildren = [];
		const seen = new Set();
		const criticalTags = new Map();

		// Enhanced deduplication for all elements
		Array.from(newHead.children).forEach(child => {
			const tag = child.tagName.toLowerCase();
			let key = '';

			// Generate unique keys for different element types
			if (tag === 'link') {
				key = `link:${child.rel}:${child.href || ''}`;
			} else if (tag === 'style') {
				key = `style:${child.textContent.substring(0, 50)}`;
			} else if (tag === 'script') {
				key = `script:${child.src || ''}:${child.textContent.substring(0, 20)}`;
			} else if (tag === 'meta') {
				key = `meta:${child.name || child.httpEquiv || ''}:${child.content || ''}`;
			} else {
				key = child.outerHTML;
			}

			// Deduplication
			if (seen.has(key)) return;
			seen.add(key);

			// Critical tags cache
			if (tag === 'meta') {
				const name = child.name || child.httpEquiv;
				if (name) criticalTags.set(name.toLowerCase(), child);
			}

			newChildren.push(child);
		});

		// DOM-safe replacement
		const fragment = document.createDocumentFragment();
		newChildren.forEach(child => fragment.appendChild(child.cloneNode(true)));

		// Swap head content
		document.head.replaceChildren(fragment);

		// Phase 5: Restore preserved elements
		preservedElements.forEach((el, selector) => {
			const current = document.head.querySelector(selector);
			if (current) current.replaceWith(el);
			else document.head.prepend(el);
		});

		// Phase 6: Restore JSON-LD
		const jsonLdContainer = document.createDocumentFragment();
		jsonLdScripts.forEach(script => jsonLdContainer.appendChild(script));
		document.head.appendChild(jsonLdContainer);

		// Phase 7: Restore critical links and styles - NEW!
		existingLinks.forEach(link => {
			const key = link.rel + ':' + (link.href || '');
			if (!seen.has(key)) {
				document.head.appendChild(link);
			}
		});

		existingStyles.forEach(style => {
			const key = `style:${style.textContent.substring(0, 50)}`;
			if (!seen.has(key)) {
				document.head.appendChild(style);
			}
		});

		// Phase 8: Dynamic meta updates
		const dynamicUpdates = [
			'title', 'canonical', 'description', 'og:', 'twitter:', 'robots',
			'theme-color', 'msapplication-config', 'apple-touch-icon'
		];

		dynamicUpdates.forEach(type => {
			const elements = newHead.querySelectorAll(
				type === 'title' ? 'title' :
				type === 'canonical' ? 'link[rel="canonical"]' :
				type === 'theme-color' ? 'meta[name="theme-color"]' :
				type === 'msapplication-config' ? 'meta[name="msapplication-config"]' :
				type === 'apple-touch-icon' ? 'link[rel="apple-touch-icon"]' :
				`meta[${type.startsWith('og:') ? 'property' : 'name'}="${type}"]`
			);

			elements.forEach(newEl => {
				let currentEl;

				if (type === 'title') {
					document.title = newEl.textContent;
					return;
				}

				if (type === 'canonical') {
					currentEl = document.querySelector('link[rel="canonical"]');
					if (currentEl) currentEl.href = newEl.href;
					else document.head.appendChild(newEl.cloneNode(true));
					return;
				}

				if (type === 'theme-color' || type === 'msapplication-config') {
					currentEl = document.querySelector(`meta[name="${type}"]`);
					if (currentEl) currentEl.content = newEl.content;
					else document.head.appendChild(newEl.cloneNode(true));
					return;
				}

				if (type === 'apple-touch-icon') {
					// Remove existing apple touch icons
					document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(el => el.remove());
					// Add new one
					document.head.appendChild(newEl.cloneNode(true));
					return;
				}

				const attr = type.startsWith('og:') ? 'property' : 'name';
				currentEl = document.querySelector(`meta[${attr}="${type}"]`);
				if (currentEl) {
					currentEl.content = newEl.content;
				} else {
					document.head.appendChild(newEl.cloneNode(true));
				}
			});
		});

		// Phase 9: Bot compatibility layer
		if (!document.querySelector('meta[name="fragment"][content="!"]')) {
			const fragmentMeta = document.createElement('meta');
			fragmentMeta.name = 'fragment';
			fragmentMeta.content = '!';
			document.head.appendChild(fragmentMeta);
		}

		// Phase 10: Error boundary
		if (!document.title) {
			document.title = document.querySelector('h1')?.textContent ||
				newHead.querySelector('title')?.textContent ||
				'Untitled Page';
		}

		// Phase 11: Perf metrics
		const duration = performance.now() - startTime;

		// Phase 12: Event dispatching
		if (typeof dispatchEvent === 'function') {
			const headSnapshot = Array.from(document.head.children).map(el => ({
				tag: el.tagName,
				attrs: Array.from(el.attributes).reduce((acc, attr) => {
					acc[attr.name] = attr.value;
					return acc;
				}, {}),
				content: el.textContent
			}));

			dispatchEvent('head-replaced', {
				src,
				duration,
				head: headSnapshot
			});
		}

		const headClone = document.head.cloneNode(true);
		setCache(cacheKey, headClone, 'memory');

	} catch (error) {
		console.error('FnF: Head replacement error', error);
		document.head.replaceChildren(originalHead);

		if (typeof dispatchEvent === 'function') {
			dispatchEvent('head-replace-error', {
				src,
				error: error.message
			});
		}
	}
}


/**
 * Restores critical meta elements (charset, viewport, base) from original head
 * into a new head to ensure rendering consistency and prevent layout issues.
 *
 * Used as a safety step during head replacement.
 *
 * @private
 * @function _restoreCriticalElements
 * @param {HTMLHeadElement} newHead - The head being applied.
 * @param {HTMLHeadElement} originalHead - The original head to source from.
 */
function _restoreCriticalElements(newHead, originalHead) {
	const criticalElements = [
		'meta[charset]',
		'meta[http-equiv="Content-Type" i]',
		'meta[name="viewport" i]',
		'base',
		'base[href]'
	];

	criticalElements.forEach(selector => {
		const originalEl = originalHead.querySelector(selector);
		if (originalEl) {
			const currentEl = newHead.querySelector(selector);
			if (currentEl) {
				currentEl.replaceWith(originalEl.cloneNode(true));
			} else {
				newHead.prepend(originalEl.cloneNode(true));
			}
		}
	});
}

/**
 * Generates a URL-friendly slug from a given string.
 *
 * Normalizes Unicode characters, removes diacritics, converts to lowercase,
 * replaces spaces and special chars with hyphens, and trims edge hyphens.
 *
 * Used internally for routing, caching keys, and SEO-friendly URLs.
 *
 * @public
 * @function FnFGenerateSlug
 * @param {string} str - Input string to convert into a slug.
 * @returns {string} The generated slug, or empty string if input is invalid.
 *
 * @example
 * FnFGenerateSlug("Hello World!"); // → "hello-world"
 * FnFGenerateSlug("Café & Co.");  // → "cafe-co"
 * FnFGenerateSlug("  --Invalid--  "); // → "invalid"
 */
function FnFGenerateSlug(str) {
	if (typeof str !== 'string' || !str.trim()) return '';
	return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Checks whether the server supports clean URLs (e.g., `/page` instead of `/page.html`).
 *
 * Sends a `HEAD` request to a well-known test path (`.well-known/fnf-clean-url`).
 * Also checks for an `x-clean-url: supported` header as a hint.
 *
 * Result is cached globally to avoid repeated network requests.
 *
 * @public
 * @async
 * @function FnFCheckCleanUrlSupport
 * @returns {Promise<boolean>} Resolves to `true` if clean URLs are supported.
 *
 * @example
 * const supportsCleanUrls = await FnFCheckCleanUrlSupport();
 * const url = supportsCleanUrls ? '/about' : '/about.html';
 */
async function FnFCheckCleanUrlSupport() {
	if (_isCleanUrlSupported !== null) {
		return Promise.resolve(_isCleanUrlSupported);
	}

	try {
		const testPath = '.well-known/fnf-clean-url';
		const response = await fetch(testPath, {
			method: 'HEAD',
			cache: 'no-store'
		});
		_isCleanUrlSupported = response.ok || response.headers.get('x-clean-url') === 'supported';
		return _isCleanUrlSupported;
	} catch (e) {
		console.warn('FnF: Clean URL support check failed, assuming not supported.', e);
		_isCleanUrlSupported = false;
		return false;
	}
}


/**
 * ====================================================================
 * CORE FUNCTION: FnFLoad
 * ====================================================================
 * This is the main function of the library. It fetches, sanitizes,
 * and injects content into the DOM.
 */

/**
 * Fetches content from a URL and fills it into a target DOM element.
 * @public
 * @param {string} src - The URL of the content to fetch.
 * @param {string} targetSelector - A CSS selector for the target element to fill.
 * @param {object} [options={}] - Configuration options for the operation.
 * @param {string} [options.basePath=''] - A base path to resolve relative `src` URLs against.
 * @param {string} [options.position='replace'] - How to insert the content ('replace', 'append', 'prepend', 'before', 'after').
 * @param {string|null} [options.relativeTo=null] - A CSS selector for 'before'/'after' positioning, relative to the target.
 * @param {boolean} [options.runScripts=false] - Whether to execute scripts in the fetched content. Disables sanitization.
 * @param {boolean} [options.sanitize=true] - Whether to sanitize the HTML content. Ignored if `runScripts` is true.
 * @param {object} [options.sanitizerOptions] - Configuration for DOMPurify (if available).
 * @param {string} [options.cache='memory'] - Caching strategy ('memory', 'session', 'none').
 * @param {number} [options.maxRetries=2] - Maximum number of retries on fetch failure.
 * @param {number} [options.retryDelay=1000] - Initial delay for retries in milliseconds.
 * @param {number} [options.timeout=30000] - Timeout in milliseconds for finding a dynamic target element.
 * @param {AbortSignal|null} [options.signal=null] - An external AbortSignal to cancel the fetch.
 * @param {boolean} [options.replaceHead=false] - Whether to replace the document's <head> content.
 * @param {function|null} [options.onSuccess=null] - Callback executed on successful content load.
 * @param {function|null} [options.onError=null] - Callback executed on error.
 * @param {string} [options.dataType='html'] - Type of data expected ('html', 'json', 'text'). Default is 'html'.
 * @param {string} [options.jsonProperty] - If dataType is 'json', set this property (e.g., '.value') or attribute on target.
 * @returns {{abort: function, on: function}} A loader object with an `abort` method to cancel the operation and an `on` method to subscribe to events.
 */
function FnFLoad(src, targetSelector, options = {}) {
	if (typeof src !== 'string' || !src.trim()) {
		throw new TypeError('FnFLoad: Parameter src must be a non-empty string');
	}
	if (typeof targetSelector !== 'string' || !targetSelector.trim()) {
		throw new TypeError('FnFLoad: Parameter targetSelector must be a valid CSS selector');
	}

	const config = {
		basePath: '',
		position: 'replace',
		relativeTo: null,
		dataType: 'html',
		srcSelector: '',
		runScripts: true,
		scriptReinit: 'wrap',
		sanitize: false,
		sanitizerOptions: {},
		replaceHead: true,
		cache: 'memory',
		maxRetries: 2,
		retryDelay: 1000,
		timeout: 30000,
		signal: null,
		onSuccess: null,
		onError: null,
		...options
	};

	// For security and simplicity, running scripts implies trusting the content,
	// so we disable sanitization. It also implies head content might be important.
	if (config.runScripts) {
		config.sanitize = false;
		if (options.replaceHead !== false) config.replaceHead = true;
	}

	const fullSrc = new URL(src, new URL(config.basePath, window.location.origin)).href;

	let lazyObserver;
	let enhancedCleanup;
	const controller = new AbortController();
	const abortSignal = config.signal || controller.signal;
	let observer, timeoutId, isFilled = false,
		retryCount = 0;
	const eventHandlers = new Map();

	function dispatchEvent(eventName, detail) {
		const event = new CustomEvent(EVENT_PREFIX + eventName, {
			detail
		});
		document.dispatchEvent(event);
		if (eventHandlers.has(eventName)) {
			eventHandlers.get(eventName).forEach(handler => handler(event));
		}
	}

	function cleanup() {
		observer?.disconnect();
		lazyObserver?.disconnect();
		clearTimeout(timeoutId);
		if (!config.signal) controller.abort();
		dispatchEvent('cleanup', {
			src: fullSrc,
			targetSelector
		});
	}

	function validateSelector(selector) {
		if (!selector || typeof selector !== 'string' || selector.trim() === '') return false;
		try {
			document.createElement('div').querySelector(selector);
			return true;
		} catch (e) {
			console.warn(`FnF: Selector validation warning: "${selector}" - ${e.message}`);
			return false;
		}
	}

	function setupLazyObserver(target) {
		if (!('IntersectionObserver' in window)) {
			console.warn('FnF: IntersectionObserver not supported. Loading immediately.');
			proceedFill(target);
			return;
		}
		dispatchEvent('lazy-wait', {
			src: fullSrc,
			target
		});
		lazyObserver = new IntersectionObserver((entries, obs) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					obs.unobserve(target);
					dispatchEvent('lazy-trigger', {
						src: fullSrc,
						target
					});
					proceedFill(target);
				}
			});
		}, {
			rootMargin: lazyConfig.margin,
			threshold: lazyConfig.threshold
		});
		lazyObserver.observe(target);
	}

	/**
	 * Escapes the content inside `<code>` tags to prevent HTML interpretation.
	 * Ensures code examples are displayed literally and safely.
	 *
	 * @private
	 * @function escapeCodeTags
	 * @param {string} content - HTML string that may contain `<code>` blocks.
	 * @returns {string} HTML with escaped `<code>` content.
	 *
	 * @example
	 * escapeCodeTags('<code><div></div></code>'); // → <code><div></div></code>
	 */
	function escapeCodeTags(content) {
		function escapeHtml(text) {
			const div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		}

		return content.replace(/<code>([\s\S]*?)<\/code>/g, (match, inner) => {
			return '<code>' + escapeHtml(inner) + '</code>';
		});
	}

	/**
	 * Initiates the process of fetching, processing, and injecting content into the DOM.
	 * Handles caching, fetch retries, sanitization, and critical meta shell detection
	 * to prevent infinite loops or loading the app shell as content.
	 *
	 * @private
	 * @function proceedFill
	 * @param {Element} target - The DOM element to be filled with content.
	 * @returns {Promise<void>}
	 *
	 * @description
	 * This function performs:
	 * - Selector validation
	 * - Cache lookup (memory/session)
	 * - Fetch with exponential retry
	 * - Meta shell detection:
	 *   - `fnf-redirect-shell`: Indicates a 404 redirect page was returned → treat as 404.
	 *   - `fnf-root-shell`: Indicates the main app shell was returned → likely a 404.
	 * - Content rendering based on `dataType`
	 * - Script reinitialization if `runScripts: true`
	 *
	 * @fires fetchandfill:start - When the process begins.
	 * @fires fetchandfill:fetch - When content is successfully fetched from network.
	 * @fires fetchandfill:cachehit - When content is served from cache.
	 * @fires fetchandfill:success - When content is successfully rendered.
	 * @fires fetchandfill:error - On non-abort errors.
	 * @fires fetchandfill:fallbacksanitize - When DOMPurify is unavailable.
	 * @fires fetchandfill:retry - When a retry is triggered.
	 *
	 * @example
	 * proceedFill(document.getElementById('main'));
	 */
	async function proceedFill(target) {
		if (isFilled) return;
		isFilled = true;
		let cacheKey;

		try {
			if (!validateSelector(targetSelector)) throw new Error(`Target selector invalid: "${targetSelector}"`);
			if (config.relativeTo && !validateSelector(config.relativeTo)) {
				console.warn(`FnF: Relative selector invalid: "${config.relativeTo}" - using fallback.`);
				config.relativeTo = null;
			}

			dispatchEvent('start', {
				src: fullSrc,
				target,
				config
			});
			let content = null;
			cacheKey = `cache:${fullSrc}`;

			// Step 1: Get content from cache or network
			if (config.cache !== 'none') {
				content = getCache(cacheKey, config.cache);

				if (content !== null) {
					dispatchEvent('cachehit', {
						src: fullSrc,
						cacheType: config.cache,
						dataType: config.dataType
					});
				}
			}

			if (content === null) {
				const startTime = performance.now();
				const response = await fetchWithRetry(fullSrc, abortSignal, config.maxRetries, config.retryDelay);

				if (!response.ok) throw new Error(`HTTP ${response.status}`);

				// Handle different response types
				switch (config.dataType) {
					case 'json':
						content = await response.json();
						break;
					case 'text':
						content = await response.text();
						break;
					default:
						content = await response.text();
				}

				dispatchEvent('fetch', {
					src: fullSrc,
					duration: performance.now() - startTime,
					size: config.dataType === 'json' ? JSON.stringify(content).length : content.length,
					dataType: config.dataType
				});

				if (config.cache !== 'none') {
					setCache(cacheKey, content, config.cache);
				}
			}

			// Step 2: Process content based on data type
			switch (config.dataType) {
				case 'json':
					// Handle JSON data
					const jsonDetail = {
						src: fullSrc,
						target,
						data: content,
						dataType: 'json'
					};

					// If jsonProperty is specified, set it on target element
					if (config.jsonProperty) {
						if (config.jsonProperty.startsWith('.')) {
							// Set property (e.g., .value, .innerHTML)
							const prop = config.jsonProperty.substring(1);
							target[prop] = typeof content === 'object' ?
								JSON.stringify(content) :
								content;
						} else {
							// Set attribute
							target.setAttribute(
								config.jsonProperty,
								typeof content === 'object' ?
								JSON.stringify(content) :
								content
							);
						}
					}

					dispatchEvent('success', jsonDetail);

					window.dispatchEvent(new CustomEvent('fnf:content-rendered', {
						bubbles: true,
						composed: true,
						detail: {
							targetElement: target,
							source: fullSrc,
							dataType: 'json',
							data: content
						}
					}));

					if (config.onSuccess) config.onSuccess(jsonDetail);
					break;

				case 'text':
					// Handle text content
					if ('value' in target) {
						// For form elements (input, textarea, select)
						target.value = content;
					} else {
						// For regular elements
						target.textContent = content;
					}

					const textDetail = {
						src: fullSrc,
						target,
						content: content,
						dataType: 'text'
					};

					dispatchEvent('success', textDetail);

					window.dispatchEvent(new CustomEvent('fnf:content-rendered', {
						bubbles: true,
						composed: true,
						detail: {
							targetElement: target,
							source: fullSrc,
							dataType: 'text',
							content: content
						}
					}));

					if (config.onSuccess) config.onSuccess(textDetail);
					break;

				case 'html':
				default:

					let htmlToParse = escapeCodeTags(content);

					if (config.sanitize) {
						if (typeof DOMPurify !== 'undefined') {
							htmlToParse = DOMPurify.sanitize(content, config.sanitizerOptions);
						} else {
							htmlToParse = fallbackSanitize(content);
							dispatchEvent('fallbacksanitize', {
								src: fullSrc
							});
						}
					}

					if (!htmlToParse || htmlToParse.trim() === '') {
						throw new Error(`Content for ${fullSrc} became empty after processing. Aborting.`);
					}


					/**
					 * @description
					 * === ANTI-LOOP PROTECTION: META SHELL DETECTION ===
					 *
					 * FnF uses two special meta tags to detect invalid responses:
					 *
					 * 1. `<meta name="fnf-redirect-shell">`
					 *    - Found in 404.html. If returned during content fetch, it means the file doesn’t exist.
					 *    - Triggers 404 error and stops further processing.
					 *
					 * 2. `<meta name="fnf-root-shell">`
					 *    - Found in index.html. If returned as content, server likely can't resolve clean URLs.
					 *    - Prevents infinite loop by treating it as a 404.
					 */
					const doc = new DOMParser().parseFromString(htmlToParse, 'text/html');

					//[1]
					if (doc.head.querySelector('meta[name="fnf-redirect-shell"]')) {
						console.error(
							`FNF: Critical error detected! The server returns the redirect page (404.html) to request '$ {fullSrc}'. This means that physical files do not exist. Triggered 404 by force to stop loop.`
						);
						ShowErrors(target, '404', config.basePath, fullSrc);
						if (config.onError) {
							config.onError({
								src: fullSrc,
								error: new Error('File not found; redirect shell was served instead of content.')
							});
						}
						throw new Error(`File not found; server returned the 404 redirect handler for '${fullSrc}'.`);
					}

					//[2]
					if (doc.head.querySelector('meta[name="fnf-root-shell"]')) {
						console.error(
							`FNF: Fake success is detected! The server returns the main application shell (recognized from Meta 'FNF-Root-Shell') instead of content for '$ $ {fullSrc}'. This 99% means that physical files do not exist. Triggers 404.`
						);
						ShowErrors(target, '404', config.basePath, fullSrc);
						if (config.onError) {
							config.onError({
								src: fullSrc,
								error: new Error('File not found; redirect handler was served instead of content.')
							});
						}
						throw new Error(`root shell returned instead of content for '${fullSrc}'. Probable 404.`);
					}

					if (config.replaceHead) {
						FnFReplaceHeadContent(doc.head, fullSrc, dispatchEvent);
					}

					if (config.srcSelector) {
						const selectedElement = doc.querySelector(config.srcSelector);

						if (selectedElement) {
							const fragment = document.createDocumentFragment();
							fragment.appendChild(selectedElement.cloneNode(true));
							handlePosition(target, fragment, config.position, config.relativeTo);
						} else {
							console.warn(`FnF: Selector "${config.srcSelector}" not found in ${src}. Loading full content.`);
							dispatchEvent('selector-missing', {
								src: fullSrc,
								selector: config.srcSelector
							});
							const fragment = document.createDocumentFragment();
							doc.body.childNodes.forEach(node => fragment.appendChild(node.cloneNode(true)));
							handlePosition(target, fragment, config.position, config.relativeTo);
						}
					} else {
						const fragment = document.createDocumentFragment();
						doc.body.childNodes.forEach(node => fragment.appendChild(node.cloneNode(true)));
						handlePosition(target, fragment, config.position, config.relativeTo);
					}

					if (config.runScripts) {
						reinitScripts(target);

						if (config.replaceHead) {
							reinitScripts(document.head);
						}
					}

					const htmlDetail = {
						src: fullSrc,
						target,
						dataType: 'html'
					};

					dispatchEvent('success', htmlDetail);

					window.dispatchEvent(new CustomEvent('fnf:content-rendered', {
						bubbles: true,
						composed: true,
						detail: {
							targetElement: target,
							source: fullSrc,
							dataType: 'html'
						}
					}));

					if (config.onSuccess) config.onSuccess(htmlDetail);
					break;
			}

		} catch (err) {
			if (err.name === 'AbortError') return;

			// Enhanced error classification
			const errorType = classifyError(err);

			// Prevent infinite fallback loops
			if (config.isFallbackProcess) {
				console.error("FnF: Fallback aborted to prevent recursion", {
					src: fullSrc,
					error: err.message
				});
				ShowErrors(target, '404', config.basePath, fullSrc);
				return;
			}

			// Special handling for 404s
			if (errorType === 'NOT_FOUND') {
				console.warn(`FnF: 404 detected for ${fullSrc}`);

				const fallbackConfig = {
					...config,
					isFallbackProcess: true,
					cache: 'none',
					onError: () => ShowErrors(target, '404', config.basePath, fullSrc)
				};

				// Try physical 404 page
				const physical404 = new URL('FnF404.html', new URL(config.basePath, window.location.origin)).href;
				FnFLoad(physical404, targetSelector, fallbackConfig);
			}
			// Server errors
			else if (errorType === 'SERVER_ERROR') {
				console.error(`FnF: Server error for ${fullSrc}`, err);

				const fallbackConfig = {
					...config,
					isFallbackProcess: true,
					cache: 'none',
					onError: () => ShowErrors(target, '500', config.basePath, fullSrc)
				};

				// Try physical 500 page
				const physical500 = new URL('FnF500.html', new URL(config.basePath, window.location.origin)).href;
				FnFLoad(physical500, targetSelector, fallbackConfig);
			}
			// Other errors
			else {
				console.error(`FnF: Critical error for ${fullSrc}`, err);
				ShowErrors(target, 'GENERIC', config.basePath, fullSrc, err.message);
			}
		}
	}

	/**
	 * Classifies an error into meaningful types for fallback routing.
	 *
	 * @private
	 * @function classifyError
	 * @param {Error} err - The error object.
	 * @returns {'NOT_FOUND'|'SERVER_ERROR'|'PERMISSION_DENIED'|'GENERIC'}
	 *
	 * @example
	 * if (classifyError(err) === 'NOT_FOUND') {
	 *   // Try 404.html
	 * }
	 */
	function classifyError(err) {
		if (err.message.includes('404') ||
			err.message.includes('Not Found') ||
			err.message.includes('Failed to fetch')) {
			return 'NOT_FOUND';
		}

		if (err.message.includes('50') || // 500, 503, etc.
			err.message.includes('Server Error') ||
			err.message.includes('Bad Gateway')) {
			return 'SERVER_ERROR';
		}

		if (err.message.includes('403') ||
			err.message.includes('Forbidden')) {
			return 'PERMISSION_DENIED';
		}

		return 'GENERIC';
	}

	/**
	 * Renders a built-in, secure error page directly into the target element.
	 * Used when physical error pages (e.g., FnF404.html) are missing or inaccessible.
	 *
	 * @private
	 * @function ShowErrors
	 * @param {Element} target - The DOM element to fill with the error UI.
	 * @param {'404'|'500'|'PERMISSION_DENIED'|'GENERIC'} type - Type of error to display.
	 * @param {string} basePath - Base path for the "Back to Home" button.
	 * @param {string} [failedUrl=''] - The URL that failed to load (shown in details).
	 * @param {string} [message=''] - Optional custom message (for 'GENERIC' errors).
	 *
	 * @description
	 * This is a fallback UI that:
	 * - Requires no external files.
	 * - Prevents infinite loops.
	 * - Displays clear context (URL, timestamp, error type).
	 *
	 * @example
	 * ShowErrors(el, '404', '/app', '/app/missing-page');
	 */
	function ShowErrors(target, type, basePath, message = '', failedUrl = '') {
		if (!target) return;

		const homePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
		const displayUrl = failedUrl || window.location.href;

		const errorData = {
			'404': {
				code: '404',
				title: 'Page Not Found',
				message: 'The resource you were looking for could not be found.',

				details: `Requested URL: ${escapeHTML(displayUrl)}`,
				buttonText: 'Back to Home'
			},

			'500': {
				code: '500',
				title: 'Internal Server Error',
				message: 'Our apologies. The server encountered a problem and could not complete your request.',
				details: `Please try again later. Occurred at: ${new Date().toLocaleString()}`,
				buttonText: 'Try Again'
			},
			'PERMISSION_DENIED': {
				code: '403',
				title: 'Access Denied',
				message: "You don't have the required permissions to view this page.",
				details: `Access to the following resource was blocked: ${escapeHTML(displayUrl)}`,
				buttonText: 'Return to Safety'
			},
			'GENERIC': {
				code: 'Error',
				title: 'Something Went Wrong',
				message: message || 'An unexpected error has occurred. We are looking into it.',
				details: `If the problem persists, please contact support.`,
				buttonText: 'Go to Homepage'
			}
		};

		const data = errorData[type] || errorData.GENERIC;

		if (type === 'GENERIC' && message) {
			data.message = escapeHTML(message);
		}

		const template = `
<!DOCTYPE html><html lang="en"><head><title>${escapeHTML(data.code)}- ${escapeHTML(data.title)}</title><meta name="description" content="${escapeHTML(data.message)}"><meta name="robots" content="noindex, nofollow"><style>.fnf-error-container{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:#f8f9fa;color:#212529;margin:0;display:flex;align-items:center;justify-content:center;padding:20px;min-height:80vh}.fnf-error-content{text-align:center;max-width:600px;width:100%;background:white;border-radius:12px;padding:30px 40px;box-shadow:0 4px 25px rgba(0,0,0,0.08);border:1px solid #e9ecef}.fnf-error-code{font-size:5rem;font-weight:700;margin:0;line-height:1;color:#e03131}.fnf-error-title{font-size:1.5rem;margin:15px 0 10px;color:#343a40}.fnf-error-message{color:#495057;margin-bottom:25px;line-height:1.6;font-size:1.1rem}.fnf-error-details{background:#f1f3f5;padding:15px;border-radius:8px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;word-break:break-all;color:#495057;text-align:left;margin:20px 0;font-size:.9rem;border:1px solid #dee2e6}.fnf-error-btn{display:inline-block;margin-top:15px;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;background-color:#17a2b8;color:white;border:0;cursor:pointer;transition:all .2s ease;font-size:1rem}.fnf-error-btn:hover{background-color:#138496;transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.1)}</style></head><body><div class="fnf-error-container"><div class="fnf-error-content"><h1 class="fnf-error-code">${escapeHTML(data.code)}</h1><h2 class="fnf-error-title">${escapeHTML(data.title)}</h2><p class="fnf-error-message">${escapeHTML(data.message)}</p><div class="fnf-error-details">${data.details}</div><a href="${escapeHTML(homePath)}" class="fnf-error-btn">${escapeHTML(data.buttonText)}</a></div></div></body></html>
  `;

		target.innerHTML = template;
	}

	/**
	 * Escapes HTML special characters to prevent XSS in dynamic content.
	 *
	 * @private
	 * @function escapeHTML
	 * @param {string} str - Input string.
	 * @returns {string} String with `<`, `>`, `&`, `"`, `'` converted to entities.
	 *
	 * @example
	 * escapeHTML('<script>alert(1)</script>'); // → <script>alert(1)</script>
	 */
	function escapeHTML(str) {
		if (typeof str !== 'string') return '';
		const div = document.createElement('div');
		div.textContent = str;
		return div.innerHTML;
	}


	/**
	 * Fetches a URL with exponential retry support.
	 * Only retries on network failures or 5xx errors.
	 *
	 * @private
	 * @async
	 * @function fetchWithRetry
	 * @param {string} url - The URL to fetch.
	 * @param {AbortSignal} signal - Signal to cancel the request.
	 * @param {number} maxRetries - Maximum number of retry attempts.
	 * @param {number} retryDelay - Initial delay in milliseconds.
	 * @returns {Promise<Response>} Resolves with the Response object.
	 *
	 * @throws {Error} If all retries fail.
	 *
	 * @fires fetchandfill:retry - On each retry attempt.
	 *
	 * @example
	 * const res = await fetchWithRetry('/api/data', signal, 3, 1000);
	 */
	async function fetchWithRetry(url, signal, maxRetries, retryDelay) {
		try {
			const response = await fetch(url, {
				signal
			});
			if (response.ok) return response;
			// Only trigger retry for network-like errors or specific server errors
			if (response.status >= 500 && retryCount < maxRetries) throw new Error(`HTTP ${response.status}`);
			return response; // Return failed response for 4xx errors immediately.
		} catch (err) {
			if (retryCount < maxRetries) {
				retryCount++;
				const delay = retryDelay * Math.pow(2, retryCount - 1);
				dispatchEvent('retry', {
					src: url,
					retryCount,
					delay
				});
				await new Promise(res => setTimeout(res, delay));
				return fetchWithRetry(url, signal, maxRetries, retryDelay);
			}
			throw err;
		}
	}


	/**
	 * A lightweight fallback sanitizer used when DOMPurify is not available.
	 * Removes dangerous tags (script, iframe) and event attributes (onclick, onload).
	 *
	 * @private
	 * @function fallbackSanitize
	 * @param {string} html - Raw HTML string to sanitize.
	 * @returns {string} Sanitized HTML string.
	 *
	 * @warning
	 * This is not as secure as DOMPurify. Use only as a fallback.
	 * For production, always include DOMPurify.
	 *
	 * @example
	 * const clean = fallbackSanitize('<script>alert(1)</script><p>Safe</p>');
	 */
	function fallbackSanitize(html) {
		const temp = document.createElement('div');
		temp.innerHTML = html;
		const forbidden = ['script', 'iframe', 'object', 'embed', 'form', 'link'];
		forbidden.forEach(tag => temp.querySelectorAll(tag).forEach(el => el.remove()));
		temp.querySelectorAll('*').forEach(el => {
			for (let i = el.attributes.length - 1; i >= 0; i--) {
				const attr = el.attributes[i].name;
				if (attr.startsWith('on') || ['src', 'href', 'style'].includes(attr) && /javascript|expression/i.test(el.getAttribute(attr))) {
					el.removeAttribute(attr);
				}
			}
		});
		return temp.innerHTML;
	}


	/**
	 * Inserts a DOM fragment into the target element based on the specified position.
	 * Used internally by FnFLoad to handle content placement.
	 *
	 * @private
	 * @function handlePosition
	 * @param {Element} target - The target DOM element.
	 * @param {DocumentFragment} fragment - The content to insert.
	 * @param {string} position - Insertion method: 'replace', 'append', 'prepend', 'before', 'after'.
	 * @param {string|null} [relativeTo=null] - Selector for reference element in 'before'/'after' mode.
	 *
	 * @example
	 * handlePosition(el, fragment, 'append');
	 */
	function handlePosition(target, fragment, position, relativeTo) {
		switch (position) {
			case 'replace':
				target.replaceChildren(fragment);
				break;
			case 'append':
				target.appendChild(fragment);
				break;
			case 'prepend':
				target.prepend(fragment);
				break;
			case 'before':
			case 'after':
				const ref = relativeTo ? target.querySelector(relativeTo) : null;
				if (ref) {
					ref[position](fragment);
				} else {
					if (relativeTo) console.warn(`FnF: Reference element not found: ${relativeTo}. Using 'append' as fallback.`);
					target.appendChild(fragment);
				}
				break;
			default:
				throw new Error(`FnF: Invalid position: ${position}`);
		}
	}

	/**
	 * Reinitializes <script> elements within a container to ensure execution in SPA context.
	 * Uses the `scriptReinit` strategy from the parent FnFLoad config.
	 *
	 * @private
	 * @function reinitScripts
	 * @param {Element} container - The DOM element containing scripts to reinitialize.
	 * @param {string} [strategy='wrap'] - Execution strategy: 'wrap' (IIFE), 'execute', or 'preserve' (clone).
	 *
	 * @description
	 * - 'wrap': Wraps script in IIFE to avoid global pollution.
	 * - 'execute': Re-creates script with same content (may pollute global scope).
	 * - 'preserve': Clones original script to retain execution context.
	 */
	function reinitScripts(container) {
		container.querySelectorAll('script').forEach(oldScript => {
			if (oldScript.type === 'module') return; // Skip module scripts

			const newScript = document.createElement('script');

			// Copy attributes
			Array.from(oldScript.attributes).forEach(attr => {
				newScript.setAttribute(attr.name, attr.value);
			});

			// Handle content based on reinit option
			if (oldScript.textContent) {
				switch (config.scriptReinit) {
					case 'wrap':
						newScript.textContent = `(function(){\n${oldScript.textContent}\n})();`;
						break;

					case 'execute':
						newScript.textContent = oldScript.textContent;
						break;

					case 'preserve':
						// Clone entire script element as-is
						oldScript.parentNode.replaceChild(
							oldScript.cloneNode(true),
							oldScript
						);
						return; // Skip further processing
				}
			}

			oldScript.replaceWith(newScript);
		});
	}
	/**
	 * Callback for MutationObserver to detect when a target element appears in the DOM.
	 * Used when the target is not yet available at call time.
	 *
	 * @private
	 * @function mutationCallback
	 * @param {MutationRecord[]} mutations - List of DOM mutations.
	 * @param {MutationObserver} observer - The observer instance.
	 *
	 * @description
	 * If target is found:
	 * - Stops observing.
	 * - Clears timeout.
	 * - Triggers `proceedFill`.
	 */
	function mutationCallback(mutations, obs) {
		const target = document.querySelector(targetSelector);
		if (target && !isFilled) {
			obs.disconnect();
			clearTimeout(timeoutId);
			if (lazyConfig.enabled && (!lazyConfig.disableForAboveFold || !isElementInViewport(target))) {
				setupLazyObserver(target);
			} else {
				proceedFill(target);
			}
		}
	}

	try {
		validateSelector(targetSelector);
		const target = document.querySelector(targetSelector);
		if (target) {
			if (lazyConfig.enabled && (!lazyConfig.disableForAboveFold || !isElementInViewport(target))) {
				setupLazyObserver(target);
			} else {
				proceedFill(target);
			}
		} else {
			observer = new MutationObserver(mutationCallback);
			observer.observe(document.documentElement, {
				childList: true,
				subtree: true
			});
			timeoutId = setTimeout(() => {
				if (!isFilled) {
					observer.disconnect();
					const err = new Error(`Target element not found after ${config.timeout}ms: ${targetSelector}`);
					const errorDetail = {
						src: fullSrc,
						error: err
					};
					dispatchEvent('error', errorDetail);
					if (config.onError) config.onError(errorDetail);
					// No need to throw here, as it would be an unhandled promise rejection.
				}
			}, config.timeout);
			abortSignal.addEventListener('abort', () => observer.disconnect());
		}
	} catch (err) {
		dispatchEvent('error', {
			src: fullSrc,
			error: err
		});
		if (config.onError) config.onError({
			src: fullSrc,
			error: err
		});
	}

	const loader = {
		abort: cleanup,
		on: (event, handler) => {
			const eventName = event.startsWith(EVENT_PREFIX) ? event.substring(EVENT_PREFIX.length) : event;
			if (!eventHandlers.has(eventName)) {
				eventHandlers.set(eventName, []);
			}
			eventHandlers.get(eventName).push(handler);
			return () => { // Return a function to unsubscribe
				const handlers = eventHandlers.get(eventName);
				if (handlers) {
					const index = handlers.indexOf(handler);
					if (index > -1) handlers.splice(index, 1);
				}
			};
		}
	};

	activeLoaders.add(loader);
	enhancedCleanup = () => {
		lazyObserver?.disconnect();
		cleanup();
		activeLoaders.delete(loader);
	};
	loader.abort = enhancedCleanup;

	return loader;
}


/**
 * ====================================================================
 * ROUTING ENGINE
 * ====================================================================
 * Classes for managing client-side routing and navigation UI.
 * Supports both clean URLs (e.g. /about) and fallback query strings (e.g. ?page=about).
 * Dynamically generates SEO-friendly slugs from page titles or IDs.
 */

/**
 * @typedef {Object} PageObject
 * @property {string} id - Unique identifier for the page (e.g. "home", "about").
 * @property {string} src - Relative or absolute path to the HTML file for this page.
 */

/**
 * @typedef {Object} RouteConfig
 * @property {string} name - Name of the route group (e.g. "docs", "blog").
 * @property {PageObject[]} pages - Array of page objects belonging to this route.
 * @property {boolean} [set_default=false] - If true, this route's first page is the default homepage.
 * @property {string} [slugParam='page'] - Query parameter used for routing (e.g. ?page=about).
 * @property {string} [slugPrefix] - Optional URL prefix (e.g. "blog" → /blog/post-title).
 * @property {string} [slugTarget='h1'] - CSS selector to extract title from for slug generation.
 * @property {string} [slugSource='title'] - Where to get slug text: 'title' or 'content'.
 * @property {string} [cache='memory'] - Caching strategy for slug/content: 'memory', 'session', 'none'.
 */

/**
 * @typedef {Object} ResolvedRoute
 * @property {string} page - The resolved page ID.
 * @property {RouteConfig} route - The matched route configuration.
 * @property {string} src - Source file path to be loaded.
 */

/**
 * FnFRouter handles client-side routing with clean URL support and dynamic slug generation.
 * It resolves routes based on query params or clean paths, ensures consistent URLs,
 * and supports SEO-friendly slug derivation from page content.
 */
class FnFRouter {
	/**
	 * Creates a new FnFRouter instance.
	 * @param {Object} options - Router configuration options.
	 * @param {RouteConfig[]} options.routes - Array of route configurations.
	 * @param {string} [options.basePath='/'] - Base path for the app (e.g. "/app/").
	 * @throws {Error} If `routes` is not provided or not an array.
	 */
	constructor(options = {}) {
		if (!options.routes || !Array.isArray(options.routes)) {
			throw new Error('FnFRouter: `routes` array is a required option.');
		}
		this.routes = options.routes;
		this.basePath = (options.basePath || '/').replace(/\/?$/, '/'); // Ensure trailing slash
	}

	/**
	 * Generates a URL-friendly slug from a page's title or fallbacks to its ID.
	 * Caches results per config and page to avoid redundant processing.
	 * @param {PageObject} pageObj - The page object to generate a slug for.
	 * @param {RouteConfig} config - The route configuration containing slug rules.
	 * @returns {Promise<string>} The generated slug, or fallback slug from page ID.
	 * @throws Will catch and warn on errors (e.g. 404, parsing issues), returning placeholder.
	 */
	async getSlugForPage(pageObj, config) {
		const slugCacheKey = `${config.name}:${pageObj.id}`;

		const cachedSlug = getCache(slugCacheKey, 'slug');
		if (cachedSlug) {
			return cachedSlug;
		}

		try {
			const fullSrc = new URL(pageObj.src, new URL(this.basePath, window.location.origin)).href;
			const contentCacheKey = `cache:${fullSrc}`;

			let html = getCache(contentCacheKey, config.cache || 'memory');

			if (!html) {
				const response = await fetch(fullSrc);
				if (!response.ok) {
					throw new Error(`File not found or server error: ${response.status}`);
				}
				html = await response.text();
				setCache(contentCacheKey, html, config.cache || 'memory');
			}

			const doc = new DOMParser().parseFromString(html, 'text/html');
			const slugSourceElement = config.slugSource === 'title' ?
				doc.querySelector('title') :
				doc.querySelector(config.slugTarget);

			const titleText = slugSourceElement ? slugSourceElement.textContent.trim() : '';
			const slug = FnFGenerateSlug(titleText) || FnFGenerateSlug(pageObj.id);

			setCache(slugCacheKey, slug, 'slug');
			return slug;
		} catch (error) {
			return FnFGenerateSlug(pageObj.id);
		}
	}

	/**
	 * Finds a page object by matching its slug (dynamic or placeholder).
	 * First checks placeholder slugs (from ID), then attempts dynamic slug resolution.
	 * @param {string} slug - The slug to search for (e.g. "about-us").
	 * @param {RouteConfig} config - The route config containing the page list.
	 * @returns {Promise<PageObject|null>} Matched page object, or null if not found.
	 */
	async findPageBySlug(slug, config) {
		if (!slug) return null;

		// First pass: check static (ID-based) slugs
		for (const pageObj of config.pages) {
			const placeholderSlug = FnFGenerateSlug(pageObj.id);
			if (slug === placeholderSlug) {
				return pageObj;
			}
		}

		// Second pass: resolve dynamic slugs from content
		for (const pageObj of config.pages) {
			try {
				const hydratedSlug = await this.getSlugForPage(pageObj, config);
				if (slug === hydratedSlug) {
					return pageObj;
				}
			} catch (error) {
				continue; // Ignore errors and try next
			}
		}

		return null;
	}

	/**
	 * Updates the browser URL to use a clean path if supported (no query params).
	 * Called after navigation to ensure consistent, shareable URLs.
	 * @param {PageObject} pageObj - The target page object.
	 * @param {RouteConfig} route - The associated route config.
	 * @returns {Promise<void>}
	 */
	async ensureCleanUrl(pageObj, route) {
		const isCleanSupported = _isCleanUrlSupported !== null ? _isCleanUrlSupported : await FnFCheckCleanUrlSupport();
		if (!isCleanSupported) return;

		try {
			const finalSlug = await this.getSlugForPage(pageObj, route);
			const prefix = route.slugPrefix ? `${route.slugPrefix}/` : '';
			const finalPath = `${this.basePath}${prefix}${finalSlug}`;

			if (window.location.pathname !== finalPath) {
				history.replaceState({
					path: finalPath
				}, '', finalPath);
			}
		} catch (error) {
			console.warn(`FnFRouter: Could not ensure clean URL for "${pageObj.id}" due to slug generation error.`, error);
		}
	}


	/**
	 * Resolves the current route by checking query parameters first, then clean URLs.
	 * Handles both static and dynamic routes, normalizes URL if clean URL is supported.
	 *
	 * @description
	 * This method sets `window.routeParams` for dynamic routes and normalizes URLs
	 * using clean paths if supported. Triggers 404/500 fallbacks on failure.
	 * 
	 * @returns {Object} The resolved route info { page, route, src, pageObj }, or error page.
	 * @throws {Error} If routing fails critically.
	 */
	async resolveCurrentRoute() {
		try {
			const url = new URL(window.location.href);
			const isCleanSupported = await FnFCheckCleanUrlSupport();

			// --- STAGE 1: Handle query parameter-based routing ---
			let matchedRoute = null;
			let routeParams = {};

			for (const route of this.routes) {
				const slugParam = route.slugParam || 'page';

				if (url.searchParams.has(slugParam)) {
					const slugFromQuery = url.searchParams.get(slugParam);
					let dynamicMatchFound = false;

					// Check for dynamic route match via query param
					for (const pageObj of route.pages) {
						if (pageObj.path && pageObj.path.includes(':')) {
							const pathSegments = pageObj.path.split('/');
							const valueSegments = slugFromQuery.split('/');

							// Validate segment count match
							if (pathSegments.length !== valueSegments.length) continue;

							let match = true;
							const params = {};

							for (let i = 0; i < pathSegments.length; i++) {
								if (pathSegments[i].startsWith(':')) {
									// Dynamic segment: capture parameter
									const paramName = pathSegments[i].substring(1);
									params[paramName] = valueSegments[i];
								} else if (pathSegments[i] !== valueSegments[i]) {
									// Static segment mismatch
									match = false;
									break;
								}
							}

							if (match) {
								routeParams = params;
								matchedRoute = {
									pageObj,
									route
								};
								dynamicMatchFound = true;
								break;
							}
						}
					}

					// Fallback to static route match if no dynamic match
					if (!dynamicMatchFound) {
						const pageObj = await this.findPageBySlug(slugFromQuery, route);
						if (pageObj) {
							matchedRoute = {
								pageObj,
								route
							};
						} else {
							// Immediate 404 if no match found
							return {
								page: '404',
								route: {
									name: 'error'
								},
								src: 'FnF404.html',
							};
						}
					}

					if (matchedRoute) break;
				}
			}

			// Return early if matched via query
			if (matchedRoute) {
				const {
					pageObj,
					route
				} = matchedRoute;
				window.routeParams = routeParams;

				// Only static routes need slug resolution
				let finalSlug = null;
				if (!(pageObj.path && pageObj.path.includes(':'))) {
					finalSlug = await this.getSlugForPage(pageObj, route);
				}

				// Normalize URL if clean URLs supported
				if (isCleanSupported) {
					let newPath = this.basePath;

					if (pageObj.path && pageObj.path.includes(':')) {
						// Build dynamic path from parameters
						let cleanPath = pageObj.path;
						for (const [key, value] of Object.entries(routeParams)) {
							cleanPath = cleanPath.replace(`:${key}`, value);
						}

						// Add prefix if defined
						if (route.slugPrefix) {
							newPath += route.slugPrefix + '/';
						}
						newPath += cleanPath;
					} else if (finalSlug) {
						// Static route with resolved slug
						if (route.slugPrefix) {
							newPath += route.slugPrefix + '/';
						}
						newPath += finalSlug;
					}

					// Normalize path and update history
					newPath = newPath.replace(/\/+/g, '/'); // Remove double slashes
					if (window.location.pathname !== newPath) {
						history.replaceState({
							path: newPath
						}, '', newPath);
					}
				}
				// Update query param for static routes if needed
				else if (finalSlug && url.searchParams.get(route.slugParam || 'page') !== finalSlug) {
					const newUrl = new URL(url);
					newUrl.searchParams.set(route.slugParam || 'page', finalSlug);
					history.replaceState(null, '', newUrl.href);
				}

				return {
					page: pageObj.id,
					route,
					src: pageObj.src,
					pageObj,
				};
			}

			// --- STAGE 2: Handle clean URL routing ---
			const currentPath = url.pathname;
			const localPath = currentPath.startsWith(this.basePath) ?
				currentPath.substring(this.basePath.length) :
				currentPath;
			const cleanPath = localPath.replace(/\/$/, ''); // Remove trailing slash

			// Handle root or index
			if (cleanPath === '' || cleanPath === 'index.html') {
				const defaultRoute = this.routes.find(r => r.set_default) || this.routes[0];
				if (!defaultRoute?.pages?.length) {
					console.error("No valid root route found");
					return this.getErrorPage('500');
				}

				const pageObj = defaultRoute.pages[0];
				await this.ensureCleanUrl(pageObj, defaultRoute);

				return {
					page: pageObj.id,
					route: defaultRoute,
					src: pageObj.src,
					pageObj,
				};
			}

			// Match dynamic routes in clean URL format
			let dynamicMatch = null;
			for (const route of this.routes) {
				const prefix = route.slugPrefix ? `${route.slugPrefix}/` : '';

				for (const pageObj of route.pages) {
					if (!pageObj.path?.includes(':')) continue;

					const fullPath = prefix + pageObj.path;
					const pathSegments = fullPath.split('/');
					const cleanSegments = cleanPath.split('/');

					// Skip if segment count doesn't match
					if (pathSegments.length !== cleanSegments.length) continue;

					let match = true;
					const params = {};

					for (let i = 0; i < pathSegments.length; i++) {
						if (pathSegments[i].startsWith(':')) {
							// Capture and decode dynamic parameter
							const paramName = pathSegments[i].substring(1);
							params[paramName] = decodeURIComponent(cleanSegments[i]);
						} else if (pathSegments[i] !== cleanSegments[i]) {
							match = false;
							break;
						}
					}

					if (match) {
						dynamicMatch = {
							pageObj,
							route,
							params
						};
						break;
					}
				}

				if (dynamicMatch) break;
			}

			if (dynamicMatch) {
				const {
					pageObj,
					route,
					params
				} = dynamicMatch;
				window.routeParams = params;
				return {
					page: pageObj.id,
					route,
					src: pageObj.src,
					pageObj,
				};
			}

			// Match static routes in clean URL format
			for (const route of this.routes) {
				const prefix = route.slugPrefix ? `${route.slugPrefix}/` : '';

				if (cleanPath.startsWith(prefix)) {
					const slug = cleanPath.substring(prefix.length);
					if (!slug) continue;

					const pageObj = await this.findPageBySlug(slug, route);
					if (pageObj) {
						await this.ensureCleanUrl(pageObj, route);
						return {
							page: pageObj.id,
							route,
							src: pageObj.src,
							pageObj,
						};
					}
				}
			}

			// Final fallback: 404
			return this.getErrorPage('404');
		} catch (error) {
			console.error('FnFRouter: Critical routing failure', error);
			return this.getErrorPage('500');
		}
	}

	// Helper for error pages
	getErrorPage(code = '404') {
		return {
			page: code,
			route: {
				name: 'error'
			},
			src: code === '404' ? 'FnF404.html' : 'FnF500.html',
		};
	}


	/**
	 * Starts the router by attaching SPA navigation listeners and triggering initial navigation.
	 * Attaches:
	 * - click listener for internal links
	 * - popstate and spa-navigate for history changes
	 *
	 * @param {Object} options
	 * @param {Function} options.onNavigate - Callback to run when navigation occurs.
	 * @throws {TypeError} If `onNavigate` is not a function.
	 */
	start({
		onNavigate
	}) {
		if (typeof onNavigate !== 'function') {
			throw new TypeError('FnFRouter.start() requires an onNavigate function.');
		}

		document.addEventListener('click', this._handleSPAClick.bind(this));
		window.addEventListener('popstate', onNavigate);
		window.addEventListener('spa-navigate', onNavigate);
		onNavigate(); // Trigger initial navigation
	}

	/**
	 * Handles clicks on anchor links and enables SPA navigation.
	 * Prevents full page reloads for internal links.
	 * @param {MouseEvent} event - The click event.
	 * @private
	 */
	_handleSPAClick(event) {
		const link = event.target.closest('a');
		if (!link || !link.getAttribute('href')) {
			return;
		}

		const href = link.getAttribute('href');
		const target = link.target;
		const download = link.hasAttribute('download');
		const rel = link.rel;

		// Skip special links
		if (href.startsWith('#') || target === '_blank' || download || rel === 'external') {
			return;
		}

		const linkUrl = new URL(href, window.location.href);

		// External origin
		if (linkUrl.origin !== window.location.origin) {
			return;
		}

		event.preventDefault();

		// Avoid redundant navigation
		if (linkUrl.href === window.location.href) {
			return;
		}

		// Push new state and trigger navigation
		history.pushState({
			path: linkUrl.pathname + linkUrl.search
		}, '', linkUrl.href);
	}
}

/**
 * A high-performance navigation manager that dynamically generates navigation menus
 * from router configurations. It supports lazy-hydrating link `href`s for performance
 * using Intersection Observer, and integrates with dynamic content loading via events.
 *
 * @public
 */
class FnFNavigationManager {
	/**
	 * Creates a new navigation manager instance.
	 *
	 * @param {FnFRouter} router - The router instance used to generate slugs for pages.
	 * @param {Object} options - Configuration options for the navigation manager.
	 * @param {string} options.basePath - The base path for all generated URLs (e.g., `/app`).
	 * @param {boolean} options.isCleanUrlSupported - Whether clean URLs (without query params) are supported.
	 * @param {Array<{name: string, nav_container?: string, slugPrefix?: string, slugParam?: string, pages?: Array<{id: string, name?: string, button_container?: string, hidden?: boolean}>}>} options.routes - Route configurations defining navigation structure.
	 */
	constructor(router, options) {
		/**
		 * The router instance responsible for generating slugs.
		 * @type {FnFRouter}
		 * @private
		 */
		this.router = router;

		/**
		 * Configuration options passed during initialization.
		 * @type {Object}
		 * @private
		 */
		this.options = options;

		/**
		 * CSS selector used to identify navigation links that need lazy hydration.
		 * @type {string}
		 * @private
		 */
		this.linkSelector = 'a[data-fnf-nav]';

		/**
		 * IntersectionObserver that lazily hydrates link `href` attributes when they enter the viewport.
		 * @type {IntersectionObserver}
		 * @private
		 */
		this.lazyObserver = new IntersectionObserver(
			this.handleIntersection.bind(this), {
				rootMargin: '200px' // Hydrate links 200px before they enter the viewport
			}
		);

		// Listen for dynamically rendered content to re-scan for placeholders
		window.addEventListener(
			'fnf:content-rendered',
			this.handleContentRendered.bind(this)
		);
	}

	/**
	 * Scans the entire document for all navigation and button placeholders
	 * defined in the routes and renders them accordingly.
	 *
	 * @public
	 * @param {Object} [styleConfig={}] - Optional styling configuration to customize generated HTML classes.
	 * @param {string} [styleConfig.navClass='nav-menu'] - CSS class for the navigation `<ul>` element.
	 * @param {string} [styleConfig.itemClass='nav-item'] - CSS class for each `<li>` item in the navigation list.
	 * @param {string} [styleConfig.linkClass='nav-link'] - CSS class for navigation `<a>` elements.
	 * @param {string} [styleConfig.buttonClass='nav-button'] - Additional class for button-style links.
	 * @param {boolean} [styleConfig.useRouteClass=true] - Whether to add a route-specific class (e.g., `route-home`).
	 * @param {boolean} [styleConfig.usePageClass=true] - Whether to add a page-specific class (e.g., `page-about`).
	 *
	 * @example
	 * navManager.mountAll({
	 *   navClass: 'navbar-nav',
	 *   linkClass: 'nav-link',
	 *   useRouteClass: false
	 * });
	 */
	mountAll(styleConfig = {}) {
		this.activeClass = styleConfig.activeClass || 'active-link';
		this.options.routes.forEach(route => {
			this._processRoute(route, document, styleConfig);
		});
	}

	/**
	 * Handles the `fnf:content-rendered` event, which indicates new content has been loaded
	 * (e.g., via AJAX or SPA navigation). It scans the new content for placeholders and mounts
	 * navigation elements as needed.
	 *
	 * @private
	 * @param {CustomEvent} event - The `fnf:content-rendered` event.
	 * @param {Object} event.detail - Event details.
	 * @param {Element} event.detail.targetElement - The DOM element containing the newly rendered content.
	 *
	 * @fires FnFNavigationManager#event:active-link-updated - After mounting, updates active link state.
	 */
	handleContentRendered(event) {
		const newContentContainer = event.detail.targetElement;
		if (!newContentContainer) return;

		this.options.routes.forEach(route => {
			this._processRoute(route, newContentContainer, {});
		});

		this.setActiveLink();
	}

	/**
	 * Processes a single route to mount navigation lists (`nav_container`) and individual buttons (`button_container`)
	 * within a given scope (e.g., document or a container element).
	 *
	 * @private
	 * @param {Object} route - The route configuration object.
	 * @param {string} route.name - The name of the route.
	 * @param {string} [route.nav_container] - Selector for a container where a full navigation list should be mounted.
	 * @param {string} [route.slugPrefix] - Prefix to use in clean URLs for this route.
	 * @param {string} [route.slugParam='page'] - Query parameter name if clean URLs are disabled.
	 * @param {Array<Object>} [route.pages] - List of page objects for this route.
	 * @param {Element} scope - The root element to search within (e.g., `document` or a DOM fragment).
	 * @param {Object} styleConfig - Styling options passed to HTML generation functions.
	 */
	_processRoute(route, scope, styleConfig) {
		// Mount navigation list if nav_container is specified
		if (route.nav_container) {
			const listContainer = scope.querySelector(route.nav_container);
			if (listContainer && !listContainer.hasAttribute('data-fnf-mounted')) {
				const html = this._generateNavListHtml(route, styleConfig);
				if (html) {
					listContainer.innerHTML = html;
					listContainer.setAttribute('data-fnf-mounted', 'true');
					this._initializeLazyHydrationIn(listContainer);
				}
			}
		}

		// Mount individual buttons for pages that have button_container
		(route.pages || []).forEach(pageObj => {
			if (pageObj.button_container) {
				const buttonContainer = scope.querySelector(pageObj.button_container);
				if (buttonContainer && !buttonContainer.hasAttribute('data-fnf-mounted')) {
					const html = this._generateNavButtonHtml(pageObj, route, styleConfig);
					buttonContainer.innerHTML = html;
					buttonContainer.setAttribute('data-fnf-mounted', 'true');
					this._initializeLazyHydrationIn(buttonContainer);
				}
			}
		});
	}

	/**
	 * Generates HTML for a full navigation list (`<ul>`) based on a route's pages.
	 * Filters out pages marked with `button_container` or `hidden: true`.
	 *
	 * @private
	 * @param {Object} route - The route configuration.
	 * @param {Array<Object>} [route.pages] - Array of page objects to render in the list.
	 * @param {Object} styleConfig - Styling configuration (same as in `mountAll`).
	 * @returns {string} The generated HTML string for the navigation list, or empty string if no valid pages.
	 *
	 * @example
	 * const html = _generateNavListHtml(route, { navClass: 'menu', itemClass: 'item' });
	 */
	_generateNavListHtml(route, styleConfig = {}) {
		const {
			navClass = 'nav-menu',
				itemClass = 'nav-item',
				...rest
		} = styleConfig;

		const pagesForList = (route.pages || []).filter(p => !p.button_container && !p.hidden);

		if (pagesForList.length === 0) {
			return '';
		}

		let html = `<ul class="${navClass}">`;
		pagesForList.forEach(pageObj => {
			html += `<li class="${itemClass}">${this._generateNavButtonHtml(pageObj, route, rest)}</li>`;
		});
		html += '</ul>';
		return html;
	}

	/**
	 * Generates HTML for a single navigation button/link (`<a>`).
	 *
	 * @private
	 * @param {Object} pageObj - The page configuration object.
	 * @param {string} pageObj.id - Unique identifier for the page.
	 * @param {string} [pageObj.link_name] - Display name for the link. Falls back to capitalized `id`.
	 * @param {string} [pageObj.link_icon] - Adding icons either via an image URL (`link_icon`) , Font Awesome HTML , emoji or text.
	 * @param {Object} route - The parent route configuration.
	 * @param {string} route.link_name - button name of the route.
	 * @param {Object} styleConfig - Styling and configuration options for the button.
	 * @param {string} [styleConfig.linkClass='nav-link'] - CSS class for the link element.
	 * @param {string} [styleConfig.buttonClass='nav-button'] - Additional CSS class for button-style links.
	 * @param {boolean} [styleConfig.useRouteClass=true] - Whether to add a route-specific class.
	 * @param {boolean} [styleConfig.usePageClass=true] - Whether to add a page-specific class.
	 * @param {string} [styleConfig.iconClass='fnf-nav-icon'] - CSS class applied to the icon container (img or span).
	 * @param {('before'|'after')} [styleConfig.iconPosition='before'] - Position of the icon relative to the link text.
	 * @returns {string} The generated anchor tag HTML string with lazy-hydration attributes.
	 *
	 * @description
	 * The generated link uses a placeholder URL initially and is later hydrated with the real slug.
	 * Includes dataset attributes for lazy hydration and identification.
	 * Supports adding icons either via an image URL (`link_icon`) , Font Awesome HTML , emoji or text.
	 * The `has-icon` class is added to the link when an icon is present.
	 */
	_generateNavButtonHtml(pageObj, route, styleConfig = {}) {

		const {
			linkClass = 'nav-link',
				buttonClass = 'nav-button',
				useRouteClass = true,
				usePageClass = true,
				iconClass = 'fnf-nav-icon',
				iconPosition = 'before',
				activeClass = this.activeClass
		} = styleConfig;

		if (!pageObj) return '';

		const placeholderUrl = this._generatePlaceholderUrl(pageObj.id, route);
		const routeClass = useRouteClass ? `route-${route.name}` : '';
		const pageClass = usePageClass ? `page-${pageObj.id}` : '';
		let combinedClasses = `${linkClass} ${buttonClass} ${routeClass} ${pageClass}`.trim();

		// Add icon classes if present
		let iconHtml = '';
		if (pageObj.link_icon) {
			// Check if it's HTML (like Font Awesome)
			if (/<[a-z][\s\S]*>/i.test(pageObj.link_icon)) {
				// Treat as HTML icon
				iconHtml = `<span class="${iconClass}">${pageObj.link_icon}</span>`;
			} else {
				// Treat as image path
				let imgSrc = pageObj.link_icon;
				if (!imgSrc.startsWith('http') && !imgSrc.startsWith('/') && !imgSrc.startsWith('data:')) {
					imgSrc = `${this.options.basePath}${imgSrc}`;
				}
				iconHtml = `<img src="${imgSrc}" alt="${pageObj.link_name || pageObj.id}" class="${iconClass}" style="width: 20px; height: 20px; border-radius: 50%; ">`;
			}
			combinedClasses += ' has-icon';
		}

		// Position icon relative to text
		const linkText = pageObj.link_name || this.capitalize(pageObj.id);
		const linkContent = iconPosition === 'after' ?
			`${linkText} ${iconHtml}` :
			`${iconHtml} ${linkText}`;

		return `
    <a href="${placeholderUrl}"
       class="${combinedClasses}"
       data-route-name="${route.name}"
       data-page-id="${pageObj.id}"
       data-active-class="${activeClass}" 
       style="display: flex; align-items: center; gap: 5px;">
       ${linkContent.trim()}
    </a>
  `;
	}

	/**
	 * Sets the `active` class on navigation links based on the currently resolved route object.
	 * This method is robust and avoids race conditions by comparing data attributes
	 * instead of relying on the potentially unhydrated `href` attribute.
	 *
	 * @public
	 * @param {Object} [currentRouteResult] - The result object from `router.resolveCurrentRoute()`.
	 * @param {Object} currentRouteResult.route - The active route configuration.
	 * @param {Object} currentRouteResult.pageObj - The active page object.
	 * @fires FnFNavigationManager#event:active-link-updated - After updating active states.
	 */
	setActiveLink(currentRouteResult) {
		// Jika tidak ada informasi rute saat ini, jangan lakukan apa-apa.
		if (!currentRouteResult || !currentRouteResult.route || !currentRouteResult.pageObj) {
			// Hapus semua class aktif sebagai fallback
			document.querySelectorAll('[data-route-name][data-page-id]').forEach(link => {
				const activeClass = link.dataset.activeClass || 'active-link';
				link.classList.remove(activeClass);
				const icon = link.querySelector('.fnf-nav-icon');
				if (icon) {
					icon.classList.remove(activeClass + '-icon');
				}
			});
			return;
		}

		// Ambil identitas rute yang sedang aktif
		const activeRouteName = currentRouteResult.route.name;
		const activePageId = currentRouteResult.pageObj.id;

		document.querySelectorAll('[data-route-name][data-page-id]').forEach(link => {
			try {
				const activeClass = link.dataset.activeClass || 'active-link';
				
				// Ambil identitas dari data atribut link
				const linkRouteName = link.dataset.routeName;
				const linkPageId = link.dataset.pageId;

				// Bandingkan identitas, BUKAN href! Ini solusi intinya.
				const isActive = (linkRouteName === activeRouteName && linkPageId === activePageId);

				// Terapkan atau hapus class 'active'
				link.classList.toggle(activeClass, isActive);

				// Logika untuk ikon (jika ada)
				const icon = link.querySelector('.fnf-nav-icon');
				if (icon) {
					icon.classList.toggle(activeClass + '-icon', isActive);
				}
			} catch (e) {
				console.warn(`FnFNavManager: Error processing link for active state`, e, link);
			}
		});
	}

	/**
	 * Disconnects all observers and removes event listeners to prevent memory leaks.
	 * Should be called before destroying the instance or unmounting the component.
	 *
	 * @public
	 *
	 * @example
	 * navManager.destroy();
	 */
	destroy() {
		this.lazyObserver.disconnect();
		window.removeEventListener('fnf:content-rendered', this.handleContentRendered.bind(this));
	}

	// --- "Private" Helper Methods ---

	/**
	 * Initializes lazy hydration for all unhydrated links within a given container.
	 * Observes each link using IntersectionObserver so their `href` is set only when near viewport.
	 *
	 * @private
	 * @param {Element} container - The DOM element containing navigation links.
	 */
	_initializeLazyHydrationIn(container) {
		const links = container.querySelectorAll(this.linkSelector);
		links.forEach(link => {
			if (!link.dataset.hydrated) {
				this.lazyObserver.observe(link);
			}
		});
	}

	/**
	 * Hydrates a single navigation link by resolving its actual slug via the router,
	 * updating its `href`, and marking it as hydrated. Uses cache to avoid redundant lookups.
	 *
	 * @private
	 * @param {HTMLAnchorElement} link - The anchor element to hydrate.
	 * @returns {Promise<void>}
	 *
	 * @fires FnFNavigationManager#event:link-hydrated - When the link is successfully hydrated.
	 * @fires FnFNavigationManager#event:link-hydration-error - If slug generation fails.
	 */
	async hydrateLink(link) {
		const pageId = link.dataset.pageId;
		const routeName = link.dataset.routeName;
		const routeConfig = this.options.routes.find(r => r.name === routeName);

		if (!pageId || !routeConfig) return;

		const pageObj = (routeConfig.pages || []).find(p => p.id === pageId);
		if (!pageObj) return;

		const cacheId = `${routeName}:${pageId}`;

		const slug = getCache(cacheId, 'slug');

		if (slug) {
			link.href = this._generateUrl(slug, routeConfig);
			link.dataset.hydrated = "true";
			return;
		}

		try {
			const slug = await this.router.getSlugForPage(pageObj, routeConfig);
			const newHref = this._generateUrl(slug, routeConfig);

			if (newHref !== link.getAttribute('href')) {
				link.href = newHref;
			}

			link.dataset.hydrated = "true";
		} catch (error) {
			console.error(`FnFNavManager: Failed to hydrate link for '${pageId}'.`, error);
			link.dataset.hydrated = "error";
		}
	}

	/**
	 * Callback for IntersectionObserver. Triggers hydration when a link enters the viewport.
	 *
	 * @private
	 * @param {Array<IntersectionObserverEntry>} entries - List of observed elements and their intersection states.
	 */
	handleIntersection(entries) {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				const link = entry.target;
				this.lazyObserver.unobserve(link);
				this.hydrateLink(link);
			}
		});
	}

	/**
	 * Generates a placeholder URL using a predictable slug from the page ID.
	 * Used as a temporary `href` until the real slug is resolved.
	 *
	 * @private
	 * @param {string} pageId - The page identifier.
	 * @param {Object} route - The associated route configuration.
	 * @returns {string} A temporary URL using a generated slug.
	 */
	_generatePlaceholderUrl(pageId, route) {
		const slug = FnFGenerateSlug(pageId);
		return this._generateUrl(slug, route);
	}

	/**  
	 * Generates final URL for a page, respecting clean URL support and base path.  
	 * Throws if `route.slugParam` is missing for query-based routing.  
	 *  
	 * @private  
	 * @param {string} slug - URL-safe slug (e.g., `"about-us"`).  
	 * @param {Object} route - Route config with `slugParam` and `slugPrefix`.  
	 * @param {string} [route.slugParam="page"] - Query param for non-clean URLs.  
	 * @param {string} [route.slugPrefix] - Path prefix (e.g., `"blog"` → `/blog/...`).  
	 * @returns {string} Full URL path.  
	 * @throws {TypeError} If `slugParam` is undefined in query mode.  
	 *  
	 * @example  
	 * _generateUrl("hello-world", { slugPrefix: "posts" });  
	 * // → "/base/posts/hello-world" (clean)  
	 * // → "/base?page=hello-world" (query)  
	 */
	_generateUrl(slug, route) {
		if (this.options.isCleanUrlSupported) {
			const prefix = route.slugPrefix ? `${route.slugPrefix}/` : '';
			return `${this.options.basePath}${prefix}${slug}`;
		} else {
			const url = new URL(this.options.basePath, window.location.origin);
			url.searchParams.set(route.slugParam || 'page', slug);
			return url.pathname + url.search;
		}
	}

	/**  
	 * Capitalizes and humanizes a string (ID → Display Name).  
	 * Handles hyphenated strings, numbers, and edge cases.  
	 *  
	 * @private  
	 * @param {string} str - Input string (e.g., `"user-profile"`, `"404"`).  
	 * @returns {string} Human-readable title (e.g., `"User Profile"`, `"404"`).  
	 *  
	 * @example  
	 * capitalize("");          // → ""  
	 * capitalize("hello");     // → "Hello"  
	 * capitalize("hello-world"); // → "Hello World"  
	 * capitalize("apiV2");     // → "Api V2"  
	 */
	capitalize(str) {
		if (typeof str !== 'string' || !str) return '';
		return str.replace(/(?:^|\s)\S/g, char => char.toUpperCase()).replace(/-/g, ' ');
	}
}

/**
 * ====================================================================
 * PUBLIC API EXPORTS
 * ====================================================================
 * Exposes the public functions and classes of the FnF toolkit.
 */
export {
	FnFLoad,
	FnFCleanupAll,
	FnFConfigureLazyLoading,
	FnFGenerateSlug,
	FnFReplaceHeadContent,
	FnFCheckCleanUrlSupport,
	FnFNavigationManager,
	FnFRouter
};