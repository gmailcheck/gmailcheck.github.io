// Premium Glassmorphic Notepad module using IndexedDB
const DB_NAME = 'NotepadDB';
const DB_VERSION = 1;
const STORE_NAME = 'notes';

let db = null;
let activeNoteId = null;
let saveDebounceTimer = null;
let searchFilterQuery = '';

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        request.onerror = (e) => {
            reject(e.target.error);
        };
    });
}

// Database Helpers
function getAllNotes() {
    return new Promise((resolve, reject) => {
        if (!db) return resolve([]);
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
            // Sort by updatedAt descending
            const sorted = request.result.sort((a, b) => b.updatedAt - a.updatedAt);
            resolve(sorted);
        };
        request.onerror = () => reject(request.error);
    });
}

function saveNoteToDB(note) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Database not initialized');
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(note);
        request.onsuccess = (e) => {
            resolve(e.target.result); // Returns ID
        };
        request.onerror = () => reject(request.error);
    });
}

function deleteNoteFromDB(id) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Database not initialized');
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// UI State Management & Renderers
async function refreshNotesList() {
    const listContainer = document.getElementById('notes-list-container');
    if (!listContainer) return;

    const notes = await getAllNotes();
    listContainer.innerHTML = '';

    const filtered = notes.filter(n => {
        const query = searchFilterQuery.toLowerCase();
        return n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 25px 10px; color: var(--text-muted); font-size: 0.8rem; font-family: 'RobotoMono'; border: 1px dashed var(--border-color); border-radius: 12px; background: rgba(255,255,255,0.01);">
                <i class="fa-solid fa-folder-open" style="font-size: 1.5rem; color: var(--border-color); margin-bottom: 8px; display: block;"></i>
                No notes found
            </div>
        `;
        return;
    }

    filtered.forEach(note => {
        const item = document.createElement('div');
        item.className = `dashboard-header-card ${activeNoteId === note.id ? 'active' : ''}`;
        item.style.cssText = `
            background: ${activeNoteId === note.id ? 'rgba(175, 134, 252, 0.08)' : 'rgba(255, 255, 255, 0.02)'};
            border: 1px solid ${activeNoteId === note.id ? '#af86fc' : 'var(--border-color)'};
            border-radius: 12px;
            padding: 12px 15px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            gap: 6px;
            transition: all 0.2s ease;
        `;

        // Event listener for select note
        item.addEventListener('click', () => selectNote(note.id));

        const snippet = note.content.trim().slice(0, 45) || 'No content';
        const formattedTime = getRelativeTimeString(note.updatedAt);

        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; width:100%;">
                <span style="font-weight: bold; color: var(--text-sharp); font-family: 'Orbitron', monospace; font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                    ${escapeHTML(note.title) || 'Untitled Note'}
                </span>
                <span style="font-size: 0.68rem; color: var(--text-muted); font-family: 'RobotoMono'; white-space: nowrap;">
                    ${formattedTime}
                </span>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.75rem; margin: 0; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHTML(snippet)}
            </p>
        `;
        listContainer.appendChild(item);
    });
}

function getRelativeTimeString(timestamp) {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDay}d ago`;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Select a Note to display
async function selectNote(id) {
    activeNoteId = id;
    const notes = await getAllNotes();
    const note = notes.find(n => n.id === id);

    const titleInput = document.getElementById('notepad-active-title');
    const contentInput = document.getElementById('notepad-active-content');
    const lastSavedDisplay = document.getElementById('notepad-last-updated');

    if (!note) {
        // Fallback: Clear editor if not found
        activeNoteId = null;
        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';
        if (lastSavedDisplay) lastSavedDisplay.textContent = 'Last saved: Never';
        updateStats();
        await refreshNotesList();
        return;
    }

    if (titleInput) titleInput.value = note.title;
    if (contentInput) {
        contentInput.value = note.content;
        // Synchronize custom line numbers
        window.initTextareaLineNumbers('notepad-active-content', 'line-numbers-app4', 'email-input-container-app4');
    }
    if (lastSavedDisplay) {
        lastSavedDisplay.textContent = `Last saved: ${new Date(note.updatedAt).toLocaleTimeString()}`;
    }

    // Reset status to saved
    const status = document.getElementById('notepad-save-status');
    if (status) {
        status.textContent = '✓ Saved';
        status.style.color = 'var(--text-muted)';
    }

    updateStats();
    await refreshNotesList();
}

// Create a New Note (internal use / sidebar)
async function createNewNote() {
    const notes = await getAllNotes();
    const nextNum = notes.length + 1;
    const newNote = {
        title: `Note ${nextNum}`,
        content: '',
        updatedAt: Date.now()
    };

    const newId = await saveNoteToDB(newNote);
    await selectNote(newId);
    if (window.showAppNotification) {
        window.showAppNotification('success', 'New Note created successfully!');
    }
}

// Clear the notepad editor — New Note intent without saving yet
async function clearNotepad() {
    activeNoteId = null;

    const titleInput = document.getElementById('notepad-active-title');
    const contentInput = document.getElementById('notepad-active-content');
    const lastSavedDisplay = document.getElementById('notepad-last-updated');
    const status = document.getElementById('notepad-save-status');

    if (titleInput) titleInput.value = '';
    if (contentInput) {
        contentInput.value = '';
        window.initTextareaLineNumbers('notepad-active-content', 'line-numbers-app4', 'email-input-container-app4');
    }
    if (lastSavedDisplay) lastSavedDisplay.textContent = 'Last saved: Never';
    if (status) {
        status.textContent = '● New Note';
        status.style.color = '#af86fc';
    }

    updateStats();
    await refreshNotesList(); // Deselect active note in sidebar

    if (window.showAppNotification) {
        window.showAppNotification('success', 'Notepad cleared. Type your note and click <strong>Save</strong> to create it.');
    }
}

// Mark current active note as modified / unsaved
function markAsUnsaved() {
    const status = document.getElementById('notepad-save-status');
    if (status) {
        status.textContent = '● Unsaved Changes';
        status.style.color = '#ffa500';
    }
}

// Manually Save the Active Note — creates new note if none active, updates existing otherwise
async function saveActiveNote() {
    const titleVal = document.getElementById('notepad-active-title').value.trim() || 'Untitled Note';
    const contentVal = document.getElementById('notepad-active-content').value;

    let noteToSave;
    if (!activeNoteId) {
        // No active note yet (user clicked "New" then typed) — create a brand-new entry
        noteToSave = {
            title: titleVal,
            content: contentVal,
            updatedAt: Date.now()
        };
    } else {
        // Update existing note
        noteToSave = {
            id: activeNoteId,
            title: titleVal,
            content: contentVal,
            updatedAt: Date.now()
        };
    }

    const savedId = await saveNoteToDB(noteToSave);
    if (!activeNoteId) activeNoteId = savedId; // Capture new note ID after first save

    const status = document.getElementById('notepad-save-status');
    if (status) {
        status.textContent = '✓ Saved';
        status.style.color = '#00ff88';
        setTimeout(() => {
            if (status && status.textContent === '✓ Saved') {
                status.style.color = 'var(--text-muted)';
            }
        }, 3000);
    }

    const lastSavedDisplay = document.getElementById('notepad-last-updated');
    if (lastSavedDisplay) {
        lastSavedDisplay.textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
    }

    await refreshNotesList();

    if (window.showAppNotification) {
        window.showAppNotification('success', `Note <strong>"${titleVal}"</strong> saved offline successfully.`);
    }
}

// Delete Active Note
async function deleteActiveNote() {
    if (!activeNoteId) {
        if (window.showAppNotification) window.showAppNotification('warning', 'No active note selected to delete!');
        return;
    }

    if (confirm('Are you sure you want to delete this note permanently?')) {
        await deleteNoteFromDB(activeNoteId);
        if (window.showAppNotification) window.showAppNotification('success', 'Note deleted.');

        const notes = await getAllNotes();
        if (notes.length > 0) {
            await selectNote(notes[0].id);
        } else {
            await selectNote(null);
        }
    }
}

// Copy Note to Clipboard
function copyNoteText() {
    const textarea = document.getElementById('notepad-active-content');
    if (!textarea || !textarea.value) {
        if (window.showAppNotification) window.showAppNotification('warning', 'Note is empty!');
        return;
    }

    navigator.clipboard.writeText(textarea.value).then(() => {
        if (window.showAppNotification) window.showAppNotification('success', 'Copied to Clipboard!');
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}

// Download Note as File
function downloadNoteFile() {
    const textarea = document.getElementById('notepad-active-content');
    const titleInput = document.getElementById('notepad-active-title');
    if (!textarea || !textarea.value) {
        if (window.showAppNotification) window.showAppNotification('warning', 'Note is empty!');
        return;
    }

    const filename = (titleInput.value.trim() || 'untitled-note') + '.txt';
    const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);

    if (window.showAppNotification) window.showAppNotification('success', `Downloaded ${filename}`);
}

// Word & Character count update
function updateStats() {
    const textarea = document.getElementById('notepad-active-content');
    const countDisplay = document.getElementById('notepad-word-char-count');
    if (!textarea || !countDisplay) return;

    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = textarea.value.length;

    countDisplay.textContent = `${words} word${words !== 1 ? 's' : ''} | ${chars} character${chars !== 1 ? 's' : ''}`;
}

// Initialize the entire Notepad Application
async function initNotepad() {
    try {
        await initDB();

        // #btn-notepad-new: clears editor only — save creates the actual note
        const btnNew = document.getElementById('btn-notepad-new');
        if (btnNew) btnNew.addEventListener('click', clearNotepad);

        const btnDelete = document.getElementById('btn-notepad-delete');
        if (btnDelete) btnDelete.addEventListener('click', deleteActiveNote);

        const btnCopy = document.getElementById('btn-notepad-copy');
        if (btnCopy) btnCopy.addEventListener('click', copyNoteText);

        const btnDownload = document.getElementById('btn-notepad-download');
        if (btnDownload) btnDownload.addEventListener('click', downloadNoteFile);

        const btnSave = document.getElementById('btn-notepad-save');
        if (btnSave) btnSave.addEventListener('click', saveActiveNote);

        const titleInput = document.getElementById('notepad-active-title');
        if (titleInput) {
            titleInput.addEventListener('input', markAsUnsaved);
        }

        const contentInput = document.getElementById('notepad-active-content');
        if (contentInput) {
            contentInput.addEventListener('input', () => {
                updateStats();
                markAsUnsaved();
            });
        }

        const searchInput = document.getElementById('notepad-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchFilterQuery = e.target.value;
                refreshNotesList();
            });
        }

        // Initialize Line Numbers Synchronizer
        window.initTextareaLineNumbers('notepad-active-content', 'line-numbers-app4', 'email-input-container-app4');

        // Load initial note or create one if empty
        const notes = await getAllNotes();
        if (notes.length > 0) {
            await selectNote(notes[0].id);
        }

    } catch (e) {
        console.error('Notepad Init Failed:', e);
    }
}

// Run notepad initializer when module is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotepad);
} else {
    initNotepad();
}
