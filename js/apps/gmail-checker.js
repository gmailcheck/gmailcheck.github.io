(function () {
	const body = document.body;
	const textarea = document.getElementById('gmail-checker-input');
	const inputContainer = document.getElementById('input-container-container-app1');
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

	const SERVER_URL = window.API.GC_CHECKER_BASE;
	let results = [];
	let currentFilter = 'all';
	let isRunning = false;
	let abortController = null;
	let sanitizerWorker = null;

	function showProgressOverlay() {
		if (!document.getElementById('progress-overlay-styles')) {
			const style = document.createElement('style');
			style.id = 'progress-overlay-styles';
			style.innerHTML = `
				@keyframes progressFadeIn {
					from { opacity: 0; }
					to { opacity: 1; }
				}
			`;
			document.head.appendChild(style);
		}

		let overlay = document.getElementById('gmail-checker-progress-overlay');
		if (!overlay) {
			overlay = document.createElement('div');
			overlay.id = 'gmail-checker-progress-overlay';

			overlay.style.cssText = `
				position: absolute;
				width: 100%;
				height: 100%;
				top: 0;
				left: 0;
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				z-index: 10;
				animation: progressFadeIn 0.3s ease;
				background: rgba(0, 0, 0, 0.1);
				pointer-events: none;
			`;
			overlay.innerHTML = `
				<div style="position: relative; min-width: 200px; min-height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: rgba(0, 0, 0, 0.5); box-shadow: 0 2px 8px rgba(3, 141, 206, 0.6); border-radius: 15px; padding: 36px; border-radius: 15%;">
					<div style="position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center;">
						<svg data-rds-skip="true" viewBox="0 0 120 120" style="width: 120px; height: 120px; transform: rotate(-90deg); overflow: visible; ">
							<circle cx="60" cy="60" r="50" 
									fill="rgba(0, 0, 0, 0.5)" 
									stroke="rgba(0, 136, 170, 0.05)" 
									stroke-width="10" />
							<circle id="progress-circle-bar" cx="60" cy="60" r="50" 
									fill="transparent" 
									stroke="url(#progress-grad)" 
									stroke-width="8" 
									stroke-dasharray="314.159" 
									stroke-dashoffset="314.159" 
									stroke-linecap="round"
									filter="url(#progress-shadow)"
									style="transition: stroke-dashoffset 0.3s ease;" />
							<defs>
								<linearGradient id="progress-grad" x1="0%" y1="0%" x2="100%" y2="100%">
									<stop offset="0%" stop-color="#af86fc" stop-opacity="1" />
									<stop offset="100%" stop-color="#00ffff" stop-opacity="1" />
								</linearGradient>
								<filter id="progress-shadow" x="-30%" y="-30%" width="160%" height="160%">
									<feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#af86fc" flood-opacity="0.6"/>
								</filter>
							</defs>
						</svg>
						<div style="
							position: absolute;
							top: 0;
							left: 0;
							width: 100%;
							height: 100%;
							display: flex;
							flex-direction: column;
							align-items: center;
							justify-content: center;
						">
							<span id="progress-percentage" style="font-size: 1.6rem; font-weight: 700; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">0%</span>
							<span id="progress-fraction" style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.6); margin-top: 2px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">0/0</span>
						</div>
					</div>
					<div id="progress-status-text" style="
						margin-top: 24px;
						font-size: 0.95rem;
						color: #ffffff;
						font-weight: 500;
						text-align: center;
						max-width: 85%;
						text-shadow: 0 2px 8px rgba(0,0,0,0.6);
						background: rgba(1, 46, 83, 0.5);
						padding: 6px 16px;
						border-radius: 20px;
						border: 1px solid rgba(255,255,255,0.06);
					">
					Preparing...
				</div>
				</div>
			`;
			body.appendChild(overlay);
		}
	}

	function updateProgressOverlay(percentage, completed, total, statusText) {
		const circleBar = document.getElementById('progress-circle-bar');
		const pctSpan = document.getElementById('progress-percentage');
		const fractionSpan = document.getElementById('progress-fraction');
		const statusTextDiv = document.getElementById('progress-status-text');

		if (circleBar) {
			const circumference = 314.159;
			const offset = circumference - (percentage / 100) * circumference;
			circleBar.setAttribute('stroke-dashoffset', offset);
			circleBar.style.strokeDashoffset = String(offset);
		}
		if (pctSpan) {
			pctSpan.textContent = `${Math.round(percentage)}%`;
		}
		if (fractionSpan) {
			fractionSpan.textContent = `${completed}/${total}`;
		}
		if (statusTextDiv && statusText) {
			statusTextDiv.innerHTML = statusText;
		}
	}

	function hideProgressOverlay() {
		const overlay = document.getElementById('gmail-checker-progress-overlay');
		if (overlay) {
			overlay.remove();
		}
	}

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
		const sidebarLiveText = document.querySelector('#stats-live-app1') ? document.querySelector('#stats-live-app1').previousElementSibling : null;
		const filterLiveBtn = document.getElementById('filter-live-app1');

		// Check for PRO/ULTRA restriction
		const isPremiumServer = server === 'fastServer' || server === 'deepServer';
		const profile = window.dashboardProfile || {};
		const isProUltra = profile.role === 'admin' || (profile.subscription_plan && profile.subscription_plan !== 'free' && profile.subscription_plan !== 'none' && profile.subscription_expiry > Date.now());

		if (isPremiumServer && !isProUltra) {
			window.showAppNotification('warning', '<strong>Premium Server:</strong> Fast (VIP) and Deep (VIP) are exclusive to PRO & ULTRA members. Please upgrade to unlock.');
		}

		const isFast = server.startsWith('fast');

		if (!isFast) {
			// Normal Server (Detailed Stats - Advanced 1 & 2 & Deep PRO)
			detailedRows.forEach(row => row.classList.remove('hide'));
			if (filterVer) filterVer.classList.remove('hide');
			if (filterDisabled) filterDisabled.classList.remove('hide');
			if (filterUnregistered) filterUnregistered.classList.remove('hide');

			// Advanced doesn't have "Bad" status (which is Fast-only)
			if (filterBad) filterBad.classList.add('hide');
			if (sidebarBadRow) sidebarBadRow.classList.add('hide');

			// Restore labels to "Live"
			if (sidebarLiveText) sidebarLiveText.innerHTML = '<i class="fa-solid fa-circle-check app-stats-icon-live"></i> Live:';
			if (filterLiveBtn) {
				const countSpan = document.getElementById('count-live-app1');
				if (countSpan) {
					filterLiveBtn.innerHTML = '';
					filterLiveBtn.appendChild(document.createTextNode('Live '));
					filterLiveBtn.appendChild(countSpan);
				}
			}
		} else {
			// Fast Server (Basic Live / Bad Stats - Fast 1 & Fast PRO)
			detailedRows.forEach(row => row.classList.add('hide'));
			if (filterVer) filterVer.classList.add('hide');
			if (filterDisabled) filterDisabled.classList.add('hide');
			if (filterUnregistered) filterUnregistered.classList.add('hide');

			// Fast/Dast server uses "Bad"
			if (filterBad) filterBad.classList.remove('hide');
			if (sidebarBadRow) sidebarBadRow.classList.remove('hide');

			// Change labels to "Good"
			if (sidebarLiveText) sidebarLiveText.innerHTML = '<i class="fa-solid fa-circle-check app-stats-icon-live"></i> Good:';
			if (filterLiveBtn) {
				const countSpan = document.getElementById('count-live-app1');
				if (countSpan) {
					filterLiveBtn.innerHTML = '';
					filterLiveBtn.appendChild(document.createTextNode('Good '));
					filterLiveBtn.appendChild(countSpan);
				}
			}
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
			const reason = escapeHTML(item.message || 'Invalid format');
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

	let validationTimer;

	// Immediately hide invalid list on input, paste, or focus – show only on button press
	function hideInvalidListNow() {
		if (invalidListBox) {
			invalidListBox.classList.add('hide');
			invalidListBox.innerHTML = '';
		}
	}

	textarea.addEventListener('input', () => {
		statsInput.textContent = `${getEmailsArray().length} email(s)`;
		hideInvalidListNow();
		clearTimeout(validationTimer);
		validationTimer = setTimeout(() => validateInputEmails(false), 500);
	});
	textarea.addEventListener('paste', () => {
		hideInvalidListNow();
	});

	textarea.addEventListener('focus', () => {
		hideInvalidListNow();
	});

	textarea.addEventListener('blur', () => {
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



	// Fetch helper with timeout per User Plan
	function fetchWithTimeout(url, options, timeoutMs = 180000) {
		return new Promise((resolve, reject) => {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				controller.abort();
				reject(new Error(`Timeout (${Math.round(timeoutMs / 1000)}s)`));
			}, timeoutMs);

			const combinedSignal = options.signal;
			if (combinedSignal) {
				combinedSignal.addEventListener('abort', () => {
					clearTimeout(timeoutId);
					controller.abort();
					reject(new Error('Aborted'));
				});
			}

			if (localStorage.getItem('gmailChecker_debugMode') === 'true') {
				console.log(`[DEBUG] Fetching URL: ${url}`, {
					method: options.method,
					headers: options.headers,
					body: options.body ? JSON.parse(options.body) : null
				});
			}

			fetch(url, { ...options, signal: controller.signal }).then(res => {
				clearTimeout(timeoutId);
				if (localStorage.getItem('gmailChecker_debugMode') === 'true') {
					console.log(`[DEBUG] Received Response from ${url}: Status ${res.status}`);
				}
				resolve(res);
			}).catch(err => {
				clearTimeout(timeoutId);
				if (localStorage.getItem('gmailChecker_debugMode') === 'true') {
					console.warn(`[DEBUG] Fetch Error from ${url}:`, err);
				}
				reject(err);
			});
		});
	}

	// Execute Verification Flow
	btnExecute.addEventListener('click', async function () {
		const selected = selectServer.value;
		const isPremiumServer = selected === 'fastServer' || selected === 'deepServer';
		const profile = window.dashboardProfile || {};
		const isProUltra = profile.role === 'admin' || (profile.subscription_plan && profile.subscription_plan !== 'free' && profile.subscription_plan !== 'none' && profile.subscription_expiry > Date.now());

		if (isPremiumServer && !isProUltra) {
			window.showAppNotification('danger', '<strong>Access Blocked:</strong> Fast (VIP) and Deep (VIP) servers are exclusive to PRO & ULTRA members. Please upgrade your plan.');
			return;
		}

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

		const isFastServer = selected.startsWith('fast');
		const cleanedEmails = getEmailsArray();
		const chunkSize = selected === 'fastServer' ? 250
			: selected === 'fastFreeServer' ? 250
				: selected === 'deepServer' ? 40
					: selected === 'deepFreeServer' ? 40
						: 40;


		const chunks = [];
		for (let i = 0; i < cleanedEmails.length; i += chunkSize) {
			chunks.push(cleanedEmails.slice(i, i + chunkSize));
		}

		// UI transitions
		inputContainer.classList.add('hide');
		resultsContainer.classList.remove('hide');
		tasksList.innerHTML = '';

		btnBack.classList.add('hide');
		btnExecute.classList.add('hide');
		btnClear.classList.add('hide');
		btnAddDomain.classList.add('hide');
		btnStop.classList.remove('hide');
		btnCopy.classList.add('hide');
		btnDownload.classList.add('hide');
		btnDownloadAll.classList.add('hide');

		results = [];
		isRunning = true;
		abortController = new AbortController();
		window.clearAppNotification();
		showProgressOverlay();
		updateProgressOverlay(0, 0, chunks.length, `Preparing verification of ${cleanedEmails.length} email(s)...`);

		statsInput.textContent = `${cleanedEmails.length} email(s)`;
		updateCounters();
		renderResultsList();

		let completedChunks = 0;

		// Resolve Firebase Auth ID Token for Cloudflare Worker Authorization
		let idToken = '';
		try {
			idToken = await window.getAuthToken();
		} catch (e) {
			console.error("Auth Token generation failed:", e);
		}

		// API endpoint resolution
		let endpoint = 'free-fastcheck';
		if (selected === 'fastFreeServer') endpoint = idToken ? 'auth-free-fastcheck' : 'free-fastcheck';
		else if (selected === 'fastServer') endpoint = idToken ? 'auth-fastcheck' : 'fastcheck';
		else if (selected === 'deepFreeServer') endpoint = idToken ? 'auth-free-deepcheck' : 'free-deepcheck';
		else if (selected === 'deepServer') endpoint = idToken ? 'auth-deepcheck' : 'deepcheck';
		const requestUrl = `${SERVER_URL}/${endpoint}`;

		const maxRetries = isProUltra ? 3 : 2;
		const retryDelay = isProUltra ? 1000 : 500;

		for (let index = 0; index < chunks.length; index++) {
			if (!isRunning) break;

			const chunk = chunks[index];
			let chunkSuccess = false;
			let chunkResults = null;

			for (let attempt = 0; attempt < maxRetries; attempt++) {
				if (!isRunning) break;

				const currentPercent = (completedChunks / chunks.length) * 100;
				updateProgressOverlay(
					currentPercent,
					completedChunks,
					chunks.length,
					`Verifying batch #${completedChunks + 1} of ${chunks.length}... (Attempt ${attempt + 1}/${maxRetries})`
				);

				try {
					const headers = {
						'Content-Type': 'application/json'
					};
					if (idToken) {
						headers['Authorization'] = `Bearer ${idToken}`;
					}

					const response = await fetchWithTimeout(requestUrl, {
						method: 'POST',
						headers: headers,
						body: JSON.stringify({ mail: chunk }),
						signal: abortController.signal
					}, 180000);

					if (!isRunning) break;

					if (!response.ok) {
						if (response.status === 402) {
							let errData = {};
							try {
								errData = await response.json();
							} catch (e) { }
							const errorMsg = errData.message || 'You do not have enough credits to perform this request.';
							const remaining = errData.message ? parseInt(errData.message.match(/have (\d+) remaining/)?.[1] || 0) : 0;

							// Abort other tasks and stop checker running state
							if (abortController) abortController.abort();
							isRunning = false;
							btnExecute.classList.remove('hide');
							btnStop.classList.add('hide');
							btnBack.classList.remove('hide');

							hideProgressOverlay();
							inputContainer.classList.add('hide');

							showInsufficientCreditsModal(errorMsg, remaining);
							throw new Error('Insufficient Credits');
						}

						let errorMsg = `Server returned ${response.status}`;
						try {
							const errData = await response.json();
							if (errData && errData.error) {
								errorMsg = `Server error: ${errData.error}`;
							}
						} catch (e) { }
						throw new Error(errorMsg);
					}

					const data = await response.json();
					if (!Array.isArray(data) || data.length === 0) {
						throw new Error(data?.error || 'Server overloaded');
					}

					// Parse API Status
					chunkResults = [];
					let batchFailedCount = 0;
					data.forEach(item => {
						let status = (item.status || 'bad').toLowerCase();
						if (isFastServer) {
							status = (status === 'live' || status === 'good') ? 'good' : 'bad';
						} else {
							const allowed = ['live', 'verify', 'disabled', 'unregistered', 'bad'];
							if (!allowed.includes(status)) status = 'bad';
						}

						if (status === 'failed') {
							batchFailedCount++;
						}

						chunkResults.push({
							email: item.email,
							status: status,
							details: item.details || ''
						});
					});

					// Jika ada email dalam chunk yang tidak dikembalikan oleh API, klasifikasikan sebagai failed
					const returnedEmails = new Set(data.map(item => item.email ? item.email.toLowerCase().trim() : ''));
					chunk.forEach(email => {
						const lowerEmail = email.toLowerCase().trim();
						if (!returnedEmails.has(lowerEmail)) {
							chunkResults.push({
								email: email,
								status: 'failed',
								details: 'No response from verification server'
							});
							batchFailedCount++;
						}
					});

					// [TAMBAHAN] Beri notifikasi ringan jika 1 batch gagal total (agar user tidak bingung)
					if (batchFailedCount === chunk.length && chunk.length > 0) {
						window.showAppNotification('warning', `<strong>Notice:</strong> Provider gagal memvalidasi batch #${index + 1}. Kredit Anda otomatis dikembalikan.`);
					}

					chunkSuccess = true;
					break; // Success! Exit retry loop for this chunk
				} catch (err) {
					console.warn(`[RETRY] Batch #${index + 1} Attempt ${attempt + 1}/${maxRetries} failed:`, err.message);
					if (err.message === 'Insufficient Credits' || err.message === 'Aborted') {
						break;
					}
					if (attempt < maxRetries - 1 && isRunning) {
						await new Promise(resolve => setTimeout(resolve, retryDelay));
					}
				}
			}

			if (chunkSuccess && chunkResults) {
				results.push(...chunkResults);
			} else {
				// Map remaining chunk emails as failed
				chunk.forEach(email => {
					results.push({
						email: email,
						status: 'failed',
						details: 'API Connection Error after all retries'
					});
				});
			}

			completedChunks++;
			updateCounters();

			// Realtime display of verified emails
			renderResultsList(true);

			// Update progress percentage
			const newPercent = (completedChunks / chunks.length) * 100;
			const verifiedCount = Math.min(completedChunks * chunkSize, cleanedEmails.length);
			updateProgressOverlay(
				newPercent,
				completedChunks,
				chunks.length,
				`Verifying... (Processed ${verifiedCount}/${cleanedEmails.length} emails)`
			);
		}

		if (completedChunks === chunks.length) {
			// Entire Verification completed
			isRunning = false;
			btnExecute.classList.remove('hide');
			btnStop.classList.add('hide');
			btnBack.classList.remove('hide');

			if (typeof window.refreshRealtimeProfile === 'function') {
				window.refreshRealtimeProfile();
			}

			// Hide progress overlay and hide input container on completion
			hideProgressOverlay();
			inputContainer.classList.add('hide');

			// Auto switch to 'All' tab on completion
			currentFilter = 'all';
			filterButtons.forEach(b => {
				if (b) b.classList.remove('active');
			});
			if (filterAll) filterAll.classList.add('active');
			renderResultsList(true);

			selectServerContainer.classList.add('hide');
			btnExecute.classList.add('hide');
			btnAddDomain.classList.add('hide');
			btnClear.classList.add('hide');
			btnCopy.classList.remove('hide');
			btnDownload.classList.remove('hide');
			if (results.length > 50) btnDownloadAll.classList.remove('hide');
			updateDownloadButtonsLabels();

			window.showAppNotification('success', `<strong>Verification Completed:</strong> Successfully processed <strong>${results.length.toLocaleString()} email(s)</strong>!`);

			// Play premium chime sound if enabled
			if (localStorage.getItem('gmailChecker_soundEffects') !== 'false' && typeof window.playSuccessChime === 'function') {
				window.playSuccessChime();
			}

			// Send finished system notification
			window.sendBrowserNotification("Gmail Checker Completed", `Successfully verified ${results.length.toLocaleString()} email(s)!`);

			// Persist unified history for dashboard
			saveUnifiedHistory();
		}
	});

	// Save run to local storage history
	function saveUnifiedHistory() {
		try {
			// Saring hasil: jangan masukkan status === 'failed' ke history
			const filteredResults = results.filter(x => x.status !== 'failed');

			// Jika failed semuanya (misal abort controller, respon 500, dll), jangan masukkan ke history sama sekali
			if (filteredResults.length === 0) {
				return;
			}

			const histKey = 'projekin_app_history';
			const raw = localStorage.getItem(histKey);
			const history = raw ? JSON.parse(raw) : [];
			const now = new Date();
			const timeStr = now.toLocaleDateString() + ', ' + now.toLocaleTimeString();
			const dateStr = now.toISOString().split('T')[0];

			const selectedServer = selectServer ? selectServer.value : 'fastFreeServer';

			// Combine output content
			const contentText = filteredResults.map(x => `${x.email} - ${x.status.toUpperCase()}`).join('\n');

			history.unshift({
				id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
				appId: 'app1',
				appName: 'Gmail Checker',
				title: dateStr,
				time: timeStr,
				count: filteredResults.length,
				content: contentText,
				server: selectedServer
			});

			if (history.length > 50) history.pop();
			localStorage.setItem(histKey, JSON.stringify(history));

			// Save to premium offline IndexedDB History
			if (window.saveHistoryEntry) {
				window.saveHistoryEntry('app1', 'Gmail Checker', filteredResults.length, contentText, 'emails', { server: selectedServer });
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


		btnExecute.classList.remove('hide');
		btnStop.classList.add('hide');
		btnBack.classList.remove('hide');

		hideProgressOverlay();
		inputContainer.classList.add('hide');

		window.showAppNotification('danger', '<strong>Cancelled:</strong> Verification process was stopped by user.');
	});

	// Back/Reset button
	btnBack.addEventListener('click', function () {
		isRunning = false;

		if (abortController) abortController.abort();

		hideProgressOverlay();
		resultsContainer.classList.add('hide');
		inputContainer.classList.remove('hide');

		results = [];

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
		btnBack.classList.add('hide');
		updateInvalidList([]);

		window.clearAppNotification();
		textarea.dispatchEvent(new Event('input'));
	});

	// Update real-time statistics boxes
	function updateCounters() {
		const all = results.length;
		const live = results.filter(x => x.status === 'live' || x.status === 'good').length;
		const ver = results.filter(x => x.status === 'verify').length;
		const disabled = results.filter(x => x.status === 'disabled').length;
		const unregistered = results.filter(x => x.status === 'unregistered').length;
		const bad = results.filter(x => x.status === 'bad').length;
		const failed = results.filter(x => x.status === 'failed').length;

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
		const isFast = selectServer.value.startsWith('fast');
		const labelMap = {
			all: 'All',
			live: isFast ? 'Good' : 'Live',
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
	function renderResultsList(scrollToBottom = false) {
		if (results.length === 0) {
			tasksList.innerHTML = '';
			return;
		}

		if (tasksList._virtualScrollHandler) {
			tasksList.removeEventListener('scroll', tasksList._virtualScrollHandler);
			tasksList._virtualScrollHandler = null;
		}

		// Clear list container
		tasksList.innerHTML = '';

		const filtered = currentFilter === 'all'
			? results
			: results.filter(x => {
				if (currentFilter === 'live') {
					return x.status === 'live' || x.status === 'good';
				}
				return x.status === currentFilter;
			});

		if (filtered.length === 0) {
			tasksList.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted); ">No emails matched the "${currentFilter.toUpperCase()}" filter.</div>`;
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
		tasksList.style.display = 'block';
		tasksList.style.gap = '0px';

		function displayResults() {
			const scrollTop = tasksList.scrollTop;
			const clientHeight = tasksList.clientHeight || 800; // Fallback
			const totalItems = filtered.length;
			const itemHeightPx = remToPx(ITEM_HEIGHT_REM);

			const startIndex = Math.max(0, Math.floor(scrollTop / itemHeightPx) - OVERSCAN);
			const endIndex = Math.min(totalItems - 1, Math.ceil((scrollTop + clientHeight) / itemHeightPx) + OVERSCAN);

			const paddingTop = startIndex * ITEM_HEIGHT_REM;
			const paddingBottom = Math.max(0, (totalItems - 1 - endIndex) * ITEM_HEIGHT_REM);

			tasksList.innerHTML = ''; // Kosongkan daftar

			// Tambahkan padding atas (langsung gunakan rem untuk performa maksimal)
			if (paddingTop > 0) {
				const topPaddingDiv = document.createElement('div');
				topPaddingDiv.style.height = `${paddingTop}rem`;
				tasksList.appendChild(topPaddingDiv);
			}

			// Render hanya item yang terlihat
			for (let i = startIndex; i <= endIndex; i++) {
				const item = filtered[i];
				if (!item) continue;

				const itemRow = document.createElement('div');
				itemRow.style.height = `2.375rem`; // 38px / 16 (Accounting for 8px gap)
				itemRow.style.padding = '0 0.875rem'; // 14px / 16
				itemRow.style.display = 'flex';
				itemRow.style.flexDirection = 'row';
				itemRow.style.justifyContent = 'space-between';
				itemRow.style.alignItems = 'center';
				itemRow.style.boxSizing = 'border-box';
				itemRow.style.margin = '0 0 0.5rem 0'; // Bottom margin for gap (8px / 16)
				itemRow.style.background = 'rgba(255, 255, 255, 0.02)';
				itemRow.style.border = '1px solid var(--border-color)';
				itemRow.style.borderRadius = '8px';

				let color = '#ff00bf'; // bad (tomato red)
				let icon = '<i class="fa-solid fa-circle-xmark app-stats-icon-bad"></i>';
				if (item.status === 'live' || item.status === 'good') {
					color = '#66ffd9';
					icon = '<i class="fa-solid fa-circle-check app-stats-icon-live"></i>';
				} else if (item.status === 'verify') {
					color = '#ffd700';
					icon = '<i class="fa-solid fa-circle-question app-stats-icon-verify"></i>';
				} else if (item.status === 'disabled') {
					color = '#ff00bf';
					icon = '<i class="fa-solid fa-circle-minus app-stats-icon-disabled"></i>';
				} else if (item.status === 'unregistered') {
					color = '#00b7ff';
					icon = '<i class="fa-solid fa-user-xmark app-stats-icon-unregistered"></i>';
				} else if (item.status === 'failed') {
					color = '#ff4d4d';
					icon = '<i class="fa-solid fa-circle-exclamation"></i>';
				}

				itemRow.innerHTML = `
					<div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
						<span style="color: var(--text-muted);">#${i + 1}</span>
						<span style="color: var(--text-sharp);  text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(item.email)}</span>
					</div>
					<div style="display: flex; align-items: center; gap: 8px;">
						${item.details ? `<span style="color: var(--text-muted);" title="${escapeHTML(item.details)}">${escapeHTML(item.details)}</span>` : ''}
						<span style=" color: ${color}; display: flex; align-items: center; gap: 4px; ">${icon} ${escapeHTML(item.status.toUpperCase())}</span>
					</div>
				`;
				tasksList.appendChild(itemRow);
			}

			// Tambahkan padding bawah
			if (paddingBottom > 0) {
				const bottomPaddingDiv = document.createElement('div');
				bottomPaddingDiv.style.height = `${paddingBottom}rem`;
				tasksList.appendChild(bottomPaddingDiv);
			}
		}

		tasksList._virtualScrollHandler = function () {
			if (resultVirtualScrollTimer) clearTimeout(resultVirtualScrollTimer);
			resultVirtualScrollTimer = setTimeout(displayResults, 30); // Debounce
		};

		tasksList.addEventListener('scroll', tasksList._virtualScrollHandler, { passive: true });

		// Initial render
		displayResults();

		if (scrollToBottom) {
			setTimeout(() => {
				tasksList.scrollTop = filtered.length * remToPx(ITEM_HEIGHT_REM);
			}, 50);
		}
	}

	// Copy active filtered results
	btnCopy.addEventListener('click', function () {
		const filtered = currentFilter === 'all'
			? results
			: results.filter(x => {
				if (currentFilter === 'live') {
					return x.status === 'live' || x.status === 'good';
				}
				return x.status === currentFilter;
			});
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
		const filtered = currentFilter === 'all'
			? results
			: results.filter(x => {
				if (currentFilter === 'live') {
					return x.status === 'live' || x.status === 'good';
				}
				return x.status === currentFilter;
			});
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
			const statuses = ['live', 'good', 'verify', 'disabled', 'unregistered', 'bad', 'failed'];
			statuses.forEach(status => {
				const group = results.filter(x => x.status === status);
				if (group.length > 0) {
					const textContent = group.map(x => x.email).join('\n');
					const fileName = status === 'good' ? 'GOOD_emails_list.txt' : `${status.toUpperCase()}_emails_list.txt`;
					zip.file(fileName, textContent);
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

	function showInsufficientCreditsModal(message, remainingCredits) {
		// Calculate the actual sum of daily + api_credits dynamically
		let actualRemaining = remainingCredits;
		if (window.dashboardProfile) {
			const profile = window.dashboardProfile;
			let plan = profile.subscription_plan || 'none';
			const expiry = profile.subscription_expiry || 0;
			if (plan !== 'none' && expiry < Date.now()) plan = 'none';

			let dailyCredits = 0;
			const isSubActive = plan !== 'none' && plan !== 'free';
			if (plan === 'pro_subs') {
				dailyCredits = profile.pro_subs_credits !== undefined ? profile.pro_subs_credits : 0;
			} else if (plan === 'ultra_subs') {
				dailyCredits = profile.ultra_subs_credits !== undefined ? profile.ultra_subs_credits : 0;
			} else if (plan === 'special_subs') {
				dailyCredits = profile.special_credits !== undefined ? profile.special_credits : 0;
			}
			// Selalu tambahkan free_credits (harian) ke total — konsisten dengan dashboard
			const freeCreditsBalance = profile.free_credits !== undefined ? profile.free_credits : 0;
			dailyCredits = isSubActive ? (dailyCredits + freeCreditsBalance) : freeCreditsBalance;

			const apiCredits = profile.api_credits !== undefined ? profile.api_credits : (profile.api_quota || 0);
			actualRemaining = dailyCredits + apiCredits;
		} else {
			const appRemaining = document.getElementById('db-remaining-requests');
			if (appRemaining && appRemaining.textContent) {
				const val = parseInt(appRemaining.textContent.replace(/,/g, ''));
				if (!isNaN(val)) {
					actualRemaining = val;
				}
			}
		}

		let modal = document.getElementById('insufficient-credits-modal');
		if (!modal) {
			modal = document.createElement('div');
			modal.id = 'insufficient-credits-modal';
			modal.className = 'modal-overlay hide modal-overlay-custom';
			modal.style.zIndex = '99999';
			modal.innerHTML = `
				<div class="modal-card-custom" style="max-width: 420px; text-align: center; gap: 20px;">
					<!-- Close Button -->
					<button id="credits-modal-close-btn" class="modal-btn-close-custom"><i class="fa-solid fa-xmark"></i></button>
					
					<!-- Warning Icon -->
					<div style="margin-top: 10px; margin-bottom: 10px;">
						<div style="width: 64px; height: 64px; background: rgba(255, 102, 102, 0.1); border: 1px solid rgba(255, 102, 102, 0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; box-shadow: 0 0 15px rgba(255, 102, 102, 0.2);">
							<i class="fa-solid fa-circle-exclamation" style="color: #ff6666;"></i>
						</div>
					</div>

					<!-- Title -->
					<h3 style="color: var(--text-sharp); margin: 0; letter-spacing: 0.5px;">Insufficient Credits</h3>
					
					<!-- Message Description -->
					<p id="credits-modal-message" style="color: var(--text-secondary); margin: 0; line-height: 1.6; text-align: center;"></p>
					
					<!-- Quota Info Box -->
					<div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: 14px; padding: 12px 16px; margin: 5px 0; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; width: 100%;">
						<span style="color: var(--text-muted); ">Remaining Credits</span>
						<span id="credits-modal-balance" style="color: #ff6666; background: rgba(255, 102, 102, 0.1); padding: 4px 10px; border-radius: 8px;">0 credits</span>
					</div>

					<!-- Buttons -->
					<div style="display: flex; gap: 12px; width: 100%; margin-top: 10px;">
						<button id="btn-credits-modal-cancel" class="btn btn-secondary" style="flex: 1; border-radius: 12px; padding: 10px 16px; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary); cursor: pointer; transition: all 0.2s;">
							Cancel
						</button>
						<button id="btn-credits-modal-upgrade" class="btn btn-primary" style="flex: 1; border-radius: 12px; padding: 10px 16px; background: linear-gradient(135deg, #af86fc 0%, #7e53c9 100%); color: white; border: none;  cursor: pointer; box-shadow: 0 4px 12px rgba(175, 134, 252, 0.3); transition: all 0.2s;">
							Upgrade Now
						</button>
					</div>
				</div>
			`;
			document.body.appendChild(modal);

			// Setup event listeners
			const closeBtn = document.getElementById('credits-modal-close-btn');
			const cancelBtn = document.getElementById('btn-credits-modal-cancel');
			const upgradeBtn = document.getElementById('btn-credits-modal-upgrade');

			const closeModal = () => {
				modal.classList.add('hide');
			};

			closeBtn.addEventListener('click', closeModal);
			cancelBtn.addEventListener('click', closeModal);
			upgradeBtn.addEventListener('click', () => {
				closeModal();
				if (window.setActiveMenu) {
					window.setActiveMenu('pricing', true);
				}
			});

			// Close on overlay click
			modal.addEventListener('click', (e) => {
				if (e.target === modal) {
					closeModal();
				}
			});
		}

		// Update modal dynamic values (gunakan textContent agar aman dari XSS)
		document.getElementById('credits-modal-message').textContent = message;
		document.getElementById('credits-modal-balance').textContent = `${actualRemaining.toLocaleString()} credit(s)`;

		// Show modal
		modal.classList.remove('hide');
	}
})();
