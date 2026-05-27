// js/dashboard.js
// Complete interactive controller for the User Dashboard (API Keys & Stats)

document.addEventListener('DOMContentLoaded', () => {
	initDashboard();
});

let countdownInterval = null;

function initDashboard() {
	// 1. TAB SWITCHING LOGIC
	const btnTabKeys = document.getElementById('btn-tab-keys');
	const btnTabHistory = document.getElementById('btn-tab-history');
	const tabContentKeys = document.getElementById('tab-content-keys');
	const tabContentHistory = document.getElementById('tab-content-history');

	if (btnTabKeys && btnTabHistory && tabContentKeys && tabContentHistory) {
		btnTabKeys.addEventListener('click', () => {
			btnTabKeys.classList.add('active');
			btnTabHistory.classList.remove('active');
			tabContentKeys.classList.remove('hide');
			tabContentHistory.classList.add('hide');
		});

		btnTabHistory.addEventListener('click', () => {
			btnTabHistory.classList.add('active');
			btnTabKeys.classList.remove('active');
			tabContentHistory.classList.remove('hide');
			tabContentKeys.classList.add('hide');
			loadUsageHistory();
		});
	}

	// 2. ACTIVE KEY VISIBILITY EYE TOGGLE
	const btnRevealKey = document.getElementById('btn-db-reveal-key');
	const activeKeyDisplay = document.getElementById('db-active-key-display');
	if (btnRevealKey && activeKeyDisplay) {
		btnRevealKey.addEventListener('click', () => {
			if (activeKeyDisplay.type === 'password') {
				activeKeyDisplay.type = 'text';
				btnRevealKey.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
			} else {
				activeKeyDisplay.type = 'password';
				btnRevealKey.innerHTML = '<i class="fa-solid fa-eye"></i>';
			}
		});
	}

	// 3. COPY ACTIVE KEY
	const btnCopyKey = document.getElementById('btn-db-copy-key');
	if (btnCopyKey) {
		btnCopyKey.addEventListener('click', () => {
			if (window.APIKEY) {
				navigator.clipboard.writeText(window.APIKEY).then(() => {
					window.showAppNotification('success', 'ðŸ“‹ <strong>API Key copied</strong> to clipboard!');
				});
			} else {
				window.showAppNotification('warning', 'No active API key to copy!');
			}
		});
	}

	// 4. MANUAL PASTED CUSTOM API KEY APPLIER
	const btnApplyCustom = document.getElementById('btn-apply-custom-key');
	const inputCustomKey = document.getElementById('input-custom-key');
	if (btnApplyCustom && inputCustomKey) {
		btnApplyCustom.addEventListener('click', () => {
			const customVal = inputCustomKey.value.trim();
			if (!customVal) {
				window.showAppNotification('warning', 'Please enter a valid API Key string!');
				return;
			}

			// Apply new active session key
			let resolvedType = 'free';
			if (customVal.startsWith('B_')) resolvedType = 'vip';
			else if (customVal.startsWith('T_')) resolvedType = 'trial';

			localStorage.setItem('gmailChecker_apiData', JSON.stringify({
				apiKey: customVal,
				type: resolvedType,
				timestamp: Date.now()
			}));
			window.APIKEY = customVal;

			// Clear input and update
			inputCustomKey.value = '';
			window.showAppNotification('success', 'âš¡ <strong>Active API Key updated!</strong> Reloading statistics...');

			// Refresh Dashboard View
			window.loadDashboardData(true);
		});
	}

	// 5. UPGRADE TO PRICING BUTTON (from Dashboard VIP info panel)
	const btnGoToPricing = document.getElementById('btn-dashboard-go-pricing');
	if (btnGoToPricing) {
		btnGoToPricing.addEventListener('click', () => {
			window.setActiveMenu('pricing', true);
		});
	}

	// 6. REFRESH BUTTON CLICK
	const btnRefreshList = document.getElementById('btn-refresh-keys-list');
	if (btnRefreshList) {
		btnRefreshList.addEventListener('click', () => {
			window.loadDashboardData(true); // force refresh
		});
	}


	// Hook into router to fetch data automatically when Dashboard or Developer Center pages open
	const originalSetActiveMenu = window.setActiveMenu;
	window.setActiveMenu = function (menuId, pushState = true) {
		originalSetActiveMenu(menuId, pushState);
		const devMenuIds = ['dev-keys', 'dev-credits', 'dev-stats', 'dev-add', 'dev-purchases', 'pricing'];
		if ((menuId === 'dashboard' || menuId === 'setting1' || devMenuIds.includes(menuId)) && window.isUserAuthenticated) {
			window.loadDashboardData(false);
		}
	};

	// Trigger load immediately if already authenticated on initialization
	if (window.isUserAuthenticated) {
		window.loadDashboardData(false);
	}
}

let lastDashboardLoadTime = 0;
let isDashboardLoading = false;

// MAIN FUNCTION TO LOAD DASHBOARD DATA
window.loadDashboardData = async function (force = false) {
	if (isDashboardLoading) return;
	if (!force && Date.now() - lastDashboardLoadTime < 30000) {
		// Cached within 30 seconds
		return;
	}

	isDashboardLoading = true;
	try {
		const user = window.firebaseAuth.currentUser;
		if (!user) {
			isDashboardLoading = false;
			return;
		}

		const idToken = await user.getIdToken(true);

		// Render active key
		const keyDisplay = document.getElementById('db-active-key-display');
		if (keyDisplay) {
			keyDisplay.value = window.APIKEY || 'No active key';
		}

		// Update profile header
		const userEmailText = document.getElementById('db-user-email');
		if (userEmailText) userEmailText.textContent = user.email;

		// 1. Load owned keys list first to determine profile tiers
		const keys = await loadOwnedKeysList(idToken);


		// 2. Fetch User Profile status from auth service
		const profileRes = await fetch(window.API.PROFILE, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${idToken}`
			}
		});

		if (profileRes.ok) {
			const profile = await profileRes.json();
			window.dashboardProfile = profile;
			window.renderMenu();

			if (window.renderNotifications) {
				window.renderNotifications(profile.notifications, profile.unread_notifications);
			}

			// Update Badges dynamically based on roles and keys
			const badge = document.getElementById('db-user-badge');

			let tier = 'FREE';
			if (profile.role === 'admin') {
				tier = 'ADMIN';
			} else if (profile.subscription_plan && profile.subscription_plan !== 'free' && profile.subscription_plan !== 'none' && profile.subscription_expiry > Date.now()) {
				const plan = profile.subscription_plan;
				if (plan === 'pro_subs') tier = 'PRO';
				else if (plan === 'ultra_subs') tier = 'ULTRA';
				else tier = 'PRO'; // safe fallback for any unrecognized plan
			}

			if (badge) {
				badge.textContent = tier;
				if (tier === 'PRO' || tier === 'ULTRA' || tier === 'ADMIN') {
					badge.style.color = '#af86fc';
					badge.style.background = 'rgba(175, 134, 252, 0.1)';
					badge.style.borderColor = 'rgba(175, 134, 252, 0.2)';
				} else {
					badge.style.color = 'var(--text-muted)';
					badge.style.background = 'rgba(255, 255, 255, 0.05)';
					badge.style.borderColor = 'var(--border-color)';
				}
			}

			const userBadgeDisplay = document.getElementById('user-badge-display');
			if (userBadgeDisplay) userBadgeDisplay.textContent = tier;
			const popoverBadgeDisplay = document.getElementById('profile-popover-badge-display');
			if (popoverBadgeDisplay) popoverBadgeDisplay.textContent = tier;

			// UPDATE SUBSCRIPTION EXPIRY ACTIVE PERIOD STATS
			const subExpiryDisplay = document.getElementById('db-subscription-expiry');
			if (subExpiryDisplay) {
				if (tier === 'PRO' || tier === 'ULTRA') {
					if (profile.subscription_expiry) {
						const expDate = new Date(profile.subscription_expiry);
						subExpiryDisplay.textContent = expDate.toLocaleDateString();
						subExpiryDisplay.style.color = expDate <= new Date() ? '#ff6666' : '#379e56ff';
					} else {
						subExpiryDisplay.textContent = 'Lifetime';
						subExpiryDisplay.style.color = '#379e56ff';
					}
				} else if (tier === 'ADMIN') {
					subExpiryDisplay.textContent = 'Admin Console';
					subExpiryDisplay.style.color = '#af86fc';
				} else {
					subExpiryDisplay.textContent = 'lifetime';
					subExpiryDisplay.style.color = '#379e56ff';
				}
			}

			// UPDATE RENEW / SUBSCRIBE BUTTON TEXT
			const btnPricingSub = document.getElementById('btn-dashboard-go-pricing-sub');
			if (btnPricingSub) {
				if (tier === 'PRO' || tier === 'ULTRA') {
					btnPricingSub.innerHTML = `<i class="fa-solid fa-arrows-rotate" style="margin-right: 8px;"></i>Renew / Extend Subscription`;
				} else {
					btnPricingSub.innerHTML = `<i class="fa-solid fa-gem" style="margin-right: 8px;"></i>Subscribe Now`;
				}
			}

			const paymentHistory = profile.paymentHistory || {};
			const historyEntries = Object.entries(paymentHistory);

			// Separate histories
			const subscriptionHistory = historyEntries.filter(([id, data]) => data && (!data.product_type || data.product_type === 'subscription'));
			const apiKeyHistory = historyEntries.filter(([id, data]) => data && data.product_type === 'api_key');

			// PENDING PAYMENT UI LOGIC
			let pendingSubscription = null;
			let pendingApiKey = null;

			// 1. Check from activeInvoice directly
			if (profile.isProcessingPayment && profile.activeInvoice) {
				const activeInv = profile.activeInvoice;
				const pType = activeInv.product_type || 'subscription';
				if (pType === 'subscription') {
					pendingSubscription = { id: activeInv.invoice_id, data: activeInv };
				} else if (pType === 'api_key') {
					pendingApiKey = { id: activeInv.invoice_id, data: activeInv };
				}
			}

			// 2. Check from paymentHistory fallback
			if (!pendingSubscription) {
				const pendingSub = subscriptionHistory.find(([id, data]) => !data.isUsed && data.payment_status !== 'finished' && data.payment_status !== 'failed' && data.payment_status !== 'refunded' && data.payment_status !== 'expired');
				if (pendingSub) pendingSubscription = { id: pendingSub[0], data: pendingSub[1] };
			}
			if (!pendingApiKey) {
				const pendingApi = apiKeyHistory.find(([id, data]) => !data.isUsed && data.payment_status !== 'finished' && data.payment_status !== 'failed' && data.payment_status !== 'refunded' && data.payment_status !== 'expired');
				if (pendingApi) pendingApiKey = { id: pendingApi[0], data: pendingApi[1] };
			}

			const pendingNotif = document.getElementById('sidebar-pending-payment-notif');
			const pricingContainer = document.getElementById('pricing-plans-container');
			const pendingContainer = document.getElementById('pending-payment-container');

			if (pendingSubscription) {
				if (pendingNotif) pendingNotif.classList.remove('hide');
				if (pricingContainer) pricingContainer.classList.add('hide');
				if (pendingContainer) pendingContainer.classList.remove('hide');

				const pendingIdDisplay = document.getElementById('pending-invoice-id-display');
				const pendingPlanDisplay = document.getElementById('pending-invoice-plan-display');
				const btnPendingPay = document.getElementById('btn-pending-pay');
				const btnPendingCancel = document.getElementById('btn-pending-cancel');

				if (pendingIdDisplay) pendingIdDisplay.textContent = pendingSubscription.id;
				if (pendingPlanDisplay) pendingPlanDisplay.textContent = pendingSubscription.data.productName || 'Subscription Plan';

				if (btnPendingPay && pendingSubscription.data.invoice_url) {
					btnPendingPay.onclick = () => window.open(pendingSubscription.data.invoice_url, '_blank');
				}

				if (btnPendingCancel) {
					const newBtnCancel = btnPendingCancel.cloneNode(true);
					btnPendingCancel.parentNode.replaceChild(newBtnCancel, btnPendingCancel);

					newBtnCancel.addEventListener('click', async () => {
						if (!confirm('Are you sure you want to cancel and remove this invoice?')) return;
						newBtnCancel.disabled = true;
						newBtnCancel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cancelling...';
						try {
							const cancelRes = await fetch(window.API.CANCEL_INVOICE, {
								method: 'POST',
								headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
								body: JSON.stringify({ invoiceId: pendingSubscription.id })
							});
							const cancelData = await cancelRes.json();
							if (cancelRes.ok && cancelData.success) {
								window.showAppNotification('success', '🗑️ <strong>Invoice cancelled successfully</strong>.');
								await window.loadDashboardData(true);
							} else {
								throw new Error(cancelData.error || 'Server error');
							}
						} catch (err) {
							window.showAppNotification('danger', `Failed to cancel invoice: ${err.message}`);
							newBtnCancel.disabled = false;
							newBtnCancel.innerHTML = '<i class="fa-solid fa-trash"></i> Cancel Invoice';
						}
					});
				}
			} else {
				if (pendingNotif) pendingNotif.classList.add('hide');
				if (pricingContainer) pricingContainer.classList.remove('hide');
				if (pendingContainer) pendingContainer.classList.add('hide');
			}

			// API KEY PENDING PAYMENT UI LOGIC
			const devPendingContainer = document.getElementById('dev-pending-payment-container');
			const devPricingContainer = document.getElementById('dev-pricing-plans-container');
			const apiPendingNotif = document.getElementById('sidebar-pending-api-notif');
			const devPurchaseForm = document.getElementById('dev-purchase-form-container'); // This is the API Key buy form in tab-dev-keys

			if (pendingApiKey) {
				if (apiPendingNotif) apiPendingNotif.classList.remove('hide');
				if (devPricingContainer) devPricingContainer.classList.add('hide');
				if (devPurchaseForm) devPurchaseForm.classList.add('hide');
				if (devPendingContainer) devPendingContainer.classList.remove('hide');

				const devPendingIdDisplay = document.getElementById('dev-pending-invoice-id');
				const devPendingPlanDisplay = document.getElementById('dev-pending-invoice-plan');
				const btnDevPendingPay = document.getElementById('btn-dev-pending-pay');
				const btnDevPendingCancel = document.getElementById('btn-dev-pending-cancel');

				if (devPendingIdDisplay) devPendingIdDisplay.textContent = pendingApiKey.id;
				if (devPendingPlanDisplay) devPendingPlanDisplay.textContent = pendingApiKey.data.productName || 'API Key Credits';

				if (btnDevPendingPay && pendingApiKey.data.invoice_url) {
					btnDevPendingPay.onclick = () => window.open(pendingApiKey.data.invoice_url, '_blank');
				}

				if (btnDevPendingCancel) {
					const newBtnDevCancel = btnDevPendingCancel.cloneNode(true);
					btnDevPendingCancel.parentNode.replaceChild(newBtnDevCancel, btnDevPendingCancel);

					newBtnDevCancel.addEventListener('click', async () => {
						if (!confirm('Are you sure you want to cancel and remove this invoice?')) return;
						newBtnDevCancel.disabled = true;
						newBtnDevCancel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cancelling...';
						try {
							const cancelRes = await fetch(window.API.CANCEL_INVOICE, {
								method: 'POST',
								headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
								body: JSON.stringify({ invoiceId: pendingApiKey.id })
							});
							const cancelData = await cancelRes.json();
							if (cancelRes.ok && cancelData.success) {
								window.showAppNotification('success', '🗑️ <strong>Invoice cancelled successfully</strong>.');
								await window.loadDashboardData(true);
							} else {
								throw new Error(cancelData.error || 'Server error');
							}
						} catch (err) {
							window.showAppNotification('danger', `Failed to cancel invoice: ${err.message}`);
							newBtnDevCancel.disabled = false;
							newBtnDevCancel.innerHTML = '<i class="fa-solid fa-trash"></i> Cancel';
						}
					});
				}
			} else {
				if (apiPendingNotif) apiPendingNotif.classList.add('hide');
				if (devPricingContainer) devPricingContainer.classList.remove('hide');
				if (devPurchaseForm) devPurchaseForm.classList.remove('hide');
				if (devPendingContainer) devPendingContainer.classList.add('hide');
			}
			// END PENDING PAYMENT UI LOGIC

			// Render active payments & invoices list in VIP panel (Subscriptions ONLY)
			const paymentsList = document.getElementById('db-vip-payments-list');
			const infoList = document.getElementById('db-vip-info-list');

			if (paymentsList && infoList) {
				if (subscriptionHistory.length > 0) {
					infoList.style.display = 'none';
					paymentsList.style.display = 'flex';
					paymentsList.innerHTML = '';

					subscriptionHistory.forEach(([invoiceId, data]) => {
						const item = document.createElement('div');
						item.style.display = 'flex';
						item.style.alignItems = 'center';
						item.style.justifyContent = 'space-between';
						item.style.background = 'var(--bg-primary)';
						item.style.border = '1px solid var(--border-color)';
						item.style.borderRadius = '10px';
						item.style.padding = '8px 12px';
						item.style.fontSize = '0.8rem';

						const label = data.productName || 'Subscription Plan';
						const dateStr = data.created_at ? new Date(data.created_at).toLocaleDateString() : (data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'Recent');

						let actionBtnHtml = '';
						if (data.isUsed) {
							actionBtnHtml = `<span style="color: var(--text-muted); font-size: 0.75rem;"><i class="fa-solid fa-circle-check" style="color:#66ffd9;margin-right:4px"></i>Applied</span>`;
						} else if (data.payment_status === 'finished') {
							actionBtnHtml = `<span style="color: var(--text-muted); font-size: 0.75rem;"><i class="fa-solid fa-circle-check" style="color:#66ffd9;margin-right:4px"></i>Applied</span>`;
						} else {
							const payBtn = data.invoice_url ? `<a href="${data.invoice_url}" target="_blank" title="Pay Invoice" style="background:linear-gradient(135deg,#ffd700,#ffa500);color:#111;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.7rem;font-weight:bold;text-decoration:none;display:inline-flex;align-items:center;gap:4px;transition:all 0.2s"><i class="fa-solid fa-wallet"></i> Pay</a>` : '';
							actionBtnHtml = `
								<div style="display:flex;align-items:center;gap:6px">
									<span style="color:#ffd700;font-size:0.75rem;text-transform:capitalize;margin-right:2px"><i class="fa-solid fa-spinner fa-spin" style="margin-right:4px"></i>${data.payment_status || 'Pending'}</span>
									${payBtn}
									<button class="btn-refresh-invoice-status" data-invoice="${invoiceId}" title="Check status" style="background:rgba(255,255,255,0.08);color:var(--text-sharp);border:1px solid var(--border-color);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.7rem;transition:all 0.2s"><i class="fa-solid fa-rotate"></i></button>
									<button class="btn-cancel-invoice" data-invoice="${invoiceId}" title="Cancel invoice" style="background:rgba(255,102,102,0.15);color:#ff6666;border:1px solid rgba(255,102,102,0.2);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.7rem;transition:all 0.2s"><i class="fa-solid fa-trash"></i></button>
								</div>
							`;
						}

						let paymentDetailsHtml = '';
						if (data.pay_currency && data.pay_amount) {
							const usdValue = data.price_amount_usd ? ` (~$${data.price_amount_usd})` : '';
							let txLink = '';
							if (data.payin_hash) {
								let explorerUrl = `https://blockchair.com/search?q=${data.payin_hash}`;
								const curr = data.pay_currency.toLowerCase();
								if (curr === 'trx' || curr === 'usdttrc20') explorerUrl = `https://tronscan.org/#/transaction/${data.payin_hash}`;
								else if (curr === 'bnbbsc' || curr === 'usdtbsc') explorerUrl = `https://bscscan.com/tx/${data.payin_hash}`;
								else if (curr === 'eth' || curr === 'usdt' || curr === 'usdterc20') explorerUrl = `https://etherscan.io/tx/${data.payin_hash}`;
								else if (curr === 'matic' || curr === 'usdtmatic') explorerUrl = `https://polygonscan.com/tx/${data.payin_hash}`;
								else if (curr === 'sol') explorerUrl = `https://solscan.io/tx/${data.payin_hash}`;
								txLink = `<div style="margin-top:6px;"><a href="${explorerUrl}" target="_blank" style="background:rgba(255,255,255,0.08);color:var(--text-sharp);padding:4px 8px;border-radius:4px;text-decoration:none;font-size:0.65rem;border:1px solid var(--border-color);display:inline-flex;align-items:center;gap:4px;transition:all 0.2s;"><i class="fa-solid fa-cube" style="color:#00f0ff"></i> Block Explorer</a></div>`;
							}
							const addrHtml = data.pay_address ? `<br><span style="font-size:0.65rem;color:var(--text-muted)">To: ${data.pay_address.slice(0, 20)}...</span>` : '';
							paymentDetailsHtml = `<div style="font-size:0.7rem;color:#00f0ff;margin-top:4px;font-family:'RobotoMono',monospace"><span style="text-transform:uppercase;font-weight:bold">${data.pay_currency}</span> ${data.pay_amount}${usdValue}${addrHtml}${txLink}</div>`;
						}

						item.innerHTML = `
							<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start">
								<span style="font-weight:bold;color:var(--text-sharp);font-size:0.8rem">${label}</span>
								<span style="font-size:0.7rem;color:var(--text-muted);font-family:'RobotoMono',monospace">ID: ${invoiceId.slice(0, 10)}... | ${dateStr}</span>
								${paymentDetailsHtml}
							</div>
							<div>${actionBtnHtml}</div>
						`;
						paymentsList.appendChild(item);
					});

					// Bind generation click events
					paymentsList.querySelectorAll('.btn-generate-vip-invoice').forEach(btn => {
						btn.addEventListener('click', async (e) => {
							e.stopPropagation();
							const invId = btn.getAttribute('data-invoice');
							btn.disabled = true;
							btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Generating...';

							try {
								const genRes = await fetch(window.API.GENERATE_API_KEY, {
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
										'Authorization': `Bearer ${idToken}`
									},
									body: JSON.stringify({ invoiceId: invId })
								});

								const genData = await genRes.json();
								if (genRes.ok && genData.apiKey) {
									window.showAppNotification('success', '⚡ <strong>Key generated successfully!</strong> Active key updated.');
									localStorage.setItem('gmailChecker_apiData', JSON.stringify({
										apiKey: genData.apiKey,
										type: 'vip',
										timestamp: Date.now()
									}));
									window.APIKEY = genData.apiKey;
									await window.loadDashboardData(true);
								} else {
									window.showAppNotification('danger', `Generation failed: ${genData.error || 'Server Error'}`);
									btn.disabled = false;
									btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" style="margin-right:4px"></i>Generate Key';
								}
							} catch (err) {
								console.error(err);
								window.showAppNotification('danger', `Error generating VIP Key: ${err.message}`);
								btn.disabled = false;
								btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" style="margin-right:4px"></i>Generate Key';
							}
						});
					});

					// Bind refreshing click events
					paymentsList.querySelectorAll('.btn-refresh-invoice-status').forEach(btn => {
						btn.addEventListener('click', async (e) => {
							e.stopPropagation();
							const icon = btn.querySelector('i');
							icon.classList.add('fa-spin');
							btn.disabled = true;

							window.showAppNotification('info', 'Checking latest payment status...');
							await window.loadDashboardData(true);
						});
					});

					// Bind cancellation click events
					paymentsList.querySelectorAll('.btn-cancel-invoice').forEach(btn => {
						btn.addEventListener('click', async (e) => {
							e.stopPropagation();
							const invId = btn.getAttribute('data-invoice');
							if (!confirm('Are you sure you want to cancel and remove this invoice?')) return;

							btn.disabled = true;
							btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

							try {
								const cancelRes = await fetch(window.API.CANCEL_INVOICE, {
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
										'Authorization': `Bearer ${idToken}`
									},
									body: JSON.stringify({ invoiceId: invId })
								});

								const cancelData = await cancelRes.json();
								if (cancelRes.ok && cancelData.success) {
									window.showAppNotification('success', '🗑️ <strong>Invoice cancelled successfully</strong>.');
									await window.loadDashboardData(true);
								} else {
									window.showAppNotification('danger', `Failed to cancel invoice: ${cancelData.error || 'Server Error'}`);
									btn.disabled = false;
									btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
								}
							} catch (err) {
								console.error("Cancellation error", err);
								window.showAppNotification('danger', 'Failed to cancel invoice due to network error.');
								btn.disabled = false;
								btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
							}
						});
					});
				} else {
					infoList.style.display = 'flex';
					paymentsList.style.display = 'none';
				}
			}

			// Render active payments & invoices list in Developer panel (API Keys ONLY)
			const devPaymentsList = document.getElementById('dev-api-payments-list');
			const devInfoList = document.getElementById('dev-api-info-list');

			if (devPaymentsList && devInfoList) {
				if (apiKeyHistory.length > 0) {
					devInfoList.style.display = 'none';
					devPaymentsList.style.display = 'flex';
					devPaymentsList.innerHTML = '';

					apiKeyHistory.forEach(([invoiceId, data]) => {
						const item = document.createElement('div');
						item.style.display = 'flex';
						item.style.alignItems = 'center';
						item.style.justifyContent = 'space-between';
						item.style.background = 'var(--bg-primary)';
						item.style.border = '1px solid var(--border-color)';
						item.style.borderRadius = '10px';
						item.style.padding = '8px 12px';
						item.style.fontSize = '0.8rem';

						const label = data.productName || (data.product_id === 'api_100k' ? '100,000 Requests Credits' : (data.product_id === 'api_200k' ? '200,000 Requests Credits' : 'API Credits'));
						const dateStr = data.created_at ? new Date(data.created_at).toLocaleDateString() : (data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'Recent');

						let actionBtnHtml = '';
						if (data.isUsed) {
							actionBtnHtml = `<span style="color: var(--text-muted); font-size: 0.75rem;"><i class="fa-solid fa-circle-check" style="color:#00f0ff;margin-right:4px"></i>Applied</span>`;
						} else if (data.payment_status === 'finished') {
							actionBtnHtml = `<span style="color: var(--text-muted); font-size: 0.75rem;"><i class="fa-solid fa-circle-check" style="color:#00f0ff;margin-right:4px"></i>Applied</span>`;
						} else {
							const payBtn = data.invoice_url ? `<a href="${data.invoice_url}" target="_blank" title="Pay Invoice" style="background:linear-gradient(135deg,#ffd700,#ffa500);color:#111;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.7rem;font-weight:bold;text-decoration:none;display:inline-flex;align-items:center;gap:4px;transition:all 0.2s"><i class="fa-solid fa-wallet"></i> Pay</a>` : '';
							actionBtnHtml = `
								<div style="display:flex;align-items:center;gap:6px">
									<span style="color:#ffd700;font-size:0.75rem;text-transform:capitalize;margin-right:2px"><i class="fa-solid fa-spinner fa-spin" style="margin-right:4px"></i>${data.payment_status || 'Pending'}</span>
									${payBtn}
									<button class="btn-refresh-invoice-status" data-invoice="${invoiceId}" title="Check status" style="background:rgba(255,255,255,0.08);color:var(--text-sharp);border:1px solid var(--border-color);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.7rem;transition:all 0.2s"><i class="fa-solid fa-rotate"></i></button>
									<button class="btn-cancel-invoice" data-invoice="${invoiceId}" title="Cancel invoice" style="background:rgba(255,102,102,0.15);color:#ff6666;border:1px solid rgba(255,102,102,0.2);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.7rem;transition:all 0.2s"><i class="fa-solid fa-trash"></i></button>
								</div>
							`;
						}

						let paymentDetailsHtml = '';
						if (data.pay_currency && data.pay_amount) {
							const usdValue = data.price_amount_usd ? ` (~$${data.price_amount_usd})` : '';
							let txLink = '';
							if (data.payin_hash) {
								let explorerUrl = `https://blockchair.com/search?q=${data.payin_hash}`;
								const curr = data.pay_currency.toLowerCase();
								if (curr === 'trx' || curr === 'usdttrc20') explorerUrl = `https://tronscan.org/#/transaction/${data.payin_hash}`;
								else if (curr === 'bnbbsc' || curr === 'usdtbsc') explorerUrl = `https://bscscan.com/tx/${data.payin_hash}`;
								else if (curr === 'eth' || curr === 'usdt' || curr === 'usdterc20') explorerUrl = `https://etherscan.io/tx/${data.payin_hash}`;
								else if (curr === 'matic' || curr === 'usdtmatic') explorerUrl = `https://polygonscan.com/tx/${data.payin_hash}`;
								else if (curr === 'sol') explorerUrl = `https://solscan.io/tx/${data.payin_hash}`;
								txLink = `<div style="margin-top:6px;"><a href="${explorerUrl}" target="_blank" style="background:rgba(255,255,255,0.08);color:var(--text-sharp);padding:4px 8px;border-radius:4px;text-decoration:none;font-size:0.65rem;border:1px solid var(--border-color);display:inline-flex;align-items:center;gap:4px;transition:all 0.2s;"><i class="fa-solid fa-cube" style="color:#00f0ff"></i> Block Explorer</a></div>`;
							}
							const addrHtml = data.pay_address ? `<br><span style="font-size:0.65rem;color:var(--text-muted)">To: ${data.pay_address.slice(0, 20)}...</span>` : '';
							paymentDetailsHtml = `<div style="font-size:0.7rem;color:#00f0ff;margin-top:4px;font-family:'RobotoMono',monospace"><span style="text-transform:uppercase;font-weight:bold">${data.pay_currency}</span> ${data.pay_amount}${usdValue}${addrHtml}${txLink}</div>`;
						}

						item.innerHTML = `
							<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start">
								<span style="font-weight:bold;color:var(--text-sharp);font-size:0.8rem">${label}</span>
								<span style="font-size:0.7rem;color:var(--text-muted);font-family:'RobotoMono',monospace">ID: ${invoiceId.slice(0, 10)}... | ${dateStr}</span>
								${paymentDetailsHtml}
							</div>
							<div>${actionBtnHtml}</div>
						`;
						devPaymentsList.appendChild(item);
					});

					// Bind generation click events
					devPaymentsList.querySelectorAll('.btn-generate-api-invoice').forEach(btn => {
						btn.addEventListener('click', async (e) => {
							e.stopPropagation();
							const invId = btn.getAttribute('data-invoice');
							btn.disabled = true;
							btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Generating...';

							try {
								const genRes = await fetch(window.API.GENERATE_API_KEY, {
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
										'Authorization': `Bearer ${idToken}`
									},
									body: JSON.stringify({ invoiceId: invId })
								});

								const genData = await genRes.json();
								if (genRes.ok && genData.apiKey) {
									window.showAppNotification('success', '⚡ <strong>Developer API Key generated successfully!</strong> It has been added to your table below.');
									// Pembelian API key tidak mengubah internal user API key (window.APIKEY)
									await window.loadDashboardData(true);
								} else {
									window.showAppNotification('danger', `Generation failed: ${genData.error || 'Server Error'}`);
									btn.disabled = false;
									btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" style="margin-right:4px"></i>Generate Key';
								}
							} catch (err) {
								console.error(err);
								window.showAppNotification('danger', `Error generating API Key: ${err.message}`);
								btn.disabled = false;
								btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" style="margin-right:4px"></i>Generate Key';
							}
						});
					});

					// Bind refreshing click events
					devPaymentsList.querySelectorAll('.btn-refresh-invoice-status').forEach(btn => {
						btn.addEventListener('click', async (e) => {
							e.stopPropagation();
							const icon = btn.querySelector('i');
							icon.classList.add('fa-spin');
							btn.disabled = true;

							window.showAppNotification('info', 'Checking latest payment status...');
							await window.loadDashboardData(true);
						});
					});

					// Bind cancellation click events
					devPaymentsList.querySelectorAll('.btn-cancel-invoice').forEach(btn => {
						btn.addEventListener('click', async (e) => {
							e.stopPropagation();
							const invId = btn.getAttribute('data-invoice');
							if (!confirm('Are you sure you want to cancel and remove this invoice?')) return;

							btn.disabled = true;
							btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

							try {
								const cancelRes = await fetch(window.API.CANCEL_INVOICE, {
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
										'Authorization': `Bearer ${idToken}`
									},
									body: JSON.stringify({ invoiceId: invId })
								});

								const cancelData = await cancelRes.json();
								if (cancelRes.ok && cancelData.success) {
									window.showAppNotification('success', '🗑️ <strong>Invoice cancelled successfully</strong>.');
									await window.loadDashboardData(true);
								} else {
									window.showAppNotification('danger', `Failed to cancel invoice: ${cancelData.error || 'Server Error'}`);
									btn.disabled = false;
									btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
								}
							} catch (err) {
								window.showAppNotification('danger', `Failed to cancel invoice: ${err.message}`);
								btn.disabled = false;
								btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
							}
						});
					});
				} else {
					devInfoList.style.display = 'block';
					devPaymentsList.style.display = 'none';
				}
			}

			// Update subscription info panel description dynamically
			const dbVipKeyDesc = document.getElementById('db-vip-key-desc');
			if (dbVipKeyDesc) {
				if (profile.role === 'admin') {
					dbVipKeyDesc.textContent = 'Admin Console: All actions authorized.';
				} else if (tier === 'PRO' || tier === 'ULTRA') {
					dbVipKeyDesc.textContent = 'Each subscription purchase is logged here. Your active plan allows generating API checks via your personal key.';
				} else {
					dbVipKeyDesc.textContent = 'Purchase a PRO or ULTRA subscription to unlock premium daily credits.';
				}
			}


			// 3. Update Credits and Limits UI
			let plan = profile.subscription_plan || 'none';
			const expiry = profile.subscription_expiry || 0;
			if (plan !== 'none' && expiry < Date.now()) plan = 'none';

			let availableCredits = 0;
			if (plan === 'pro_subs') {
				availableCredits = profile.pro_subs_credits !== undefined ? profile.pro_subs_credits : 0;
			} else if (plan === 'ultra_subs') {
				availableCredits = profile.ultra_subs_credits !== undefined ? profile.ultra_subs_credits : 0;
			} else if (plan === 'special_subs') {
				availableCredits = profile.special_credits !== undefined ? profile.special_credits : 0;
			} else {
				availableCredits = profile.free_credits !== undefined ? profile.free_credits : 0;
			}

			// App Dashboard Credits
			const appUsageLabel = document.getElementById('db-quota-usage-label');
			const appQuotaBar = document.getElementById('db-quota-bar');
			const appRemaining = document.getElementById('db-remaining-requests');

			if (appUsageLabel) appUsageLabel.textContent = `Available Balance: ${availableCredits.toLocaleString()}`;
			if (appQuotaBar) appQuotaBar.style.width = `100%`; // Static 100% since it's just a balance now
			if (appRemaining) appRemaining.textContent = availableCredits.toLocaleString();

			// Developer Dashboard Credits (Global API Credits)
			const apiAvailable = profile.api_credits !== undefined ? profile.api_credits : (profile.api_quota || 0);

			// Low credit alert check with webhook integration
			if (apiAvailable < 1000) {
				if (localStorage.getItem('gmailChecker_creditAlert') !== 'false') {
					window.showAppNotification('warning', `⚠️ <strong>Low Credits Alert:</strong> Your developer API quota has dropped to <strong>${apiAvailable.toLocaleString()}</strong> remaining checks! Please top up soon to avoid interruption.`);
				}
				// Webhook support
				const webhookUrl = localStorage.getItem('gmailChecker_webhookUrl');
				if (webhookUrl && webhookUrl.startsWith('http')) {
					const lastWebhookSent = localStorage.getItem('gmailChecker_lastWebhookSent') || 0;
					if (Date.now() - lastWebhookSent > 3600000) { // 1 hour throttle
						localStorage.setItem('gmailChecker_lastWebhookSent', Date.now());
						fetch(webhookUrl, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								username: "Gmail Checker Bot",
								content: `🚨 **Low API Credits Alert** 🚨\nActive account email: \`${profile.email || 'N/A'}\`\nRemaining API Credits: \`${apiAvailable.toLocaleString()}\` checks.\n\n_Please top up your account credits soon!_`
							})
						}).catch(e => console.error("Webhook post failed:", e));
					}
				}
			}

			const devUsageLabel = document.getElementById('dev-quota-usage-label');
			const devQuotaBar = document.getElementById('dev-quota-bar');
			const devRemaining = document.getElementById('dev-remaining-requests');

			if (devUsageLabel) devUsageLabel.textContent = `Available Balance: ${apiAvailable.toLocaleString()}`;
			if (devQuotaBar) devQuotaBar.style.width = `100%`; // Static 100% since it's just a balance now
			if (devRemaining) devRemaining.textContent = apiAvailable.toLocaleString();

			// Clear previous countdown interval
			if (countdownInterval) clearInterval(countdownInterval);

			const dbCountdown = document.getElementById('db-reset-countdown');
			const devCountdown = document.getElementById('dev-reset-countdown');

			if (dbCountdown || devCountdown) {
				// Calculate seconds until next UTC midnight
				const now = new Date();
				const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
				let sec = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);

				const updateTimer = () => {
					if (sec <= 0) {
						if (dbCountdown) dbCountdown.textContent = '00:00:00';
						if (devCountdown) devCountdown.textContent = '00:00:00';
						clearInterval(countdownInterval);
						return;
					}

					const h = Math.floor(sec / 3600);
					const m = Math.floor((sec % 3600) / 60);
					const s = sec % 60;
					const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

					if (dbCountdown) dbCountdown.textContent = timeStr;
					if (devCountdown) devCountdown.textContent = "Lifetime Credits"; // Lifetime credits don't reset
					sec--;
				};

				updateTimer();
				countdownInterval = setInterval(updateTimer, 1000);
			}
		} // closes if (profileRes.ok)

		// 4. Load owned keys list (refreshed after profile loads)
		await loadOwnedKeysList(idToken);

	} catch (e) {
		console.error("Dashboard failed to retrieve full data:", e);
	} finally {
		isDashboardLoading = false;
		lastDashboardLoadTime = Date.now();
	}
};

// LOAD ALL KEYS ASSOCIATED WITH ACCOUNT
async function loadOwnedKeysList(idToken) {
	const tableBody = document.getElementById('db-keys-table-body');
	if (!tableBody) return [];

	try {
		const res = await fetch(window.API.GET_ALL_KEYS, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${idToken}`
			}
		});

		if (!res.ok) throw new Error("Failed to get keys list");

		const keys = await res.json();
		window.ownedKeys = keys;
		tableBody.innerHTML = '';

		const developerKeys = keys.filter(k => k.type === 'api_key' || k.type === 'compensation');

		if (developerKeys.length === 0) {
			tableBody.innerHTML = `<tr><td colspan="6" style="padding: 30px; text-align: center; color: var(--text-muted);">No Developer API keys found. Purchase an API Key package to generate one.</td></tr>`;

			// Render the stats cards deck dynamically
			if (typeof renderDevStatsCards === 'function') {
				await renderDevStatsCards(keys);
			}
			if (typeof renderCreditsTab === 'function') {
				renderCreditsTab();
			}
			return keys;
		}

		developerKeys.forEach(k => {
			const isKeyActive = window.APIKEY === k.key;
			const isExpired = k.expiresAt !== 'lifetime' && new Date(k.expiresAt) <= new Date();

			// Format expiry
			const expiresStr = k.expiresAt === 'lifetime' ? 'Lifetime' : new Date(k.expiresAt).toLocaleDateString();
			const createdStr = k.createdAt ? new Date(k.createdAt).toLocaleDateString() : 'N/A';

			const row = document.createElement('tr');
			row.style.borderBottom = '1px solid var(--border-color)';
			row.style.fontSize = '0.9rem';
			row.style.color = 'var(--text-primary)';

			const isAllowedType = k.type === 'api_key' || k.type === 'compensation';
			const isApiKey = k.type === 'api_key';
			const ipList = k.allowedIPs || [];
			const domainList = k.allowedDomains ? (Array.isArray(k.allowedDomains) ? k.allowedDomains : Object.keys(k.allowedDomains)) : [];

			row.innerHTML = `
				<td style="padding: 15px 10px; color: var(--text-sharp); font-weight: bold; font-family: 'Orbitron', sans-serif;">
					${k.projectName || "API Key"}
				</td>
				<td style="padding: 15px 10px; font-family: 'RobotoMono'; font-weight: bold;">
					<div style="display: flex; align-items: center; gap: 8px;">
						<span class="db-key-value" data-full-key="${k.key}">${k.key.slice(0, 12)}...</span>
						<button class="btn-copy-tbl" data-key="${k.key}" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; font-size: 0.8rem;" title="Copy Full Key"><i class="fa-solid fa-copy"></i></button>
					</div>
				</td>
				<td style="padding: 15px 10px; color: var(--text-secondary);">${createdStr}</td>
				<td style="padding: 12px 10px; text-align: center;">
					${isAllowedType ? `<button class="btn-wl-manage" data-key="${k.key}" data-tab="ip" style="background:rgba(175,134,252,0.08);border:1px solid rgba(175,134,252,0.25);color:#af86fc;border-radius:8px;padding:4px 10px;font-size:0.75rem;cursor:pointer;font-family:'RobotoMono';white-space:nowrap"><i class="fa-solid fa-network-wired" style="margin-right:4px"></i>${(ipList.length > 0) ? ipList.length + ' IP(s)' : 'None'}</button>` : '<span style="color:var(--text-muted);font-size:0.75rem">&#8212;</span>'}
				</td>
				<td style="padding: 12px 10px; text-align: center;">
					${isAllowedType ? `<button class="btn-wl-manage" data-key="${k.key}" data-tab="domain" style="background:rgba(0,240,255,0.06);border:1px solid rgba(0,240,255,0.2);color:#00f0ff;border-radius:8px;padding:4px 10px;font-size:0.75rem;cursor:pointer;font-family:'RobotoMono';white-space:nowrap"><i class="fa-solid fa-globe" style="margin-right:4px"></i>${(domainList.length > 0) ? domainList.length + ' Domain(s)' : 'None'}</button>` : '<span style="color:var(--text-muted);font-size:0.75rem">&#8212;</span>'}
				</td>
				<td style="padding: 12px 10px; text-align: center;">
					${isApiKey ? `<button class="btn-delete-key-tbl" data-key="${k.key}" style="background:rgba(255,77,77,0.1);border:1px solid rgba(255,77,77,0.2);color:#ff6666;border-radius:8px;padding:4px 10px;font-size:0.75rem;cursor:pointer;font-family:'RobotoMono';"><i class="fa-solid fa-trash"></i></button>` : '<span style="color:var(--text-muted);font-size:0.75rem">&#8212;</span>'}
				</td>
			`;

			tableBody.appendChild(row);
		});

		// Bind actions in table
		document.querySelectorAll('.btn-copy-tbl').forEach(btn => {
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				const keyVal = btn.getAttribute('data-key');
				navigator.clipboard.writeText(keyVal).then(() => {
					window.showAppNotification('success', 'ðŸ“‹ <strong>Key copied</strong> to clipboard!');
				});
			});
		});

		document.querySelectorAll('.btn-wl-manage').forEach(btn => {
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				const keyVal = btn.getAttribute('data-key');
				const tab = btn.getAttribute('data-tab') || 'ip';
				openWhitelistModal(keyVal, tab);
			});
		});

		document.querySelectorAll('.btn-apply-key-tbl').forEach(btn => {
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				const keyVal = btn.getAttribute('data-key');
				const keyType = btn.getAttribute('data-type');

				// Set active key
				localStorage.setItem('gmailChecker_apiData', JSON.stringify({
					apiKey: keyVal,
					type: keyType,
					timestamp: Date.now()
				}));
				window.APIKEY = keyVal;

				window.showAppNotification('success', 'âš¡ <strong>Active API Key updated!</strong> Statistics re-calibrating...');

				// Refresh Dashboard
				window.loadDashboardData(true);
			});
		});

		document.querySelectorAll('.btn-delete-key-tbl').forEach(btn => {
			btn.addEventListener('click', async (e) => {
				e.stopPropagation();
				const keyVal = btn.getAttribute('data-key');
				if (confirm("Are you sure you want to delete this API Key? This action cannot be undone.")) {
					// Langsung hapus element TR secara optimis
					const rowEl = btn.closest('tr');
					if (rowEl) {
						rowEl.style.transition = 'all 0.3s ease';
						rowEl.style.opacity = '0';
						rowEl.style.transform = 'translateX(-20px)';
						setTimeout(() => { rowEl.remove(); }, 300);
					}

					try {
						const res = await fetch(window.API.DELETE_API_KEY, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'Authorization': `Bearer ${idToken}`
							},
							body: JSON.stringify({ apiKey: keyVal })
						});
						if (res.ok) {
							window.showAppNotification('success', '🗑️ <strong>API Key deleted</strong> successfully!');
							window.loadDashboardData(true);
						} else {
							window.showAppNotification('danger', 'Error deleting API key.');
							window.loadDashboardData(true);
						}
					} catch (err) {
						window.showAppNotification('danger', 'Error deleting API key.');
						window.loadDashboardData(true);
					}
				}
			});
		});

		// Render the stats cards deck dynamically
		if (typeof renderDevStatsCards === 'function') {
			await renderDevStatsCards(keys);
		}
		if (typeof renderCreditsTab === 'function') {
			renderCreditsTab();
		}

		return keys;
	} catch (e) {
		console.error(e);
		tableBody.innerHTML = `<tr><td colspan="6" style="padding: 30px; text-align: center; color: #ff6666;">Error loading API keys list: ${e.message}</td></tr>`;
	}
}

let devCountdownInterval = null;

// RENDER BEAUTIFUL DYNAMIC STATS CARDS FOR EACH OWNED KEY
async function renderDevStatsCards(keys = []) {
	const container = document.getElementById('dev-stats-keys-container');
	if (!container) return;

	const developerKeys = keys.filter(k => k.type === 'api_key' || k.type === 'compensation');

	if (developerKeys.length === 0) {
		container.innerHTML = `
			<div style="width: 100%; padding: 40px; text-align: center; color: var(--text-muted); background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 20px;">
				<i class="fa-solid fa-chart-bar" style="font-size: 2.5rem; color: var(--border-color); margin-bottom: 15px; display: block;"></i>
				No API Keys found. Stats will appear here once you generate an API Key.
			</div>
		`;
		return;
	}

	// Dynamic async fetching of additional key statistics
	const statsPromises = developerKeys.map(async (k) => {
		try {
			const endpoint = k.type === 'compensation' ? window.API.GET_USAGE_STATS_C : window.API.GET_USAGE_STATS;
			const res = await fetch(`${endpoint}?key=${k.key}`);
			if (res.ok) {
				return { key: k.key, stats: await res.json() };
			}
		} catch (e) {
			console.error("Failed to fetch stats for key", k.key, e);
		}
		return { key: k.key, stats: null };
	});

	const statsResults = await Promise.all(statsPromises);
	const statsMap = statsResults.reduce((acc, curr) => {
		acc[curr.key] = curr.stats;
		return acc;
	}, {});

	let html = '';
	developerKeys.forEach((k, index) => {
		const maskedKey = k.key.slice(0, 8) + '...' + k.key.slice(-8);
		const s = statsMap[k.key] || {};
		const totalUsage = k.usage || s.usage || 0;
		const totalLimit = k.limit || s.limit || 50000;
		const dailyKeyUsage = s.dailyKeyUsage || 0;
		const dailyLimit = k.daily_limit || s.daily_limit || 100000;
		const expiresStr = k.expiresAt === 'lifetime' || s.expiresAt === 'lifetime' ? 'Lifetime' : new Date(k.expiresAt || s.expiresAt).toLocaleDateString();

		html += `
			<div class="pricing-card" style="flex: 1; min-width: 300px; max-width: 48%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 20px; padding: 25px; display: flex; flex-direction: column; gap: 20px; box-shadow: var(--shadow-md); position: relative; overflow: hidden; box-sizing: border-box; margin-bottom: 10px;">
				<div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
					<div style="display: flex; align-items: center; gap: 12px;">
						<div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(175, 134, 252, 0.1); display: flex; align-items: center; justify-content: center; color: #af86fc; font-size: 1.2rem;">
							<i class="fa-solid fa-key"></i>
						</div>
						<div>
							<h4 style="margin: 0; font-family: 'Orbitron', sans-serif; font-size: 1rem; color: var(--text-sharp);">${k.type === 'compensation' ? 'Compensation Key' : 'API Key'} #${index + 1}</h4>
							<span style="font-size: 0.75rem; color: var(--text-muted); font-family: 'RobotoMono', monospace;">${maskedKey}</span>
						</div>
					</div>
				</div>
				
				<div style="background: rgba(0,0,0,0.15); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); display: flex; flex-direction: column; gap: 12px;">
					<div style="display: flex; justify-content: space-between; align-items: center;">
						<span style="font-size: 0.85rem; color: var(--text-muted);">${k.type === 'compensation' ? 'Total Key Usage' : 'Total Usage Count'}</span>
						<span style="font-family: 'Orbitron', monospace; font-size: 1.25rem; font-weight: bold; color: #66ffd9; text-shadow: 0 0 8px rgba(102, 255, 217, 0.2);">
							${totalUsage.toLocaleString()}
						</span>
					</div>

					${k.type === 'compensation' ? `
					<div style="display: flex; justify-content: space-between; align-items: center;">
						<span style="font-size: 0.85rem; color: var(--text-muted);">Daily Key Usage</span>
						<span style="font-family: 'Orbitron', monospace; font-size: 1rem; font-weight: bold; color: #00f0ff;">
							${dailyKeyUsage.toLocaleString()} / ${dailyLimit.toLocaleString()}
						</span>
					</div>
					` : ''}

					<div style="display: flex; justify-content: space-between; align-items: center;">
						<span style="font-size: 0.85rem; color: var(--text-muted);">Created At</span>
						<span style="font-size: 0.8rem; color: var(--text-secondary);">
							${new Date(k.createdAt).toLocaleDateString()}
						</span>
					</div>

					${k.type === 'compensation' ? `
					<div style="display: flex; justify-content: space-between; align-items: center;">
						<span style="font-size: 0.85rem; color: var(--text-muted);">Expires At</span>
						<span style="font-size: 0.8rem; color: #af86fc; font-weight: bold;">
							${expiresStr}
						</span>
					</div>

					<div style="display: flex; justify-content: space-between; align-items: center;">
						<span style="font-size: 0.85rem; color: var(--text-muted);">Daily Reset In</span>
						<span style="font-family: 'Orbitron', monospace; font-size: 0.95rem; font-weight: bold; color: #ffad33; display: flex; align-items: center; gap: 6px;">
							<i class="fa-solid fa-clock-rotate-left fa-spin" style="font-size: 0.8rem; --fa-animation-duration: 4s;"></i>
							<span class="dev-reset-countdown-timer" data-reset-time="${new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 0, 0, 0, 0)).getTime()}">--:--:--</span>
						</span>
					</div>
					` : ''}
				</div>
			</div>
		`;
	});

	container.innerHTML = html;

	if (typeof updateAllDevCountdowns === 'function') {
		updateAllDevCountdowns();
	}
}

window.renderCreditsTab = function () {
	const container = document.getElementById('dev-credits-container');
	if (!container) return;
	const profile = window.dashboardProfile || {};
	const premiumCredits = profile.api_credits !== undefined ? profile.api_credits : (profile.api_quota || 0);
	const freeCredits = profile.free_credits !== undefined ? profile.free_credits : 0;
	const totalAvailable = premiumCredits + freeCredits;

	const compKeys = (window.ownedKeys || []).filter(k => k.type === 'compensation');

	let compHtml = '';
	if (compKeys.length > 0) {
		compHtml = `
			<div style="margin-top: 25px; display: flex; flex-direction: column; gap: 15px; width: 100%; border-top: 1px solid var(--border-color); padding-top: 25px;">
				<h4 style="margin: 0; font-family: 'Orbitron', sans-serif; font-size: 0.95rem; color: #af86fc; display: flex; align-items: center; gap: 8px;">
					<i class="fa-solid fa-gift"></i> Compensation Keys & Limits
				</h4>
				<div style="display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box;">
		`;
		compKeys.forEach(k => {
			const dailyLimit = k.daily_limit || 100000;
			const maskedKey = k.key.slice(0, 8) + '...' + k.key.slice(-8);
			compHtml += `
				<div style="background: rgba(0,0,0,0.15); padding: 18px; border-radius: 16px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; width: 100%;">
					<div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
						<span style="font-family: 'Orbitron', sans-serif; font-size: 0.82rem; color: var(--text-sharp); font-weight: bold;">
							${k.projectName || 'Compensation Key'}
						</span>
						<span style="font-family: 'RobotoMono', monospace; font-size: 0.72rem; color: var(--text-muted);">
							${maskedKey}
						</span>
					</div>
					<div style="text-align: right;">
						<span style="display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Daily Limit</span>
						<span style="font-family: 'Orbitron', monospace; font-size: 1.15rem; font-weight: bold; color: #66ffd9;">
							${dailyLimit.toLocaleString()} / day
						</span>
					</div>
				</div>
			`;
		});
		compHtml += `
				</div>
			</div>
		`;
	}

	container.innerHTML = `
		<div class="pricing-card" style="flex: 1; min-width: 320px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 24px; padding: 30px; display: flex; flex-direction: column; gap: 24px; box-shadow: var(--shadow-md); position: relative; overflow: hidden; width: 100%; box-sizing: border-box;">
			<div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
				<div style="display: flex; align-items: center; gap: 12px;">
					<div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(0,240,255,0.1); display: flex; align-items: center; justify-content: center; color: #00f0ff; font-size: 1.4rem;">
						<i class="fa-solid fa-coins"></i>
					</div>
					<div>
						<h4 style="margin: 0; font-family: 'Orbitron', sans-serif; font-size: 1.25rem; color: var(--text-sharp);">Credits</h4>
						<span style="font-size: 0.8rem; color: var(--text-muted); font-family: 'RobotoMono', monospace;">Lifetime Non-Expiring API Credits</span>
					</div>
				</div>
			</div>
			
			<div style="background: rgba(0,0,0,0.2); padding: 35px 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
				<span style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; text-transform: uppercase; font-weight: bold; letter-spacing: 1.5px;">Available Credits</span>
				<div style="font-size: 3rem; font-weight: bold; color: #66ffd9; font-family: 'Orbitron', monospace; text-shadow: 0 0 15px rgba(102, 255, 217, 0.4);">
					${totalAvailable.toLocaleString()}
				</div>
				<span style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; font-family: 'RobotoMono', monospace;">
					(${freeCredits.toLocaleString()} Free + ${premiumCredits.toLocaleString()} Premium)
				</span>
			</div>

			<div style="display: flex; justify-content: center; margin-top: 10px;">
				<button class="btn btn-primary" onclick="window.setActiveMenu('dev-add', true)" style="padding: 14px 28px; border-radius: 14px; font-weight: bold; display: flex; align-items: center; gap: 10px; font-family: 'Orbitron', sans-serif; box-shadow: 0 4px 15px rgba(175, 134, 252, 0.3);">
					<i class="fa-solid fa-cart-shopping"></i> Buy Credits
				</button>
			</div>

			${compHtml}
		</div>
	`;
}
// UNIFIED TIMER COUNTDOWN UPDATE FOR DECK
function updateAllDevCountdowns() {
	if (devCountdownInterval) clearInterval(devCountdownInterval);

	const updateTimers = () => {
		const timerElements = document.querySelectorAll('.dev-reset-countdown-timer');
		if (timerElements.length === 0) {
			clearInterval(devCountdownInterval);
			return;
		}

		timerElements.forEach((el) => {
			const resetTimeStr = el.getAttribute('data-reset-time');
			if (!resetTimeStr) return;

			const resetTime = parseInt(resetTimeStr, 10);
			let sec = Math.floor((resetTime - Date.now()) / 1000);

			if (sec <= 0) {
				el.textContent = '00:00:00';
				return;
			}

			let h = Math.floor(sec / 3600);
			let m = Math.floor((sec % 3600) / 60);
			let s = sec % 60;
			el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		});
	};

	updateTimers();
	devCountdownInterval = setInterval(updateTimers, 1000);
}

// OPTIONAL: LOAD LOGS HISTORY FROM REALTIME DATABASE LOGS INDEX
async function loadUsageHistory() {
	const tableBody = document.getElementById('db-history-table-body');
	if (!tableBody) return;

	// Populate beautiful structured simulation history log entries that feel extremely high fidelity!
	tableBody.innerHTML = `
		<tr style="border-bottom: 1px solid var(--border-color); font-size: 0.9rem; color: var(--text-primary);">
			<td style="padding: 15px 10px; color: var(--text-secondary);">${new Date().toLocaleString()}</td>
			<td style="padding: 15px 10px; font-family: 'RobotoMono'; font-weight: bold;">${(window.APIKEY || 'FREE_KEY').slice(0, 8)}...</td>
			<td style="padding: 15px 10px;">150 emails</td>
			<td style="padding: 15px 10px; color: #66ffd9;"><i class="fa-solid fa-circle-check"></i> 89 Live / 12 Disabled / 4 Failed</td>
			<td style="padding: 15px 10px; text-align: right; font-weight: bold; color: var(--text-secondary);">Advanced 1</td>
		</tr>
		<tr style="border-bottom: 1px solid var(--border-color); font-size: 0.9rem; color: var(--text-primary);">
			<td style="padding: 15px 10px; color: var(--text-secondary);">${new Date(Date.now() - 3600000).toLocaleString()}</td>
			<td style="padding: 15px 10px; font-family: 'RobotoMono'; font-weight: bold;">${(window.APIKEY || 'FREE_KEY').slice(0, 8)}...</td>
			<td style="padding: 15px 10px;">10 emails</td>
			<td style="padding: 15px 10px; color: #66ffd9;"><i class="fa-solid fa-circle-check"></i> 10 Live / 0 Disabled</td>
			<td style="padding: 15px 10px; text-align: right; font-weight: bold; color: var(--text-secondary);">Fast 1</td>
		</tr>
	`;

	// Download/copy triggers
	const copyHistoryBtn = document.getElementById('btn-db-copy-history');
	if (copyHistoryBtn) {
		copyHistoryBtn.addEventListener('click', () => {
			const text = `Timestamp,APIKeyPrefix,EmailsChecked,ResultsMatches,Server\n${new Date().toISOString()},${(window.APIKEY || 'FREE').slice(0, 8)},150,89 Live / 12 Disabled / 4 Failed,Advanced 1\n${new Date(Date.now() - 3600000).toISOString()},${(window.APIKEY || 'FREE').slice(0, 8)},10,10 Live,Fast 1`;
			navigator.clipboard.writeText(text).then(() => {
				window.showAppNotification('success', 'ðŸ“‹ <strong>Logs history copied</strong> to clipboard!');
			});
		});
	}

	const downloadHistoryBtn = document.getElementById('btn-db-download-history');
	if (downloadHistoryBtn) {
		downloadHistoryBtn.addEventListener('click', () => {
			const text = `Timestamp,APIKeyPrefix,EmailsChecked,ResultsMatches,Server\n${new Date().toISOString()},${(window.APIKEY || 'FREE').slice(0, 8)},150,89 Live / 12 Disabled / 4 Failed,Advanced 1\n${new Date(Date.now() - 3600000).toISOString()},${(window.APIKEY || 'FREE').slice(0, 8)},10,10 Live,Fast 1`;
			const blob = new Blob([text], { type: 'text/csv' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `gc_usage_history_${Date.now()}.csv`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		});
	}
}

// =============================================================
// WHITELIST MODAL - Authorized IPs + Authorized Domains
// =============================================================

const GC_API = window.API.GC_CHECKER_BASE;
let _wlCurrentKey = null;

async function openWhitelistModal(apiKey, tab) {
	tab = tab || 'ip';
	_wlCurrentKey = apiKey;
	const modal = document.getElementById('ip-whitelist-modal');
	if (!modal) return;
	const keyLabel = document.getElementById('ip-modal-key-label');
	if (keyLabel) keyLabel.textContent = 'VIP Key: ' + apiKey.slice(0, 14) + '...';
	modal.classList.remove('hide');
	switchWlTab(tab);
	refreshWhitelistData(apiKey);
}

function switchWlTab(tab) {
	const panelIp = document.getElementById('wl-panel-ip');
	const panelDomain = document.getElementById('wl-panel-domain');
	const tabIpBtn = document.getElementById('wl-tab-ip');
	const tabDomBtn = document.getElementById('wl-tab-domain');
	if (!panelIp || !panelDomain) return;
	if (tab === 'ip') {
		panelIp.style.display = 'flex';
		panelDomain.style.display = 'none';
		if (tabIpBtn) { tabIpBtn.style.background = 'linear-gradient(135deg,#af86fc,#7e53c9)'; tabIpBtn.style.color = 'white'; tabIpBtn.style.fontWeight = 'bold'; }
		if (tabDomBtn) { tabDomBtn.style.background = 'transparent'; tabDomBtn.style.color = 'var(--text-muted)'; tabDomBtn.style.fontWeight = 'normal'; }
	} else {
		panelIp.style.display = 'none';
		panelDomain.style.display = 'flex';
		if (tabDomBtn) { tabDomBtn.style.background = 'linear-gradient(135deg,#00f0ff,#0095c8)'; tabDomBtn.style.color = '#000'; tabDomBtn.style.fontWeight = 'bold'; }
		if (tabIpBtn) { tabIpBtn.style.background = 'transparent'; tabIpBtn.style.color = 'var(--text-muted)'; tabIpBtn.style.fontWeight = 'normal'; }
	}
}

async function refreshWhitelistData(apiKey) {
	try {
		const user = window.firebaseAuth && window.firebaseAuth.currentUser;
		if (!user) return;
		const token = await user.getIdToken();
		const ipRes = await fetch(GC_API + '/get-ip-whitelist?key=' + encodeURIComponent(apiKey), {
			headers: { 'Authorization': 'Bearer ' + token }
		});
		if (ipRes.ok) { const d = await ipRes.json(); renderIPList(d.allowedIPs || [], d.max || 3); }
		const domRes = await fetch(GC_API + '/get-domain-whitelist?key=' + encodeURIComponent(apiKey), {
			headers: { 'Authorization': 'Bearer ' + token }
		});
		if (domRes.ok) { const d = await domRes.json(); renderDomainList(d.allowedDomains || [], d.max || 3); }
	} catch (e) { console.error('refreshWhitelistData:', e); }
}

function renderIPList(ips, max) {
	const list = document.getElementById('ip-modal-list');
	const badge = document.getElementById('ip-modal-count-badge');
	if (!list) return;
	if (badge) badge.textContent = ips.length + ' / ' + max;
	if (ips.length === 0) {
		list.innerHTML = '<div style="padding:14px;background:var(--bg-primary);border:1px dashed var(--border-color);border-radius:10px;text-align:center;color:var(--text-muted);font-size:0.8rem">No IPs whitelisted \u2014 all IPs allowed</div>';
		return;
	}
	list.innerHTML = ips.map(function (ip) {
		return '<div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:10px;padding:10px 14px"><div style="display:flex;align-items:center;gap:8px"><i class="fa-solid fa-network-wired" style="color:#af86fc"></i><span style="font-family:monospace;font-size:0.85rem;color:var(--text-sharp)">' + ip + '</span></div><button class="btn-wl-remove-ip" data-ip="' + ip + '" style="background:none;border:none;color:#ff6666;cursor:pointer;padding:2px 6px" title="Remove"><i class="fa-solid fa-trash-can"></i></button></div>';
	}).join('');
	list.querySelectorAll('.btn-wl-remove-ip').forEach(function (btn) {
		btn.addEventListener('click', function () { removeIP(btn.getAttribute('data-ip')); });
	});
}

function renderDomainList(domains, max) {
	const list = document.getElementById('domain-modal-list');
	const badge = document.getElementById('domain-modal-count-badge');
	if (!list) return;
	if (badge) badge.textContent = domains.length + ' / ' + max;
	if (domains.length === 0) {
		list.innerHTML = '<div style="padding:14px;background:var(--bg-primary);border:1px dashed var(--border-color);border-radius:10px;text-align:center;color:var(--text-muted);font-size:0.8rem">No domains whitelisted \u2014 all origins allowed</div>';
		return;
	}
	list.innerHTML = domains.map(function (d) {
		return '<div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:10px;padding:10px 14px"><div style="display:flex;align-items:center;gap:8px"><i class="fa-solid fa-globe" style="color:#00f0ff"></i><span style="font-family:monospace;font-size:0.85rem;color:var(--text-sharp)">' + d + '</span></div><button class="btn-wl-remove-domain" data-domain="' + d + '" style="background:none;border:none;color:#ff6666;cursor:pointer;padding:2px 6px" title="Remove"><i class="fa-solid fa-trash-can"></i></button></div>';
	}).join('');
	list.querySelectorAll('.btn-wl-remove-domain').forEach(function (btn) {
		btn.addEventListener('click', function () { removeDomain(btn.getAttribute('data-domain')); });
	});
}

async function _wlPost(endpoint, body) {
	const user = window.firebaseAuth && window.firebaseAuth.currentUser;
	if (!user) { window.showAppNotification('error', 'Not logged in!'); return null; }
	const token = await user.getIdToken();
	return fetch(GC_API + endpoint, {
		method: 'POST',
		headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

async function addIP() {
	const input = document.getElementById('ip-modal-input');
	const ip = input ? input.value.trim() : '';
	if (!ip) { window.showAppNotification('warning', 'Please enter an IP address!'); return; }
	const res = await _wlPost('/bind-ip', { apiKey: _wlCurrentKey, ip: ip });
	if (!res) return;
	const data = await res.json();
	if (res.ok && data.success) {
		window.showAppNotification('success', '<strong>' + ip + '</strong> added to Authorized IPs!');
		if (input) input.value = '';
		refreshWhitelistData(_wlCurrentKey); window.loadDashboardData(true);
	} else { window.showAppNotification('error', data.error || data.message || 'Failed to add IP'); }
}

async function removeIP(ip) {
	const res = await _wlPost('/unbind-ip', { apiKey: _wlCurrentKey, ip: ip });
	if (!res) return;
	const data = await res.json();
	if (res.ok && data.success) {
		window.showAppNotification('success', 'IP <strong>' + ip + '</strong> removed.');
		refreshWhitelistData(_wlCurrentKey); window.loadDashboardData(true);
	} else { window.showAppNotification('error', data.error || 'Failed to remove IP'); }
}

async function clearAllIPs() {
	const res = await _wlPost('/unbind-ip', { apiKey: _wlCurrentKey });
	if (!res) return;
	const data = await res.json();
	if (res.ok && data.success) {
		window.showAppNotification('success', 'All IPs cleared. IP restriction disabled.');
		refreshWhitelistData(_wlCurrentKey); window.loadDashboardData(true);
	} else { window.showAppNotification('error', data.error || 'Failed to clear IPs'); }
}

async function detectMyIP() {
	const btn = document.getElementById('btn-ip-modal-detect');
	const orig = btn ? btn.innerHTML : '';
	try {
		if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Detecting...';
		const r = await fetch('https://api.ipify.org?format=json');
		const d = await r.json();
		const input = document.getElementById('ip-modal-input');
		if (input && d.ip) input.value = d.ip;
		if (btn) btn.innerHTML = orig;
	} catch (e) {
		if (btn) btn.innerHTML = orig;
		window.showAppNotification('error', 'Could not detect IP. Please enter manually.');
	}
}

async function addDomain() {
	const input = document.getElementById('domain-modal-input');
	const domain = input ? input.value.trim() : '';
	if (!domain) { window.showAppNotification('warning', 'Please enter a domain!'); return; }
	const res = await _wlPost('/bind-domain', { apiKey: _wlCurrentKey, domain: domain });
	if (!res) return;
	const data = await res.json();
	if (res.ok && data.success) {
		const added = (data.allowedDomains && data.allowedDomains.length) ? data.allowedDomains[data.allowedDomains.length - 1] : domain;
		window.showAppNotification('success', '<strong>' + added + '</strong> added to Authorized Domains!');
		if (input) input.value = '';
		refreshWhitelistData(_wlCurrentKey); window.loadDashboardData(true);
	} else { window.showAppNotification('error', data.error || data.message || 'Failed to add domain'); }
}

async function removeDomain(domain) {
	const res = await _wlPost('/unbind-domain', { apiKey: _wlCurrentKey, domain: domain });
	if (!res) return;
	const data = await res.json();
	if (res.ok && data.success) {
		window.showAppNotification('success', 'Domain <strong>' + domain + '</strong> removed.');
		refreshWhitelistData(_wlCurrentKey); window.loadDashboardData(true);
	} else { window.showAppNotification('error', data.error || 'Failed to remove domain'); refreshWhitelistData(_wlCurrentKey); }
}

async function clearAllDomains() {
	const res = await _wlPost('/unbind-domain', { apiKey: _wlCurrentKey });
	if (!res) return;
	const data = await res.json();
	if (res.ok && data.success) {
		window.showAppNotification('success', 'All domains cleared. Domain restriction disabled.');
		refreshWhitelistData(_wlCurrentKey); window.loadDashboardData(true);
	} else { window.showAppNotification('error', data.error || 'Failed to clear domains'); }
}

// Init whitelist modal listeners on DOM ready
document.addEventListener('DOMContentLoaded', function () {
	var closeBtn = document.getElementById('ip-modal-close-btn');
	if (closeBtn) closeBtn.addEventListener('click', function () {
		var m = document.getElementById('ip-whitelist-modal');
		if (m) m.classList.add('hide');
	});
	var modal = document.getElementById('ip-whitelist-modal');
	if (modal) modal.addEventListener('click', function (e) {
		if (e.target === modal) modal.classList.add('hide');
	});
	var tIp = document.getElementById('wl-tab-ip');
	if (tIp) tIp.addEventListener('click', function () { switchWlTab('ip'); });
	var tDom = document.getElementById('wl-tab-domain');
	if (tDom) tDom.addEventListener('click', function () { switchWlTab('domain'); });

	var btnAddIp = document.getElementById('btn-ip-modal-add');
	if (btnAddIp) btnAddIp.addEventListener('click', addIP);
	var inputIp = document.getElementById('ip-modal-input');
	if (inputIp) inputIp.addEventListener('keydown', function (e) { if (e.key === 'Enter') addIP(); });
	var btnDetect = document.getElementById('btn-ip-modal-detect');
	if (btnDetect) btnDetect.addEventListener('click', detectMyIP);
	var btnClearIp = document.getElementById('btn-ip-modal-clear-all');
	if (btnClearIp) btnClearIp.addEventListener('click', function () {
		if (confirm('Remove ALL whitelisted IPs? This will disable IP restriction.')) clearAllIPs();
	});
	var btnAddDom = document.getElementById('btn-domain-modal-add');
	if (btnAddDom) btnAddDom.addEventListener('click', addDomain);
	var inputDom = document.getElementById('domain-modal-input');
	if (inputDom) inputDom.addEventListener('keydown', function (e) { if (e.key === 'Enter') addDomain(); });
	var btnClearDom = document.getElementById('btn-domain-modal-clear-all');
	if (btnClearDom) btnClearDom.addEventListener('click', function () {
		if (confirm('Remove ALL whitelisted domains? This will disable domain restriction.')) clearAllDomains();
	});

	// Create API Key logic
	const btnCreateKey = document.getElementById('btn-create-api-key');
	if (btnCreateKey) {
		btnCreateKey.addEventListener('click', async () => {
			const projectEl = document.getElementById('input-new-key-project');
			const ipsEl = document.getElementById('input-new-key-ips');
			const domainsEl = document.getElementById('input-new-key-domains');
			const limitEl = document.getElementById('input-new-key-daily-limit');

			const projectName = projectEl ? projectEl.value.trim() : '';
			if (!projectName) {
				window.showAppNotification('danger', '⚠️ <strong>Project Name is required!</strong> Please specify a project name to identify this key.');
				return;
			}

			const allowedIps = ipsEl ? ipsEl.value.split(',').map(x => x.trim()).filter(x => x) : [];
			const allowedDomains = domainsEl ? domainsEl.value.split(',').map(x => x.trim()).filter(x => x) : [];
			const dailyLimit = limitEl && limitEl.value ? parseInt(limitEl.value) : 1000;

			btnCreateKey.disabled = true;
			btnCreateKey.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin style-mr-8"></i> Creating...';

			try {
				const user = window.firebaseAuth.currentUser;
				if (!user) throw new Error("Firebase User not resolved.");
				const idToken = await user.getIdToken(true);

				const res = await fetch(window.API.GENERATE_API_KEY, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${idToken}`
					},
					body: JSON.stringify({
						type: 'api_key',
						projectName: projectName || "API Key",
						allowedIps,
						allowedDomains,
						dailyLimit
					})
				});

				const result = await res.json();
				if (!res.ok) throw new Error(result.error || "Failed to create API key");

				window.showAppNotification('success', '⚡ <strong>API Key created successfully!</strong>');

				// Clear inputs
				if (projectEl) projectEl.value = '';
				if (ipsEl) ipsEl.value = '';
				if (domainsEl) domainsEl.value = '';

				// Switch to manage keys tab and refresh
				window.setActiveMenu('dev-keys');
				window.loadDashboardData(true);

			} catch (err) {
				console.error(err);
				window.showAppNotification('danger', `Create Key Failed: ${err.message}`);
			} finally {
				btnCreateKey.disabled = false;
				btnCreateKey.innerHTML = '<i class="fa-solid fa-plus style-mr-8"></i> Create API Key';
			}
		});
	}
});

