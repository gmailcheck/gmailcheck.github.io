(function () {
	const body = document.body;
	const textarea = document.getElementById('gmail-checker-input');
	const inputContainer = document.getElementById('input-container-container-app1');
	const resultsContainer = document.getElementById('results-container-app1');
	const tasksList = document.getElementById('tasks-list-app1');
	const backBtnWrapper = document.getElementById('back-btn-wrapper-app1');
	const btnBack = document.getElementById('btn-back-app1');
	const app1Instruction = document.getElementById('app1-instruction');
	const btnExecute = document.getElementById('btn-execute-app1');
	const stopBtn = document.getElementById('btn-stop-app1');
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
	const statsInputLabel = document.getElementById('stats-input-label-app1');
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
	let verificationStartTime = null;
	let timerInterval = null;

	function startTimer() {
		verificationStartTime = Date.now();
		const elapsedSpan = document.getElementById('progress-elapsed');
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			const elapsedMs = Date.now() - verificationStartTime;
			const totalSecs = Math.floor(elapsedMs / 1000);
			const mins = Math.floor(totalSecs / 60);
			const secs = totalSecs % 60;
			const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
			if (elapsedSpan) {
				elapsedSpan.textContent = timeStr;
			}
		}, 1000);
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function clearTasksList() {
		// Hapus event listener scroll
		if (tasksList._virtualScrollHandler) {
			tasksList.removeEventListener('scroll', tasksList._virtualScrollHandler);
			tasksList._virtualScrollHandler = null;
		}
		// Hapus timer yang sedang berjalan
		if (tasksList._scrollTimer) {
			clearTimeout(tasksList._scrollTimer);
			tasksList._scrollTimer = null;
		}
		// Hapus ResizeObserver jika ada
		if (tasksList._resizeObserver) {
			tasksList._resizeObserver.disconnect();
			tasksList._resizeObserver = null;
		}
		// Kosongkan HTML
		tasksList.innerHTML = '';
	}

	function makeElementDraggable(el, handleSelector) {
		let startX = 0, startY = 0;
		let offsetX = 0, offsetY = 0;
		let isDragging = false;

		const handle = el.querySelector(handleSelector) || el;

		el.resetDragPosition = function () {
			offsetX = 0;
			offsetY = 0;
			el.style.transform = '';
			el.style.animation = '';
			el.style.left = '';
			el.style.top = '';
			el.style.bottom = '';
			el.style.right = '';
		};

		handle.addEventListener('mousedown', dragStart);
		handle.addEventListener('touchstart', dragStart, { passive: false });

		function dragStart(e) {
			if (!el.classList.contains('gc-minimized')) return;
			if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) {
				return;
			}

			isDragging = true;
			el.style.animation = 'none'; // Prevent CSS animation override on transform

			const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
			const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

			startX = clientX - offsetX;
			startY = clientY - offsetY;

			document.addEventListener('mousemove', drag);
			document.addEventListener('mouseup', dragEnd);
			document.addEventListener('touchmove', drag, { passive: false });
			document.addEventListener('touchend', dragEnd);

			handle.style.cursor = 'grabbing';
			if (e.type === 'touchstart') {
				e.preventDefault();
			}
		}

		function drag(e) {
			if (!isDragging) return;

			const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
			const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

			let nextX = clientX - startX;
			let nextY = clientY - startY;

			const rect = el.getBoundingClientRect();
			const vw = window.innerWidth;
			const vh = window.innerHeight;

			// Calculate bounds based on initial placement
			const initialLeft = rect.left - offsetX;
			const initialTop = rect.top - offsetY;

			const minX = -initialLeft;
			const maxX = vw - rect.width - initialLeft;
			const minY = -initialTop;
			const maxY = vh - rect.height - initialTop;

			offsetX = Math.max(minX, Math.min(nextX, maxX));
			offsetY = Math.max(minY, Math.min(nextY, maxY));

			el.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;

			if (e.type === 'touchmove') {
				e.preventDefault();
			}
		}

		function dragEnd() {
			isDragging = false;
			document.removeEventListener('mousemove', drag);
			document.removeEventListener('mouseup', dragEnd);
			document.removeEventListener('touchmove', drag);
			document.removeEventListener('touchend', dragEnd);

			handle.style.cursor = 'grab';
		}
	}

	function showProgressOverlay() {
		if (!document.getElementById('progress-overlay-styles')) {
			const style = document.createElement('style');
			style.id = 'progress-overlay-styles';
			style.innerHTML = `
				@keyframes progressFadeIn {
					from { opacity: 0; }
					to { opacity: 1; }
				}
				@keyframes progressPulseGlow {
					0% { box-shadow: 0 10px 40px -10px rgba(175, 134, 252, 0.2); }
					50% { box-shadow: 0 10px 50px 0px rgba(0, 255, 255, 0.3); }
					100% { box-shadow: 0 10px 40px -10px rgba(175, 134, 252, 0.2); }
				}
				@keyframes progressMiniPulseGlow {
					0% { box-shadow: 0 0 10px rgba(255, 208, 0, 0.5); }
					50% { box-shadow: 0 0 20px rgba(255, 208, 0, 0.8); }
					100% { box-shadow: 0 0 10px rgba(255, 208, 0, 0.5); }
				}
				@keyframes progressSpin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}
				@keyframes progressDotPulse {
					0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 8px #00ffff; }
					50% { opacity: 0.4; transform: scale(0.8); box-shadow: 0 0 2px #00ffff; }
				}
				@keyframes gcMiniFadeIn {
					from { opacity: 0; transform: translateY(20px); }
					to { opacity: 1; transform: translateY(0); }
				}

				/* ===== FULL OVERLAY MODE ===== */
				.gc-overlay-glass {
					position: absolute; width: 100%; height: 100%; top: 0; left: 0;
					display: flex; flex-direction: column; align-items: center; justify-content: center;
					z-index: 999; animation: progressFadeIn 0.4s ease forwards;
					background: rgba(10, 10, 15, 0.65);
					backdrop-filter: blur(10px);
					-webkit-backdrop-filter: blur(10px);
					pointer-events: auto;
				}
				.gc-overlay-glass.gc-minimized {
					position: fixed;
					width: auto; height: auto;
					top: auto; left: auto;
					bottom: 24px; right: 24px;
					background: none;
					backdrop-filter: none;
					-webkit-backdrop-filter: none;
					align-items: flex-end;
					justify-content: flex-end;
					animation: gcMiniFadeIn 0.3s ease forwards;
					z-index: 9999;
				}
				.gc-overlay-glass.gc-minimized .gc-modal-card {
					display: none;
				}
				.gc-mini-bar {
					display: none;
				}
				.gc-overlay-glass.gc-minimized .gc-mini-bar {
					display: flex;
					flex-direction: column;
					gap: 8px;
					background: linear-gradient(145deg, rgba(20, 20, 35, 0.97), rgba(10, 10, 20, 0.99));
					border: 1px solid rgba(255, 255, 255, 0.1);
					border-radius: 16px;
					padding: 12px 16px;
					min-width: 280px;
					max-width: 340px;
					pointer-events: auto;
					animation: progressMiniPulseGlow 3s infinite ease-in-out;
					cursor: grab;
					user-select: none;
				}

				/* Mini bar header */
				.gc-mini-header {
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 10px;
				}
				.gc-mini-title {
					display: flex;
					align-items: center;
					gap: 8px;
					font-size: 0.78rem;
					font-weight: 600;
					color: #c0c0d0;
					letter-spacing: 0.5px;
				}
				.gc-mini-dot {
					width: 7px; height: 7px; border-radius: 50%; background: #00ffff;
					animation: progressDotPulse 1.5s infinite ease-in-out;
					flex-shrink: 0;
				}
				.gc-mini-actions {
					display: flex;
					align-items: center;
					gap: 6px;
				}
				.gc-btn-mini-maximize, .gc-btn-mini-stop {
					background: transparent;
					border: 1px solid rgba(255,255,255,0.12);
					border-radius: 8px;
					color: #a0a0b8;
					cursor: pointer;
					width: 28px; height: 28px;
					display: flex; align-items: center; justify-content: center;
					font-size: 0.75rem;
					transition: all 0.15s ease;
					flex-shrink: 0;
				}
				.gc-btn-mini-maximize:hover {
					background: rgba(175, 134, 252, 0.15);
					border-color: rgba(175, 134, 252, 0.4);
					color: #af86fc;
				}
				.gc-btn-mini-stop {
					border-color: rgba(255, 77, 77, 0.25);
					color: #ff7777;
				}
				.gc-btn-mini-stop:hover {
					background: rgba(255, 77, 77, 0.15);
					border-color: rgba(255, 77, 77, 0.5);
					color: #ff4444;
				}

				/* Mini progress track */
				.gc-mini-progress-track {
					width: 100%;
					height: 5px;
					background: rgba(255, 255, 255, 0.06);
					border-radius: 100px;
					overflow: hidden;
				}
				.gc-mini-progress-fill {
					height: 100%;
					width: 0%;
					border-radius: 100px;
					background: linear-gradient(90deg, #af86fc, #00ffff);
					transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
					box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
				}

				/* Mini info row */
				.gc-mini-info {
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 8px;
				}
				.gc-mini-status-text {
					font-size: 0.72rem;
					color: #707090;
					flex: 1;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.gc-mini-pct {
					font-size: 0.82rem;
					font-weight: 700;
					background: linear-gradient(90deg, #af86fc, #00ffff);
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					flex-shrink: 0;
				}

				/* ===== FULL MODAL CARD ===== */
				.gc-modal-card {
					position: relative; min-width: 280px; display: flex; flex-direction: column;
					align-items: center; justify-content: center; padding: 40px 30px;
					background: linear-gradient(145deg, rgba(30, 30, 45, 0.95), rgba(15, 15, 20, 0.98));
					border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px;
					animation: progressPulseGlow 3s infinite ease-in-out;
				}
				.gc-btn-minimize {
					position: absolute;
					top: 14px; right: 14px;
					background: rgba(255,255,255,0.05);
					border: 1px solid rgba(255,255,255,0.1);
					border-radius: 8px;
					color: #707090;
					cursor: pointer;
					width: 30px; height: 30px;
					display: flex; align-items: center; justify-content: center;
					font-size: 0.8rem;
					transition: all 0.15s ease;
				}
				.gc-btn-minimize:hover {
					background: rgba(175, 134, 252, 0.15);
					border-color: rgba(175, 134, 252, 0.4);
					color: #af86fc;
				}
				.gc-ring-wrapper {
					position: relative; width: 150px; height: 150px; display: flex;
					align-items: center; justify-content: center; margin-bottom: 28px;
				}
				.gc-modal-card #btn-stop-app1 {
					position: relative;
					margin-top: 24px;
					background: linear-gradient(135deg, #ff4d4d 0%, #cc0000 100%);
					border: 1px solid rgba(255, 255, 255, 0.15);
					box-shadow: 0 4px 15px rgba(255, 77, 77, 0.4);
					color: #ffffff;
					padding: 10px 24px;
					font-size: 0.9rem;
					font-weight: 600;
					border-radius: 20px;
					cursor: pointer;
					display: flex !important;
					align-items: center;
					gap: 8px;
					transition: all 0.2s ease-in-out;
					pointer-events: auto;
				}
				.gc-modal-card #btn-stop-app1 .inline-style-gen-4 { color: #ffffff; }
				.gc-modal-card #btn-stop-app1:hover {
					background: linear-gradient(135deg, #ff6666 0%, #e60000 100%);
					box-shadow: 0 6px 20px rgba(255, 77, 77, 0.6);
					transform: scale(1.05);
				}
				.gc-modal-card #btn-stop-app1:active { transform: scale(0.95); }
				.gc-modal-card #btn-stop-app1.hide { display: none !important; }
				.gc-spin-dashed {
					position: absolute; width: 166px; height: 166px; border-radius: 50%;
					border: 2px dashed rgba(175, 134, 252, 0.3);
					animation: progressSpin 15s linear infinite; pointer-events: none;
				}
				.gc-text-center {
					position: absolute; top: 0; left: 0; width: 100%; height: 100%;
					display: flex; flex-direction: column; align-items: center; justify-content: center;
				}
				.gc-percent {
					font-size: 2.2rem; font-weight: 800; line-height: 1;
					background: linear-gradient(90deg, #af86fc, #00ffff);
					-webkit-background-clip: text; -webkit-text-fill-color: transparent;
					filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
				}
				.gc-fraction {
					font-size: 0.85rem; color: #a0a0b0; margin-top: 6px; font-weight: 500;
					letter-spacing: 1px;
				}
				.gc-status-pill {
					font-size: 0.9rem; color: #e0e0e0; font-weight: 500; text-align: center;
					background: rgba(255, 255, 255, 0.03); padding: 8px 20px;
					border-radius: 30px; border: 1px solid rgba(255, 255, 255, 0.06);
					display: flex; align-items: center; gap: 10px;
					box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);
				}
				.gc-status-dot {
					width: 8px; height: 8px; border-radius: 50%; background: #00ffff;
					animation: progressDotPulse 1.5s infinite ease-in-out;
				}
			`;
			document.head.appendChild(style);
		}

		let overlay = document.getElementById('gmail-checker-progress-overlay');
		if (!overlay) {
			overlay = document.createElement('div');
			overlay.id = 'gmail-checker-progress-overlay';
			overlay.className = 'gc-overlay-glass';

			overlay.innerHTML = `
				<div class="gc-modal-card">
					<button class="gc-btn-minimize" id="gc-btn-minimize" title="Minimize">
						<i class="fa-solid fa-minus"></i>
					</button>
					<div class="gc-ring-wrapper">
						<div class="gc-spin-dashed"></div>
						<svg data-rds-skip="true" viewBox="0 0 140 140" style="width: 150px; height: 150px; transform: rotate(-90deg); overflow: visible;">
							<circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255, 255, 255, 0.03)" stroke-width="8" />
							<circle id="progress-circle-bar" cx="70" cy="70" r="60"
								fill="none" stroke="url(#progress-grad)" stroke-width="8"
								stroke-dasharray="376.991" stroke-dashoffset="376.991"
								stroke-linecap="round" filter="url(#progress-shadow)"
								style="transition: stroke-dashoffset 0.4s cubic-bezier(0.4, 0, 0.2, 1);" />
							<defs>
								<linearGradient id="progress-grad" x1="0%" y1="0%" x2="100%" y2="100%">
									<stop offset="0%" stop-color="#af86fc" />
									<stop offset="100%" stop-color="#00ffff" />
								</linearGradient>
								<filter id="progress-shadow" x="-20%" y="-20%" width="140%" height="140%">
									<feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#00ffff" flood-opacity="0.5"/>
								</filter>
							</defs>
						</svg>
						<div class="gc-text-center">
							<span id="progress-percentage" class="gc-percent">0%</span>
							<span id="progress-fraction" class="gc-fraction">0 / 0</span>
							<span id="progress-elapsed" style="font-size: 0.875rem; color: var(--text-muted); display: block; margin-top: 4px; font-family: monospace;">00:00</span>
						</div>
					</div>
					<div class="gc-status-pill">
						<div class="gc-status-dot"></div>
						<span id="progress-status-text">Preparing...</span>
					</div>
				</div>
				<div class="gc-mini-bar">
					<div class="gc-mini-header">
						<div class="gc-mini-title">
							<div class="gc-mini-dot"></div>
							Gmail Checker
						</div>
						<div class="gc-mini-actions">
							<button class="gc-btn-mini-maximize" id="gc-btn-maximize" title="Maximize">
								<i class="fa-solid fa-expand"></i>
							</button>
							<button class="gc-btn-mini-stop" id="gc-btn-mini-stop" title="Stop">
								<i class="fa-solid fa-stop"></i>
							</button>
						</div>
					</div>
					<div class="gc-mini-progress-track">
						<div class="gc-mini-progress-fill" id="gc-mini-fill"></div>
					</div>
					<div class="gc-mini-info">
						<span class="gc-mini-status-text" id="gc-mini-status">Preparing...</span>
						<span class="gc-mini-pct" id="gc-mini-pct">0%</span>
					</div>
				</div>
			`;
			document.body.appendChild(overlay);

			makeElementDraggable(overlay, '.gc-mini-bar');

			// Tombol minimize
			overlay.querySelector('#gc-btn-minimize').addEventListener('click', () => {
				overlay.classList.add('gc-minimized');
				if (typeof overlay.resetDragPosition === 'function') {
					overlay.resetDragPosition();
				}
				// Pindahkan stopBtn kembali ke .controls
				const btnAddDomain = document.getElementById('btn-add-domain-app1');
				if (btnAddDomain && btnAddDomain.parentNode && stopBtn) {
					btnAddDomain.parentNode.insertBefore(stopBtn, btnAddDomain);
				}
			});

			// Tombol maximize (kembali ke full)
			overlay.querySelector('#gc-btn-maximize').addEventListener('click', () => {
				overlay.classList.remove('gc-minimized');
				if (typeof overlay.resetDragPosition === 'function') {
					overlay.resetDragPosition();
				}
				// Pindahkan stopBtn kembali ke .gc-modal-card
				const modalCard = overlay.querySelector('.gc-modal-card');
				if (modalCard && stopBtn) {
					modalCard.appendChild(stopBtn);
				}
			});

			// Tombol stop di mini bar — trigger klik ke stop button asli
			overlay.querySelector('#gc-btn-mini-stop').addEventListener('click', () => {
				const realStop = document.getElementById('btn-stop-app1');
				if (realStop) realStop.click();
			});
		}

		// Pastikan kembali ke mode full saat overlay ditampilkan ulang
		overlay.classList.remove('gc-minimized');
		if (typeof overlay.resetDragPosition === 'function') {
			overlay.resetDragPosition();
		}

		// Pindahkan #btn-stop-app1 ke paling bawah di dalam .gc-modal-card
		const modalCard = overlay.querySelector('.gc-modal-card');
		if (modalCard && stopBtn) {
			modalCard.appendChild(stopBtn);
		}
	}

	function updateProgressOverlay(percentage, completed, total, statusText) {
		const circleBar = document.getElementById('progress-circle-bar');
		const pctSpan = document.getElementById('progress-percentage');
		const fractionSpan = document.getElementById('progress-fraction');
		const statusTextDiv = document.getElementById('progress-status-text');

		if (circleBar) {
			const circumference = 376.991;
			const offset = circumference - (percentage / 100) * circumference;
			circleBar.setAttribute('stroke-dashoffset', offset);
			circleBar.style.strokeDashoffset = String(offset);
		}
		if (pctSpan) pctSpan.textContent = `${Math.round(percentage)}%`;
		if (fractionSpan) fractionSpan.textContent = `${completed} / ${total}`;
		if (statusTextDiv && statusText) statusTextDiv.innerHTML = statusText;

		// Sync mini bar
		const miniFill = document.getElementById('gc-mini-fill');
		const miniPct = document.getElementById('gc-mini-pct');
		const miniStatus = document.getElementById('gc-mini-status');
		if (miniFill) miniFill.style.width = `${Math.min(100, Math.round(percentage))}%`;
		if (miniPct) miniPct.textContent = `${Math.round(percentage)}%`;
		if (miniStatus && statusText) miniStatus.textContent = statusText.replace(/<[^>]*>/g, '');
	}


	function hideProgressOverlay() {
		const overlay = document.getElementById('gmail-checker-progress-overlay');
		if (overlay) {
			// Kembalikan #btn-stop-app1 ke posisi semula
			if (stopBtn) {
				const btnAddDomain = document.getElementById('btn-add-domain-app1');
				if (btnAddDomain && btnAddDomain.parentNode) {
					btnAddDomain.parentNode.insertBefore(stopBtn, btnAddDomain);
				} else {
					document.body.appendChild(stopBtn);
				}
				stopBtn.classList.add('hide');
			}
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

		// Update description text dynamically
		const descEl = document.getElementById('select-server-desc-app1');
		if (descEl) {
			let descText = '';
			if (server === 'fastFreeServer') {
				descText = '250 emails / batch';
			} else if (server === 'deepFreeServer') {
				descText = '100 emails / batch';
			} else if (server === 'fastServer') {
				descText = '500 emails / batch';
			} else if (server === 'deepServer') {
				descText = '250 emails / batch';
			} else if (server === 'fastTurboServer') {
				descText = '1000 emails / batch' + (!isProUltra ? '<br>free 5x/day for free user.' : '');
			} else if (server === 'deepTurboServer') {
				descText = '500 emails / batch' + (!isProUltra ? '<br>free 5x/day for free user.' : '');
			}
			descEl.innerHTML = descText;
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

	// --- HELPER: MENUNGGU WEBSOCKET SYNC ---
	function waitForProfileSync(timeoutMs = 60000) {
		return new Promise((resolve) => {
			const interval = 100; // Cek setiap 100ms
			let elapsed = 0;

			const check = setInterval(() => {
				// Tanda data WS sudah asli masuk: Ada property 'email' di dalam object
				if (typeof window.refreshRealtimeProfile === 'function') {
					window.refreshRealtimeProfile();
				}
				if (window.dashboardProfile && window.dashboardProfile.email) {
					clearInterval(check);
					resolve(true);
				}
				elapsed += interval;
				if (elapsed >= timeoutMs) {
					clearInterval(check);
					resolve(false); // Timeout (Internet lemot/WS gagal)
				}
			}, interval);
		});
	}

	// --- HELPER: MENDAPATKAN TOTAL KREDIT YANG AKURAT (STRICT MODE) ---
	function getAccurateAvailableCredits() {
		// Pastikan objectnya bukan cuma {} kosong, harus ada .email (bukti dari WS)
		if (window.dashboardProfile && window.dashboardProfile.email) {
			const profile = window.dashboardProfile;
			let plan = profile.subscription_plan || 'none';
			const expiry = profile.subscription_expiry || 0;
			if (plan !== 'none' && expiry < Date.now()) plan = 'none';

			let dailyCredits = 0;
			const isSubActive = plan !== 'none' && plan !== 'free';
			if (plan === 'pro_subs') dailyCredits = profile.pro_subs_credits || 0;
			else if (plan === 'ultra_subs') dailyCredits = profile.ultra_subs_credits || 0;
			else if (plan === 'special_subs') dailyCredits = profile.special_credits || 0;

			// Strict ambil angkanya, jangan fallback ke 0 kalau undef supaya ketahuan errornya
			const freeCredits = profile.free_credits !== undefined ? profile.free_credits : 0;
			const apiCredits = profile.api_credits !== undefined ? profile.api_credits : (profile.api_quota || 0);

			return freeCredits + dailyCredits + apiCredits;
		}

		return null; // Data belum siap
	}

	// --- FUNGSI SENTRAL UNTUK MENGAKHIRI PROSES (CLEANUP & SAVE) ---
	function finalizeExecution(endReason, customMsg = '', remainingCredits = 0) {
		stopTimer();
		isRunning = false;

		// Sembunyikan progress dan kembalikan tombol
		hideProgressOverlay();
		stopBtn.classList.add('hide');
		backBtnWrapper.classList.remove('hide');
		btnExecute.classList.add('hide');
		btnAddDomain.classList.add('hide');
		btnClear.classList.add('hide');

		// Tampilkan tombol download jika ada hasil
		if (results.length > 0) {
			btnCopy.classList.remove('hide');
			btnDownload.classList.remove('hide');
			if (results.length > 50) btnDownloadAll.classList.remove('hide');
			updateDownloadButtonsLabels();
		}

		// Auto switch ke 'All' filter
		currentFilter = 'all';
		filterButtons.forEach(b => { if (b) b.classList.remove('active'); });
		if (filterAll) filterAll.classList.add('active');
		renderResultsList(true);

		// Tampilkan Notifikasi sesuai alasan berhentinya proses
		if (endReason === 'success') {
			window.showAppNotification('success', `<strong>Verification Completed:</strong> Successfully processed <strong>${results.length.toLocaleString()} email(s)</strong>!`);
			if (localStorage.getItem('gmailChecker_soundEffects') !== 'false' && typeof window.playSuccessChime === 'function') {
				window.playSuccessChime();
			}
			window.sendBrowserNotification("Gmail Checker Completed", `Successfully verified ${results.length.toLocaleString()} email(s)!`);
		}
		else if (endReason === 'aborted') {
			window.showAppNotification('danger', '<strong>Cancelled:</strong> Verification process was stopped by user.');
		}
		else if (endReason === 'credits_empty') {
			inputContainer.classList.add('hide'); // Pastikan UI input tertutup jika error mid-way
			showInsufficientCreditsModal(customMsg || 'You do not have enough credits to perform this request.', remainingCredits);
			window.showAppNotification('warning', '<strong>Paused:</strong> Process stopped due to insufficient credits.');
		}
		else if (endReason === 'error') {
			window.showAppNotification('danger', `<strong>Error:</strong> ${customMsg || 'An unexpected error occurred.'}`);
		}

		if (typeof window.refreshRealtimeProfile === 'function') {
			window.refreshRealtimeProfile();
		}

		// Simpan History APAPUN hasilnya (selama ada results yang diproses)
		saveUnifiedHistory();
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
		const chunkSize = selected === 'fastFreeServer' ? 250
			: selected === 'deepFreeServer' ? 100
				: selected === 'fastServer' ? 500
					: selected === 'deepServer' ? 250
						: selected === 'fastTurboServer' ? 1000
							: selected === 'deepTurboServer' ? 500
								: 250;

		// ------------------------------------------------------------------
		// [PRE-FLIGHT CHECK] TUNGGU DATA & CEK KREDIT (PRO UX)
		// ------------------------------------------------------------------
		// Beri efek loading di tombol Execute jika data belum siap
		const originalBtnHtml = btnExecute.innerHTML;
		if (!window.dashboardProfile || !window.dashboardProfile.email) {
			btnExecute.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
			btnExecute.disabled = true;
		}

		// Tunggu sampai WebSocket ngirim data profile (Max 5 detik)
		const isSynced = await waitForProfileSync();

		// Kembalikan tombol ke keadaan semula
		btnExecute.innerHTML = originalBtnHtml;
		btnExecute.disabled = false;

		if (!isSynced) {
			window.showAppNotification('danger', '<strong>Connection Error:</strong> Failed to sync profile data with server. Please refresh the page.');
			return; // STOP Eksekusi
		}

		// Cek batas Turbo Check harian (khusus free user)
		const isTurbo = selected === 'fastTurboServer' || selected === 'deepTurboServer';
		if (isTurbo) {
			const profile = window.dashboardProfile || {};
			const isPaid = (profile.subscription_plan && profile.subscription_plan !== 'free' && profile.subscription_plan !== 'none' && profile.subscription_expiry > Date.now()) || profile.role === 'admin';
			if (!isPaid) {
				const turboLimit = profile.turbo_limit !== undefined ? profile.turbo_limit : 5;
				const turboUsage = profile.turbo_usage !== undefined ? profile.turbo_usage : 0;
				if (turboLimit !== null && turboUsage >= turboLimit) {
					window.showAppNotification('danger', 'Daily Turbo has been used 5 times. Upgrade plan for unlimited Turbo checks.');
					return; // STOP Eksekusi
				}
			}
		}

		// Ambil angka kredit yang dijamin sudah 100% akurat
		const totalAvailableCredits = getAccurateAvailableCredits();

		// Jika total email LEBIH BESAR dari total kredit
		if (totalAvailableCredits !== null && cleanedEmails.length > totalAvailableCredits) {
			const errorMsg = `Insufficient Credits: You are trying to verify ${cleanedEmails.length.toLocaleString()} emails, but you only have ${totalAvailableCredits.toLocaleString()} credits available. Please upgrade your plan or buy more credits.`;

			// Langsung tampilkan modal tanpa memulai proses checking!
			showInsufficientCreditsModal(errorMsg, totalAvailableCredits);

			// Kembalikan tombol fix/warning jika ada
			const hasWarning = document.querySelector('.notification-bar.type-warning');
			if (hasWarning && btnFix) btnFix.classList.remove('hide');

			return; // STOP EKSEKUSI DI SINI
		}
		// ------------------------------------------------------------------

		const chunks = [];
		for (let i = 0; i < cleanedEmails.length; i += chunkSize) {
			chunks.push(cleanedEmails.slice(i, i + chunkSize));
		}

		// UI transitions
		inputContainer.classList.add('hide');
		resultsContainer.classList.remove('hide');
		selectServerContainer.classList.add('hide');
		backBtnWrapper.classList.add('hide');
		btnExecute.classList.add('hide');
		btnClear.classList.add('hide');
		btnAddDomain.classList.add('hide');
		stopBtn.classList.remove('hide');
		btnCopy.classList.add('hide');
		btnDownload.classList.add('hide');
		btnDownloadAll.classList.add('hide');
		app1Instruction.classList.add('hide');

		isRunning = true;
		abortController = new AbortController();
		results = [];
		clearTasksList();
		window.clearAppNotification();
		showProgressOverlay();
		startTimer();
		updateProgressOverlay(0, 0, cleanedEmails.length, `Preparing verification of ${cleanedEmails.length} email(s)...`);

		if (statsInputLabel) {
			statsInputLabel.innerHTML = '<i class="fa-solid fa-envelope m-r-4"></i> Output:';
		}
		statsInput.textContent = `0 email(s)`;
		updateCounters();
		renderResultsList();

		let completedChunks = 0;
		let idToken = '';
		try { idToken = await window.getAuthToken(); } catch (e) { console.error("Auth Token failed:", e); }

		if (isTurbo && !idToken) {
			window.showAppNotification('danger', '<strong>Login Required:</strong> Silakan login terlebih dahulu untuk menggunakan fitur Turbo Check.');
			finalizeExecution('error', 'Login required for Turbo Check');
			return;
		}

		// API endpoint resolution
		let endpoint = 'free-fastcheck';
		if (selected === 'fastFreeServer') endpoint = idToken ? 'auth-free-fastcheck' : 'free-fastcheck';
		else if (selected === 'fastServer') endpoint = idToken ? 'auth-fastcheck' : 'fastcheck';
		else if (selected === 'deepFreeServer') endpoint = idToken ? 'auth-free-deepcheck' : 'free-deepcheck';
		else if (selected === 'deepServer') endpoint = idToken ? 'auth-deepcheck' : 'deepcheck';
		else if (selected === 'fastTurboServer') endpoint = idToken ? 'auth-turbo-fastcheck' : 'turbo-fastcheck';
		else if (selected === 'deepTurboServer') endpoint = idToken ? 'auth-turbo-deepcheck' : 'turbo-deepcheck';
		const requestUrl = `${SERVER_URL}/${endpoint}`;

		const maxRetries = isProUltra ? 5 : 3;
		const retryDelay = 1000;

		// Setup Variable untuk melacak hasil akhir proses
		let endReason = 'success';
		let customErrorMsg = '';
		let remainingForModal = 0;
		let didIncrementTurbo = false;

		try {
			if (isTurbo) {
				const turboRes = await fetch(window.API.TURBO_INCREMENT, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${idToken}`
					},
					body: JSON.stringify({ count: 1 })
				});
				if (!turboRes.ok) {
					const errBody = await turboRes.json().catch(() => ({}));
					throw new Error(errBody.message || errBody.error || `Failed to increment Turbo Check usage (status ${turboRes.status})`);
				}
				didIncrementTurbo = true;
			}

			for (let index = 0; index < chunks.length; index++) {
				if (!isRunning) {
					endReason = 'aborted';
					break;
				}

				const chunk = chunks[index];
				let chunkSuccess = false;
				let chunkResults = null;

				for (let attempt = 0; attempt < maxRetries; attempt++) {
					if (!isRunning) break;

					const currentPercent = (completedChunks / chunks.length) * 100;
					const completedEmails = completedChunks * chunkSize;
					updateProgressOverlay(
						currentPercent, completedEmails, cleanedEmails.length,
						`Verifying email ${completedEmails + 1} - ${Math.min(completedEmails + chunk.length, cleanedEmails.length)} of ${cleanedEmails.length}... (Attempt ${attempt + 1}/${maxRetries})`
					);

					try {
						const headers = { 'Content-Type': 'application/json' };
						if (idToken) {
							// Proactively refresh token if expired/near expiry
							try {
								idToken = await window.getAuthToken();
							} catch (e) {
								console.error("Auth Token refresh failed before request:", e);
							}
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
							if (response.status === 401) {
								console.warn("[WARN] Auth token expired (401). Attempting to force refresh token...");
								try {
									idToken = await window.refreshAuthToken(true);
								} catch (tokenErr) {
									console.error("[ERROR] Failed to force refresh token:", tokenErr);
								}
								throw new Error("Auth failed: Token expired. Token has been refreshed, retrying chunk...");
							}

							if (response.status === 402) {
								let errData = {};
								try { errData = await response.json(); } catch (e) { }
								const msg = errData.message || 'You do not have enough credits.';
								const remain = msg ? parseInt(msg.match(/have (\d+) remaining/)?.[1] || 0) : 0;

								// LEMPAR ERROR KHUSUS agar loop berhenti langsung masuk catch utama
								throw new Error(`CREDIT_EXHAUSTED|${msg}|${remain}`);
							}

							// Error selain 401 & 402
							let errorMsg = `Server returned ${response.status}`;
							try {
								const errData = await response.json();
								if (errData && errData.error) errorMsg = `Server error: ${errData.error}`;
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
							let status = (item.status).toLowerCase();
							if (isFastServer) {
								if (status === 'failed') {
									status = 'failed';
								} else {
									status = (status === 'live' || status === 'good') ? 'good' : 'bad';
								}
							} else {
								const allowed = ['live', 'verify', 'disabled', 'unregistered', 'failed'];
								if (!allowed.includes(status)) status = 'failed';
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
						// Deteksi jika Abort/Kredit Habis, langsung BREAK tanpa retry
						if (err.name === 'AbortError' || err.message === 'Aborted') {
							throw err; // Lempar ke catch utama
						}
						if (err.message.startsWith('CREDIT_EXHAUSTED')) {
							throw err; // Lempar ke catch utama
						}

						console.warn(`[RETRY] Batch #${index + 1} Attempt ${attempt + 1}/${maxRetries} failed:`, err.message);
						if (attempt < maxRetries - 1 && isRunning) {
							await new Promise(resolve => setTimeout(resolve, retryDelay));
						}
					}
				}

				// Memasukkan hasil chunk ke global results
				if (chunkSuccess && chunkResults) {
					results.push(...chunkResults);
				} else if (isRunning) {
					chunk.forEach(email => {
						results.push({ email: email, status: 'failed', details: 'API Connection Error' });
					});
				}

				completedChunks++;
				updateCounters();
				renderResultsList(true);

				// ------------------------------------------------------------------
				// PAKSA REFRESH PROFIL PER CHUNK
				// ------------------------------------------------------------------
				if (typeof window.refreshRealtimeProfile === 'function') {
					window.refreshRealtimeProfile();
				}

				const newPercent = (completedChunks / chunks.length) * 100;
				const verifiedCount = Math.min(completedChunks * chunkSize, cleanedEmails.length);
				updateProgressOverlay(
					newPercent, verifiedCount, cleanedEmails.length,
					`Verifying... (Processed ${verifiedCount}/${cleanedEmails.length} emails)`
				);
			}

		} catch (err) {
			// --- PENANGANAN ERROR GLOBAL PROSES ---
			if (err.name === 'AbortError' || err.message === 'Aborted') {
				endReason = 'aborted';
			} else if (err.message.startsWith('CREDIT_EXHAUSTED')) {
				endReason = 'credits_empty';
				const parts = err.message.split('|');
				customErrorMsg = parts[1];
				remainingForModal = parseInt(parts[2], 10);
			} else {
				endReason = 'error';
				customErrorMsg = err.message;
				console.error("Execute Check Error:", err);
			}
		} finally {
			if (isTurbo && didIncrementTurbo && (endReason === 'aborted' || results.length === 0)) {
				try {
					await fetch(window.API.TURBO_REFUND, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${idToken}`
						},
						body: JSON.stringify({ count: 1 })
					});
				} catch (refundErr) {
					console.error("Failed to refund Turbo Check usage:", refundErr);
				}
			}
			// proses selesai semua, user klik stop, error jaringan, atau credit habis.
			finalizeExecution(endReason, customErrorMsg, remainingForModal);
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

			// Calculate duration
			const elapsedMs = verificationStartTime ? (Date.now() - verificationStartTime) : 0;
			const totalSecs = Math.floor(elapsedMs / 1000);
			let durationText = '';
			if (totalSecs < 60) {
				durationText = `${totalSecs}s`;
			} else {
				const mins = Math.floor(totalSecs / 60);
				const secs = totalSecs % 60;
				durationText = `${mins}m ${secs}s`;
			}

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
				server: selectedServer,
				duration: durationText,
				creditsUsed: filteredResults.length
			});

			if (history.length > 50) history.pop();
			localStorage.setItem(histKey, JSON.stringify(history));

			// Save to premium offline IndexedDB History
			if (window.saveHistoryEntry) {
				window.saveHistoryEntry('app1', 'Gmail Checker', filteredResults.length, contentText, 'emails', {
					server: selectedServer,
					duration: durationText,
					creditsUsed: filteredResults.length
				});
			}
		} catch (e) {
			console.error("Unified history persist error:", e);
		}
	}

	// Stop/Cancel Verification handler
	stopBtn.addEventListener('click', function () {
		if (!isRunning) return;
		isRunning = false;

		if (statsInputLabel) {
			statsInputLabel.innerHTML = '<i class="fa-solid fa-envelope m-r-4"></i> Input:';
		}
		if (statsInput) {
			statsInput.textContent = `${getEmailsArray().length} email(s)`;
		}

		// Abort controller akan otomatis men-trigger catch "AbortError" di loop btnExecute
		if (abortController) {
			abortController.abort();
		}
	});


	// Back/Reset button
	btnBack.addEventListener('click', function () {
		isRunning = false;
		stopTimer();

		if (abortController) abortController.abort();

		hideProgressOverlay();
		resultsContainer.classList.add('hide');
		inputContainer.classList.remove('hide');

		results = [];
		clearTasksList();

		if (statsInputLabel) {
			statsInputLabel.innerHTML = '<i class="fa-solid fa-envelope m-r-4"></i> Input:';
		}
		statsInput.textContent = `${getEmailsArray().length} email(s)`;
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
		backBtnWrapper.classList.add('hide');
		app1Instruction.classList.remove('hide');

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

		if (isRunning && statsInput) {
			statsInput.textContent = `${all} email(s)`;
		}

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
			clearTasksList();
			return;
		}

		// Bersihkan listener dan timer sebelum render ulang
		if (tasksList._virtualScrollHandler) {
			tasksList.removeEventListener('scroll', tasksList._virtualScrollHandler);
			tasksList._virtualScrollHandler = null;
		}
		if (tasksList._scrollTimer) {
			clearTimeout(tasksList._scrollTimer);
			tasksList._scrollTimer = null;
		}
		if (tasksList._resizeObserver) {
			tasksList._resizeObserver.disconnect();
			tasksList._resizeObserver = null;
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

		const ITEM_HEIGHT_REM = 3.25; // 2.75rem height + 0.5rem margin
		const OVERSCAN = 15;

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
				itemRow.style.height = `2.75rem`; // Balanced height for vertical stack on the right
				itemRow.style.padding = '0 0.875rem';
				itemRow.style.display = 'flex';
				itemRow.style.flexDirection = 'row';
				itemRow.style.justifyContent = 'space-between';
				itemRow.style.alignItems = 'center';
				itemRow.style.boxSizing = 'border-box';
				itemRow.style.margin = '0 0 0.5rem 0'; // Bottom margin for gap
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
					<div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; margin-right: 12px;">
						<span style="color: var(--text-muted); font-size: 0.85rem; flex-shrink: 0;">#${i + 1}</span>
						<span style="color: var(--text-sharp); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; font-size: 0.9rem;">${escapeHTML(item.email)}</span>
					</div>
					<div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: center; flex-shrink: 0; line-height: 1.25;">
						<span style="color: ${color}; display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; font-weight: 600;">${icon} ${escapeHTML(item.status.toUpperCase())}</span>
						${item.details ? `<span style="color: var(--text-muted); font-size: 0.72rem;" title="${escapeHTML(item.details)}">${escapeHTML(item.details)}</span>` : ''}
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
			// Gunakan timer global yang diletakkan di object tasksList
			if (tasksList._scrollTimer) clearTimeout(tasksList._scrollTimer);
			tasksList._scrollTimer = setTimeout(displayResults, 30); // Debounce
		};

		tasksList.addEventListener('scroll', tasksList._virtualScrollHandler, { passive: true });

		if (window.ResizeObserver) {
			tasksList._resizeObserver = new ResizeObserver(() => {
				if (tasksList._scrollTimer) clearTimeout(tasksList._scrollTimer);
				tasksList._scrollTimer = setTimeout(displayResults, 30);
			});
			tasksList._resizeObserver.observe(tasksList);
		}

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
			const statuses = ['live', 'good', 'verify', 'disabled', 'unregistered', 'bad'];
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
		// Gunakan angka dari backend jika ada, tapi selalu validasi dengan perhitungan Frontend
		let actualRemaining = remainingCredits || 0;
		const calcCredits = getAccurateAvailableCredits();

		// Jika frontend berhasil menghitung kredit, timpa angka backend (Karena Frontend menjumlahkan API + Harian)
		if (calcCredits !== null) {
			actualRemaining = calcCredits;
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
						<span id="credits-modal-balance" style="color: #ff6666; background: rgba(255, 102, 102, 0.1); padding: 4px 10px; border-radius: 8px;"></span>
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
