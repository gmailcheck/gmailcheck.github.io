// js/apps/history.js
// Enterprise-Grade Offline History System using IndexedDB for GC Apps Suite

const DB_NAME = 'HistoryDB';
const DB_VERSION = 1;
const STORE_NAME = 'history';
let historyDbInstance = null;
let cachedHistoryEntries = null;

// Custom confirm dialog modal helper to replace default browser confirms
function showCustomConfirm(title, message, onConfirm) {
    let modal = document.getElementById('custom-confirm-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-confirm-modal';
        modal.className = 'modal-overlay hide modal-overlay-whitelist';
        modal.style.zIndex = '99999';
        modal.innerHTML = `
            <div class="modal-card-whitelist" style="max-width: 400px; text-align: center; display: flex; flex-direction: column; gap: 20px; padding: 24px; border-radius: 16px; background: var(--bg-card); border: 1px solid var(--border-color); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <!-- Warning Icon -->
                <div style="display: flex; justify-content: center; align-items: center;">
                    <div style="width: 60px; height: 60px; background: rgba(255, 102, 102, 0.1); border: 1px solid rgba(255, 102, 102, 0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(255, 102, 102, 0.2);">
                        <i class="fa-solid fa-triangle-exclamation" style="color: #ff6666; font-size: 24px;"></i>
                    </div>
                </div>

                <!-- Text Content -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <h3 class="font-keren" id="custom-confirm-title" style="color: var(--text-sharp); margin: 0; font-size: 20px; letter-spacing: 0.5px;"></h3>
                    <p id="custom-confirm-message" style="color: var(--text-secondary); margin: 0; line-height: 1.5; font-size: 14px; text-align: center;"></p>
                </div>

                <!-- Buttons -->
                <div style="display: flex; gap: 12px; margin-top: 8px; width: 100%;">
                    <button id="btn-custom-confirm-cancel" class="btn btn-secondary" style="flex: 1; border-radius: 12px; padding: 10px 16px; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary); cursor: pointer; transition: all 0.2s;">
                        Cancel
                    </button>
                    <button id="btn-custom-confirm-ok" class="btn btn-danger" style="flex: 1; border-radius: 12px; padding: 10px 16px; background: linear-gradient(135deg, #ff4d4d 0%, #cc0000 100%); color: white; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(255, 77, 77, 0.3); transition: all 0.2s;">
                        Confirm
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const closeModal = () => modal.classList.add('hide');
        document.getElementById('btn-custom-confirm-cancel').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Set dynamic content
    document.getElementById('custom-confirm-title').textContent = title;
    document.getElementById('custom-confirm-message').innerHTML = message;

    // Hook the confirm button
    const confirmBtn = document.getElementById('btn-custom-confirm-ok');
    // Recreate the confirm button to strip previous event listeners cleanly
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
        modal.classList.add('hide');
        if (typeof onConfirm === 'function') onConfirm();
    });

    // Show modal
    modal.classList.remove('hide');
}

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
window.saveHistoryEntry = async function (appId, appName, count, content, typeLabel = 'emails', metadata = null) {
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
            content: content,
            metadata: metadata
        };

        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(entry);

        transaction.oncomplete = () => {
            console.log(`[History] Successfully saved entry for ${appName}`);
            cachedHistoryEntries = null; // Reset cache so next render gets fresh DB data
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

// Premium self-contained details modal
// Global handler cleanups to prevent multiple active listeners/leaks
let historyDetailsScrollHandler = null;
let historyDetailsGmailScrollHandler = null;

function showHistoryDetailsModal(entry) {
    const mainViewport = document.getElementById('history-main-viewport');
    const detailsViewport = document.getElementById('history-details-viewport');

    if (mainViewport) mainViewport.classList.add('hide');
    if (detailsViewport) detailsViewport.classList.remove('hide');

    // Show premium loading spinner overlay immediately
    const overlay = document.getElementById('history-details-loading-overlay');
    const loadingText = document.getElementById('history-details-loading-text');
    if (overlay) {
        overlay.classList.remove('hide');
        if (loadingText) {
            loadingText.textContent = `Parsing ${entry.count.toLocaleString()} ${entry.typeLabel || 'items'}...`;
        }
    }

    // Delay heavy parsing and rendering workload to let the browser paint the loading spinner first!
    setTimeout(() => {
        // Populate Metadata & Header Title
        const appBadge = document.getElementById('history-details-meta-app');
        if (appBadge) {
            appBadge.className = `history-badge ${entry.appId}`;
            appBadge.textContent = entry.appName;
        }

        const timeMeta = document.getElementById('history-details-meta-time');
        if (timeMeta) timeMeta.textContent = entry.title;

        const countMeta = document.getElementById('history-details-meta-count');
        if (countMeta) {
            countMeta.textContent = entry.count.toLocaleString() + ' ' + (entry.typeLabel || 'emails');
        }

        // Populate Server metadata row (only for Gmail Checker app1)
        const serverRow = document.getElementById('history-details-meta-server-row');
        const serverVal = document.getElementById('history-details-meta-server');
        if (serverRow && serverVal) {
            const serverCode = (entry.metadata && entry.metadata.server) || entry.server || null;
            if (entry.appId === 'app1' && serverCode) {
                const serverMap = {
                    fastServer1: 'Fast 1',
                    fastServer2: 'Fast 2',
                    server1: 'Advanced 1',
                    server2: 'Advanced 2'
                };
                serverVal.textContent = serverMap[serverCode] || serverCode;
                serverRow.style.display = 'flex';
            } else {
                serverRow.style.display = 'none';
            }
        }

        const titleContainer = document.getElementById('history-details-title-container');
        if (titleContainer) {
            titleContainer.innerHTML = `<i class="fa-solid fa-gauge-high style-color-af86fc"></i> Run Details - ${entry.appName} (${entry.title})`;
        }

        const textViewport = document.getElementById('history-details-text-viewport');
        const tasksViewport = document.getElementById('history-details-tasks-viewport');

        // Clean up previous event listeners on viewports
        if (historyDetailsScrollHandler && textViewport) {
            textViewport.removeEventListener('scroll', historyDetailsScrollHandler);
            historyDetailsScrollHandler = null;
        }
        if (historyDetailsGmailScrollHandler && tasksViewport) {
            tasksViewport.removeEventListener('scroll', historyDetailsGmailScrollHandler);
            historyDetailsGmailScrollHandler = null;
        }

        // Reset Viewports state
        if (textViewport) {
            textViewport.scrollTop = 0;
            textViewport.innerHTML = '';
        }
        if (tasksViewport) {
            tasksViewport.scrollTop = 0;
            tasksViewport.innerHTML = '';
        }

        // Hook Back Button
        const backBtn = document.getElementById('btn-back-history-details');
        if (backBtn) {
            // Clone and replace to clean up listeners
            const newBackBtn = backBtn.cloneNode(true);
            backBtn.parentNode.replaceChild(newBackBtn, backBtn);
            newBackBtn.addEventListener('click', () => {
                if (detailsViewport) detailsViewport.classList.add('hide');
                if (mainViewport) mainViewport.classList.remove('hide');

                // Clean scroll handlers when leaving
                if (historyDetailsScrollHandler && textViewport) {
                    textViewport.removeEventListener('scroll', historyDetailsScrollHandler);
                    historyDetailsScrollHandler = null;
                }
                if (historyDetailsGmailScrollHandler && tasksViewport) {
                    tasksViewport.removeEventListener('scroll', historyDetailsGmailScrollHandler);
                    historyDetailsGmailScrollHandler = null;
                }

                // Hancurkan DOM di viewport detail untuk membebaskan memory secara instan!
                if (textViewport) {
                    textViewport.innerHTML = '';
                }
                if (tasksViewport) {
                    tasksViewport.innerHTML = '';
                }

                // Refresh history list to keep it updated
                window.loadHistoryList();
            });
        }

        // Hook Hook Copy/Download Sidebar Actions
        const actionsContainer = document.getElementById('history-details-actions-container');
        if (actionsContainer) {
            actionsContainer.innerHTML = '';

            if (entry.appId === 'app1') {
                // Gmail Checker: Show dynamic split copy/download buttons + global copy/download
                const lines = entry.content ? entry.content.split('\n') : [];
                const items = lines.map(line => {
                    const parts = line.split(' - ');
                    const email = parts[0]?.trim() || '';
                    const statusText = parts[1]?.trim() || 'BAD';
                    return {
                        email: email,
                        status: statusText.toLowerCase()
                    };
                }).filter(x => x.email.length > 0 && x.status !== 'failed');

                // Detect server type
                let serverType = 'advanced';
                const serverCode = (entry.metadata && entry.metadata.server) || entry.server || null;
                if (serverCode) {
                    if (serverCode.startsWith('fast')) {
                        serverType = 'fast';
                    } else {
                        serverType = 'advanced';
                    }
                } else {
                    // Heuristic
                    const hasAdvanced = items.some(x => ['verify', 'disabled', 'unregistered'].includes(x.status));
                    const hasFast = items.some(x => x.status === 'bad');
                    if (hasFast && !hasAdvanced) {
                        serverType = 'fast';
                    } else {
                        serverType = 'advanced';
                    }
                }

                const targetStatuses = serverType === 'fast'
                    ? ['live', 'bad', 'failed']
                    : ['live', 'verify', 'disabled', 'unregistered', 'failed'];

                const statusDetails = {
                    live: { label: 'LIVE', color: '#66ffd9', icon: '<i class="fa-solid fa-circle-check"></i>' },
                    verify: { label: 'VER', color: '#ffd700', icon: '<i class="fa-solid fa-circle-question"></i>' },
                    disabled: { label: 'DISABLED', color: '#ff6347', icon: '<i class="fa-solid fa-circle-minus"></i>' },
                    unregistered: { label: 'UNREGISTERED', color: '#00f0ff', icon: '<i class="fa-solid fa-user-xmark"></i>' },
                    bad: { label: 'BAD', color: '#ff6666', icon: '<i class="fa-solid fa-circle-xmark"></i>' },
                    failed: { label: 'FAILED', color: '#ff4d4d', icon: '<i class="fa-solid fa-circle-exclamation"></i>' }
                };

                // Global Copy
                const copyAllBtn = document.createElement('button');
                copyAllBtn.className = 'btn style-mtb-10';
                copyAllBtn.style.width = '100%';
                copyAllBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy All Results';
                copyAllBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(entry.content).then(() => {
                        const origHTML = copyAllBtn.innerHTML;
                        copyAllBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #66ffd9;"></i> Copied!';
                        copyAllBtn.style.borderColor = '#00cccc';
                        setTimeout(() => {
                            copyAllBtn.innerHTML = origHTML;
                            copyAllBtn.style.borderColor = '';
                        }, 2000);
                    });
                });
                actionsContainer.appendChild(copyAllBtn);

                // Global Download
                const downloadAllBtn = document.createElement('button');
                downloadAllBtn.className = 'btn style-mtb-10';
                downloadAllBtn.style.width = '100%';
                downloadAllBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download All (TXT)';
                downloadAllBtn.addEventListener('click', () => {
                    const blob = new Blob([entry.content], { type: 'text/plain;charset=utf-8' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `${entry.appId}-${entry.title}-ALL.txt`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                });
                actionsContainer.appendChild(downloadAllBtn);

                // Dynamic Split Actions Panel
                const splitPanel = document.createElement('div');
                splitPanel.style.marginTop = '10px';
                splitPanel.style.background = 'rgba(255, 255, 255, 0.02)';
                splitPanel.style.border = '1px solid var(--border-color)';
                splitPanel.style.borderRadius = '12px';
                splitPanel.style.padding = '10px';
                splitPanel.style.display = 'flex';
                splitPanel.style.flexDirection = 'column';
                splitPanel.style.gap = '8px';

                splitPanel.innerHTML = `
                    <div style="color: var(--text-muted); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-filter" style="color: #af86fc;"></i> SPLIT BY STATUS
                    </div>
                `;

                targetStatuses.forEach(status => {
                    const groupItems = items.filter(x => x.status === status);
                    const count = groupItems.length;
                    const details = statusDetails[status] || { label: status.toUpperCase(), color: '#ffffff', icon: '' };

                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.alignItems = 'center';
                    row.style.justifyContent = 'space-between';
                    row.style.padding = '6px 8px';
                    row.style.background = 'rgba(255,255,255,0.01)';
                    row.style.borderRadius = '8px';
                    row.style.border = '1px solid rgba(255,255,255,0.03)';

                    row.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1; margin-right: 8px;">
                            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${details.color}; flex-shrink: 0; box-shadow: 0 0 6px ${details.color};"></span>
                            <span style="color: var(--text-sharp); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${details.label}">${details.label} (${count})</span>
                        </div>
                        <div style="display: flex; gap: 6px; flex-shrink: 0;">
                            <button class="btn-split-copy" style="background: rgba(175, 134, 252, 0.1); border: 1px solid rgba(175, 134, 252, 0.2); color: #af86fc; border-radius: 6px; padding: 4px 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 24px;  transition: all 0.2s; ${count === 0 ? 'opacity: 0.4; cursor: not-allowed;' : ''}" ${count === 0 ? 'disabled' : ''} title="Copy ${details.label} (${count})">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                            <button class="btn-split-download" style="background: rgba(102, 255, 217, 0.1); border: 1px solid rgba(102, 255, 217, 0.2); color: #66ffd9; border-radius: 6px; padding: 4px 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 24px;  transition: all 0.2s; ${count === 0 ? 'opacity: 0.4; cursor: not-allowed;' : ''}" ${count === 0 ? 'disabled' : ''} title="Download ${details.label} (${count})">
                                <i class="fa-solid fa-download"></i>
                            </button>
                        </div>
                    `;

                    if (count > 0) {
                        const splitCopyBtn = row.querySelector('.btn-split-copy');
                        const splitDownloadBtn = row.querySelector('.btn-split-download');

                        splitCopyBtn.addEventListener('click', () => {
                            const text = groupItems.map(x => x.email).join('\n');
                            navigator.clipboard.writeText(text).then(() => {
                                const origHTML = splitCopyBtn.innerHTML;
                                splitCopyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                                setTimeout(() => {
                                    splitCopyBtn.innerHTML = origHTML;
                                }, 1500);
                            });
                        });

                        splitDownloadBtn.addEventListener('click', () => {
                            const text = groupItems.map(x => x.email).join('\n');
                            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = `${entry.appId}-${entry.title}-${status.toUpperCase()}.txt`;
                            link.click();
                            URL.revokeObjectURL(link.href);
                        });
                    }

                    splitPanel.appendChild(row);
                });

                actionsContainer.appendChild(splitPanel);

            } else {
                // Other Apps: Show standard copy & download buttons
                const copyBtn = document.createElement('button');
                copyBtn.className = 'btn style-mtb-10';
                copyBtn.style.width = '100%';
                copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Results';
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
                actionsContainer.appendChild(copyBtn);

                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'btn style-mtb-10';
                downloadBtn.style.width = '100%';
                downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download (TXT)';
                downloadBtn.addEventListener('click', () => {
                    const blob = new Blob([entry.content], { type: 'text/plain;charset=utf-8' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `${entry.appId}-${entry.title}.txt`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                });
                actionsContainer.appendChild(downloadBtn);
            }
        }

        // RENDER LOGIC
        if (entry.appId === 'app1') {
            // Gmail Checker: Beautiful Virtual Scroll Cards Viewport
            if (textViewport) textViewport.classList.add('hide');
            if (tasksViewport) {
                tasksViewport.classList.remove('hide');
                renderGmailCheckerHistoryVirtualScroll(entry, tasksViewport);
            }
        } else if (entry.appId === 'app2') {
            // Gmail Dot Tricks: Beautiful task-based card viewport
            if (textViewport) textViewport.classList.add('hide');
            if (tasksViewport) {
                tasksViewport.classList.remove('hide');
                renderGmailDotTricksHistoryTasks(entry, tasksViewport);
            }
        } else if (entry.appId === 'app3') {
            // Name Combiner: Single task-based card viewport
            if (textViewport) textViewport.classList.add('hide');
            if (tasksViewport) {
                tasksViewport.classList.remove('hide');
                renderNameCombinerHistoryTasks(entry, tasksViewport);
            }
        } else {
            // Other Apps (e.g. Email Extractor): Mono Line Numbers Virtual Scroll Viewport
            if (tasksViewport) tasksViewport.classList.add('hide');
            if (textViewport) {
                textViewport.classList.remove('hide');
                renderMonospaceHistoryVirtualScroll(entry, textViewport);
            }
        }

        // Hide premium loading spinner overlay
        if (overlay) overlay.classList.add('hide');
    }, 50);
}

// Monospace Gutter Line Numbers Virtual Scroller for other apps
function renderMonospaceHistoryVirtualScroll(entry, viewport) {
    const lines = entry.content ? entry.content.split('\n') : [];
    const TOTAL_LINES = lines.length;

    // Line dimensions: 1.2rem
    const LINE_HEIGHT_REM = 1.2;
    const LINE_OVERSCAN = 15;
    let vScrollTimer;

    function getRemPx() {
        return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    }

    // Force strict dimensions for clean box-model scroller
    viewport.style.display = 'block';
    viewport.style.padding = '10px 0';
    viewport.style.boxSizing = 'border-box';

    function renderLines() {
        const scrollTop = viewport.scrollTop;
        const viewH = viewport.clientHeight || 500;
        const lineH = LINE_HEIGHT_REM * getRemPx();

        const startIdx = Math.max(0, Math.floor(scrollTop / lineH) - LINE_OVERSCAN);
        const endIdx = Math.min(TOTAL_LINES - 1, Math.ceil((scrollTop + viewH) / lineH) + LINE_OVERSCAN);

        const padTop = startIdx * LINE_HEIGHT_REM;
        const padBot = Math.max(0, (TOTAL_LINES - 1 - endIdx) * LINE_HEIGHT_REM);

        viewport.innerHTML = '';

        // Top spacer
        if (padTop > 0) {
            const t = document.createElement('div');
            t.style.height = `${padTop}rem`;
            viewport.appendChild(t);
        }

        // Visible rows
        for (let i = startIdx; i <= endIdx; i++) {
            const row = document.createElement('div');
            row.style.height = `${LINE_HEIGHT_REM}rem`;
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.overflow = 'hidden';

            const gutter = document.createElement('span');
            gutter.textContent = i + 1;
            gutter.style.display = 'inline-block';
            gutter.style.minWidth = '3.5rem';
            gutter.style.paddingRight = '0.75rem';
            gutter.style.textAlign = 'right';
            gutter.style.color = 'rgba(0, 240, 255, 0.4)';
            gutter.style.userSelect = 'none';
            gutter.style.flexShrink = '0';
            gutter.style.borderRight = '1px solid rgba(0, 240, 255, 0.15)';
            gutter.style.marginRight = '0.75rem';

            const text = document.createElement('span');
            text.textContent = lines[i] || '';
            text.style.color = '#00f0ff';
            text.style.whiteSpace = 'nowrap';
            text.style.overflow = 'hidden';
            text.style.textOverflow = 'ellipsis';
            text.style.flex = '1';

            row.appendChild(gutter);
            row.appendChild(text);
            viewport.appendChild(row);
        }

        // Bottom spacer
        if (padBot > 0) {
            const b = document.createElement('div');
            b.style.height = `${padBot}rem`;
            viewport.appendChild(b);
        }
    }

    historyDetailsScrollHandler = function () {
        if (vScrollTimer) clearTimeout(vScrollTimer);
        vScrollTimer = setTimeout(renderLines, 16);
    };

    viewport.addEventListener('scroll', historyDetailsScrollHandler, { passive: true });

    // Trigger initial render
    renderLines();
}

// Gmail Checker Card/Row Virtual Scroller
function renderGmailCheckerHistoryVirtualScroll(entry, viewport) {
    const lines = entry.content ? entry.content.split('\n') : [];
    let visibleIndex = 0;
    const items = lines.map((line) => {
        const parts = line.split(' - ');
        const email = parts[0]?.trim() || '';
        const statusText = parts[1]?.trim() || 'BAD';
        return {
            email: email,
            status: statusText.toLowerCase(),
            details: 'checked'
        };
    }).filter(x => x.email.length > 0 && x.status !== 'failed')
      .map(item => {
          visibleIndex++;
          return {
              index: visibleIndex,
              ...item
          };
      });

    const TOTAL_ITEMS = items.length;
    const ITEM_HEIGHT_REM = 2.875; // 46px / 16
    const OVERSCAN = 15;
    let vScrollTimer;

    function getRemPx() {
        return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    }

    viewport.style.display = 'block';
    viewport.style.gap = '0px';

    function renderCards() {
        const scrollTop = viewport.scrollTop;
        const viewH = viewport.clientHeight || 500;
        const itemHPx = ITEM_HEIGHT_REM * getRemPx();

        const startIdx = Math.max(0, Math.floor(scrollTop / itemHPx) - OVERSCAN);
        const endIdx = Math.min(TOTAL_ITEMS - 1, Math.ceil((scrollTop + viewH) / itemHPx) + OVERSCAN);

        const padTop = startIdx * ITEM_HEIGHT_REM;
        const padBot = Math.max(0, (TOTAL_ITEMS - 1 - endIdx) * ITEM_HEIGHT_REM);

        viewport.innerHTML = '';

        // Top padding
        if (padTop > 0) {
            const t = document.createElement('div');
            t.style.height = `${padTop}rem`;
            viewport.appendChild(t);
        }

        // Visible cards
        for (let i = startIdx; i <= endIdx; i++) {
            const item = items[i];
            if (!item) continue;

            const itemRow = document.createElement('div');
            itemRow.className = 'task-card';
            itemRow.style.height = `2.375rem`; // 38px / 16
            itemRow.style.padding = '0 0.875rem';
            itemRow.style.display = 'flex';
            itemRow.style.flexDirection = 'row';
            itemRow.style.justifyContent = 'space-between';
            itemRow.style.alignItems = 'center';
            itemRow.style.boxSizing = 'border-box';
            itemRow.style.margin = '0 0 0.5rem 0'; // Gap between rows

            let color = '#ff6666'; // bad (tomato red)
            let icon = '<i class="fa-solid fa-circle-xmark"></i>';
            if (item.status === 'live') {
                color = '#66ffd9';
                icon = '<i class="fa-solid fa-circle-check"></i>';
            } else if (item.status === 'verify') {
                color = '#ffd700';
                icon = '<i class="fa-solid fa-circle-question"></i>';
            } else if (item.status === 'disabled') {
                color = '#ff6347';
                icon = '<i class="fa-solid fa-circle-minus"></i>';
            } else if (item.status === 'unregistered') {
                color = '#00f0ff';
                icon = '<i class="fa-solid fa-user-xmark"></i>';
            } else if (item.status === 'failed') {
                color = '#ff4d4d';
                icon = '<i class="fa-solid fa-circle-exclamation"></i>';
            }

            itemRow.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                    <span style="color: var(--text-muted);">#${item.index}</span>
                    <span style="color: var(--text-sharp); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.email}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--text-muted);">${item.details}</span>
                    <span style=" color: ${color}; display: flex; align-items: center; gap: 4px; ">${icon} ${item.status.toUpperCase()}</span>
                </div>
            `;
            viewport.appendChild(itemRow);
        }

        // Bottom padding
        if (padBot > 0) {
            const b = document.createElement('div');
            b.style.height = `${padBot}rem`;
            viewport.appendChild(b);
        }
    }

    historyDetailsGmailScrollHandler = function () {
        if (vScrollTimer) clearTimeout(vScrollTimer);
        vScrollTimer = setTimeout(renderCards, 16);
    };

    viewport.addEventListener('scroll', historyDetailsGmailScrollHandler, { passive: true });

    // Initial render
    renderCards();
}

// Gmail Dot Tricks: Beautiful task-based completed card viewport
function renderGmailDotTricksHistoryTasks(entry, viewport) {
    const lines = entry.content ? entry.content.split('\n') : [];

    // Group by clean email address (dots removed from username)
    const groups = {};
    const originalEmailsOrdered = []; // To preserve original task order

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const parts = trimmed.split('@');
        if (parts.length < 2) return;

        const cleanUsername = parts[0].replace(/\./g, '');
        const domain = parts[1].toLowerCase();
        const key = cleanUsername + '@' + domain;

        if (!groups[key]) {
            groups[key] = [];
            originalEmailsOrdered.push(key);
        }
        groups[key].push(trimmed);
    });

    const tasks = originalEmailsOrdered.map((email, idx) => {
        const variations = groups[email];
        return {
            index: idx + 1,
            email: email,
            count: variations.length,
            content: variations.join('\n')
        };
    });

    viewport.innerHTML = '';
    viewport.style.display = 'flex';
    viewport.style.flexDirection = 'column';
    viewport.style.gap = '12px';

    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '8px';
        card.style.padding = '15px';
        card.style.background = 'var(--bg-card)';
        card.style.border = '1px solid var(--border-color)';
        card.style.borderRadius = '12px';

        card.innerHTML = `
            <div class="task-card-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span class="task-badge">Task #${task.index}</span>
                <span class="task-email" style="color: var(--text-sharp); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 50%;" title="${task.email}">${task.email}</span>
                <span class="task-status" style="color: #66ffd9;"><i class="fa-solid fa-circle-check"></i> Completed</span>
            </div>
            <div class="task-progress-container" style="width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; margin: 4px 0;">
                <div class="task-progress-bar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #af86fc, #00f0ff); border-radius: 3px;"></div>
            </div>
            <div class="task-card-footer" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span class="task-stats" style="color: var(--text-muted);">Successfully generated ${task.count.toLocaleString()} variations!</span>
                <div class="task-actions" style="display: flex; gap: 8px;">
                    <button class="task-btn view-btn" style="padding: 4px 10px; cursor: pointer; border-radius: 8px;"><i class="fa-solid fa-eye"></i> View</button>
                    <button class="task-btn dl-btn" style="padding: 4px 10px; cursor: pointer; border-radius: 8px;"><i class="fa-solid fa-download"></i> Download</button>
                </div>
            </div>
        `;

        const viewBtn = card.querySelector('.view-btn');
        const dlBtn = card.querySelector('.dl-btn');

        viewBtn.addEventListener('click', () => {
            const blob = new Blob([task.content], { type: 'text/plain;charset=utf-8' });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        });

        dlBtn.addEventListener('click', () => {
            const blob = new Blob([task.content], { type: 'text/plain;charset=utf-8' });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `gmail-dot-${task.email}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        });

        viewport.appendChild(card);
    });
}

// Name Combiner: Beautiful task-based completed card viewport
function renderNameCombinerHistoryTasks(entry, viewport) {
    viewport.innerHTML = '';
    viewport.style.display = 'flex';
    viewport.style.flexDirection = 'column';
    viewport.style.gap = '12px';

    const card = document.createElement('div');
    card.className = 'task-card';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '8px';
    card.style.padding = '15px';
    card.style.background = 'var(--bg-card)';
    card.style.border = '1px solid var(--border-color)';
    card.style.borderRadius = '12px';

    card.innerHTML = `
        <div class="task-card-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span class="task-badge">Task #1</span>
            <span class="task-email" style=" color: var(--text-sharp);">Fisher-Yates Permutator Engine</span>
            <span class="task-status" style="color: #66ffd9;"><i class="fa-solid fa-circle-check"></i> Completed</span>
        </div>
        <div class="task-progress-container" style="width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; margin: 4px 0;">
            <div class="task-progress-bar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #af86fc, #00f0ff); border-radius: 3px;"></div>
        </div>
        <div class="task-card-footer" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span class="task-stats" style="color: var(--text-muted);">Successfully generated ${entry.count.toLocaleString()} combinations!</span>
            <div class="task-actions" style="display: flex; gap: 8px;">
                <button class="task-btn view-btn" style="padding: 4px 10px; cursor: pointer; border-radius: 8px;"><i class="fa-solid fa-eye"></i> View</button>
                <button class="task-btn dl-btn" style="padding: 4px 10px; cursor: pointer; border-radius: 8px;"><i class="fa-solid fa-download"></i> Download</button>
            </div>
        </div>
    `;

    const viewBtn = card.querySelector('.view-btn');
    const dlBtn = card.querySelector('.dl-btn');

    viewBtn.addEventListener('click', () => {
        const blob = new Blob([entry.content], { type: 'text/plain;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    });

    dlBtn.addEventListener('click', () => {
        const blob = new Blob([entry.content], { type: 'text/plain;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `name-combine-variations.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    });

    viewport.appendChild(card);
}


window.loadHistoryList = async function (forceRefresh = false) {
    const listContainer = document.getElementById('history-list-container');
    if (!listContainer) return;

    // Clear previous virtual scroll event listener if it exists
    if (listContainer._virtualScrollHandler) {
        listContainer.removeEventListener('scroll', listContainer._virtualScrollHandler);
        listContainer._virtualScrollHandler = null;
    }

    let allEntries;
    if (cachedHistoryEntries === null || forceRefresh) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-circle-notch fa-spin" style="color: #af86fc; margin-bottom: 12px;"></i>
                <p>Retrieving secure offline index...</p>
            </div>
        `;
        allEntries = await getHistoryEntries();
        cachedHistoryEntries = allEntries;
    } else {
        allEntries = cachedHistoryEntries;
    }

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

            // Premium case-insensitive RegExp test to avoid heavy .toLowerCase() allocation on massive content
            const escapeRegExp = (str) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const queryRegExp = new RegExp(escapeRegExp(query), 'i');
            const matchesContent = queryRegExp.test(entry.content);

            return matchesTitle || matchesAppName || matchesContent;
        }
        return true;
    });

    listContainer.innerHTML = '';

    if (filtered.length === 0) {
        // Restore container styles for empty layout
        listContainer.style.display = '';
        listContainer.style.gap = '';
        listContainer.style.height = '';
        listContainer.style.padding = '';

        listContainer.innerHTML = `
            <div style="text-align: center; padding: 50px 20px; color: var(--text-muted); border: 2px dashed var(--border-color); border-radius: 16px; background: rgba(255,255,255,0.01);">
                <i class="fa-solid fa-clock" style="color: var(--border-color); margin-bottom: 15px; display: block;"></i>
                <h4 style="color: var(--text-sharp);  margin-bottom: 8px;">No History Found</h4>
                <p style="max-width: 320px; margin: 0 auto 20px;">
                    ${historySearchQuery ? 'No records match your query. Try resetting your search filter.' : 'You have not checked or permuted any results yet. Your offline run history will appear here.'}
                </p>
                ${!historySearchQuery ? `
                    <button class="btn btn-primary" id="btn-history-empty-action">
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

    const ITEM_HEIGHT_REM = 10.25; // Card height (9.5rem) + bottom gap (0.75rem margin)
    const OVERSCAN = 15;
    let historyVirtualScrollTimer;

    function getCurrentRemValue() {
        return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    }

    function remToPx(remValue) {
        return remValue * getCurrentRemValue();
    }

    // Override container styles for simpler box-model virtual scrolling
    // CRITICAL: height (not max-height) must be set so clientHeight is bounded
    // and the virtual scroller knows the real viewport size
    listContainer.style.display = 'block';
    listContainer.style.gap = '0px';
    listContainer.style.overflowY = 'auto';
    listContainer.style.padding = '0';
    listContainer.scrollTop = 0;

    function displayResults() {
        const scrollTop = listContainer.scrollTop;
        const clientHeight = listContainer.clientHeight || 480; // Fallback to max-height
        const totalItems = filtered.length;
        const itemHeightPx = remToPx(ITEM_HEIGHT_REM);

        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeightPx) - OVERSCAN);
        const endIndex = Math.min(totalItems - 1, Math.ceil((scrollTop + clientHeight) / itemHeightPx) + OVERSCAN);

        const paddingTop = startIndex * ITEM_HEIGHT_REM;
        const paddingBottom = Math.max(0, (totalItems - 1 - endIndex) * ITEM_HEIGHT_REM);

        listContainer.innerHTML = ''; // Clear items

        // Top padding
        if (paddingTop > 0) {
            const topPaddingDiv = document.createElement('div');
            topPaddingDiv.style.height = `${paddingTop}rem`;
            listContainer.appendChild(topPaddingDiv);
        }

        // Render visible items
        for (let i = startIndex; i <= endIndex; i++) {
            const entry = filtered[i];
            if (!entry) continue;

            const card = document.createElement('div');
            card.className = `history-item-card ${entry.appId}`;
            card.style.height = `9.5rem`; // Card height: 152px / 16
            card.style.margin = `0 0 0.75rem 0`; // Bottom margin: 12px / 16
            card.style.boxSizing = `border-box`;
            card.style.display = `flex`;
            card.style.flexDirection = `column`;
            card.style.gap = `12px`; // 0.75rem

            // Humanize display count
            const displayLabel = entry.count.toLocaleString() + ' ' + (entry.typeLabel || 'emails');

            card.innerHTML = `
                <div class="history-card-header" style="flex: 1; min-height: 0;">
                    <div style="display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1;">
                        <span class="history-badge ${entry.appId}" style="display: inline-block; width: max-content;">${entry.appName}</span>
                        <div class="history-title" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <i class="fa-regular fa-calendar-check" style="margin-right: 6px; color: var(--text-muted);"></i>${entry.title}
                        </div>
                        <div class="history-meta" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <i class="fa-solid fa-list-check" style="margin-right: 6px;"></i>${displayLabel}
                        </div>
                    </div>
                    <div class="history-actions" style="flex-shrink: 0;">
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
                
                <div style="display: flex; justify-content: flex-start; flex-shrink: 0;">
                    <button class="history-btn toggle-details-btn" style="border: none; padding: 2px 4px; color: #af86fc;  background: transparent;">
                        <i class="fa-solid fa-eye" style="margin-right: 4px;"></i> View Details
                    </button>
                </div>
            `;

            // Card event listeners
            const copyBtn = card.querySelector('.copy-btn');
            const dlBtn = card.querySelector('.download-btn');
            const delBtn = card.querySelector('.delete-btn');
            const detailsToggle = card.querySelector('.toggle-details-btn');

            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
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

            dlBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const blob = new Blob([entry.content], { type: 'text/plain;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${entry.appId}-${entry.title}.txt`;
                link.click();
                URL.revokeObjectURL(link.href);
            });

            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showCustomConfirm(
                    "Delete Entry",
                    `Are you sure you want to delete the history entry from <strong>${entry.title}</strong>?`,
                    async () => {
                        await deleteHistoryEntry(entry.id);
                        cachedHistoryEntries = null; // Clear cache
                        if (window.showAppNotification) {
                            window.showAppNotification('success', 'History entry successfully removed.');
                        }
                        window.loadHistoryList();
                    }
                );
            });

            detailsToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                showHistoryDetailsModal(entry);
            });

            listContainer.appendChild(card);
        }

        // Bottom padding
        if (paddingBottom > 0) {
            const bottomPaddingDiv = document.createElement('div');
            bottomPaddingDiv.style.height = `${paddingBottom}rem`;
            listContainer.appendChild(bottomPaddingDiv);
        }
    }

    listContainer._virtualScrollHandler = function () {
        if (historyVirtualScrollTimer) clearTimeout(historyVirtualScrollTimer);
        historyVirtualScrollTimer = setTimeout(displayResults, 15);
    };

    listContainer.addEventListener('scroll', listContainer._virtualScrollHandler, { passive: true });

    // Initial render
    displayResults();
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
            window.loadHistoryList(true); // Force refresh from IndexedDB
        });
    }

    // Clear All button
    const clearAllBtn = document.getElementById('btn-clear-all-history');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            showCustomConfirm(
                "Clear History",
                "Are you absolutely sure you want to clear your entire check/generation history? This will permanently delete your offline history database and cannot be undone.",
                async () => {
                    await clearAllHistory();
                    cachedHistoryEntries = null; // Clear memory cache
                    if (window.showAppNotification) {
                        window.showAppNotification('success', '🗑️ <strong>History cleared successfully</strong>.');
                    }
                    window.loadHistoryList();
                }
            );
        });
    }

    // Hook into router page active callback to load history list automatically
    const origSetActiveMenu = window.setActiveMenu;
    window.setActiveMenu = function (menuId, pushState = true) {
        origSetActiveMenu(menuId, pushState);
        if (menuId === 'history') {
            const mainViewport = document.getElementById('history-main-viewport');
            const detailsViewport = document.getElementById('history-details-viewport');
            if (mainViewport) mainViewport.classList.remove('hide');
            if (detailsViewport) detailsViewport.classList.add('hide');

            // Clean active scroll handlers if any
            if (historyDetailsScrollHandler) {
                const textViewport = document.getElementById('history-details-text-viewport');
                if (textViewport) textViewport.removeEventListener('scroll', historyDetailsScrollHandler);
                historyDetailsScrollHandler = null;
            }
            if (historyDetailsGmailScrollHandler) {
                const tasksViewport = document.getElementById('history-details-tasks-viewport');
                if (tasksViewport) tasksViewport.removeEventListener('scroll', historyDetailsGmailScrollHandler);
                historyDetailsGmailScrollHandler = null;
            }

            if (window.isUserAuthenticated) {
                window.loadHistoryList();
            }
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
