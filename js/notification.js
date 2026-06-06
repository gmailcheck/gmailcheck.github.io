let notificationTimeout = null;

// Inject CSS for Notification System dynamically
(function injectNotificationCSS() {
	if (document.getElementById('notification-css')) return;
	const style = document.createElement('style');
	style.id = 'notification-css';
	style.innerHTML = `
		.notification-bar {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 10px 16px;
			border-radius: 8px;
			background-color: var(--bg-secondary) !important;
			color: var(--text-primary) !important;
			
			
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			border-left: 4px solid transparent;
			animation: slideInDown 0.3s ease-out forwards;
			position: relative;
						pointer-events: auto;
		}
		.notification-bar.type-warning { border-left-color: #ffcc00; }
		.notification-bar.type-danger { border-left-color: #ff6666; }
		.notification-bar.type-success { border-left-color: #66ffd9; }
		
		.notification-close-btn {
			background: transparent;
			border: none;
			color: var(--text-muted);
			
			cursor: pointer;
			margin-left: 12px;
			transition: color 0.2s;
		}
		.notification-close-btn:hover { color: var(--text-sharp); }
		
		@keyframes slideInDown {
			from { transform: translateY(-10px); opacity: 0; }
			to { transform: translateY(0); opacity: 1; }
		}
	`;
	document.head.appendChild(style);
})();

window.showAppNotification = function (type, message, durationMs = null) {
	const container = document.getElementById('notification-container');
	if (!container) return;

	let icon = '';
	let autoCloseTime = durationMs;
	if (autoCloseTime === null) {
		if (type === 'success') autoCloseTime = 4000;      // 4 secs
		else if (type === 'warning') autoCloseTime = 6000; // 6 secs
		else if (type === 'danger') autoCloseTime = 6000;  // 6 secs
	}

	if (type === 'warning') {
		icon = '<i class="fa-solid fa-triangle-exclamation" style="color: var(--text-sharp); margin-right: 12px; flex-shrink: 0;"></i>';
	} else if (type === 'danger') {
		icon = '<i class="fa-solid fa-circle-exclamation" style="color: var(--text-sharp); margin-right: 12px; flex-shrink: 0;"></i>';
	} else if (type === 'success') {
		icon = '<i class="fa-solid fa-circle-check" style="color: var(--text-sharp); margin-right: 12px; flex-shrink: 0;"></i>';
	}

	container.innerHTML = `
		<div class="notification-bar type-${type}">
			<div style="display: flex; align-items: center;">
				${icon}
				<div style="line-height: 1.4;">${message}</div>
			</div>
			<button class="notification-close-btn" onclick="window.clearAppNotification()"><i class="fa-solid fa-times"></i></button>
		</div>
	`;

	if (notificationTimeout) clearTimeout(notificationTimeout);
	if (autoCloseTime > 0) {
		notificationTimeout = setTimeout(() => {
			window.clearAppNotification();
		}, autoCloseTime);
	}
};

window.clearAppNotification = function () {
	const container = document.getElementById('notification-container');
	if (container) container.innerHTML = '';
	if (notificationTimeout) {
		clearTimeout(notificationTimeout);
		notificationTimeout = null;
	}
};

window.requestNotificationPermission = function () {
	if ('Notification' in window) {
		if (Notification.permission === 'default') {
			Notification.requestPermission();
		}
	}
};

window.sendBrowserNotification = function (title, body) {
	if ('Notification' in window && Notification.permission === 'granted') {
		if (document.hidden) {
			try {
				const options = {
					body: body,
					icon: 'https://cdn-icons-png.flaticon.com/512/281/281769.png', // Fallback premium icon
					vibrate: [200, 100, 200],
					requireInteraction: false
				};
				const notif = new Notification(title, options);
				notif.onclick = function (e) {
					e.preventDefault();
					window.focus();
					notif.close();
				};
			} catch (e) {
				console.error("Browser Notification failed to fire:", e);
			}
		}
	}
};

window.playSuccessChime = function () {
	try {
		const AudioContext = window.AudioContext || window.webkitAudioContext;
		if (!AudioContext) throw new Error("AudioContext not supported");
		const context = new AudioContext();

		// Create synthesizers
		const osc1 = context.createOscillator();
		const osc2 = context.createOscillator();
		const gain = context.createGain();

		// High fidelity modern electronic chime frequencies
		osc1.type = 'sine';
		osc1.frequency.setValueAtTime(587.33, context.currentTime); // D5
		osc1.frequency.exponentialRampToValueAtTime(880.00, context.currentTime + 0.15); // A5

		osc2.type = 'triangle';
		osc2.frequency.setValueAtTime(880.00, context.currentTime); // A5
		osc2.frequency.exponentialRampToValueAtTime(1174.66, context.currentTime + 0.15); // D6

		// Gentle gain curve for beautiful fading sustain
		gain.gain.setValueAtTime(0.12, context.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.6);

		osc1.connect(gain);
		osc2.connect(gain);
		gain.connect(context.destination);

		osc1.start();
		osc2.start();
		osc1.stop(context.currentTime + 0.6);
		osc2.stop(context.currentTime + 0.6);
	} catch (e) {
		console.warn("Web Audio API Chime failed, falling back to Audio object:", e);
		try {
			const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');
			audio.volume = 0.3;
			audio.play().catch(() => { });
		} catch (ex) { }
	}
};
