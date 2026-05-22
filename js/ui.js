// --- THEME UTILITIES ---
window.applyTheme = function(theme) {
	if (theme === 'dark') {
		document.documentElement.classList.add('dark');
	} else if (theme === 'light') {
		document.documentElement.classList.remove('dark');
	} else {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		if (prefersDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}
}

window.setTheme = function(theme) {
	localStorage.setItem('app-theme', theme);
	window.applyTheme(theme);
	window.updateThemePopoverUI(theme);

	const themeSelect = document.getElementById('theme-select');
	if (themeSelect) {
		themeSelect.value = theme;
	}
}

window.updateThemePopoverUI = function(theme) {
	document.querySelectorAll('.theme-popover-item').forEach(item => {
		const radioIcon = item.querySelector('.radio-icon');
		if (item.getAttribute('data-theme') === theme) {
			item.classList.add('active');
			if (radioIcon) {
				radioIcon.className = 'radio-icon fas fa-circle';
			}
		} else {
			item.classList.remove('active');
			if (radioIcon) {
				radioIcon.className = 'radio-icon far fa-circle';
			}
		}
	});
}

// ========== INPUT LINE NUMBERS ==========
window.initTextareaLineNumbers = function(textareaId, lineNumbersId, containerId) {
	const emailInput = document.getElementById(textareaId);
	const lineNumbers = document.getElementById(lineNumbersId);
	const emailInputContainer = document.getElementById(containerId);

	if (!emailInput || !lineNumbers || !emailInputContainer) return;

	// Pastikan lineNumbers dapat merender \n dengan benar
	lineNumbers.style.whiteSpace = 'pre';

	function inputLineNumbersScroll() {
		lineNumbers.scrollTop = emailInput.scrollTop;
	}

	let currentLinesCount = 0;

	function updateInputLineNumbers() {
		// Menggunakan regex jauh lebih cepat dan hemat memori daripada .split('\n')
		const totalLines = (emailInput.value.match(/\n/g) || []).length + 1;
		
		// Optimasi krusial: Jangan merender ulang DOM jika jumlah baris tidak berubah
		// Ini membuat proses mengetik menjadi instan 0ms lag
		if (totalLines === currentLinesCount) return;
		currentLinesCount = totalLines;

		// Hapus hack style merah 2000 baris
		emailInputContainer.style.cssText = ``;
		lineNumbers.style.cssText = `white-space: pre;`; // Pertahankan white-space
		
		// Render dengan textContent sebagai 1 text node besar.
		// Jauh lebih ringan untuk browser dibandingkan membuat puluhan ribu <div> elements.
		lineNumbers.textContent = Array.from({ length: totalLines }, (_, i) => i + 1).join('\n');
		
		inputLineNumbersScroll();
	}

	emailInput.addEventListener('scroll', inputLineNumbersScroll, { passive: true });
	emailInput.addEventListener('input', updateInputLineNumbers);
	
	// Panggil sekali untuk sinkronisasi awal
	updateInputLineNumbers();
}

// ========== COPY DOCUMENTATION CODE ==========
window.copyDocCode = function(paneId) {
	const pane = document.getElementById(paneId);
	if (!pane) return;

	const pre = pane.querySelector('pre');
	if (!pre) return;

	// Extract content, trim leading/trailing whitespace
	const codeText = pre.textContent || pre.innerText;

	navigator.clipboard.writeText(codeText).then(() => {
		const btn = pane.querySelector('.btn-copy-doc');
		if (!btn) return;

		const originalHtml = btn.innerHTML;
		btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
		btn.style.borderColor = '#00ff88';
		btn.style.color = '#00ff88';
		btn.style.background = 'rgba(0, 255, 136, 0.15)';

		setTimeout(() => {
			btn.innerHTML = originalHtml;
			btn.style.borderColor = '#af86fc';
			btn.style.color = '#af86fc';
			btn.style.background = 'rgba(175, 134, 252, 0.15)';
		}, 2000);
	}).catch(err => {
		console.error('Failed to copy text: ', err);
		if (window.showAppNotification) {
			window.showAppNotification('danger', 'Failed to copy code to clipboard.');
		}
	});
}
