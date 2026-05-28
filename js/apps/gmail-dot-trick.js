(function () {
	const textarea = document.getElementById('gmail-dot-trick-input');
	const inputContainer = document.getElementById('email-input-container-app2');
	const resultsContainer = document.getElementById('results-container-app2');
	const tasksList = document.getElementById('tasks-list-app2');
	const btnBack = document.getElementById('btn-back-app2');
	const btnDownloadAll = document.getElementById('btn-download-all-app2');
	const btnGenerate = document.getElementById('btn-generate-app2');
	const btnAddDomain = document.getElementById('btn-add-domain-app2');
	const btnClear = document.getElementById('btn-clear-app2');
	const btnFix = document.getElementById('btn-fix-app2');
	const btnCopy = document.getElementById('btn-copy-app2');
	const btnDownload = document.getElementById('btn-download-app2');
	const selectModeContainer = document.getElementById('select-mode-container-app2');
	const selectMode = document.getElementById('select-mode-app2');
	const statsInput = document.getElementById('stats-input-app2');
	const statsOutput = document.getElementById('stats-output-app2');

	if (!textarea || !btnGenerate) return;

	// Store all task results in memory (key: email, value: string of variations)
	let taskResults = new Map();
	let isRunning = false;
	let sanitizerWorker = null;

	const basePath = window.BASE_PATH || '';
	const workerPath = (basePath.endsWith('/') ? basePath : basePath + '/') + 'js/apps/sanitizerWorker.js';

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

	// Helper: Parse valid emails
	function getEmailsArray() {
		return textarea.value.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 0);
	}

	const invalidListBox = document.getElementById('invalid-list-app2');

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

	// Task Queue for concurrency management
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

	// Generate Variations (Bulk Dashboard alur)
	btnGenerate.addEventListener('click', function () {
		const emails = getEmailsArray();
		if (emails.length === 0) {
			window.showAppNotification('danger', '<strong>Error:</strong> Please enter at least one email address first!');
			return;
		}

		// Run validation check before execution
		// showList=true: reveal invalid list only when Generate is pressed
		validateInputEmails(true).then(isValid => {
			if (!isValid) return;

			// Send start notification if tab is hidden
			window.sendBrowserNotification("Gmail Dot Trick Started", `Generating variations for ${emails.length.toLocaleString()} email(s)...`);

			// Mode & concurrency setup
			const mode = selectMode.value;
			let maxCombinations = Infinity;
			let concurrency = 3;

			if (mode === 'balance') {
				maxCombinations = 2000000;
				concurrency = 3;
			} else if (mode === 'slow') {
				maxCombinations = 250000;
				concurrency = 1;
			} else { // fast
				maxCombinations = Infinity;
				concurrency = 10;
			}

			// Toggle views
			inputContainer.classList.add('hide');
			resultsContainer.classList.remove('hide');
			tasksList.innerHTML = '';

			// Hide action buttons during process
			btnCopy.classList.add('hide');
			btnDownload.classList.add('hide');
			btnDownloadAll.classList.add('hide');

			taskResults.clear();
			isRunning = true;
			window.clearAppNotification();

			let totalInputEmails = 0;
			let grandTotalVariations = 0;
			let completedTasks = 0;

			const queue = new ConcurrencyQueue(concurrency);

			// Loop through all unique inputs
			const uniqueEmails = [...new Set(emails)];
			totalInputEmails = uniqueEmails.length;
			statsInput.textContent = `${totalInputEmails} email(s)`;
			statsOutput.textContent = '0 variation(s)';

			uniqueEmails.forEach((email, idx) => {
				const parts = email.split('@');
				const username = parts[0].replace(/\./g, '');
				const domain = (parts[1] || '').toLowerCase();

				// Card UI creation
				const card = document.createElement('div');
				card.className = 'task-card';

				const cardId = `task-${idx}`;
				card.id = cardId;

				card.innerHTML = `
					<div class="task-card-header">
						<span class="task-badge">Task #${idx + 1}</span>
						<span class="task-email" title="${email}">${email}</span>
						<span class="task-status" id="${cardId}-status"><i class="fa-solid fa-clock"></i> Pending</span>
					</div>
					<div class="task-progress-container">
						<div class="task-progress-bar" id="${cardId}-progress" style="width: 0%"></div>
					</div>
					<div class="task-card-footer">
						<span class="task-stats" id="${cardId}-stats">In queue...</span>
						<div class="task-actions">
							<button class="task-btn" id="${cardId}-view" disabled><i class="fa-solid fa-eye"></i> View</button>
							<button class="task-btn" id="${cardId}-dl" disabled><i class="fa-solid fa-download"></i> Download</button>
						</div>
					</div>
				`;
				tasksList.appendChild(card);

				// Task execution block
				queue.push((next) => {
					if (!isRunning) {
						next();
						return;
					}

					const statusEl = document.getElementById(`${cardId}-status`);
					const progressEl = document.getElementById(`${cardId}-progress`);
					const statsEl = document.getElementById(`${cardId}-stats`);
					const viewBtn = document.getElementById(`${cardId}-view`);
					const dlBtn = document.getElementById(`${cardId}-dl`);

					if (domain !== 'gmail.com' || username.length === 0) {
						statusEl.innerHTML = '<span style="color: #ff4d4d;"><i class="fa-solid fa-circle-xmark"></i> Invalid</span>';
						statsEl.textContent = 'Not a gmail.com domain';
						completedTasks++;
						next();
						return;
					}

					statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
					statusEl.style.color = '#af86fc';

					const len = username.length;
					// Limit exponent to 30 to avoid 32-bit integer overflow in bitwise shifts
					const maxExponent = Math.min(len - 1, 30);
					const totalPossible = Math.pow(2, maxExponent);
					const totalCombinations = Math.min(totalPossible, maxCombinations);

					// Determine how many characters we actually need to vary to achieve the target combinations
					const safeLen = Math.min(
						len,
						totalCombinations > 1 ? Math.ceil(Math.log2(totalCombinations)) + 1 : 1
					);

					let allVariations = [];
					const chunkLimit = mode === 'fast' ? 50000 : (mode === 'balance' ? 10000 : 2500);
					let currentOffset = 0;
					const startTime = Date.now();

					// Using a Blob Worker to offload heavy string concatenation from the main thread
					// exactly like the original app to handle massive generations smoothly.
					const workerCode = `
						self.onmessage = function(e) {
							const { username, safeLen, domain, currentOffset, chunkLimit, totalCombinations, len } = e.data;
							const nextOffset = Math.min(currentOffset + chunkLimit, totalCombinations);
							const chunk = [];
							for (let i = currentOffset; i < nextOffset; i++) {
								let current = username[0];
								for (let j = 0; j < safeLen - 1; j++) {
									if ((i & (1 << j)) !== 0) {
										current += '.';
									}
									current += username[j + 1];
								}
								if (len > safeLen) {
									current += username.substring(safeLen);
								}
								chunk.push(current + '@' + domain);
							}
							self.postMessage({ chunk, nextOffset });
						};
					`;
					const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
					const worker = new Worker(URL.createObjectURL(workerBlob));

					function processNextChunk() {
						if (!isRunning) {
							worker.terminate();
							next();
							return;
						}
						worker.postMessage({ username, safeLen, domain, currentOffset, chunkLimit, totalCombinations, len });
					}

					worker.onmessage = function (e) {
						const { chunk, nextOffset } = e.data;

						// Push elements efficiently
						for (let i = 0; i < chunk.length; i++) {
							allVariations.push(chunk[i]);
						}

						currentOffset = nextOffset;
						const progress = Math.min(100, Math.round((currentOffset / totalCombinations) * 100));
						const durationSec = (Date.now() - startTime) / 1000 || 0.001;
						const speed = Math.round(currentOffset / durationSec);

						// Update progress UI
						progressEl.style.width = `${progress}%`;
						statsEl.textContent = `${currentOffset.toLocaleString()} / ${totalCombinations.toLocaleString()} variations (${speed.toLocaleString()}/s)`;

						if (currentOffset < totalCombinations) {
							processNextChunk();
						} else {
							worker.terminate();
							// Task complete
							statusEl.innerHTML = '<span style="color: #66ffd9;"><i class="fa-solid fa-check-circle"></i> Completed</span>';
							statsEl.textContent = `Successfully generated ${totalCombinations.toLocaleString()} variations!`;

							const finalResultText = allVariations.join('\n');
							taskResults.set(email, finalResultText);
							grandTotalVariations += totalCombinations;
							statsOutput.textContent = `${grandTotalVariations.toLocaleString()} variation(s)`;

							// Create local blob URL for View & Download buttons
							const blob = new Blob([finalResultText], { type: 'text/plain' });
							const blobUrl = URL.createObjectURL(blob);

							viewBtn.disabled = false;
							viewBtn.addEventListener('click', () => {
								window.open(blobUrl, '_blank');
							});

							dlBtn.disabled = false;
							dlBtn.addEventListener('click', () => {
								const a = document.createElement('a');
								a.href = blobUrl;
								a.download = `gmail-dot-${email}.txt`;
								document.body.appendChild(a);
								a.click();
								document.body.removeChild(a);
							});

							completedTasks++;

							// If all tasks completed, display all action buttons
							if (completedTasks === totalInputEmails) {
								selectModeContainer.classList.add('hide');
								btnGenerate.classList.add('hide');
								btnClear.classList.add('hide');
								btnAddDomain.classList.add('hide');
								btnCopy.classList.remove('hide');
								btnDownload.classList.remove('hide');
								btnDownloadAll.classList.remove('hide');

								window.showAppNotification('success', `<strong>Generation Completed:</strong> Successfully processed <strong>${totalInputEmails} task(s)</strong> with <strong>${grandTotalVariations.toLocaleString()} total variations</strong>!`);

								// Play premium chime sound if enabled
								if (localStorage.getItem('gmailChecker_soundEffects') !== 'false' && typeof window.playSuccessChime === 'function') {
									window.playSuccessChime();
								}

								// Send finished system notification
								window.sendBrowserNotification("Gmail Dot Trick Completed", `Successfully generated ${grandTotalVariations.toLocaleString()} variations!`);

								// Save to premium offline IndexedDB History
								if (window.saveHistoryEntry) {
									const allCombinedText = Array.from(taskResults.values()).join('\n');
									window.saveHistoryEntry('app2', 'Gmail Dot Tricks', grandTotalVariations, allCombinedText, 'variations');
								}
							}

							next();
						}
					}

					processNextChunk();
				});
			});
		});
	});

	// Back / Reset button
	btnBack.addEventListener('click', function () {
		isRunning = false;
		resultsContainer.classList.add('hide');
		inputContainer.classList.remove('hide');

		taskResults.clear();

		statsInput.textContent = '0 email(s)';
		statsOutput.textContent = '0 variation(s)';

		// Hide action buttons
		btnCopy.classList.add('hide');
		btnDownload.classList.add('hide');
		btnDownloadAll.classList.add('hide');
		selectModeContainer.classList.remove('hide');
		btnGenerate.classList.remove('hide');
		btnClear.classList.remove('hide');
		btnAddDomain.classList.remove('hide');

		window.clearAppNotification();
		textarea.dispatchEvent(new Event('input'));
	});

	// Copy all results combined
	btnCopy.addEventListener('click', function () {
		if (taskResults.size === 0) return;
		const allCombinedText = Array.from(taskResults.values()).join('\n');

		navigator.clipboard.writeText(allCombinedText).then(() => {
			const originalHTML = btnCopy.innerHTML;
			btnCopy.innerHTML = '<i class="fa-solid fa-check" style="color: #66ffd9;"></i> Copied!';
			btnCopy.style.borderColor = '#00cccc';
			setTimeout(() => {
				btnCopy.innerHTML = originalHTML;
				btnCopy.style.borderColor = '';
			}, 2000);
		});
	});

	// Download all results combined as single TXT
	btnDownload.addEventListener('click', function () {
		if (taskResults.size === 0) return;
		const allCombinedText = Array.from(taskResults.values()).join('\n');
		const blob = new Blob([allCombinedText], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		const date = new Date();
		a.download = `gmail-dot-combined-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	});

	// Download all results as beautiful ZIP file using JSZip
	btnDownloadAll.addEventListener('click', function () {
		if (taskResults.size === 0) return;

		btnDownloadAll.disabled = true;
		const originalHTML = btnDownloadAll.innerHTML;
		btnDownloadAll.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Zipping...';

		loadJSZip(() => {
			const zip = new JSZip();
			taskResults.forEach((content, email) => {
				zip.file(`gmail-dot-${email}.txt`, content);
			});

			zip.generateAsync({ type: 'blob' }).then(content => {
				const url = URL.createObjectURL(content);
				const a = document.createElement('a');
				a.href = url;
				const date = new Date();
				a.download = `gmail-dot-tricks-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.zip`;
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
