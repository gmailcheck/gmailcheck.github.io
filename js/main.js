// Load all modules sequentially to build the application
import './notification.js';
import './ui.js';
import './router.js';
import './auth.js';
import './apps/gmail-dot-trick.js';
import './apps/name-combiner.js';
import './apps/gmail-checker.js';
import './apps/notepad.js';
import './apps/email-extractor.js';
import './apps/history.js';
import './pricing.js';
import './dashboard.js';
import './support.js';

// Global Event Listeners and Initialization Bridge
function initApp() {
	// 0. Process pending Firebase User if loaded early
	if (window.pendingFirebaseUser !== undefined) {
		window.applyAuthUIState(window.pendingFirebaseUser);
		delete window.pendingFirebaseUser;
	}

	// 1. Check query redirection from 404.html (SPA routing support)
	const urlParams = new URLSearchParams(window.location.search);
	const redirectPath = urlParams.get('p');
	if (redirectPath !== null) {
		window.history.replaceState(null, '', window.BASE_PATH + redirectPath);
	}

	// 2. Resolve initial active page menu based on URL pathname
	let currentPath = window.location.pathname;
	if (window.BASE_PATH && currentPath.startsWith(window.BASE_PATH)) {
		currentPath = currentPath.slice(window.BASE_PATH.length);
	}
	window.currentActiveMenu = window.getMenuByPath(currentPath);

	// 3. Render initial menu structure
	window.renderMenu();

	// 4. Initialize Settings dropdown
	const themeSelect = document.getElementById('theme-select');
	if (themeSelect) {
		const savedTheme = localStorage.getItem('app-theme') || 'dark';
		themeSelect.value = savedTheme;
		themeSelect.addEventListener('change', (e) => {
			window.setTheme(e.target.value);
		});
	}

	// 5. System theme changes observer
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		const currentTheme = localStorage.getItem('app-theme') || 'dark';
		if (currentTheme === 'system') {
			if (e.matches) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		}
	});

	// Mobile/Tablet Sidebar Drawer Toggle
	const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
	const btnToggleSidebarAnon = document.getElementById('btn-toggle-sidebar-anon');
	const sideBar = document.getElementById('side-bar');
	const sidebarBackdrop = document.getElementById('sidebar-backdrop');

	const toggleSidebar = (e) => {
		e.stopPropagation();
		sideBar.classList.add('open');
		sidebarBackdrop.classList.remove('hide');
	};

	if (sideBar && sidebarBackdrop) {
		if (btnToggleSidebar) {
			btnToggleSidebar.addEventListener('click', toggleSidebar);
		}

		if (btnToggleSidebarAnon) {
			btnToggleSidebarAnon.addEventListener('click', toggleSidebar);
		}

		sidebarBackdrop.addEventListener('click', () => {
			sideBar.classList.remove('open');
			sidebarBackdrop.classList.add('hide');
		});

		// Close sidebar on clicking menu or submenu items in mobile/tablet
		sideBar.addEventListener('click', (e) => {
			if (e.target.closest('.menu-item') || e.target.closest('.submenu-item')) {
				const clickedMenu = e.target.closest('.menu-item');
				// Don't close if it is the settings button, notifications button, or has submenu itself
				if (clickedMenu && (clickedMenu.id === 'sidebar-settings-btn' || clickedMenu.id === 'notif-container' || clickedMenu.classList.contains('has-submenu'))) {
					return;
				}
				sideBar.classList.remove('open');
				sidebarBackdrop.classList.add('hide');
			}
		});
	}

	// 6. Basic settings toggle popover & sidebar accordions
	const settingsBtn = document.getElementById('sidebar-settings-btn');
	const settingsPanel = document.getElementById('settings-panel');
	const themePanelItem = document.getElementById('theme-panel-item');
	const themePopover = document.getElementById('theme-popover');
	const setting1Btn = document.getElementById('setting1-panel-item');
	const setting2Btn = document.getElementById('setting2-panel-item');

	if (settingsBtn && settingsPanel) {
		settingsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			settingsPanel.classList.toggle('show');
		});
	}

	if (setting1Btn && settingsPanel) {
		setting1Btn.addEventListener('click', (e) => {
			e.stopPropagation();
			window.setActiveMenu('setting1');
			settingsPanel.classList.remove('show');
			if (themePopover) themePopover.classList.remove('show');
		});
	}

	if (setting2Btn && settingsPanel) {
		setting2Btn.addEventListener('click', (e) => {
			e.stopPropagation();
			window.setActiveMenu('setting2');
			settingsPanel.classList.remove('show');
			if (themePopover) themePopover.classList.remove('show');
		});
	}

	if (themePanelItem && themePopover) {
		themePanelItem.addEventListener('click', (e) => {
			e.stopPropagation();
			themePopover.classList.toggle('show');
		});
	}

	document.querySelectorAll('.theme-popover-item').forEach(item => {
		item.addEventListener('click', (e) => {
			e.stopPropagation();
			const selectedTheme = item.getAttribute('data-theme');
			window.setTheme(selectedTheme);
			if (themePopover) themePopover.classList.remove('show');
		});
	});

	document.addEventListener('click', (e) => {
		if (settingsPanel && !settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
			settingsPanel.classList.remove('show');
		}
		if (themePopover && !themePanelItem.contains(e.target)) {
			themePopover.classList.remove('show');
		}
	});

	const activeTheme = localStorage.getItem('app-theme') || 'dark';
	window.updateThemePopoverUI(activeTheme);

	// 7. BIND AUTHENTICATION & CTA TRIGGERS
	const loginBtn = document.getElementById('btn-login-google');
	if (loginBtn) {
		loginBtn.addEventListener('click', async () => {
			if (window.firebaseAuth && window.firebaseProvider && window.signInWithPopup) {
				const loginCard = document.getElementById('login-card-content');
				const loginLoading = document.getElementById('login-loading-content');
				if (loginCard && loginLoading) {
					loginCard.classList.add('hide');
					loginLoading.classList.remove('hide');
					const textEl = loginLoading.querySelector('p');
					if (textEl) textEl.textContent = 'Connecting to Google...';
				}
				try {
					const result = await window.signInWithPopup(window.firebaseAuth, window.firebaseProvider);
					console.log("Logged in successfully:", result.user.email);
					window.showAppNotification('success', `Welcome back, <strong>${result.user.displayName || result.user.email}</strong>!`);
				} catch (error) {
					console.error("Login failed:", error);
					window.showAppNotification('danger', `Login failed: ${error.message}`);
					if (loginCard && loginLoading) {
						loginCard.classList.remove('hide');
						loginLoading.classList.add('hide');
						const textEl = loginLoading.querySelector('p');
						if (textEl) textEl.textContent = 'Verifying session...';
					}
				}
			}
		});
	}

	const navGetStartedBtn = document.getElementById('btn-nav-get-started');
	if (navGetStartedBtn) {
		navGetStartedBtn.addEventListener('click', () => {
			window.setActiveMenu('login', true);
		});
	}

	const homeCtaBtn = document.getElementById('btn-home-get-started');
	if (homeCtaBtn) {
		homeCtaBtn.addEventListener('click', () => {
			window.setActiveMenu('login', true);
		});
	}

	// 8. CUSTOM LOGOUT CONFIRMATION MODAL LOGIC
	const logoutModal = document.getElementById('logout-confirm-modal');
	const btnLogoutCancel = document.getElementById('btn-logout-cancel');
	const btnLogoutConfirm = document.getElementById('btn-logout-confirm');

	function showLogoutModal() {
		if (logoutModal) logoutModal.classList.remove('hide');
	}

	function hideLogoutModal() {
		if (logoutModal) logoutModal.classList.add('hide');
	}

	if (btnLogoutCancel) {
		btnLogoutCancel.addEventListener('click', hideLogoutModal);
	}

	if (logoutModal) {
		logoutModal.addEventListener('click', (e) => {
			if (e.target === logoutModal) hideLogoutModal();
		});
	}

	if (btnLogoutConfirm) {
		btnLogoutConfirm.addEventListener('click', async () => {
			hideLogoutModal();
			if (window.firebaseAuth && window.signOut) {
				try {
					await window.signOut(window.firebaseAuth);
					console.log("Logged out successfully");
					window.showAppNotification('success', 'Logged out successfully!');
					window.location.href = "/home";
				} catch (error) {
					console.error("Logout failed:", error);
				}
			}
		});
	}

	const logoutBtn = document.getElementById('btn-logout');
	if (logoutBtn) {
		logoutBtn.addEventListener('click', (e) => {
			e.preventDefault();
			showLogoutModal();
		});
	}

	// Sidebar & logo navigation clicks
	const sidebarLogo = document.getElementById('side-bar-top');
	if (sidebarLogo) {
		sidebarLogo.addEventListener('click', () => {
			window.setActiveMenu('home', true);
		});
	}

	const anonLogo = document.getElementById('anon-logo-btn');
	if (anonLogo) {
		anonLogo.addEventListener('click', () => {
			window.setActiveMenu('home', true);
		});
	}

	const authLogo = document.getElementById('auth-logo-btn');
	if (authLogo) {
		authLogo.addEventListener('click', () => {
			window.setActiveMenu('home', true);
		});
	}

	// Back to App Navigation clicks
	const btnBackToApp = document.getElementById('btn-back-to-app');
	if (btnBackToApp) {
		btnBackToApp.addEventListener('click', () => {
			window.setActiveMenu('app1', true);
		});
	}

	const btnHomeOpenDashboard = document.getElementById('btn-home-open-dashboard');
	if (btnHomeOpenDashboard) {
		btnHomeOpenDashboard.addEventListener('click', () => {
			window.setActiveMenu('app1', true);
		});
	}

	// 9.5 PROMO POPUP MODAL HANDLERS
	const promoModal = document.getElementById('promo-popup-modal');
	const btnPromoClose = document.getElementById('promo-popup-close-btn');
	const btnPromoCancel = document.getElementById('promo-popup-cancel-btn');
	const btnPromoAction = document.getElementById('promo-popup-action-btn');

	const hidePromoModal = () => {
		if (promoModal) promoModal.classList.add('hide');
	};

	if (btnPromoClose) btnPromoClose.addEventListener('click', hidePromoModal);
	if (btnPromoCancel) btnPromoCancel.addEventListener('click', hidePromoModal);
	if (promoModal) {
		promoModal.addEventListener('click', (e) => {
			if (e.target === promoModal) hidePromoModal();
		});
	}

	if (btnPromoAction) {
		btnPromoAction.addEventListener('click', () => {
			hidePromoModal();
			window.setActiveMenu('app1', true);
		});
	}

	// 9. PROFILE POPOVER EVENT HANDLERS
	const profilePopover = document.getElementById('profile-popover');
	const profileTriggerCard = document.getElementById('user-profile-card-trigger');
	const profileTriggerEmail = document.getElementById('user-email-display');
	const profileCloseBtn = document.getElementById('profile-popover-close-btn');

	const toggleProfilePopover = (e) => {
		e.stopPropagation();
		if (profilePopover) {
			profilePopover.classList.toggle('show');
		}
	};

	if (profileTriggerCard) {
		profileTriggerCard.addEventListener('click', toggleProfilePopover);
	}
	if (profileTriggerEmail) {
		profileTriggerEmail.addEventListener('click', toggleProfilePopover);
	}

	if (profileCloseBtn) {
		profileCloseBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			if (profilePopover) profilePopover.classList.remove('show');
		});
	}

	// Prevent click inside popover from closing it
	if (profilePopover) {
		profilePopover.addEventListener('click', (e) => {
			e.stopPropagation();
		});
	}

	// Close when clicking anywhere outside
	document.addEventListener('click', () => {
		if (profilePopover) profilePopover.classList.remove('show');
	});

	// Manage membership click
	const btnManage = document.getElementById('profile-popover-btn-manage');
	if (btnManage) {
		btnManage.addEventListener('click', () => {
			if (profilePopover) profilePopover.classList.remove('show');
			// Route to pricing page
			window.setActiveMenu('pricing', true);
			window.showAppNotification('success', 'Opening Membership & Pricing...');
		});
	}

	// Anonymous Pricing Link click
	const anonLinkPricing = document.getElementById('anon-link-pricing');
	if (anonLinkPricing) {
		anonLinkPricing.addEventListener('click', (e) => {
			e.preventDefault();
			window.setActiveMenu('pricing', true);
		});
	}

	// Switch account click
	const btnSwitch = document.getElementById('profile-popover-btn-switch');
	if (btnSwitch) {
		btnSwitch.addEventListener('click', async () => {
			if (profilePopover) profilePopover.classList.remove('show');
			if (window.firebaseAuth && window.firebaseProvider && window.signInWithPopup) {
				try {
					window.firebaseProvider.setCustomParameters({
						prompt: 'select_account'
					});
					const result = await window.signInWithPopup(window.firebaseAuth, window.firebaseProvider);
					console.log("Switched account successfully:", result.user.email);
					window.showAppNotification('success', `Switched account to <strong>${result.user.displayName || result.user.email}</strong>!`);
				} catch (error) {
					console.error("Account switch failed:", error);
					window.showAppNotification('danger', `Switch failed: ${error.message}`);
				}
			}
		});
	}

	// Logout inside popover
	const btnPopoverLogout = document.getElementById('profile-popover-btn-logout');
	if (btnPopoverLogout) {
		btnPopoverLogout.addEventListener('click', async () => {
			if (profilePopover) profilePopover.classList.remove('show');
			const logoutBtnReal = document.getElementById('btn-logout');
			if (logoutBtnReal) {
				logoutBtnReal.click();
			} else if (window.firebaseAuth && window.signOut) {
				showLogoutModal();
			}
		});
	}

	// 10. Intercept client-side routing links for Terms & Privacy
	document.addEventListener('click', (e) => {
		const targetLink = e.target.closest('a');
		if (targetLink) {
			const href = targetLink.getAttribute('href');
			if (href === '/terms' || href === '/terms-of-service') {
				e.preventDefault();
				if (profilePopover) profilePopover.classList.remove('show');
				window.setActiveMenu('terms', true);
			} else if (href === '/privacy' || href === '/privacy-policy') {
				e.preventDefault();
				if (profilePopover) profilePopover.classList.remove('show');
				window.setActiveMenu('privacy', true);
			} else if (href === '/documentation') {
				e.preventDefault();
				window.setActiveMenu('documentation', true);
			}
		}
	});

	// 8. Initialize Textarea line numbers synchronization
	window.initTextareaLineNumbers('gmail-checker-input', 'line-numbers-app1', 'input-container-container-app1');
	window.initTextareaLineNumbers('gmail-dot-trick-input', 'line-numbers-app2', 'input-container-container-app2');
	window.initTextareaLineNumbers('name-combiner-input', 'line-numbers-app3', 'input-container-container-app3');
	window.initTextareaLineNumbers('notepad-active-content', 'line-numbers-app4', 'input-container-container-app4');
	window.initTextareaLineNumbers('email-extractor-input', 'line-numbers-app5', 'input-container-container-app5');

	// 11. Initialize Settings & Preferences Page UI bindings
	function initPreferencesPage() {
		const prefCompactTable = document.getElementById('pref-compact-table');
		const prefSoundEffects = document.getElementById('pref-sound-effects');
		const prefCreditAlert = document.getElementById('pref-credit-alert');
		const prefWebhookUrl = document.getElementById('pref-webhook-url');
		const prefDebugMode = document.getElementById('pref-debug-mode');

		// Load saved preferences from localStorage (with smart defaults)
		const compactTableActive = localStorage.getItem('gmailChecker_compactTable') === 'true';
		const soundEffectsActive = localStorage.getItem('gmailChecker_soundEffects') !== 'false';
		const creditAlertActive = localStorage.getItem('gmailChecker_creditAlert') === 'true';
		const debugModeActive = localStorage.getItem('gmailChecker_debugMode') === 'true';
		const webhookUrlVal = localStorage.getItem('gmailChecker_webhookUrl') || '';

		// Set initial values to UI
		if (prefCompactTable) {
			prefCompactTable.checked = compactTableActive;
			if (compactTableActive) document.body.classList.add('compact-table');
		}
		if (prefSoundEffects) prefSoundEffects.checked = soundEffectsActive;
		if (prefCreditAlert) prefCreditAlert.checked = creditAlertActive;
		if (prefDebugMode) prefDebugMode.checked = debugModeActive;
		if (prefWebhookUrl) prefWebhookUrl.value = webhookUrlVal;

		// Register switch change listeners
		if (prefCompactTable) {
			prefCompactTable.addEventListener('change', () => {
				const isChecked = prefCompactTable.checked;
				localStorage.setItem('gmailChecker_compactTable', isChecked);
				if (isChecked) {
					document.body.classList.add('compact-table');
				} else {
					document.body.classList.remove('compact-table');
				}
				window.showAppNotification('success', '⚡ <strong>Preferences saved!</strong> Compact Table mode updated.');
			});
		}

		if (prefSoundEffects) {
			prefSoundEffects.addEventListener('change', () => {
				localStorage.setItem('gmailChecker_soundEffects', prefSoundEffects.checked);
				window.showAppNotification('success', '⚡ <strong>Preferences saved!</strong> Chime Notifications updated.');
			});
		}

		if (prefCreditAlert) {
			prefCreditAlert.addEventListener('change', () => {
				localStorage.setItem('gmailChecker_creditAlert', prefCreditAlert.checked);
				window.showAppNotification('success', '⚡ <strong>Preferences saved!</strong> Low Credit alerts updated.');
			});
		}

		if (prefDebugMode) {
			prefDebugMode.addEventListener('change', () => {
				localStorage.setItem('gmailChecker_debugMode', prefDebugMode.checked);
				window.showAppNotification('success', '⚡ <strong>Preferences saved!</strong> Debug Logging mode updated.');
			});
		}

		// Webhook url with smart debounce saving
		if (prefWebhookUrl) {
			let debounceTimeout;
			prefWebhookUrl.addEventListener('input', () => {
				clearTimeout(debounceTimeout);
				debounceTimeout = setTimeout(() => {
					localStorage.setItem('gmailChecker_webhookUrl', prefWebhookUrl.value.trim());
					window.showAppNotification('success', '⚡ <strong>Webhook saved!</strong> URL updated successfully.');
				}, 600);
			});
		}

		// Browser Notification Status Indicator & Request Permission Button
		const notifStatusEl = document.getElementById('pref-notif-permission-status');
		function updateNotifPermissionStatusUI() {
			if (!notifStatusEl) return;
			if (!('Notification' in window)) {
				notifStatusEl.innerHTML = '<span style="color: var(--text-muted); "><i class="fa-solid fa-ban"></i> Not Supported</span>';
				return;
			}

			const status = Notification.permission;
			if (status === 'granted') {
				notifStatusEl.innerHTML = '<span style="background: rgba(102, 255, 217, 0.1); color: #66ffd9; border: 1px solid rgba(102, 255, 217, 0.2); padding: 5px 12px; border-radius: 20px; "><i class="fa-solid fa-circle-check"></i> Enabled</span>';
			} else if (status === 'denied') {
				notifStatusEl.innerHTML = '<span style="background: rgba(255, 77, 77, 0.1); color: #ff6666; border: 1px solid rgba(255, 77, 77, 0.2); padding: 5px 12px; border-radius: 20px; "><i class="fa-solid fa-circle-xmark"></i> Blocked</span>';
			} else { // default
				notifStatusEl.innerHTML = `<button id="btn-request-notif-pref" style="background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.3); color: #00f0ff; border-radius: 8px; padding: 6px 14px; cursor: pointer; transition: all 0.2s;"><i class="fa-solid fa-bell"></i> Request Permission</button>`;

				const btnRequest = document.getElementById('btn-request-notif-pref');
				if (btnRequest) {
					btnRequest.addEventListener('click', () => {
						Notification.requestPermission().then((perm) => {
							updateNotifPermissionStatusUI();
							if (perm === 'granted') {
								window.showAppNotification('success', '🔔 <strong>Notifications Enabled!</strong> You will now receive alerts in the background.');
							} else if (perm === 'denied') {
								window.showAppNotification('danger', '❌ <strong>Notifications Blocked!</strong> Please enable permission in your browser URL settings.');
							}
						});
					});
				}
			}
		}

		updateNotifPermissionStatusUI();
	}

	initPreferencesPage();
}

// Start application when DOM is fully prepared
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initApp);
} else {
	initApp();
}
