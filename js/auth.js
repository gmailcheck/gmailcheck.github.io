window.isUserAuthenticated = false;
window.authInitialCheckDone = false;

window.activeAuthToken = null;
window.tokenRefreshPromise = null;
let tokenRefreshInterval = null;

// Background Token Refresh
window.refreshAuthToken = async function (force = false) {
	const user = window.firebaseAuth?.currentUser;
	if (!user) {
		window.activeAuthToken = null;
		return null;
	}

	if (window.tokenRefreshPromise) {
		return window.tokenRefreshPromise;
	}

	window.tokenRefreshPromise = (async () => {
		try {
			const token = await user.getIdToken(force);
			window.activeAuthToken = token;
			if (localStorage.getItem('gmailChecker_debugMode') === 'true') {
				console.log("[DEBUG] Auth Token refreshed/retrieved successfully.");
			}
			return token;
		} catch (err) {
			console.error("[ERROR] Failed to refresh auth token:", err);
			return window.activeAuthToken; // fallback
		} finally {
			window.tokenRefreshPromise = null;
		}
	})();

	return window.tokenRefreshPromise;
};

function isTokenExpired(token) {
	if (!token) return true;
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return true;
		let base64Url = parts[1];
		let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
		const padLength = (4 - (base64.length % 4)) % 4;
		base64 += '='.repeat(padLength);
		const payload = JSON.parse(atob(base64));
		const now = Math.floor(Date.now() / 1000);
		return payload.exp < (now + 30);
	} catch (e) {
		return true;
	}
}

// Global helper to get token instantly
window.getAuthToken = async function () {
	if (window.activeAuthToken && !isTokenExpired(window.activeAuthToken)) {
		return window.activeAuthToken;
	}
	return await window.refreshAuthToken(false);
};

function startPeriodicTokenRefresh() {
	if (tokenRefreshInterval) return;
	tokenRefreshInterval = setInterval(() => {
		if (window.isUserAuthenticated) {
			if (localStorage.getItem('gmailChecker_debugMode') === 'true') {
				console.log("[DEBUG] Starting background periodic token refresh...");
			}
			window.refreshAuthToken(true);
		} else {
			stopPeriodicTokenRefresh();
		}
	}, 50 * 60 * 1000); // 50 minutes
}

function stopPeriodicTokenRefresh() {
	if (tokenRefreshInterval) {
		clearInterval(tokenRefreshInterval);
		tokenRefreshInterval = null;
	}
}

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

		// Cache token and start periodic background refresh
		window.refreshAuthToken(false).then(() => {
			startPeriodicTokenRefresh();
		});

		if (window.loadDashboardData) {
			window.loadDashboardData(false, true);
		}

		// Show 1000x Faster Gmail Checker Promo Modal (Once per session)
		if (!sessionStorage.getItem('gmailChecker_promo_shown')) {
			sessionStorage.setItem('gmailChecker_promo_shown', 'true');
			setTimeout(() => {
				const promoModal = document.getElementById('promo-popup-modal');
				if (promoModal) {
					promoModal.classList.remove('hide');
				}
			}, 2000); // delay showing slightly for a smooth feeling
		}
	} else {
		window.isUserAuthenticated = false;
		window.activeAuthToken = null;
		stopPeriodicTokenRefresh();
		if (container) container.classList.add('anonim');
		if (topBarAnon) topBarAnon.classList.remove('hide');
		if (topBarAuth) topBarAuth.classList.add('hide');

		if (window.presenceWS) {
			try { window.presenceWS.close(); } catch (e) { }
			window.presenceWS = null;
		}
		if (window.adminUsersWS) {
			try { window.adminUsersWS.close(); } catch (e) { }
			window.adminUsersWS = null;
		}
		if (window.adminUsersWSInterval) {
			clearInterval(window.adminUsersWSInterval);
			window.adminUsersWSInterval = null;
		}
		if (window.presencePingInterval) {
			clearInterval(window.presencePingInterval);
			window.presencePingInterval = null;
		}

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

window.showBannedOverlay = function (message) {
	// Remove any existing banned overlay first
	const existing = document.getElementById('banned-account-overlay');
	if (existing) existing.remove();

	const overlay = document.createElement('div');
	overlay.id = 'banned-account-overlay';
	overlay.style.position = 'fixed';
	overlay.style.top = '0';
	overlay.style.left = '0';
	overlay.style.width = '100vw';
	overlay.style.height = '100vh';
	overlay.style.background = 'rgba(10, 6, 18, 0.95)';
	overlay.style.backdropFilter = 'blur(20px)';
	overlay.style.webkitBackdropFilter = 'blur(20px)';
	overlay.style.zIndex = '999999';
	overlay.style.display = 'flex';
	overlay.style.alignItems = 'center';
	overlay.style.justifyContent = 'center';
	overlay.style.padding = '20px';
	overlay.style.boxSizing = 'border-box';
	overlay.style.color = '#ffffff';

	overlay.innerHTML = `
		<div style="max-width: 500px; width: 100%; background: linear-gradient(135deg, rgba(28, 18, 45, 0.8) 0%, rgba(15, 9, 24, 0.95) 100%); border: 1px solid rgba(255, 77, 77, 0.25); border-radius: 24px; padding: 40px 30px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 40px rgba(255, 77, 77, 0.1); display: flex; flex-direction: column; gap: 24px; animation: bannedFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);">
			<!-- Warning Neon Icon Container -->
			<div style="display: flex; justify-content: center; align-items: center; position: relative;">
				<div style="width: 84px; height: 84px; background: rgba(255, 77, 77, 0.1); border: 2px solid rgba(255, 77, 77, 0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 25px rgba(255, 77, 77, 0.25); animation: bannedIconPulse 2s ease-in-out infinite;">
					<i class="fa-solid fa-user-slash" style="color: #ff4d4d; font-size: 38px; filter: drop-shadow(0 0 8px rgba(255, 77, 77, 0.6));"></i>
				</div>
			</div>

			<!-- Typography -->
			<div style="display: flex; flex-direction: column; gap: 10px;">
				<h2 style="margin: 0; font-size: 26px; font-family: Outfit, Inter, sans-serif; font-weight: 700; letter-spacing: 0.5px; background: linear-gradient(to right, #ff4d4d, #ff8080); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Account Suspended</h2>
				<p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 15px; line-height: 1.6; font-family: Inter, sans-serif;">
					${message || "Your account has been suspended for violating our terms of service."}
				</p>
			</div>

			<!-- Details & Support Box -->
			<div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); padding: 18px; border-radius: 16px; text-align: left; display: flex; flex-direction: column; gap: 8px;">
				<span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Support Information</span>
				<p style="margin: 0; font-size: 13.5px; color: rgba(255, 255, 255, 0.6); line-height: 1.5; font-family: Inter, sans-serif;">
					If you believe this suspension is a mistake, please contact our support team via email:
				</p>
				<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; background: rgba(0, 0, 0, 0.2); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.05);">
					<span id="banned-support-email" style="font-size: 14px; color: #66ffd9; font-family: monospace; font-weight: bold; letter-spacing: 0.5px;">blacksoftchild@gmail.com</span>
					<button id="btn-copy-banned-email" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; transition: color 0.2s; padding: 4px;" title="Copy Email"><i class="fa-solid fa-copy"></i></button>
				</div>
			</div>

			<!-- Action Buttons -->
			<div style="display: flex; gap: 14px; width: 100%;">
				<button id="btn-banned-logout" class="btn btn-secondary" style="flex: 1; border-radius: 12px; padding: 14px 20px; font-weight: bold; border: 1px solid rgba(255, 255, 255, 0.1); background: transparent; color: #ffffff; cursor: pointer; transition: all 0.2s;">
					<i class="fa-solid fa-right-from-bracket" style="margin-right: 8px;"></i> Logout
				</button>
				<a href="mailto:blacksoftchild@gmail.com?subject=Banned Account Appeal" style="flex: 1; text-decoration: none;">
					<button class="btn btn-primary" style="width: 100%; border-radius: 12px; padding: 14px 20px; font-weight: bold; background: linear-gradient(135deg, #ff4d4d 0%, #cc0000 100%); color: white; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(255, 77, 77, 0.3); transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;">
						<i class="fa-solid fa-envelope"></i> Submit Appeal
					</button>
				</a>
			</div>
		</div>
	`;

	const style = document.createElement('style');
	style.id = 'banned-overlay-styles';
	style.textContent = `
		@keyframes bannedFadeIn {
			from { opacity: 0; transform: scale(0.95); }
			to { opacity: 1; transform: scale(1); }
		}
		@keyframes bannedIconPulse {
			0% { box-shadow: 0 0 25px rgba(255, 77, 77, 0.25); border-color: rgba(255, 77, 77, 0.4); }
			50% { box-shadow: 0 0 40px rgba(255, 77, 77, 0.5); border-color: rgba(255, 77, 77, 0.8); }
			100% { box-shadow: 0 0 25px rgba(255, 77, 77, 0.25); border-color: rgba(255, 77, 77, 0.4); }
		}
	`;
	document.head.appendChild(style);
	document.body.appendChild(overlay);

	// Event Listeners
	document.getElementById('btn-copy-banned-email').addEventListener('click', () => {
		navigator.clipboard.writeText('blacksoftchild@gmail.com').then(() => {
			if (window.showAppNotification) {
				window.showAppNotification('success', '📋 <strong>Email disalin</strong> ke papan klip!');
			}
		});
	});

	document.getElementById('btn-banned-logout').addEventListener('click', async () => {
		overlay.remove();
		style.remove();
		if (window.firebaseAuth && window.signOut) {
			await window.signOut(window.firebaseAuth);
		}
	});
};
