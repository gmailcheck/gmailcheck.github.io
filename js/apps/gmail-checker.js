(function () {
	const textarea = document.getElementById('gmail-checker-input');
	const inputContainer = document.getElementById('email-input-container-app1');
	const resultsContainer = document.getElementById('results-container-app1');
	const tasksList = document.getElementById('tasks-list-app1');
	const btnBack = document.getElementById('btn-back-app1');
	const btnExecute = document.getElementById('btn-execute-app1');
	const btnStop = document.getElementById('btn-stop-app1');
	const btnClear = document.getElementById('btn-clear-app1');
	const btnAddDomain = document.getElementById('btn-add-domain-app1');
	const btnFix = document.getElementById('btn-fix-app1');
	const btnCopy = document.getElementById('btn-copy-app1');
	const btnDownload = document.getElementById('btn-download-app1');
	const btnDownloadAll = document.getElementById('btn-download-all-app1');
	const selectServerContainer = document.getElementById('select-server-container-app1');
	const selectServer = document.getElementById('select-server-app1');

	// Stats Elements
	const statsInput = document.getElementById('stats-input-app1');
	const statsLive = document.getElementById('stats-live-app1');
	const statsVer = document.getElementById('stats-ver-app1');
	const statsDisabled = document.getElementById('stats-disabled-app1');
	const statsUnregistered = document.getElementById('stats-unregistered-app1');
	const statsBad = document.getElementById('stats-bad-app1');
	const statsFailed = document.getElementById('stats-failed-app1');

	// Filter Elements
	const filterAll = document.getElementById('filter-all-app1');
	const filterLive = document.getElementById('filter-live-app1');
	const filterVer = document.getElementById('filter-ver-app1');
	const filterDisabled = document.getElementById('filter-disabled-app1');
	const filterUnregistered = document.getElementById('filter-unregistered-app1');
	const filterBad = document.getElementById('filter-bad-app1');
	const filterFailed = document.getElementById('filter-failed-app1');

	// Filter Counters
	const countAll = document.getElementById('count-all-app1');
	const countLive = document.getElementById('count-live-app1');
	const countVer = document.getElementById('count-ver-app1');
	const countDisabled = document.getElementById('count-disabled-app1');
	const countUnregistered = document.getElementById('count-unregistered-app1');
	const countBad = document.getElementById('count-bad-app1');
	const countFailed = document.getElementById('count-failed-app1');

	if (!textarea || !btnExecute) return;

	const SERVER_URL = 'https://gmail-checker.blacksoftchild.workers.dev';
	let results = [];
	let currentFilter = 'all';
	let isRunning = false;
	let abortController = null;
	let sanitizerWorker = null;

	// Dynamic script loading for JSZip
	function loadJSZip(callback) {
		if (window.JSZip) {
			callback();
			return;
		}
		const script = document.createElement('script');
		script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
		script.onload = callback;
		script.onerror = () => alert('Failed to load ZIP library. Please check your internet connection!');
		document.head.appendChild(script);
	}

	// Dynamic layout sync for Server Selection
	function handleServerChange() {
		const server = selectServer.value;
		const detailedRows = document.querySelectorAll('.stat-row-detailed-app1');
		const sidebarBadRow = document.getElementById('sidebar-bad-row-app1');

		if (server === 'server1' || server === 'server2') {
			// Normal Server (Detailed Stats - Advanced 1 & 2)
			detailedRows.forEach(row => row.classList.remove('hide'));
			if (filterVer) filterVer.classList.remove('hide');
			if (filterDisabled) filterDisabled.classList.remove('hide');
			if (filterUnregistered) filterUnregistered.classList.remove('hide');

			// Advanced doesn't have "Bad" status (which is Fast-only)
			if (filterBad) filterBad.classList.add('hide');
			if (sidebarBadRow) sidebarBadRow.classList.add('hide');
		} else {
			// Fast Server (Basic Live / Bad Stats - Fast 1 & 2)
			detailedRows.forEach(row => row.classList.add('hide'));
			if (filterVer) filterVer.classList.add('hide');
			if (filterDisabled) filterDisabled.classList.add('hide');
			if (filterUnregistered) filterUnregistered.classList.add('hide');

			// Fast/Dast server uses "Bad"
			if (filterBad) filterBad.classList.remove('hide');
			if (sidebarBadRow) sidebarBadRow.classList.remove('hide');
		}
	}
	selectServer.addEventListener('change', handleServerChange);
	// Initial trigger
	handleServerChange();

	// Helper: Parse valid emails
	function getEmailsArray() {
		return textarea.value.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 0);
	}

	// Validation feedback using Shared Web Worker
	const basePath = window.BASE_PATH || '';
	const workerPath = (basePath.endsWith('/') ? basePath : basePath + '/') + 'js/apps/sanitizerWorker.js';
	const invalidListBox = document.getElementById('invalid-list-app1');

	function escapeHTML(str) {
		return str.replace(/[&<>'"]/g,
			tag => ({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				"'": '&#39;',
				'"': '&quot;'
			}[tag] || tag)
		);
	}

	function updateInvalidList(invalidEmails) {
		if (!invalidListBox) return;
		if (!invalidEmails || invalidEmails.length === 0) {
			invalidListBox.classList.add('hide');
			invalidListBox.innerHTML = '';
			return;
		}

		invalidListBox.classList.remove('hide');

		let itemsHTML = invalidEmails.map(item => {
			const reason = item.message || 'Invalid format';
			return `
				<div class="invalid-item">
					<span>
						<span class="invalid-item-line">Line ${item.lineNumber}</span>
						<span class="invalid-item-value">${escapeHTML(item.text)}</span>
					</span>
					<span class="invalid-item-reason">${reason}</span>
				</div>
			`;
		}).join('');

		invalidListBox.innerHTML = `
			<div class="invalid-list-header">
				<i class="fa-solid fa-circle-exclamation"></i>
				<span>Invalid Emails Found (${invalidEmails.length})</span>
			</div>
			<div class="invalid-list-items">
				${itemsHTML}
			</div>
		`;
	}

	// Validation feedback using Worker
	function validateInputEmails(showList = false) {
		return new Promise((resolve) => {
			const content = textarea.value;
			if (content.trim().length === 0) {
				window.clearAppNotification();
				btnFix.classList.add('hide');
				statsInput.textContent = '0 email(s)';
				updateInvalidList([]);
				resolve(true);
				return;
			}

			if (sanitizerWorker) {
				sanitizerWorker.terminate();
			}

			sanitizerWorker = new Worker(workerPath);
			sanitizerWorker.postMessage(content);

			sanitizerWorker.onmessage = function (e) {
				const { validEmails, invalidEmails } = e.data;
				statsInput.textContent = `${getEmailsArray().length} email(s)`;
				updateInvalidList(showList ? invalidEmails : []);

				if (invalidEmails.length > 0) {
					if (showList) {
						const nonGmailCount = invalidEmails.filter(x => x.message.includes('Wrong domain')).length;
						const duplicateCount = invalidEmails.filter(x => x.message.includes('Duplicate')).length;
						const formatCount = invalidEmails.length - nonGmailCount - duplicateCount;

						let msg = '<strong>Validation Warning:</strong> ';
						const warnParts = [];
						if (duplicateCount > 0) warnParts.push(`<strong>${duplicateCount} duplicate(s)</strong>`);
						if (nonGmailCount > 0) warnParts.push(`<strong>${nonGmailCount} non-gmail domain(s)</strong>`);
						if (formatCount > 0) warnParts.push(`<strong>${formatCount} invalid format(s)</strong>`);

						msg += warnParts.join(', ') + '. Use the "Quick Fix" button below to clean up immediately.';
						window.showAppNotification('warning', msg);
						btnFix.classList.remove('hide');
					}
					resolve(false);
				} else {
					window.clearAppNotification();
					btnFix.classList.add('hide');
					resolve(true);
				}
				sanitizerWorker.terminate();
			};
		});
	}

	let typingTimer;
	let validationTimer;
	const doneTypingInterval = 1500; // 1.5 seconds idle

	function formatSpacesToNewlines() {
		const currentVal = textarea.value;
		if (currentVal.includes(' ')) {
			textarea.value = currentVal.replace(/[ ]+/g, '\n');
			textarea.dispatchEvent(new Event('input'));
		}
	}

	// Immediately hide invalid list on input, paste, or focus – show only on button press
	function hideInvalidListNow() {
		if (invalidListBox) {
			invalidListBox.classList.add('hide');
			invalidListBox.innerHTML = '';
		}
	}

	// Space key converts to newline
	textarea.addEventListener('keydown', function (e) {
		if (e.key === ' ') {
			e.preventDefault();
			const start = this.selectionStart;
			const end = this.selectionEnd;
			this.value = this.value.substring(0, start) + '\n' + this.value.substring(end);
			this.selectionStart = this.selectionEnd = start + 1;
			textarea.dispatchEvent(new Event('input'));
		}
	});

	textarea.addEventListener('input', () => {
		statsInput.textContent = `${getEmailsArray().length} email(s)`;
		hideInvalidListNow();
		clearTimeout(typingTimer);
		typingTimer = setTimeout(formatSpacesToNewlines, doneTypingInterval);
		clearTimeout(validationTimer);
		// showList=false: validate for notification bar only, never show list while typing
		validationTimer = setTimeout(() => validateInputEmails(false), 500);
	});

	textarea.addEventListener('paste', () => {
		hideInvalidListNow();
	});

	textarea.addEventListener('focus', () => {
		hideInvalidListNow();
	});

	textarea.addEventListener('blur', () => {
		clearTimeout(typingTimer);
		formatSpacesToNewlines();
		statsInput.textContent = `${getEmailsArray().length} email(s)`;
		// Validate for notification bar only – do NOT show invalid list on blur
		validateInputEmails(false);
	});

	// Add @gmail.com to lines without domain
	btnAddDomain.addEventListener('click', function () {
		const lines = textarea.value.split('\n');
		const updatedLines = lines.map(line => {
			const trimmed = line.trim();
			if (trimmed.length === 0) return '';
			if (trimmed.toLowerCase().endsWith('@gmail.com')) return trimmed;
			if (trimmed.includes('@')) return trimmed;
			if (/^[a-zA-Z0-9.]+$/.test(trimmed)) {
				return trimmed + '@gmail.com';
			}
			return trimmed;
		});
		textarea.value = updatedLines.join('\n');
		textarea.dispatchEvent(new Event('input'));
	});

	// Clear Input button
	btnClear.addEventListener('click', function () {
		textarea.value = '';
		textarea.dispatchEvent(new Event('input'));
		window.clearAppNotification();
		updateInvalidList([]);
		btnFix.classList.add('hide');
		btnCopy.classList.add('hide');
		btnDownload.classList.add('hide');
		btnDownloadAll.classList.add('hide');
	});

	// Quick Fix Issues button
	btnFix.addEventListener('click', function () {
		const content = textarea.value;
		const tempWorker = new Worker(workerPath);
		tempWorker.postMessage(content);

		tempWorker.onmessage = function (e) {
			const { validEmails } = e.data;
			textarea.value = validEmails.join('\n');
			textarea.dispatchEvent(new Event('input'));
			window.showAppNotification('success', `<strong>Quick Fix Completed:</strong> Cleaned inputs! Removed invalid/duplicate emails.`);
			btnFix.classList.add('hide');
			tempWorker.terminate();
		};
	});

	// Task Queue for concurrency control
	class ConcurrencyQueue {
		constructor(concurrency) {
			this.concurrency = concurrency;
			this.active = 0;
			this.queue = [];
		}
		push(taskFn) {
			this.queue.push(taskFn);
			this.process();
		}
		process() {
			if (this.active >= this.concurrency || this.queue.length === 0) return;
			const task = this.queue.shift();
			this.active++;
			task(() => {
				this.active--;
				this.process();
			});
		}
	}

	// Fetch helper with absolute 10-second timeout per User Plan
	function fetchWithTimeout(url, options, timeoutMs = 10000) {
		return new Promise((resolve, reject) => {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				controller.abort();
				reject(new Error('Timeout (10s)'));
			}, timeoutMs);

			const combinedSignal = options.signal;
			if (combinedSignal) {
				combinedSignal.addEventListener('abort', () => {
					clearTimeout(timeoutId);
					controller.abort();
					reject(new Error('Aborted'));
				});
			}

			options.signal = controller.signal;
			fetch(url, options).then(res => {
				clearTimeout(timeoutId);
				resolve(res);
			}).catch(err => {
				clearTimeout(timeoutId);
				reject(err);
			});
		});
	}

	// Execute Verification Flow
	btnExecute.addEventListener('click', async function () {
		// Request notification permission early
		window.requestNotificationPermission();

		const emails = getEmailsArray();
		if (emails.length === 0) {
			window.showAppNotification('danger', '<strong>Error:</strong> Please enter at least one email address first!');
			return;
		}

		// Run validation check before execution – showList=true: reveal invalid list on button press
		const isValid = await validateInputEmails(true);
		if (!isValid) return;

		// Warning check
		const hasWarning = document.querySelector('.notification-bar.type-warning');
		if (hasWarning) {
			if (!confirm('Warning: Your input contains unresolved errors or duplicates. Do you want to auto-fix and verify?')) {
				return;
			}
			btnFix.click();
			// Wait brief moment for Quick Fix replacement
			await new Promise(r => setTimeout(r, 300));
		}

		// Send start notification if tab is hidden
		window.sendBrowserNotification("Gmail Checker Started", `Verifying ${getEmailsArray().length.toLocaleString()} email(s) in the background...`);

		const selected = selectServer.value;
		const isFastServer = selected.startsWith('fast');
		const chunkSize = isFastServer ? 10000 : 100;
		const concurrency = isFastServer ? 5 : 3;

		// UI transitions
		inputContainer.classList.add('hide');
		resultsContainer.classList.remove('hide');
		tasksList.innerHTML = '';

		btnExecute.style.display = 'none';
		btnStop.style.display = 'inline-flex';
		btnCopy.classList.add('hide');
		btnDownload.classList.add('hide');
		btnDownloadAll.classList.add('hide');

		results = [];
		isRunning = true;
		abortController = new AbortController();
		window.clearAppNotification();

		// Divide into chunks
		const chunks = [];
		const cleanedEmails = getEmailsArray();
		for (let i = 0; i < cleanedEmails.length; i += chunkSize) {
			chunks.push(cleanedEmails.slice(i, i + chunkSize));
		}

		statsInput.textContent = `${cleanedEmails.length} email(s)`;
		updateCounters();
		renderResultsList();

		let completedChunks = 0;
		const queue = new ConcurrencyQueue(concurrency);

		// Resolve Firebase Auth ID Token for Cloudflare Worker Authorization
		let idToken = '';
		try {
			if (window.firebaseAuth && window.firebaseAuth.currentUser) {
				idToken = await window.firebaseAuth.currentUser.getIdToken(true);
			}
		} catch (e) {
			console.error("Auth Token generation failed:", e);
		}

		// API endpoint resolution
		const endpointMap = {
			'fastServer2': 'auth-fastcheck2',
			'fastServer1': 'auth-fastcheck1',
			'server2': 'auth-check2',
			'server1': 'auth-check1'
		};
		const activeEndpoint = endpointMap[selected] || 'auth-fastcheck2';
		const requestUrl = `${SERVER_URL}/${activeEndpoint}`;

		chunks.forEach((chunk, index) => {
			// Card UI for progress logging
			const card = document.createElement('div');
			card.className = 'task-card';
			const cardId = `task-app1-${index}`;
			card.id = cardId;
			card.innerHTML = `
				<div class="task-card-header">
					<span class="task-badge">Batch #${index + 1}</span>
					<span class="task-email">Verifying ${chunk.length.toLocaleString()} email(s)</span>
					<span class="task-status" id="${cardId}-status" style="color: var(--text-muted);"><i class="fa-solid fa-clock"></i> In queue...</span>
				</div>
				<div class="task-progress-container">
					<div class="task-progress-bar" id="${cardId}-progress" style="width: 0%"></div>
				</div>
				<div class="task-card-footer">
					<span class="task-stats" id="${cardId}-stats">Waiting in queue...</span>
				</div>
			`;
			tasksList.appendChild(card);

			const statusEl = document.getElementById(`${cardId}-status`);
			const progressEl = document.getElementById(`${cardId}-progress`);
			const statsEl = document.getElementById(`${cardId}-stats`);

			queue.push(async (next) => {
				if (!isRunning) {
					next();
					return;
				}

				statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
				statusEl.style.color = '#af86fc';
				progressEl.style.width = '30%';
				statsEl.textContent = 'Contacting secure worker API...';

				try {
					const response = await fetchWithTimeout(requestUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': idToken ? `Bearer ${idToken}` : '',
							'X-Api-Key': window.APIKEY || ''
						},
						body: JSON.stringify({ mail: chunk }),
						signal: abortController.signal
					}, 180000); // Strict 3 minutes timeout

					if (!isRunning) throw new Error('Aborted');

					if (!response.ok) {
						throw new Error(`Server returned ${response.status}`);
					}

					const data = await response.json();
					if (!Array.isArray(data)) throw new Error('Invalid response array');

					// Parse API Status
					data.forEach(item => {
						let status = (item.status || 'bad').toLowerCase();
						if (isFastServer) {
							status = status === 'live' ? 'live' : 'bad';
						} else {
							const allowed = ['live', 'verify', 'disabled', 'unregistered', 'bad'];
							if (!allowed.includes(status)) status = 'bad';
						}

						results.push({
							email: item.email,
							status: status,
							details: item.details || 'Successfully checked'
						});
					});

					progressEl.style.width = '100%';
					progressEl.style.background = 'linear-gradient(90deg, #66ffd9 0%, #00ffff 100%)';
					statusEl.innerHTML = '<span style="color: #66ffd9;"><i class="fa-solid fa-circle-check"></i> Success</span>';
					statsEl.textContent = `Completed batch. Found ${chunk.length} entries.`;

				} catch (err) {
					console.error("Batch failure:", err);
					progressEl.style.width = '100%';
					progressEl.style.background = 'linear-gradient(90deg, #ff6666 0%, #ff3333 100%)';
					statusEl.innerHTML = '<span style="color: #ff6666;"><i class="fa-solid fa-circle-xmark"></i> Failed</span>';
					statsEl.textContent = err.message || 'Error occurred';

					// Map remaining chunk emails as failed
					chunk.forEach(email => {
						results.push({
							email: email,
							status: 'failed',
							details: err.message === 'Timeout (10s)' ? 'API Timeout (10s)' : 'API Connection Error'
						});
					});
				}

				completedChunks++;
				updateCounters();

				if (completedChunks === chunks.length) {
					// Entire Verification completed
					isRunning = false;
					btnExecute.style.display = 'inline-flex';
					btnStop.style.display = 'none';

					// Auto switch to 'All' tab on completion
					currentFilter = 'all';
					filterButtons.forEach(b => {
						if (b) b.classList.remove('active');
					});
					if (filterAll) filterAll.classList.add('active');
					renderResultsList();

					selectServerContainer.classList.add('hide');
					btnExecute.classList.add('hide');
					btnAddDomain.classList.add('hide');
					btnClear.classList.add('hide');
					btnCopy.classList.remove('hide');
					btnDownload.classList.remove('hide');
					if (results.length > 50) btnDownloadAll.classList.remove('hide');
					updateDownloadButtonsLabels();

					window.showAppNotification('success', `<strong>Verification Completed:</strong> Successfully processed <strong>${results.length.toLocaleString()} email(s)</strong>!`);
					
					// Send finished system notification
					window.sendBrowserNotification("Gmail Checker Completed", `Successfully verified ${results.length.toLocaleString()} email(s)!`);

					// Persist unified history for dashboard
					saveUnifiedHistory();
				}

				next();
			});
		});
	});

	// Save run to local storage history
	function saveUnifiedHistory() {
		try {
			const histKey = 'projekin_app_history';
			const raw = localStorage.getItem(histKey);
			const history = raw ? JSON.parse(raw) : [];
			const now = new Date();
			const timeStr = now.toLocaleDateString() + ', ' + now.toLocaleTimeString();
			const dateStr = now.toISOString().split('T')[0];

			// Combine output content
			const contentText = results.map(x => `${x.email} - ${x.status.toUpperCase()}`).join('\n');

			history.unshift({
				id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
				appId: 'app1',
				appName: 'Gmail Checker',
				title: dateStr,
				time: timeStr,
				count: results.length,
				content: contentText
			});

			if (history.length > 50) history.pop();
			localStorage.setItem(histKey, JSON.stringify(history));

			// Save to premium offline IndexedDB History
			if (window.saveHistoryEntry) {
				window.saveHistoryEntry('app1', 'Gmail Checker', results.length, contentText, 'emails');
			}
		} catch (e) {
			console.error("Unified history persist error:", e);
		}
	}

	// Stop/Cancel Verification handler
	btnStop.addEventListener('click', function () {
		if (abortController) {
			abortController.abort();
		}
		isRunning = false;
		btnExecute.style.display = 'inline-flex';
		btnStop.style.display = 'none';
		window.showAppNotification('danger', '<strong>Cancelled:</strong> Verification process was stopped by user.');
	});

	// Back/Reset button
	btnBack.addEventListener('click', function () {
		isRunning = false;
		if (abortController) abortController.abort();

		resultsContainer.classList.add('hide');
		inputContainer.classList.remove('hide');

		statsInput.textContent = '0 email(s)';
		statsLive.textContent = '0';
		statsVer.textContent = '0';
		statsDisabled.textContent = '0';
		statsUnregistered.textContent = '0';
		statsBad.textContent = '0';
		if (statsFailed) statsFailed.textContent = '0';

		btnCopy.classList.add('hide');
		btnDownload.classList.add('hide');
		btnDownloadAll.classList.add('hide');
		selectServerContainer.classList.remove('hide');
		btnExecute.classList.remove('hide');
		btnAddDomain.classList.remove('hide');
		btnClear.classList.remove('hide');

		window.clearAppNotification();
		textarea.dispatchEvent(new Event('input'));
	});

	// Update real-time statistics boxes
	function updateCounters() {
		const all = results.length;
		const live = results.filter(x => x.status === 'live').length;
		const ver = results.filter(x => x.status === 'verify').length;
		const disabled = results.filter(x => x.status === 'disabled').length;
		const unregistered = results.filter(x => x.status === 'unregistered').length;
		const bad = results.filter(x => x.status === 'bad').length;
		const failed = results.filter(x => x.status === 'failed').length;

		// Bottom control panel stats
		statsLive.textContent = live.toLocaleString();
		statsVer.textContent = ver.toLocaleString();
		statsDisabled.textContent = disabled.toLocaleString();
		statsUnregistered.textContent = unregistered.toLocaleString();
		statsBad.textContent = bad.toLocaleString();
		if (statsFailed) statsFailed.textContent = failed.toLocaleString();

		// Header filters stats
		countAll.textContent = `(${all})`;
		countLive.textContent = `(${live})`;
		countVer.textContent = `(${ver})`;
		countDisabled.textContent = `(${disabled})`;
		countUnregistered.textContent = `(${unregistered})`;
		countBad.textContent = `(${bad})`;
		if (countFailed) countFailed.textContent = `(${failed})`;
	}

	// Filter button active class toggle
	const filterButtons = [filterAll, filterLive, filterVer, filterDisabled, filterUnregistered, filterBad, filterFailed];
	filterButtons.forEach(btn => {
		if (!btn) return;
		btn.addEventListener('click', function () {
			filterButtons.forEach(b => b.classList.remove('active'));
			btn.classList.add('active');
			currentFilter = btn.getAttribute('data-filter');
			updateDownloadButtonsLabels();
			renderResultsList();
		});
	});

	function updateDownloadButtonsLabels() {
		if (!btnCopy || !btnDownload) return;
		const labelMap = {
			all: 'All',
			live: 'Live',
			verify: 'Ver',
			disabled: 'Disabled',
			unregistered: 'Unregistered',
			bad: 'Bad',
			failed: 'Failed'
		};
		const activeLabel = labelMap[currentFilter] || 'All';
		btnCopy.innerHTML = `<i class="fa-solid fa-copy"></i> Copy ${activeLabel} Results`;
		btnDownload.innerHTML = `<i class="fa-solid fa-download"></i> Download ${activeLabel} (TXT)`;
	}

	// Optimized dynamic rendering of checked emails
	function renderResultsList() {
		const container = document.getElementById('tasks-list-app1');
		if (results.length === 0) return;

		// Clean batch cards if verification completed or filtering changed
		if (!isRunning) {
			container.innerHTML = '';
			if (container._virtualScrollHandler) {
				container.removeEventListener('scroll', container._virtualScrollHandler);
				container._virtualScrollHandler = null;
			}
		} else {
			// Do not clear batch progress cards while running to maintain status logs
			return;
		}

		const filtered = currentFilter === 'all' ? results : results.filter(x => x.status === currentFilter);

		if (filtered.length === 0) {
			container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.95rem;">No emails matched the "${currentFilter.toUpperCase()}" filter.</div>`;
			return;
		}

		const ITEM_HEIGHT_REM = 2.875; // 46px / 16 = 2.875rem
		const OVERSCAN = 15;
		let resultVirtualScrollTimer;

		function getCurrentRemValue() {
			return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
		}

		function remToPx(remValue) {
			return remValue * getCurrentRemValue();
		}

		// Override container styles for simpler box-model virtual scrolling
		container.style.display = 'block';
		container.style.gap = '0px';
		container.scrollTop = 0;

		function displayResults() {
			const scrollTop = container.scrollTop;
			const clientHeight = container.clientHeight || 800; // Fallback
			const totalItems = filtered.length;
			const itemHeightPx = remToPx(ITEM_HEIGHT_REM);

			const startIndex = Math.max(0, Math.floor(scrollTop / itemHeightPx) - OVERSCAN);
			const endIndex = Math.min(totalItems - 1, Math.ceil((scrollTop + clientHeight) / itemHeightPx) + OVERSCAN);

			const paddingTop = startIndex * ITEM_HEIGHT_REM;
			const paddingBottom = Math.max(0, (totalItems - 1 - endIndex) * ITEM_HEIGHT_REM);

			container.innerHTML = ''; // Kosongkan daftar

			// Tambahkan padding atas (langsung gunakan rem untuk performa maksimal)
			if (paddingTop > 0) {
				const topPaddingDiv = document.createElement('div');
				topPaddingDiv.style.height = `${paddingTop}rem`;
				container.appendChild(topPaddingDiv);
			}

			// Render hanya item yang terlihat
			for (let i = startIndex; i <= endIndex; i++) {
				const item = filtered[i];
				if (!item) continue;

				const itemRow = document.createElement('div');
				itemRow.className = 'task-card';
				itemRow.style.height = `2.375rem`; // 38px / 16 (Accounting for 8px gap)
				itemRow.style.padding = '0 0.875rem'; // 14px / 16
				itemRow.style.flexDirection = 'row';
				itemRow.style.justifyContent = 'space-between';
				itemRow.style.alignItems = 'center';
				itemRow.style.boxSizing = 'border-box';
				itemRow.style.margin = '0 0 0.5rem 0'; // Bottom margin for gap (8px / 16)

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
						<span style="color: var(--text-muted); font-family: monospace; font-size: 0.8rem;">#${i + 1}</span>
						<span style="font-weight: 600; font-family: monospace; color: var(--text-sharp); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.email}</span>
					</div>
					<div style="display: flex; align-items: center; gap: 8px;">
						<span style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;" title="${item.details}">${item.details}</span>
						<span style="font-weight: bold; color: ${color}; display: flex; align-items: center; gap: 4px; font-size: 0.8rem;">${icon} ${item.status.toUpperCase()}</span>
					</div>
				`;
				container.appendChild(itemRow);
			}

			// Tambahkan padding bawah
			if (paddingBottom > 0) {
				const bottomPaddingDiv = document.createElement('div');
				bottomPaddingDiv.style.height = `${paddingBottom}rem`;
				container.appendChild(bottomPaddingDiv);
			}
		}

		container._virtualScrollHandler = function () {
			if (resultVirtualScrollTimer) clearTimeout(resultVirtualScrollTimer);
			resultVirtualScrollTimer = setTimeout(displayResults, 30); // Debounce
		};

		container.addEventListener('scroll', container._virtualScrollHandler, { passive: true });

		// Initial render
		displayResults();
	}

	// Copy active filtered results
	btnCopy.addEventListener('click', function () {
		const filtered = currentFilter === 'all' ? results : results.filter(x => x.status === currentFilter);
		if (filtered.length === 0) return;

		let text = '';
		if (currentFilter === 'all') {
			text = filtered.map(x => `${x.email} - ${x.status.toUpperCase()}`).join('\n');
		} else {
			text = filtered.map(x => x.email).join('\n');
		}

		navigator.clipboard.writeText(text).then(() => {
			const original = btnCopy.innerHTML;
			btnCopy.innerHTML = '<i class="fa-solid fa-check" style="color: #66ffd9;"></i> Copied!';
			btnCopy.style.borderColor = '#00cccc';
			setTimeout(() => {
				btnCopy.innerHTML = original;
				btnCopy.style.borderColor = '';
			}, 2000);
		});
	});

	// Download active filtered results as TXT
	btnDownload.addEventListener('click', function () {
		const filtered = currentFilter === 'all' ? results : results.filter(x => x.status === currentFilter);
		if (filtered.length === 0) return;

		let text = '';
		if (currentFilter === 'all') {
			text = filtered.map(x => `${x.email} - ${x.status.toUpperCase()}`).join('\n');
		} else {
			text = filtered.map(x => x.email).join('\n');
		}

		const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		const date = new Date();
		a.download = `gmail-check-${currentFilter}-combined-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	});

	// Split download as beautiful ZIP (using JSZip)
	btnDownloadAll.addEventListener('click', function () {
		if (results.length === 0) return;

		btnDownloadAll.disabled = true;
		const originalHTML = btnDownloadAll.innerHTML;
		btnDownloadAll.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Zipping...';

		loadJSZip(() => {
			const zip = new JSZip();

			// Group emails by active status
			const statuses = ['live', 'verify', 'disabled', 'unregistered', 'bad', 'failed'];
			statuses.forEach(status => {
				const group = results.filter(x => x.status === status);
				if (group.length > 0) {
					const textContent = group.map(x => x.email).join('\n');
					zip.file(`${status.toUpperCase()}_emails_list.txt`, textContent);
				}
			});

			// Also add all results combined file
			const allCombined = results.map(x => `${x.email} - ${x.status.toUpperCase()}`).join('\n');
			zip.file(`ALL_CHECKED_RESULTS_combined.txt`, allCombined);

			zip.generateAsync({ type: 'blob' }).then(content => {
				const url = URL.createObjectURL(content);
				const a = document.createElement('a');
				a.href = url;
				const date = new Date();
				a.download = `gmail-checker-full-results-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.zip`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);

				btnDownloadAll.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #66ffd9;"></i> Zipped & Saved!';
				setTimeout(() => {
					btnDownloadAll.innerHTML = originalHTML;
					btnDownloadAll.disabled = false;
				}, 3000);
			});
		});
	});
})();
