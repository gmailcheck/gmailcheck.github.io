// js/apps/history.js
// Enterprise-Grade Offline History System using IndexedDB for GC Apps Suite

const DB_NAME = 'HistoryDB';
const DB_VERSION = 1;
const STORE_NAME = 'history';
let historyDbInstance = null;

// Initialize IndexedDB
function initHistoryDB() {
    return new Promise((resolve, reject) => {
        if (historyDbInstance) {
            return resolve(historyDbInstance);
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => {
            historyDbInstance = e.target.result;
            resolve(historyDbInstance);
        };
        request.onerror = (e) => {
            console.error("IndexedDB Open Error:", e.target.error);
            reject(e.target.error);
        };
    });
}

// Generate user requested timestamp format: YYYY-MM-DD-HH-mm-ss
function getFormattedTimestamp() {
    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const yyyy = now.getFullYear();
    const MM = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `${yyyy}-${MM}-${dd}-${hh}-${mm}-${ss}`;
}

// Public API: Save History Entry to DB
window.saveHistoryEntry = async function (appId, appName, count, content, typeLabel = 'emails') {
    try {
        const db = await initHistoryDB();
        const entry = {
            id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            appId: appId,
            appName: appName,
            title: getFormattedTimestamp(),
            timestamp: Date.now(),
            count: count,
            typeLabel: typeLabel,
            content: content
        };

        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(entry);

        transaction.oncomplete = () => {
            console.log(`[History] Successfully saved entry for ${appName}`);
            // Refresh list if we are on the history page currently
            if (window.currentActiveMenu === 'history' && typeof window.loadHistoryList === 'function') {
                window.loadHistoryList();
            }
        };
    } catch (e) {
        console.error("[History] Save failed:", e);
    }
};

// Retrieve all history entries sorted by newest first
function getHistoryEntries() {
    return new Promise(async (resolve) => {
        try {
            const db = await initHistoryDB();
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const sorted = request.result.sort((a, b) => b.timestamp - a.timestamp);
                resolve(sorted);
            };
            request.onerror = () => {
                resolve([]);
            };
        } catch (e) {
            console.error("[History] Get failed:", e);
            resolve([]);
        }
    });
}

// Delete single entry from DB
function deleteHistoryEntry(id) {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initHistoryDB();
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (e) {
            reject(e);
        }
    });
}

// Clear all history entries
function clearAllHistory() {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initHistoryDB();
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (e) {
            reject(e);
        }
    });
}

// Global scope initialization & rendering logic
let currentCategoryFilter = 'all';
let historySearchQuery = '';

window.loadHistoryList = async function () {
    const listContainer = document.getElementById('history-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: #af86fc; margin-bottom: 12px;"></i>
            <p>Retrieving secure offline index...</p>
        </div>
    `;

    const allEntries = await getHistoryEntries();

    // Apply Filter & Search
    const filtered = allEntries.filter(entry => {
        // App Category filter
        if (currentCategoryFilter !== 'all' && entry.appId !== currentCategoryFilter) {
            return false;
        }
        // Search filter
        if (historySearchQuery) {
            const query = historySearchQuery.toLowerCase();
            const matchesTitle = entry.title.toLowerCase().includes(query);
            const matchesAppName = entry.appName.toLowerCase().includes(query);
            const matchesContent = entry.content.toLowerCase().includes(query);
            return matchesTitle || matchesAppName || matchesContent;
        }
        return true;
    });

    listContainer.innerHTML = '';

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 50px 20px; color: var(--text-muted); border: 2px dashed var(--border-color); border-radius: 16px; background: rgba(255,255,255,0.01);">
                <i class="fa-solid fa-clock" style="font-size: 3rem; color: var(--border-color); margin-bottom: 15px; display: block;"></i>
                <h4 style="color: var(--text-sharp); font-family: 'Orbitron', monospace; margin-bottom: 8px;">No History Found</h4>
                <p style="font-size: 0.82rem; max-width: 320px; margin: 0 auto 20px;">
                    ${historySearchQuery ? 'No records match your query. Try resetting your search filter.' : 'You have not checked or permuted any results yet. Your offline run history will appear here.'}
                </p>
                ${!historySearchQuery ? `
                    <button class="btn btn-primary" id="btn-history-empty-action" style="background: linear-gradient(135deg, #af86fc 0%, #7e53c9 100%); font-weight: bold; border-radius: 100px; padding: 10px 20px;">
                        <i class="fa-solid fa-rocket" style="margin-right: 6px;"></i> Run A New Check
                    </button>
                ` : ''}
            </div>
        `;

        const emptyCta = document.getElementById('btn-history-empty-action');
        if (emptyCta) {
            emptyCta.addEventListener('click', () => {
                window.setActiveMenu('app1');
            });
        }
        return;
    }

    filtered.forEach(entry => {
        const card = document.createElement('div');
        card.className = `history-item-card ${entry.appId}`;

        // Humanize display count
        const displayLabel = entry.count.toLocaleString() + ' ' + (entry.typeLabel || 'emails');

        card.innerHTML = `
            <div class="history-card-header">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <span class="history-badge ${entry.appId}">${entry.appName}</span>
                    <div class="history-title" style="margin-top: 8px;">
                        <i class="fa-regular fa-calendar-check" style="margin-right: 6px; color: var(--text-muted);"></i>${entry.title}
                    </div>
                    <div class="history-meta">
                        <i class="fa-solid fa-list-check" style="margin-right: 6px;"></i>${displayLabel}
                    </div>
                </div>
                <div class="history-actions">
                    <button class="history-btn copy-btn" title="Copy to Clipboard">
                        <i class="fa-solid fa-copy"></i> Copy
                    </button>
                    <button class="history-btn download-btn" title="Download TXT">
                        <i class="fa-solid fa-download"></i> Download
                    </button>
                    <button class="history-btn delete-btn delete" title="Remove Entry">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
            
            <!-- Details Monospace Box -->
            <div class="history-details-container hide" id="details-${entry.id}"></div>
            
            <div style="display: flex; justify-content: flex-start;">
                <button class="history-btn toggle-details-btn" style="border: none; padding: 2px 4px; font-size: 0.72rem; color: #af86fc; font-weight: bold; background: transparent;">
                    <i class="fa-solid fa-eye" style="margin-right: 4px;"></i> View Details
                </button>
            </div>
        `;

        // Event listeners inside card
        const copyBtn = card.querySelector('.copy-btn');
        const dlBtn = card.querySelector('.download-btn');
        const delBtn = card.querySelector('.delete-btn');
        const detailsToggle = card.querySelector('.toggle-details-btn');
        const detailsBox = card.querySelector(`#details-${entry.id}`);

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(entry.content).then(() => {
                const origHTML = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #66ffd9;"></i> Copied!';
                copyBtn.style.borderColor = '#00cccc';
                setTimeout(() => {
                    copyBtn.innerHTML = origHTML;
                    copyBtn.style.borderColor = '';
                }, 2000);
            });
        });

        dlBtn.addEventListener('click', () => {
            const blob = new Blob([entry.content], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${entry.appId}-${entry.title}.txt`;
            link.click();
            URL.revokeObjectURL(link.href);
        });

        delBtn.addEventListener('click', async () => {
            if (confirm(`Delete history entry from ${entry.title}?`)) {
                await deleteHistoryEntry(entry.id);
                if (window.showAppNotification) {
                    window.showAppNotification('success', 'History entry successfully removed.');
                }
                window.loadHistoryList();
            }
        });

        detailsToggle.addEventListener('click', () => {
            if (detailsBox.classList.contains('hide')) {
                // Populate details and show
                detailsBox.textContent = entry.content;
                detailsBox.classList.remove('hide');
                detailsToggle.innerHTML = '<i class="fa-solid fa-eye-slash" style="margin-right: 4px;"></i> Hide Details';
            } else {
                detailsBox.classList.add('hide');
                detailsBox.textContent = '';
                detailsToggle.innerHTML = '<i class="fa-solid fa-eye" style="margin-right: 4px;"></i> View Details';
            }
        });

        listContainer.appendChild(card);
    });
};

// Initializer
function initHistoryPage() {
    // Search filter input listener
    const searchInput = document.getElementById('history-search');
    if (searchInput) {
        let searchTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                historySearchQuery = e.target.value;
                window.loadHistoryList();
            }, 300);
        });
    }

    // Category pills listeners
    const pills = document.querySelectorAll('.btn-filter-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentCategoryFilter = pill.getAttribute('data-category');
            window.loadHistoryList();
        });
    });

    // Refresh button
    const refreshBtn = document.getElementById('btn-refresh-history');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            window.loadHistoryList();
        });
    }

    // Clear All button
    const clearAllBtn = document.getElementById('btn-clear-all-history');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async () => {
            if (confirm("Are you absolutely sure you want to clear your entire check/generation history? This cannot be undone.")) {
                if (confirm("Confirm one more time to empty your offline history database permanently.")) {
                    await clearAllHistory();
                    if (window.showAppNotification) {
                        window.showAppNotification('success', '🗑️ <strong>History cleared successfully</strong>.');
                    }
                    window.loadHistoryList();
                }
            }
        });
    }

    // Hook into router page active callback to load history list automatically
    const origSetActiveMenu = window.setActiveMenu;
    window.setActiveMenu = function (menuId, pushState = true) {
        origSetActiveMenu(menuId, pushState);
        if (menuId === 'history' && window.isUserAuthenticated) {
            window.loadHistoryList();
        }
    };

    // Auto initialize DB early
    initHistoryDB().catch(err => console.error("History DB preload error:", err));
}

// Bootstrap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHistoryPage);
} else {
    initHistoryPage();
}
