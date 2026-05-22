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
		const savedTheme = localStorage.getItem('app-theme') || 'system';
		themeSelect.value = savedTheme;
		themeSelect.addEventListener('change', (e) => {
			window.setTheme(e.target.value);
		});
	}

	// 5. System theme changes observer
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		const currentTheme = localStorage.getItem('app-theme') || 'system';
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
		sidebarBackdrop.classList.add('show');
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
			sidebarBackdrop.classList.remove('show');
		});

		// Close sidebar on clicking menu or submenu items in mobile/tablet
		sideBar.addEventListener('click', (e) => {
			if (e.target.closest('.menu-item') || e.target.closest('.submenu-item')) {
				const clickedMenu = e.target.closest('.menu-item');
				// Don't close if it is the settings button or has submenu itself
				if (clickedMenu && (clickedMenu.id === 'sidebar-settings-btn' || clickedMenu.classList.contains('has-submenu'))) {
					return;
				}
				sideBar.classList.remove('open');
				sidebarBackdrop.classList.remove('show');
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

	const activeTheme = localStorage.getItem('app-theme') || 'system';
	window.updateThemePopoverUI(activeTheme);

	// 7. BIND AUTHENTICATION & CTA TRIGGERS
	const loginBtn = document.getElementById('btn-login-google');
	if (loginBtn) {
		loginBtn.addEventListener('click', async () => {
			if (window.firebaseAuth && window.firebaseProvider && window.signInWithPopup) {
				try {
					const result = await window.signInWithPopup(window.firebaseAuth, window.firebaseProvider);
					console.log("Logged in successfully:", result.user.email);
					window.showAppNotification('success', `Welcome back, <strong>${result.user.displayName || result.user.email}</strong>!`);
				} catch (error) {
					console.error("Login failed:", error);
					window.showAppNotification('danger', `Login failed: ${error.message}`);
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

	const logoutBtn = document.getElementById('btn-logout');
	if (logoutBtn) {
		logoutBtn.addEventListener('click', async () => {
			if (window.firebaseAuth && window.signOut) {
				if (confirm("Are you sure you want to log out?")) {
					try {
						await window.signOut(window.firebaseAuth);
						console.log("Logged out successfully");
						window.showAppNotification('success', 'Logged out successfully!');
						window.location.href = "/home";
					} catch (error) {
						console.error("Logout failed:", error);
					}
				}
			}
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
				if (confirm("Are you sure you want to log out?")) {
					try {
						await window.signOut(window.firebaseAuth);
						console.log("Logged out successfully");
						window.showAppNotification('success', 'Logged out successfully!');
						window.location.href = "/home";
					} catch (error) {
						console.error("Logout failed:", error);
					}
				}
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
	window.initTextareaLineNumbers('gmail-checker-input', 'line-numbers-app1', 'email-input-container-app1');
	window.initTextareaLineNumbers('gmail-dot-trick-input', 'line-numbers-app2', 'email-input-container-app2');
	window.initTextareaLineNumbers('name-combiner-input', 'line-numbers-app3', 'email-input-container-app3');
	window.initTextareaLineNumbers('notepad-active-content', 'line-numbers-app4', 'email-input-container-app4');
	window.initTextareaLineNumbers('email-extractor-input', 'line-numbers-app5', 'email-input-container-app5');
}

// Start application when DOM is fully prepared
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initApp);
} else {
	initApp();
}
