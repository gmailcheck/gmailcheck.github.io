// js/pricing.js
// Dedicated controller for pricing plans and visual simulated sandbox payments

// Store products globally from backend
let backendProducts = {};
let selectedPlanType = 'vip_1m'; // Default plan type

document.addEventListener('DOMContentLoaded', async () => {
	await fetchProducts(); // Fetch products first
	initPricing();
});

async function fetchProducts() {
	try {
		const response = await fetch(window.API.PRODUCTS);
		const data = await response.json();
		backendProducts = data.products || {};
	} catch (err) {
		console.error("Failed to fetch products:", err);
		// Fallback to empty object, UI will show "No products"
		backendProducts = {};
	}
}

function initPricing() {
	// 1. SELECTOR PILL - MONTHLY / YEARLY TOGGLE (UNTUK SUBSCRIPTION)
	const btnMonth = document.getElementById('btn-period-month');
	const btnYear = document.getElementById('btn-period-year');
	const planCost = document.getElementById('vip-plan-cost');
	const planPeriod = document.getElementById('vip-price-period');

	// Ambil produk subscription untuk ditampilkan di pill
	const subProducts = Object.entries(backendProducts).filter(([id, prod]) => prod.type === 'subscription');
	const monthlySub = subProducts.find(([id]) => id === 'vip_1m');
	const yearlySub = subProducts.find(([id]) => id === 'vip_1y');

	if (btnMonth && btnYear && planCost && planPeriod) {
		btnMonth.addEventListener('click', () => {
			btnMonth.classList.add('active');
			btnYear.classList.remove('active');
			if (monthlySub) {
				planCost.textContent = `$${monthlySub[1].price_usd}`;
				selectedPlanType = monthlySub[0];
			} else {
				planCost.textContent = '$9.99';
				selectedPlanType = 'vip_1m';
			}
			planPeriod.textContent = '/ month';
		});

		btnYear.addEventListener('click', () => {
			btnYear.classList.add('active');
			btnMonth.classList.remove('active');
			if (yearlySub) {
				planCost.textContent = `$${yearlySub[1].price_usd}`;
				selectedPlanType = yearlySub[0];
			} else {
				planCost.textContent = '$79.99';
				selectedPlanType = 'vip_1y';
			}
			planPeriod.textContent = '/ year';
		});

		// Trigger initial load (monthly)
		if (monthlySub) {
			planCost.textContent = `$${monthlySub[1].price_usd}`;
			selectedPlanType = monthlySub[0];
		}
	}

	// 1.5 UPDATE STATIC PRICING CARDS DYNAMICALLY
	const planIds = ['pro_subs', 'ultra_subs'];
	planIds.forEach(id => {
		const priceDisplay = document.getElementById(`display-price-${id}`);
		const product = backendProducts[id];
		if (priceDisplay && product) {
			priceDisplay.textContent = `$${product.price_usd}`;
		}
	});


	// 2. CLAIM PREMIUM TRIAL BUTTON
	const btnClaimTrial = document.getElementById('btn-claim-trial');
	if (btnClaimTrial) {
		btnClaimTrial.addEventListener('click', async () => {
			// Check authentication first
			if (!window.isUserAuthenticated) {
				window.loginRedirectTarget = 'pricing';
				window.showAppNotification('warning', 'Please <strong>Sign In</strong> to claim your premium trial!');
				window.setActiveMenu('login', true);
				return;
			}

			// Perform claim trial logic
			btnClaimTrial.disabled = true;
			btnClaimTrial.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Activating...';

			try {
				const user = window.firebaseAuth.currentUser;
				if (!user) throw new Error("Firebase User not resolved.");

				const idToken = await user.getIdToken(true);

				// POST to auth service to claim trial
				const res = await fetch(window.API.CLAIM_TRIAL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${idToken}`
					}
				});

				const result = await res.json();
				if (!res.ok) {
					throw new Error(result.message || result.error || "Failed to claim trial");
				}

				// Generate Trial API Key on Checker service
				const keyRes = await fetch(window.API.GENERATE_API_KEY, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${idToken}`
					}
				});

				if (keyRes.ok) {
					const keyData = await keyRes.json();
					// Set key as active in localStorage
					localStorage.setItem('gmailChecker_apiData', JSON.stringify({
						apiKey: keyData.apiKey,
						type: 'trial',
						timestamp: Date.now()
					}));
					window.APIKEY = keyData.apiKey;

					// Update UI badge
					const userBadge = document.getElementById('user-badge-display');
					if (userBadge) userBadge.textContent = 'TRIAL';
					const popBadge = document.getElementById('profile-popover-badge-display');
					if (popBadge) popBadge.textContent = 'TRIAL';

					window.showAppNotification('success', '⚡ <strong>Trial Activated!</strong> Welcome to Premium. Redirecting...');
					setTimeout(() => {
						window.setActiveMenu('app1', true);
					}, 2000);
				} else {
					throw new Error("Trial status updated, but key generation failed.");
				}

			} catch (err) {
				console.error(err);
				window.showAppNotification('danger', `Trial Activation Failed: ${err.message}`);
				btnClaimTrial.disabled = false;
				btnClaimTrial.textContent = 'Claim 3-Day Trial';
			}
		});
	}

	// 3. GENERIC CHECKOUT MODAL OPENER
	const checkoutModal = document.getElementById('checkout-modal');
	const checkoutCloseBtn = document.getElementById('checkout-close-btn');

	window.openCheckoutModal = function (productId) {
		if (!checkoutModal) return;

		// Check authentication first
		if (!window.isUserAuthenticated) {
			window.loginRedirectTarget = window.currentActiveMenu;
			window.showAppNotification('warning', 'Please <strong>Sign In</strong> to complete your purchase!');
			window.setActiveMenu('login', true);
			return;
		}

		const product = backendProducts[productId];
		if (!product) {
			window.showAppNotification('danger', `Product ${productId} not found!`);
			return;
		}

		selectedPlanType = productId;

		const checkoutPlanName = document.getElementById('checkout-plan-name');
		const checkoutPlanPrice = document.getElementById('checkout-plan-price');
		const checkoutPlanDesc = document.getElementById('checkout-plan-desc');

		if (checkoutPlanName) checkoutPlanName.textContent = product.name;
		if (checkoutPlanPrice) checkoutPlanPrice.textContent = `$${product.price_usd}`;
		if (checkoutPlanDesc) checkoutPlanDesc.textContent = product.description;

		// Open checkout modal
		checkoutModal.classList.remove('hide');
	};

	// Bind purchase buttons dynamically for all subscription plans
	const subPlanIds = ['pro_subs', 'ultra_subs'];
	subPlanIds.forEach(id => {
		const btn = document.getElementById(`btn-upgrade-${id}`);
		if (btn) {
			btn.addEventListener('click', () => {
				window.openCheckoutModal(id);
			});
		}
	});

	// 1.6 UPDATE API KEY CARDS DYNAMICALLY
	const apiKeyIds = ['api_1M', 'api_2M', 'api_3M', 'api_4M', 'api_5M'];
	apiKeyIds.forEach(id => {
		const priceDisplay = document.getElementById(`display-price-${id}`);
		const product = backendProducts[id];
		if (priceDisplay && product) {
			priceDisplay.textContent = `$${product.price_usd}`;
		}

		const btn = document.getElementById(`btn-upgrade-${id}`);
		if (btn) {
			btn.addEventListener('click', () => {
				window.openCheckoutModal(id);
			});
		}
	});

	if (checkoutCloseBtn && checkoutModal) {
		checkoutCloseBtn.addEventListener('click', () => {
			checkoutModal.classList.add('hide');
		});
	}

	// 4. REAL CRYPTO INVOICE PROCESSOR (NOWPAYMENTS)
	const btnCreateCryptoInvoice = document.getElementById('btn-create-crypto-invoice');
	if (btnCreateCryptoInvoice) {
		btnCreateCryptoInvoice.addEventListener('click', async () => {
			btnCreateCryptoInvoice.disabled = true;
			btnCreateCryptoInvoice.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Initializing NOWPayments...';

			try {
				const user = window.firebaseAuth.currentUser;
				if (!user) throw new Error("Firebase User not resolved.");

				const idToken = await user.getIdToken(true);

				const res = await fetch(window.API.CREATE_INVOICE, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${idToken}`
					},
					body: JSON.stringify({
						productId: selectedPlanType,
						success_url: `${window.location.origin}${window.BASE_PATH || ''}`,
						cancel_url: `${window.location.origin}${window.BASE_PATH || ''}`
					})
				});

				const result = await res.json();
				if (!res.ok) {
					throw new Error(result.message || result.error || "Failed to create invoice");
				}

				if (result.invoice_url) {
					// Open payment link in new window
					window.open(result.invoice_url, '_blank');
					checkoutModal.classList.add('hide');
					window.showAppNotification('success', '💰 <strong>NOWPayments Invoice Created!</strong> Please complete payment in the new window.');

					// Update UI to show pending payment state immediately
					if (window.loadDashboardData) {
						window.loadDashboardData(true);

						// Poll profile updates 5 times, once every 1 minute
						let pollCount = 0;
						const pollInterval = setInterval(async () => {
							pollCount++;
							console.log(`Polling profile update after invoice creation (Attempt ${pollCount}/5)...`);
							if (window.loadDashboardData) {
								await window.loadDashboardData(true);
							}
							if (pollCount >= 5) {
								clearInterval(pollInterval);
							}
						}, 60000);
					}
				} else {
					throw new Error("No payment link returned by nowpayments.");
				}

			} catch (err) {
				console.error(err);
				window.showAppNotification('danger', `NOWPayments creation failed: ${err.message}`);
			} finally {
				btnCreateCryptoInvoice.disabled = false;
				btnCreateCryptoInvoice.innerHTML = 'Create NOWPayments Invoice <i class="fa-solid fa-arrow-up-right-from-square" style="margin-left: 5px; "></i>';
			}
		});
	}
}