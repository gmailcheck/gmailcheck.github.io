(function () {
	const textarea = document.getElementById('name-combiner-input');
	const inputContainer = document.getElementById('input-container-container-app3');
	const resultsContainer = document.getElementById('results-container-app3');
	const tasksList = document.getElementById('tasks-list-app3');
	const backBtnWrapper = document.getElementById('back-btn-wrapper-app3');
	const btnBack = document.getElementById('btn-back-app3');
	const app3Instruction = document.getElementById('app3-instruction');
	const btnGenerate = document.getElementById('btn-generate-app3');
	const btnClear = document.getElementById('btn-clear-app3');
	const btnFix = document.getElementById('btn-fix-app3');
	const btnCopy = document.getElementById('btn-copy-app3');
	const btnDownload = document.getElementById('btn-download-app3');
	const btnDownloadAll = document.getElementById('btn-download-all-app3');
	const selectMode = document.getElementById('select-mode-app3');
	const statsInput = document.getElementById('stats-input-app3');
	const statsOutput = document.getElementById('stats-output-app3');

	if (!textarea || !btnGenerate) return;

	let combinationsBuffer = [];
	let isRunning = false;
	let workerInstance = null;

	// Dynamic script loading for JSZip (shared helper)
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

	// Helper: TitleCase formatting
	function toTitleCase(str) {
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	}

	// Helper: Parse words
	function getWordsArray() {
		return textarea.value.trim().split(/\s+/).filter(word => word.length > 0);
	}

	// Validation: Duplicates & Invalid characters
	function validateInputNames() {
		const words = getWordsArray();

		if (words.length === 0) {
			window.clearAppNotification();
			btnFix.classList.add('hide');
			statsInput.textContent = '0 name(s)';
			return true;
		}

		let invalidCount = 0;
		let duplicateCount = 0;
		const seen = new Set();

		words.forEach(word => {
			// Clean non-alphabetic
			const clean = word.replace(/[^a-zA-Z]/g, '');
			if (clean.length > 0) {
				const lower = clean.toLowerCase();
				if (seen.has(lower)) {
					duplicateCount++;
				} else {
					seen.add(lower);
				}
			}

			if (/[^a-zA-Z]/.test(word)) {
				invalidCount++;
			}
		});

		statsInput.textContent = `${words.length} name(s)`;

		if (invalidCount > 0 || duplicateCount > 0) {
			let msg = '<strong>Validation Warning:</strong> ';
			if (duplicateCount > 0 && invalidCount > 0) {
				msg += `Found <strong>${duplicateCount} duplicate name(s)</strong> and <strong>${invalidCount} word(s) with non-alphabetic characters</strong>.`;
			} else if (duplicateCount > 0) {
				msg += `Found <strong>${duplicateCount} duplicate name(s)</strong>.`;
			} else {
				msg += `Found <strong>${invalidCount} word(s) with non-alphabetic characters</strong>.`;
			}
			msg += ' Use the "Quick Fix" button below to resolve immediately.';

			window.showAppNotification('warning', msg);
			btnFix.classList.remove('hide');
			return false;
		} else {
			window.clearAppNotification();
			btnFix.classList.add('hide');
			return true;
		}
	}

	let typingTimer;
	const doneTypingInterval = 1500; // 1.5 seconds idle

	function formatSpacesToNewlines() {
		const currentVal = textarea.value;
		if (currentVal.includes(' ')) {
			// Replace any space or sequence of spaces with a single newline
			textarea.value = currentVal.replace(/[ ]+/g, '\n');
			textarea.dispatchEvent(new Event('input'));
		}
	}

	// Tombol space menjadi Enter
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
		statsInput.textContent = `${getWordsArray().length} name(s)`;
		clearTimeout(typingTimer);
		typingTimer = setTimeout(formatSpacesToNewlines, doneTypingInterval);
	});

	textarea.addEventListener('blur', () => {
		clearTimeout(typingTimer);
		formatSpacesToNewlines();
		statsInput.textContent = `${getWordsArray().length} name(s)`;
	});

	// Clear Input button
	btnClear.addEventListener('click', function () {
		textarea.value = '';
		textarea.dispatchEvent(new Event('input'));
		window.clearAppNotification();
		btnFix.classList.add('hide');
		btnCopy.classList.add('hide');
		btnDownload.classList.add('hide');
		btnDownloadAll.classList.add('hide');
	});

	// Quick Fix Issues button
	btnFix.addEventListener('click', function () {
		const words = getWordsArray();
		const cleanWords = [];
		const seen = new Set();
		let fixedCount = 0;

		words.forEach(word => {
			const clean = word.replace(/[^a-zA-Z]/g, '');
			if (clean.length > 0) {
				const lower = clean.toLowerCase();
				if (!seen.has(lower)) {
					seen.add(lower);
					cleanWords.push(toTitleCase(clean));
				} else {
					fixedCount++;
				}
			} else {
				fixedCount++;
			}
		});

		textarea.value = cleanWords.join('\n');
		textarea.dispatchEvent(new Event('input'));

		window.showAppNotification('success', `<strong>Quick Fix Completed:</strong> Cleaned inputs! Formatted to TitleCase and removed <strong>${fixedCount} invalid/duplicate</strong> name(s).`);
		btnFix.classList.add('hide');
	});

	// Inline Web Worker Code as string
	const workerCode = `
	self.onmessage=function(t){
		const e=t.data.names,o=t.data.chunkSize,s=t.data.delay,n=e.length,a=n*(n-1);
		let l=0;
		const r=Array.from({length:a},((t,e)=>e));
		for(let t=r.length-1;t>0;t--){
			const e=Math.floor(Math.random()*(t+1));
			[r[t],r[e]]=[r[e],r[t]]
		}
		function f(t){
			let e=Math.floor(t/(n-1)),o=t%(n-1);
			return o>=e&&o++,[e,o]
		}
		!function t(){
			const n=[];
			for(let t=0;t<o&&l<a;t++){
				const t=r[l],[o,s]=f(t);
				n.push(e[o]+" "+e[s]),l++
			}
			const c=l/a;
			self.postMessage({chunk:n,progress:c}),l<a?setTimeout(t,s):self.postMessage({done:!0,finalProgress:1})
		}()
	};
	`;

	// Generate Variations (Fisher-Yates Worker alur)
	btnGenerate.addEventListener('click', function () {
		const words = getWordsArray();
		if (words.length === 0) {
			window.showAppNotification('danger', '<strong>Error:</strong> Please enter some names first!');
			return;
		}

		// Run validation check before execution
		const isValid = validateInputNames();
		if (!isValid) return;

		// Send start notification if tab is hidden
		window.sendBrowserNotification("Name Combiner Started", `Permuting ${words.length.toLocaleString()} names in the background...`);

		// Strict validation: clean up names
		const uniqueCleanNames = [];
		const seen = new Set();
		words.forEach(word => {
			const clean = word.replace(/[^a-zA-Z]/g, '');
			if (clean.length > 0) {
				const lower = clean.toLowerCase();
				if (!seen.has(lower)) {
					seen.add(lower);
					uniqueCleanNames.push(toTitleCase(clean));
				}
			}
		});

		if (uniqueCleanNames.length < 3) {
			window.showAppNotification('danger', '<strong>Error:</strong> Please enter at least three unique alphabetic names!');
			return;
		}

		// Check for unresolved warnings before generating
		const hasWarning = document.querySelector('.notification-bar.type-warning');
		if (hasWarning) {
			if (!confirm('Warning: Your input contains duplicate names or invalid characters. Do you want to auto-fix and generate?')) {
				return;
			}
			btnFix.click(); // Auto-fix
		}

		const mode = selectMode.value;
		const totalCombinations = uniqueCleanNames.length * (uniqueCleanNames.length - 1);

		// Apply limits based on mode
		let maxCombinations = Infinity;
		if (mode === 'balance') {
			maxCombinations = 1000000;
		} else if (mode === 'slow') {
			maxCombinations = 100000;
		}

		const finalCombinationsCount = Math.min(totalCombinations, maxCombinations);

		// UI Transition to Dashboard
		inputContainer.classList.add('hide');
		resultsContainer.classList.remove('hide');
		tasksList.innerHTML = '';

		btnCopy.classList.add('hide');
		btnDownload.classList.add('hide');
		btnDownloadAll.classList.add('hide');
		backBtnWrapper.classList.remove('hide');
		app3Instruction.classList.add('hide');

		combinationsBuffer = [];
		isRunning = true;
		window.clearAppNotification();

		statsInput.textContent = `${uniqueCleanNames.length} name(s)`;
		statsOutput.textContent = '0 variation(s)';

		// Create dynamic Task Card
		const cardId = 'task-combiner-card';
		const card = document.createElement('div');
		card.className = 'task-card';
		card.id = cardId;
		card.innerHTML = `
			<div class="task-card-header">
				<span class="task-badge">Task #1</span>
				<span class="task-email" title="Name Combiner Engine">Fisher-Yates Permutator Engine</span>
				<span class="task-status" id="${cardId}-status"><i class="fa-solid fa-spinner fa-spin"></i> Initializing...</span>
			</div>
			<div class="task-progress-container">
				<div class="task-progress-bar" id="${cardId}-progress" style="width: 0%"></div>
			</div>
			<div class="task-card-footer">
				<span class="task-stats" id="${cardId}-stats">Preparing name list...</span>
				<div class="task-actions">
					<button class="task-btn" id="${cardId}-view" disabled><i class="fa-solid fa-eye"></i> View</button>
					<button class="task-btn" id="${cardId}-dl" disabled><i class="fa-solid fa-download"></i> Download</button>
				</div>
			</div>
		`;
		tasksList.appendChild(card);

		const statusEl = document.getElementById(`${cardId}-status`);
		const progressEl = document.getElementById(`${cardId}-progress`);
		const statsEl = document.getElementById(`${cardId}-stats`);
		const viewBtn = document.getElementById(`${cardId}-view`);
		const dlBtn = document.getElementById(`${cardId}-dl`);

		// Calculate chunk parameters
		let chunkSize = Math.ceil(0.025 * finalCombinationsCount);
		chunkSize = Math.max(100, Math.min(50000, chunkSize));
		let delay = 0;

		if (mode === 'balance') {
			delay = chunkSize >= 25000 ? 150 : 50;
		} else if (mode === 'slow') {
			delay = chunkSize >= 25000 ? 300 : 150;
		}

		statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Permuting...';
		statusEl.style.color = '#af86fc';

		if (tasksList) {
			tasksList.scrollTo({
				top: tasksList.scrollHeight,
				behavior: 'smooth'
			});
		}

		// Start Web Worker
		const blob = new Blob([workerCode], { type: 'application/javascript' });
		const workerURL = URL.createObjectURL(blob);
		workerInstance = new Worker(workerURL);

		const startTime = Date.now();

		workerInstance.postMessage({
			names: uniqueCleanNames,
			chunkSize: chunkSize,
			delay: delay
		});

		workerInstance.onmessage = function (e) {
			if (!isRunning) {
				workerInstance.terminate();
				return;
			}

			if (e.data.chunk && e.data.chunk.length > 0) {
				// Apply hard mode limit if needed
				if (combinationsBuffer.length < finalCombinationsCount) {
					const remaining = finalCombinationsCount - combinationsBuffer.length;
					const chunkToAdd = e.data.chunk.slice(0, remaining);
					combinationsBuffer = combinationsBuffer.concat(chunkToAdd);
				}

				const progress = Math.min(100, Math.round((combinationsBuffer.length / finalCombinationsCount) * 100));
				const durationSec = (Date.now() - startTime) / 1000 || 0.001;
				const speed = Math.round(combinationsBuffer.length / durationSec);

				// Update card UI
				progressEl.style.width = `${progress}%`;
				statsEl.textContent = `${combinationsBuffer.length.toLocaleString()} / ${finalCombinationsCount.toLocaleString()} combinations (${speed.toLocaleString()}/s)`;
				statsOutput.textContent = `${combinationsBuffer.length.toLocaleString()} variation(s)`;

				if (tasksList) {
					tasksList.scrollTo({
						top: tasksList.scrollHeight,
						behavior: 'smooth'
					});
				}

				if (combinationsBuffer.length >= finalCombinationsCount) {
					// Exceeded limit: stop early
					triggerDone();
				}
			}

			if (e.data.done) {
				triggerDone();
			}
		};

		workerInstance.onerror = function (err) {
			console.error("Worker error:", err);
			statusEl.innerHTML = '<span style="color: #ff4d4d;"><i class="fa-solid fa-circle-xmark"></i> Failed</span>';
			statsEl.textContent = 'Engine error occurred.';
			workerInstance.terminate();
		};

		function triggerDone() {
			if (workerInstance) {
				workerInstance.terminate();
				workerInstance = null;
			}

			statusEl.innerHTML = '<span style="color: #66ffd9;"><i class="fa-solid fa-check-circle"></i> Completed</span>';
			statsEl.textContent = `Successfully generated ${combinationsBuffer.length.toLocaleString()} combinations!`;

			const finalResultText = combinationsBuffer.join('\n');
			if (window.saveHistoryEntry) {
				window.saveHistoryEntry('app3', 'Name Combiner', combinationsBuffer.length, finalResultText, 'variations');
			}
			const resultBlob = new Blob([finalResultText], { type: 'text/plain;charset=utf-8' });
			const resultBlobUrl = URL.createObjectURL(resultBlob);

			viewBtn.disabled = false;
			viewBtn.addEventListener('click', () => {
				window.open(resultBlobUrl, '_blank');
			});

			dlBtn.disabled = false;
			dlBtn.addEventListener('click', () => {
				const a = document.createElement('a');
				a.href = resultBlobUrl;
				a.download = `name-combine-variations.txt`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
			});

			// Enable global sidebar action buttons
			btnGenerate.classList.add('hide');
			btnClear.classList.add('hide');
			btnCopy.classList.remove('hide');
			btnDownload.classList.remove('hide');

			// Only show ZIP split download button if size > 100,000 combinations
			if (combinationsBuffer.length > 100000) {
				btnDownloadAll.classList.remove('hide');
			}

			window.showAppNotification('success', `<strong>Generation Completed:</strong> Successfully permuted <strong>${uniqueCleanNames.length} names</strong> into <strong>${combinationsBuffer.length.toLocaleString()} combinations</strong>!`);

			// Play premium chime sound if enabled
			if (localStorage.getItem('gmailChecker_soundEffects') !== 'false' && typeof window.playSuccessChime === 'function') {
				window.playSuccessChime();
			}

			// Send finished system notification
			window.sendBrowserNotification("Name Combiner Completed", `Successfully generated ${combinationsBuffer.length.toLocaleString()} combinations!`);
		}
	});

	// Back / Reset button
	btnBack.addEventListener('click', function () {
		isRunning = false;
		if (workerInstance) {
			workerInstance.terminate();
			workerInstance = null;
		}
		resultsContainer.classList.add('hide');
		inputContainer.classList.remove('hide');

		combinationsBuffer = [];

		statsInput.textContent = '0 name(s)';
		statsOutput.textContent = '0 variation(s)';

		btnCopy.classList.add('hide');
		btnDownload.classList.add('hide');
		btnDownloadAll.classList.add('hide');
		btnGenerate.classList.remove('hide');
		btnClear.classList.remove('hide');
		backBtnWrapper.classList.add('hide');
		app3Instruction.classList.remove('hide');

		window.clearAppNotification();
		textarea.dispatchEvent(new Event('input'));
	});

	// Copy all results
	btnCopy.addEventListener('click', function () {
		if (combinationsBuffer.length === 0) return;
		const allCombinedText = combinationsBuffer.join('\n');

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

	// Download as single TXT file
	btnDownload.addEventListener('click', function () {
		if (combinationsBuffer.length === 0) return;
		const allCombinedText = combinationsBuffer.join('\n');
		const blob = new Blob([allCombinedText], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		const date = new Date();
		a.download = `name-combine-combined-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	});

	// Split Download as beautiful ZIP (using JSZip)
	btnDownloadAll.addEventListener('click', function () {
		if (combinationsBuffer.length === 0) return;

		btnDownloadAll.disabled = true;
		const originalHTML = btnDownloadAll.innerHTML;
		btnDownloadAll.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Zipping...';

		loadJSZip(() => {
			const zip = new JSZip();
			const chunkSize = 100000;
			const totalParts = Math.ceil(combinationsBuffer.length / chunkSize);

			for (let i = 0; i < totalParts; i++) {
				const chunk = combinationsBuffer.slice(i * chunkSize, (i + 1) * chunkSize);
				const partContent = chunk.join('\n');
				zip.file(`part${i + 1}_of_${totalParts}_name_combine.txt`, partContent);
			}

			zip.generateAsync({ type: 'blob' }).then(content => {
				const url = URL.createObjectURL(content);
				const a = document.createElement('a');
				a.href = url;
				const date = new Date();
				a.download = `name-combine-parts-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.zip`;
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
