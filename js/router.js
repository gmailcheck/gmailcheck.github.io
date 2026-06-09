window.BASE_PATH = '';

// Default Sidebar Modes
window.sidebarMode = 'dashboard'; // 'dashboard' or 'developer'

// Developer Center Sub-menu Items
window.developerMenuItems = [
	{ id: 'dev-keys', name: 'Manage API Keys', icon: 'fas fa-key', pageLabel: 'Manage API Keys' },
	{ id: 'dev-create', name: 'Create API Key', icon: 'fas fa-plus-square', pageLabel: 'Create API Key' },
	{ id: 'dev-stats', name: 'Stats', icon: 'fas fa-chart-bar', pageLabel: 'API Usage Stats' },
	{ id: 'dev-credits', name: 'Credits', icon: 'fas fa-coins', pageLabel: 'API Credits' },
	{ id: 'dev-add', name: 'Buy Credits', icon: 'fas fa-shopping-cart', pageLabel: 'Buy Credits' },
	{ id: 'dev-purchases', name: 'Purchase History', icon: 'fas fa-file-invoice-dollar', pageLabel: 'Purchase History' }
];

// Documentation Sub-menu Items
window.documentationMenuItems = [
	{ id: 'doc-payments', name: 'Billing & Payments', icon: 'fas fa-credit-card', pageLabel: 'Docs: Billing & Payments' },
	{ id: 'doc-api-key', name: 'Developer API Key', icon: 'fas fa-key', pageLabel: 'Docs: Developer API Key' },
	{ id: 'doc-gmail-checker', name: 'Gmail Checker', icon: 'fas fa-envelope', pageLabel: 'Docs: Gmail Checker' },
	{ id: 'doc-dot-tricks', name: 'Gmail Dot Tricks', icon: 'fas fa-wand-magic-sparkles', pageLabel: 'Docs: Gmail Dot Tricks' },
	{ id: 'doc-name-combiner', name: 'Name Combiner', icon: 'fas fa-shuffle', pageLabel: 'Docs: Name Combiner' },
	{ id: 'doc-email-extractor', name: 'Email Extractor', icon: 'fas fa-filter', pageLabel: 'Docs: Email Extractor' },
	{ id: 'doc-notepad', name: 'Notepad', icon: 'fas fa-notes-medical', pageLabel: 'Docs: Notepad' },
	{ id: 'doc-history', name: 'History', icon: 'fas fa-clock-rotate-left', pageLabel: 'Docs: Result History' }
];

// Data menu (Ditambahkan properti 'path')
window.menuItems = [
	{
		id: 'home',
		name: 'Home',
		icon: 'fas fa-home',
		pageLabel: 'Home',
		path: '/Home',
		hasSubmenu: false
	},
	{
		id: 'dashboard',
		name: 'Dashboard',
		icon: 'fas fa-tachometer-alt',
		pageLabel: 'Dashboard',
		path: '/dashboard',
		hasSubmenu: false
	},
	{
		id: 'apps',
		name: 'Apps',
		icon: 'fas fa-th',
		pageLabel: 'Aplikasi',
		hasSubmenu: true,
		isOpen: false,
		submenu: [
			{ id: 'app1', name: 'Gmail Checker', icon: 'fas fa-envelope', pageLabel: 'Gmail Checker', path: '/gmail-checker' },
			{ id: 'app2', name: 'Gmail Dot Tricks', icon: 'fas fa-wand-magic-sparkles', pageLabel: 'Gmail Dot Tricks', path: '/gmail-dot-tricks' },
			{ id: 'app3', name: 'Name Combiner', icon: 'fas fa-shuffle', pageLabel: 'Name Combiner', path: '/name-combiner' },
			{ id: 'app4', name: 'Email Extractor', icon: 'fas fa-filter', pageLabel: 'Email Extractor & Remove Duplicates', path: '/email-extractor' },
			{ id: 'app5', name: 'Notepad', icon: 'fas fa-notes-medical', pageLabel: 'Notepad', path: '/notepad' },
		]
	},
	{
		id: 'admin',
		name: 'Admin Panel',
		icon: 'fas fa-user-shield',
		pageLabel: 'Admin Panel',
		path: '/admin',
		hasSubmenu: false
	},
	{
		id: 'history',
		name: 'History',
		icon: 'fas fa-clock-rotate-left',
		pageLabel: 'Result History',
		path: '/history',
		hasSubmenu: false
	},
	{
		id: 'documentation',
		name: 'Docs',
		icon: 'fas fa-book',
		pageLabel: 'Docs',
		path: '/docs',
		hasSubmenu: false
	},
	{
		id: 'support',
		name: 'Support',
		icon: 'fas fa-headset',
		pageLabel: 'Support',
		path: '/support',
		hasSubmenu: false
	},
	{
		id: 'setting1',
		name: 'Manage API Keys',
		icon: 'fas fa-key',
		pageLabel: 'Manage API Keys',
		path: '/manage-api-keys',
		hasSubmenu: false
	},
	{
		id: 'setting2',
		name: 'Preferences',
		icon: 'fas fa-sliders-h',
		pageLabel: 'Preferences',
		path: '/settings/preferences',
		hasSubmenu: false
	},
	{
		id: 'pricing',
		name: 'Pricing',
		icon: 'fas fa-tags',
		pageLabel: 'Pricing Plans',
		path: '/pricing',
		hasSubmenu: false
	},
	{
		id: 'login',
		name: 'Login',
		icon: 'fas fa-sign-in-alt',
		pageLabel: 'Sign In',
		path: '/login',
		hasSubmenu: false
	}
];

window.currentActiveMenu = 'home';

// --- ROUTER UTILITIES ---
window.getMenuByPath = function (path) {
	if (path === '' || path === '/' || path === '/Home') {
		return window.isUserAuthenticated ? 'dashboard' : 'home';
	}
	if (path === '/terms') return 'terms';
	if (path === '/privacy') return 'privacy';

	// Dev center routes
	if (path === '/developer/keys') return 'dev-keys';
	if (path === '/developer/create') return 'dev-create';
	if (path === '/developer/credits') return 'dev-credits';
	if (path === '/developer/stats') return 'dev-stats';
	if (path === '/developer/add') return 'dev-add';
	if (path === '/developer/purchases') return 'dev-purchases';

	// Documentation routes
	if (path === '/docs/gmail-checker') return 'doc-gmail-checker';
	if (path === '/docs/gmail-dot-tricks') return 'doc-dot-tricks';
	if (path === '/docs/name-combiner') return 'doc-name-combiner';
	if (path === '/docs/api-key') return 'doc-api-key';
	if (path === '/docs/payments') return 'doc-payments';
	if (path === '/docs/email-extractor') return 'doc-email-extractor';
	if (path === '/docs/notepad') return 'doc-notepad';
	if (path === '/docs/history') return 'doc-history';

	for (let menu of window.menuItems) {
		if (menu.path === path) return menu.id;
		if (menu.hasSubmenu) {
			const found = menu.submenu.find(sub => sub.path === path);
			if (found) return found.id;
		}
	}
	return window.isUserAuthenticated ? 'dashboard' : 'home'; // fallback 404 internal
}

window.getPathById = function (id) {
	if (id === 'terms') return '/terms';
	if (id === 'privacy') return '/privacy';

	if (id === 'dev-keys') return '/developer/keys';
	if (id === 'dev-create') return '/developer/create';
	if (id === 'dev-credits') return '/developer/credits';
	if (id === 'dev-stats') return '/developer/stats';
	if (id === 'dev-add') return '/developer/add';
	if (id === 'dev-purchases') return '/developer/purchases';

	if (id === 'doc-gmail-checker') return '/docs/gmail-checker';
	if (id === 'doc-dot-tricks') return '/docs/gmail-dot-tricks';
	if (id === 'doc-name-combiner') return '/docs/name-combiner';
	if (id === 'doc-api-key') return '/docs/api-key';
	if (id === 'doc-payments') return '/docs/payments';
	if (id === 'doc-email-extractor') return '/docs/email-extractor';
	if (id === 'doc-notepad') return '/docs/notepad';
	if (id === 'doc-history') return '/docs/history';

	for (let menu of window.menuItems) {
		if (menu.id === id) return menu.path;
		if (menu.hasSubmenu) {
			const found = menu.submenu.find(sub => sub.id === id);
			if (found) return found.path;
		}
	}
	return '/';
}

window.renderMenu = function () {
	const sidebarBottom = document.getElementById('side-bar-bottom-content');
	if (!sidebarBottom) return;
	sidebarBottom.innerHTML = '';

	if (window.sidebarMode === 'developer') {
		// Render Back Button
		const backDiv = document.createElement('div');
		backDiv.className = 'menu-item';
		backDiv.style.borderBottom = '1px solid var(--border-color)';
		backDiv.style.marginBottom = '12px';
		backDiv.style.paddingBottom = '12px';
		backDiv.style.cursor = 'pointer';
		backDiv.innerHTML = `<i class="fas fa-chevron-left" style="color: #af86fc; margin-right: 8px;"></i><span style=" color: #af86fc; ">Dashboard</span>`;
		backDiv.addEventListener('click', () => {
			window.sidebarMode = 'dashboard';
			window.setActiveMenu('dashboard');
		});
		sidebarBottom.appendChild(backDiv);

		// Render Developer Menu Items
		window.developerMenuItems.forEach(menu => {
			const menuDiv = createMenuItem(menu.id, menu.name, menu.icon);
			menuDiv.addEventListener('click', () => window.setActiveMenu(menu.id));
			sidebarBottom.appendChild(menuDiv);
		});
	} else if (window.sidebarMode === 'documentation') {
		// Render Back Button
		const backDiv = document.createElement('div');
		backDiv.className = 'menu-item';
		backDiv.style.borderBottom = '1px solid var(--border-color)';
		backDiv.style.marginBottom = '12px';
		backDiv.style.paddingBottom = '12px';
		backDiv.style.cursor = 'pointer';

		const backLabel = window.isUserAuthenticated ? 'Dashboard' : 'Home';
		backDiv.innerHTML = `<i class="fas fa-chevron-left" style="color: #af86fc; margin-right: 8px;"></i><span style=" color: #af86fc; ">${backLabel}</span>`;
		backDiv.addEventListener('click', () => {
			if (window.isUserAuthenticated) {
				window.sidebarMode = 'dashboard';
				window.setActiveMenu('dashboard');
			} else {
				window.sidebarMode = 'dashboard';
				window.setActiveMenu('home');
			}
		});
		sidebarBottom.appendChild(backDiv);

		// Render Documentation Menu Items
		window.documentationMenuItems.forEach(menu => {
			const menuDiv = createMenuItem(menu.id, menu.name, menu.icon);
			menuDiv.addEventListener('click', () => window.setActiveMenu(menu.id));
			sidebarBottom.appendChild(menuDiv);
		});
	} else {
		// Normal Dashboard Mode
		window.menuItems.forEach(menu => {
			if (['settings', 'setting1', 'setting2', 'home', 'login', 'pricing'].includes(menu.id)) return;
			if (menu.id === 'admin' && (!window.dashboardProfile || window.dashboardProfile.role !== 'admin')) return;

			if (!menu.hasSubmenu) {
				const menuDiv = createMenuItem(menu.id, menu.name, menu.icon);
				menuDiv.addEventListener('click', () => window.setActiveMenu(menu.id));
				sidebarBottom.appendChild(menuDiv);
			} else {
				const parentDiv = document.createElement('div');

				const parentBtn = createMenuItem(menu.id, menu.name, menu.icon, true);
				const arrowSpan = document.createElement('span');
				arrowSpan.className = `arrow ${menu.isOpen ? 'rotate' : ''}`;
				arrowSpan.innerHTML = '<i class="fas fa-chevron-right"></i>';
				parentBtn.appendChild(arrowSpan);

				parentBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					menu.isOpen = !menu.isOpen;
					window.toggleSubmenu(menu.id, menu.isOpen);
				});

				const submenuContainer = document.createElement('div');
				submenuContainer.className = `submenu-container ${menu.isOpen ? 'show' : ''}`;
				submenuContainer.id = `submenu-${menu.id}`;

				menu.submenu.forEach(sub => {
					const subItem = createSubmenuItem(sub.id, sub.name, sub.icon);
					subItem.addEventListener('click', () => {
						window.setActiveMenu(sub.id);
					});
					submenuContainer.appendChild(subItem);
				});

				parentDiv.appendChild(parentBtn);
				parentDiv.appendChild(submenuContainer);
				sidebarBottom.appendChild(parentDiv);
			}
		});
	}
}

function createMenuItem(id, name, icon, withArrow = false) {
	const div = document.createElement('div');
	div.className = `menu-item ${window.currentActiveMenu === id ? 'active' : ''}`;
	div.id = `menu-${id}`;
	div.innerHTML = `<i class="${icon}"></i><span>${name}</span>`;

	if (id === 'support' && window.supportUnrepliedCount > 0) {
		const badge = document.createElement('span');
		badge.id = 'support-notif-badge';
		badge.className = 'sidebar-notif-badge';
		badge.textContent = window.supportUnrepliedCount;
		div.appendChild(badge);
	}
	return div;
}

function getMenuItemElement(menuId) {
	return document.getElementById(`menu-${menuId}`) ||
		((['settings', 'setting1', 'setting2'].includes(menuId)) ? document.getElementById('sidebar-settings-btn') : null);
}

function createSubmenuItem(id, name, icon) {
	const div = document.createElement('div');
	div.className = `submenu-item ${window.currentActiveMenu === id ? 'active' : ''}`;
	div.id = `submenu-${id}`;
	div.innerHTML = `<i class="${icon}"></i><span>${name}</span>`;
	return div;
}

window.toggleSubmenu = function (menuId, isOpen) {
	const container = document.getElementById(`submenu-${menuId}`);
	const arrow = document.querySelector(`#menu-${menuId} .arrow`);

	if (isOpen && container) {
		container.classList.add('show');
		if (arrow) arrow.classList.add('rotate');
	} else if (container) {
		container.classList.remove('show');
		if (arrow) arrow.classList.remove('rotate');
	}
}

window.updateDevSubTabs = function (menuId) {
	const devPanes = [
		'tab-dev-keys',
		'tab-dev-create',
		'tab-dev-credits',
		'tab-dev-stats',
		'tab-dev-add',
		'tab-dev-purchases'
	];
	devPanes.forEach(paneId => {
		const pane = document.getElementById(paneId);
		if (pane) pane.classList.add('hide');
	});

	let targetPaneId = 'tab-dev-keys';
	if (menuId === 'dev-keys') targetPaneId = 'tab-dev-keys';
	else if (menuId === 'dev-create') targetPaneId = 'tab-dev-create';
	else if (menuId === 'dev-credits') targetPaneId = 'tab-dev-credits';
	else if (menuId === 'dev-stats') targetPaneId = 'tab-dev-stats';
	else if (menuId === 'dev-add') targetPaneId = 'tab-dev-add';
	else if (menuId === 'dev-purchases') targetPaneId = 'tab-dev-purchases';

	const activePane = document.getElementById(targetPaneId);
	if (activePane) activePane.classList.remove('hide');

	// Trigger table refreshes or stats sync when tabs are opened
	if (menuId === 'dev-keys' && window.loadUserKeys) {
		window.loadUserKeys();
	} else if (menuId === 'dev-credits' && window.renderCreditsTab) {
		window.renderCreditsTab();
	}
}

window.updateDocSubTabs = function (menuId) {
	const docPanes = [
		'tab-doc-gmail-checker',
		'tab-doc-dot-tricks',
		'tab-doc-name-combiner',
		'tab-doc-api-key',
		'tab-doc-payments',
		'tab-doc-email-extractor',
		'tab-doc-notepad',
		'tab-doc-history'
	];
	docPanes.forEach(paneId => {
		const pane = document.getElementById(paneId);
		if (pane) pane.classList.add('hide');
	});

	const targetPaneId = `tab-${menuId}`;
	const activePane = document.getElementById(targetPaneId);
	if (activePane) activePane.classList.remove('hide');
}

window.setActiveMenu = function (menuId, pushState = true) {
	// Re-route legacy setting1 access to dev-keys
	if (menuId === 'setting1') {
		window.sidebarMode = 'developer';
		window.setActiveMenu('dev-keys', pushState);
		return;
	}

	// Re-route legacy/default documentation access to doc-api-key
	if (menuId === 'documentation') {
		window.sidebarMode = 'documentation';
		window.setActiveMenu('doc-payments', pushState);
		return;
	}

	const devMenuIds = ['dev-keys', 'dev-create', 'dev-credits', 'dev-stats', 'dev-add', 'dev-purchases'];
	const isDevMenu = devMenuIds.includes(menuId);

	const docMenuIds = ['doc-payments', 'doc-api-key', 'doc-gmail-checker', 'doc-dot-tricks', 'doc-name-combiner', 'doc-email-extractor', 'doc-notepad', 'doc-history'];
	const isDocMenu = docMenuIds.includes(menuId);

	// Check authentication before entering protected pages (documentation is public!)
	const protectedPages = ['dashboard', 'history', 'app1', 'app2', 'app3', 'app4', 'app5', 'setting1', 'setting2', 'admin', ...devMenuIds];
	if (protectedPages.includes(menuId) && !window.isUserAuthenticated) {
		window.loginRedirectTarget = menuId;
		if (window.showAppNotification) {
			window.showAppNotification('warning', 'Please <strong>Sign In</strong> to access that page!');
		}
		window.setActiveMenu('login', pushState);
		return;
	}

	// Admin Panel Authorization Check
	if (menuId === 'admin') {
		if (!window.dashboardProfile || window.dashboardProfile.role !== 'admin') {
			if (window.showAppNotification) {
				window.showAppNotification('danger', '🚫 <strong>Access Denied:</strong> Only administrators can access the Admin Panel!');
			}
			window.setActiveMenu('home', pushState);
			return;
		}
	}

	window.currentActiveMenu = menuId;
	if (window.clearAppNotification) window.clearAppNotification();

	// Update Sidebar Mode
	if (isDevMenu) {
		window.sidebarMode = 'developer';
	} else if (isDocMenu) {
		window.sidebarMode = 'documentation';
	} else {
		window.sidebarMode = 'dashboard';
	}

	// Toggle home-active and doc-active classes on container based on menuId
	const containerElement = document.querySelector('.container');
	if (containerElement) {
		if (menuId === 'home') {
			containerElement.classList.add('home-active');
		} else {
			containerElement.classList.remove('home-active');
		}

		if (isDocMenu) {
			containerElement.classList.add('doc-active');
		} else {
			containerElement.classList.remove('doc-active');
		}
	}

	if (pushState) {
		const routePath = window.getPathById(menuId);
		window.history.pushState({ menuId }, '', window.BASE_PATH + routePath);
	}

	// Re-render sidebar to match current mode
	window.renderMenu();

	// Reset all active classes
	document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
	document.querySelectorAll('.submenu-item').forEach(item => item.classList.remove('active'));

	const mainMenu = getMenuItemElement(menuId);
	const subMenuItem = document.getElementById(`submenu-${menuId}`);

	if (subMenuItem) {
		subMenuItem.classList.add('active');
		for (let menu of window.menuItems) {
			if (menu.submenu && menu.submenu.some(sub => sub.id === menuId)) {
				menu.isOpen = true;
				window.toggleSubmenu(menu.id, true);
				break;
			}
		}
	} else if (mainMenu) {
		mainMenu.classList.add('active');
	}

	// Style Get API Key button active state
	const devBtn = document.getElementById('sidebar-developer-btn');
	if (devBtn) {
		if (isDevMenu) {
			devBtn.classList.add('active');
		} else {
			devBtn.classList.remove('active');
		}
	}

	const selectedMenu = findMenuItem(menuId);
	if (selectedMenu) {
		document.getElementById('current-page-label').textContent = selectedMenu.pageLabel;
	}

	// Show/hide main page contents
	document.querySelectorAll('.page-content').forEach(page => page.classList.add('hide'));

	const pageTargetId = isDevMenu ? 'page-setting1' : (isDocMenu ? 'page-documentation' : `page-${menuId}`);
	const activePage = document.getElementById(pageTargetId);
	if (activePage) {
		activePage.classList.remove('hide');
	}

	if (isDevMenu) {
		window.updateDevSubTabs(menuId);
	} else if (isDocMenu) {
		window.updateDocSubTabs(menuId);
	} else if (menuId === 'admin' && window.loadActiveAdminTab) {
		window.loadActiveAdminTab();
	}

	updateMetaHeader(menuId);
}

function updateMetaHeader(menuId) {
	const metaMap = {
		'home': {
			title: 'Gmail Checker - Premium Email Verifier',
			description: 'Verify your Gmail addresses in real-time. Fast, secure, and reliable email validation tool.'
		},
		'dashboard': {
			title: 'Dashboard - Gmail Checker',
			description: 'View your account balance, daily check stats, and quick links.'
		},
		'app1': {
			title: 'Gmail Checker - App',
			description: 'Clean and verify your Gmail lists in real-time. Detect live, verified, disabled, and unregistered emails.'
		},
		'app2': {
			title: 'Gmail Dot Tricks Generator - App',
			description: 'Generate all possible dot combinations for a Gmail address to test registration variants.'
		},
		'app3': {
			title: 'Name Combiner - App',
			description: 'Combine names, words, and domains into email combinations for marketing or test scenarios.'
		},
		'app4': {
			title: 'Email Extractor & Duplicate Remover - App',
			description: 'Extract valid email addresses from any raw text, clean duplicates, and format your lists instantly.'
		},
		'app5': {
			title: 'Notepad - App',
			description: 'Quick notes utility to paste, edit, and keep track of your email lists or task details.'
		},
		'admin': {
			title: 'Admin Panel - Gmail Checker',
			description: 'Manage users, track payment logs, send push notifications, and handle support tickets.'
		},
		'history': {
			title: 'Result History - Gmail Checker',
			description: 'Review your past email verification runs, view text outputs, and download result logs.'
		},
		'support': {
			title: 'Customer Support - Gmail Checker',
			description: 'Have questions? Open a support ticket, and our team will assist you shortly.'
		},
		'pricing': {
			title: 'Pricing & Plans - Gmail Checker',
			description: 'Choose the best plan for you. Upgrade to PRO or ULTRA for larger batch sizes and advanced checks.'
		},
		'login': {
			title: 'Sign In - Gmail Checker',
			description: 'Log in to your account with Google to access your dashboard, purchased credits, and tools.'
		},
		'dev-keys': {
			title: 'Manage API Keys - Developer Center',
			description: 'Generate, delete, and configure whitelist restrictions (IP/Domain) for your developer API keys.'
		},
		'dev-create': {
			title: 'Create API Key - Developer Center',
			description: 'Create a new developer API key to integrate Gmail Checker into your own applications.'
		},
		'dev-stats': {
			title: 'API Usage Stats - Developer Center',
			description: 'Monitor your API usage graphs, request counts, and success rates.'
		},
		'dev-credits': {
			title: 'API Credits - Developer Center',
			description: 'Manage your API credit balances and monitor consumption rates.'
		},
		'dev-add': {
			title: 'Buy Credits - Developer Center',
			description: 'Purchase additional credits securely using major cryptocurrencies.'
		},
		'dev-purchases': {
			title: 'Purchase History - Developer Center',
			description: 'Track and review all your credit purchases and invoices.'
		}
	};

	const isDocMenu = [
		'doc-payments', 'doc-api-key', 'doc-gmail-checker',
		'doc-dot-tricks', 'doc-name-combiner', 'doc-email-extractor',
		'doc-notepad', 'doc-history'
	].includes(menuId);

	let meta = metaMap[menuId];

	if (!meta && isDocMenu) {
		const label = document.getElementById('current-page-label')?.textContent || 'Documentation';
		meta = {
			title: `${label} - Gmail Checker Docs`,
			description: `Learn how to use, configure, and integrate ${label} in our documentation.`
		};
	}

	if (!meta) {
		meta = {
			title: 'Gmail Checker - Premium Email Verifier',
			description: 'Verify your Gmail lists in real-time. Fast, secure, and reliable email validation tool.'
		};
	}

	// Update Document Title
	document.title = meta.title;

	// Update Meta Description
	let metaDesc = document.querySelector('meta[name="description"]');
	if (!metaDesc) {
		metaDesc = document.createElement('meta');
		metaDesc.setAttribute('name', 'description');
		document.head.appendChild(metaDesc);
	}
	metaDesc.setAttribute('content', meta.description);

	// Update Open Graph (og:title, og:description)
	let ogTitle = document.querySelector('meta[property="og:title"]');
	if (ogTitle) ogTitle.setAttribute('content', meta.title);

	let ogDesc = document.querySelector('meta[property="og:description"]');
	if (ogDesc) ogDesc.setAttribute('content', meta.description);
}


function findMenuItem(id) {
	const allItems = [...window.menuItems, ...window.developerMenuItems, ...window.documentationMenuItems];
	for (let menu of allItems) {
		if (menu.id === id) return menu;
		if (menu.submenu) {
			const found = menu.submenu.find(sub => sub.id === id);
			if (found) return found;
		}
	}
	return null;
}

window.highlightParentMenu = function (submenuId) {
	for (let menu of window.menuItems) {
		if (menu.submenu && menu.submenu.some(sub => sub.id === submenuId)) {
			const parentMenu = document.getElementById(`menu-${menu.id}`);
			if (parentMenu) {
				parentMenu.classList.add('active');
				menu.isOpen = true;
				window.toggleSubmenu(menu.id, true);
			}
			break;
		}
	}
}

// Global toggle doc tabs sample code
window.toggleDocTab = function (lang) {
	document.querySelectorAll('.doc-pane').forEach(p => p.classList.add('hide'));
	const targetPane = document.getElementById(`pane-doc-${lang}`);
	if (targetPane) targetPane.classList.remove('hide');

	// Reset active button class
	const btnIds = ['btn-doc-curl', 'btn-doc-python', 'btn-doc-nodejs', 'btn-doc-php'];
	btnIds.forEach(id => {
		const btn = document.getElementById(id);
		if (btn) {
			btn.style.background = 'transparent';
			btn.style.color = 'var(--text-muted)';
		}
	});

	const activeBtn = document.getElementById(`btn-doc-${lang}`);
	if (activeBtn) {
		activeBtn.style.background = 'linear-gradient(135deg, #af86fc, #7e53c9)';
		activeBtn.style.color = 'white';
	}
}

// Global FAQ Toggle accordion
window.toggleFaq = function (el) {
	const parent = el.parentElement;
	const answer = parent.querySelector('.faq-answer');
	const icon = el.querySelector('i');

	if (answer.style.maxHeight && answer.style.maxHeight !== '0px') {
		answer.style.maxHeight = '0px';
		icon.style.transform = 'rotate(0deg)';
	} else {
		// Close all others first for accordion effect
		document.querySelectorAll('.faq-answer').forEach(ans => {
			ans.style.maxHeight = '0px';
			const parentItem = ans.parentElement;
			if (parentItem) {
				const arrow = parentItem.querySelector('i');
				if (arrow) arrow.style.transform = 'rotate(0deg)';
			}
		});
		answer.style.maxHeight = answer.scrollHeight + 'px';
		icon.style.transform = 'rotate(180deg)';
	}
}

// Bind direct clicks on the Get API Key sidebar button
document.addEventListener('DOMContentLoaded', () => {
	const devBtn = document.getElementById('sidebar-developer-btn');
	if (devBtn) {
		devBtn.addEventListener('click', () => {
			window.setActiveMenu('dev-keys');
		});
	}
});

// Event listener untuk tombol Back / Forward di Browser
window.addEventListener('popstate', (e) => {
	let path = window.location.pathname;
	if (window.BASE_PATH && path.startsWith(window.BASE_PATH)) {
		path = path.slice(window.BASE_PATH.length);
	}

	const targetMenuId = window.getMenuByPath(path);
	window.setActiveMenu(targetMenuId, false);
});

// Intercept link-link yang masih pakai <a href> biasa agar menjadi SPA navigation (tanpa reload)
document.addEventListener('DOMContentLoaded', () => {
	// Mapping: href path → menuId
	const linkRouteMap = {
		'/privacy': 'privacy',
		'/terms': 'terms',
		'/docs': 'documentation',
		'/pricing': 'pricing',
	};

	// Semua selector yang perlu di-intercept
	const interceptSelectors = [
		'.profile-popover-footer-link',
		'#anon-link-doc',
		'#anon-link-pricing',
	];

	interceptSelectors.forEach(selector => {
		document.querySelectorAll(selector).forEach(el => {
			el.addEventListener('click', (e) => {
				e.preventDefault(); // Cegah reload
				const href = el.getAttribute('href');
				const menuId = linkRouteMap[href];
				if (menuId && window.setActiveMenu) {
					window.setActiveMenu(menuId, true);
				}
			});
		});
	});
});

