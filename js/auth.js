window.APIKEY = null;
window.isUserAuthenticated = false;
window.authInitialCheckDone = false;

// Function to update UI based on Auth State
window.applyAuthUIState = function (user) {
	const container = document.querySelector('.container');
	const topBarAnon = document.getElementById('top-bar-anon-view');
	const topBarAuth = document.getElementById('top-bar-auth-view');
	const userEmailDisplay = document.getElementById('user-email-display');
	const userAvatarIcon = document.getElementById('user-avatar-icon');
	const userAvatarImg = document.getElementById('user-avatar-img');
	const dbUserAvatarCircle = document.getElementById('db-user-avatar-circle');

	// Resolve target menu based on current URL path
	let currentPath = window.location.pathname;
	if (window.BASE_PATH && currentPath.startsWith(window.BASE_PATH)) {
		currentPath = currentPath.slice(window.BASE_PATH.length);
	}
	const currentMenuId = window.getMenuByPath(currentPath);

	if (user) {
		window.isUserAuthenticated = true;
		if (container) container.classList.remove('anonim');
		if (topBarAnon) topBarAnon.classList.add('hide');
		if (topBarAuth) topBarAuth.classList.remove('hide');

		// Update User Profile Card & Popover
		if (userEmailDisplay) {
			userEmailDisplay.textContent = user.email;
			userEmailDisplay.setAttribute('title', user.email);
		}

		const popoverName = document.getElementById('profile-popover-name-display');
		const popoverEmail = document.getElementById('profile-popover-email-display');
		const popoverAvatarImg = document.getElementById('profile-popover-avatar-img');
		const popoverAvatarIcon = document.getElementById('profile-popover-avatar-icon');

		if (popoverName) popoverName.textContent = user.displayName || user.email.split('@')[0];
		if (popoverEmail) popoverEmail.textContent = user.email;

		if (user.photoURL) {
			if (userAvatarIcon) userAvatarIcon.classList.add('hide');
			if (userAvatarImg) {
				userAvatarImg.src = user.photoURL;
				userAvatarImg.classList.remove('hide');
			}
			if (popoverAvatarIcon) popoverAvatarIcon.classList.add('hide');
			if (popoverAvatarImg) {
				popoverAvatarImg.src = user.photoURL;
				popoverAvatarImg.classList.remove('hide');
			}

			if (dbUserAvatarCircle) {
				if (dbUserAvatarCircle.tagName === 'IMG') {
					dbUserAvatarCircle.src = user.photoURL;
				} else {
					dbUserAvatarCircle.style.backgroundImage = `url("${user.photoURL}")`;
				}
			}
		} else {
			if (userAvatarIcon) userAvatarIcon.classList.remove('hide');
			if (userAvatarImg) userAvatarImg.classList.add('hide');
			if (popoverAvatarIcon) popoverAvatarIcon.classList.remove('hide');
			if (popoverAvatarImg) popoverAvatarImg.classList.add('hide');
		}

		// Restore cached APIKEY from localStorage (set by dashboard after profile loads)
		const API_STORAGE_KEY = 'gmailChecker_apiData';
		try {
			const cached = localStorage.getItem(API_STORAGE_KEY);
			if (cached) {
				const data = JSON.parse(cached);
				if (data && data.apiKey) {
					window.APIKEY = data.apiKey;
				}
			}
		} catch (e) { /* ignore parse errors */ }

		// Handle routing for authenticated user
		if (window.loginRedirectTarget) {
			const target = window.loginRedirectTarget;
			window.loginRedirectTarget = null;
			window.setActiveMenu(target, true);
		} else if (currentMenuId === 'home' || currentMenuId === 'dashboard' || currentMenuId === 'login') {
			window.setActiveMenu('app1', true);
		} else {
			window.setActiveMenu(currentMenuId, false);
		}

		if (window.loadDashboardData) {
			window.loadDashboardData(false, true);
		}
	} else {
		window.isUserAuthenticated = false;
		if (container) container.classList.add('anonim');
		if (topBarAnon) topBarAnon.classList.remove('hide');
		if (topBarAuth) topBarAuth.classList.add('hide');
		window.APIKEY = null;
		localStorage.removeItem('gmailChecker_apiData');

		if (window.closeTicketsWS) {
			window.closeTicketsWS();
		}

		// Handle routing for unauthenticated user
		if (['dashboard', 'app1', 'app2', 'app3', 'setting1', 'setting2', 'support'].includes(currentMenuId)) {
			window.loginRedirectTarget = currentMenuId;
			if (window.showAppNotification) {
				window.showAppNotification('warning', 'Please <strong>Sign In</strong> to access that page!');
			}
			// If it's the initial check on load, keep the URL intact so we can redirect back after login
			const pushState = window.authInitialCheckDone;
			window.setActiveMenu('login', pushState);
		} else {
			window.setActiveMenu(currentMenuId, false);
		}
	}

	window.authInitialCheckDone = true;

	// Hide loading spinner and restore standard login card once initial auth check is resolved
	const loginCard = document.getElementById('login-card-content');
	const loginLoading = document.getElementById('login-loading-content');
	if (loginCard && loginLoading) {
		loginCard.classList.remove('hide');
		loginLoading.classList.add('hide');
	}
}

// Exposed bridge for Firebase SDK Module block
window.updateAuthUI = window.applyAuthUIState;
