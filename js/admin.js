// js/admin.js
document.addEventListener('DOMContentLoaded', () => {
    initAdminPanel();
});

function initAdminPanel() {
    // 1. Tab Switching
    const tabs = document.querySelectorAll('.db-tab-btn[data-tab^="admin-"]');
    const contents = document.querySelectorAll('.db-tab-content[id^="admin-"]');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.add('hide'));
            contents.forEach(c => c.classList.remove('active'));

            // Add active to clicked
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.remove('hide');
                targetContent.classList.add('active');
            }

            // Load specific tab data
            if (targetId === 'admin-users') loadAdminUsers();
            if (targetId === 'admin-payments') loadAdminPayments();
        });
    });

    // Expose active tab loading globally for route transitions
    window.loadActiveAdminTab = function () {
        const activeTab = document.querySelector('.db-tab-btn.active[data-tab^="admin-"]');
        if (activeTab) {
            const targetId = activeTab.getAttribute('data-tab');
            if (targetId === 'admin-users') loadAdminUsers();
            if (targetId === 'admin-payments') loadAdminPayments();
        }
    };

    // Trigger initial load on page boot if the admin panel is current page
    setTimeout(() => {
        const adminPage = document.getElementById('page-admin');
        if (adminPage && !adminPage.classList.contains('hide')) {
            window.loadActiveAdminTab();
        }
    }, 150);

    // 2. Grant Credits Form
    const btnGrantQuota = document.getElementById('admin-btn-grant-quota');
    if (btnGrantQuota) {
        btnGrantQuota.addEventListener('click', async () => {
            const email = document.getElementById('admin-quota-email').value.trim();
            const amount = document.getElementById('admin-quota-amount').value.trim();
            if (!email || !amount) return window.showAppNotification('warning', 'Please fill all fields');

            try {
                btnGrantQuota.disabled = true;
                const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/grant-credits`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${await getAuthToken()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, amount })
                });
                const data = await res.json();
                if (res.ok) {
                    window.showAppNotification('success', `Granted ${amount} credits to ${email}`);
                } else {
                    window.showAppNotification('danger', data.error || 'Failed to grant credits');
                }
            } catch (err) {
                window.showAppNotification('danger', 'Network error');
            } finally {
                btnGrantQuota.disabled = false;
            }
        });
    }

    // 3. Grant Subscription Form
    const btnGrantSub = document.getElementById('admin-btn-grant-sub');
    if (btnGrantSub) {
        btnGrantSub.addEventListener('click', async () => {
            const email = document.getElementById('admin-sub-email').value.trim();
            const plan = document.getElementById('admin-sub-plan').value;
            const days = document.getElementById('admin-sub-days').value.trim();
            const specialCredits = document.getElementById('admin-sub-special-quota').value.trim();
            if (!email || !days) return window.showAppNotification('warning', 'Please fill all fields');
            if (plan === 'special_subs' && !specialCredits) return window.showAppNotification('warning', 'Please enter custom credits for SPECIAL plan');

            try {
                btnGrantSub.disabled = true;
                const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/grant-subscription`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${await getAuthToken()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, plan, days, special_credits: specialCredits })
                });
                const data = await res.json();
                if (res.ok) {
                    window.showAppNotification('success', `Granted ${plan} for ${days} days to ${email}`);
                } else {
                    window.showAppNotification('danger', data.error || 'Failed to grant subscription');
                }
            } catch (err) {
                window.showAppNotification('danger', 'Network error');
            } finally {
                btnGrantSub.disabled = false;
            }
        });
    }

    // 4. Push Notification Form
    const btnPushNotif = document.getElementById('admin-btn-push-notif');
    if (btnPushNotif) {
        btnPushNotif.addEventListener('click', async () => {
            const email = document.getElementById('admin-notif-email').value.trim();
            const title = document.getElementById('admin-notif-title').value.trim();
            const message = document.getElementById('admin-notif-message').value.trim();
            const type = document.getElementById('admin-notif-type').value;
            if (!email || !title || !message) return window.showAppNotification('warning', 'Please fill all fields');

            try {
                btnPushNotif.disabled = true;
                const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/push-notification`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${await getAuthToken()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, title, message, type })
                });
                const data = await res.json();
                if (res.ok) {
                    window.showAppNotification('success', `Notification sent to ${email}`);
                    document.getElementById('admin-notif-title').value = '';
                    document.getElementById('admin-notif-message').value = '';
                } else {
                    window.showAppNotification('danger', data.error || 'Failed to send notification');
                }
            } catch (err) {
                window.showAppNotification('danger', 'Network error');
            } finally {
                btnPushNotif.disabled = false;
            }
        });
    }

    // 5. Generate Compensation Key Form
    const btnGenCompKey = document.getElementById('admin-btn-gen-comp-key');
    if (btnGenCompKey) {
        btnGenCompKey.addEventListener('click', async () => {
            const email = document.getElementById('admin-comp-email').value.trim();
            const dailyLimit = parseInt(document.getElementById('admin-comp-daily-limit').value) || 1000;
            const expiryDaysEl = document.getElementById('admin-comp-expiry-days');
            const expiryDays = expiryDaysEl && expiryDaysEl.value ? parseInt(expiryDaysEl.value) : null;
            const resultEl = document.getElementById('admin-comp-key-result');

            if (!email) return window.showAppNotification('warning', 'Please enter a user email');

            try {
                btnGenCompKey.disabled = true;
                btnGenCompKey.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" style="margin-right: 6px;"></i> Generating...';
                resultEl.style.display = 'none';

                const result = await window.adminGenerateCompensationKey(email, dailyLimit, expiryDays);
                if (result.success) {
                    const expiryLabel = expiryDays ? `${expiryDays} days from now` : 'Lifetime';
                    resultEl.style.display = 'block';
                    resultEl.innerHTML = `✅ <strong>Key generated:</strong><br><br>${result.apiKey}<br><br><span style="color: var(--text-muted); font-size: 0.72rem;">Daily limit: ${dailyLimit} req/day &nbsp;|&nbsp; Expiry: ${expiryLabel}</span>`;
                    window.showAppNotification('success', '🔑 Compensation key generated successfully!');
                } else {
                    window.showAppNotification('danger', result.error || 'Failed to generate key');
                }
            } catch (err) {
                window.showAppNotification('danger', 'Network error: ' + err.message);
            } finally {
                btnGenCompKey.disabled = false;
                btnGenCompKey.innerHTML = '<i class="fa-solid fa-key" style="margin-right: 6px;"></i> Generate Key';
            }
        });
    }
}

async function getAuthToken() {
    return await window.firebaseAuth.currentUser.getIdToken(true);
}

async function loadAdminUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    try {
        const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/users`, {
            headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const users = await res.json();

        // Update Total Users badge
        const totalUsersEl = document.getElementById('admin-total-users');
        if (totalUsersEl) {
            totalUsersEl.textContent = `Total Users: ${users.length}`;
        }

        tbody.innerHTML = '';
        users.forEach(u => {
            const tr = document.createElement('tr');
            
            // Format registration date
            const regDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A';
            const emailColHtml = `
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: bold; color: var(--text-sharp);">${u.email}</span>
                    <small style="color: var(--text-muted); font-size: 10px; margin-top: 2px;">Reg: ${regDate}</small>
                </div>
            `;

            // Format last seen with glowing "Online" indicator if active in last 5 minutes
            let lastSeenHtml = '';
            if (!u.lastSeen) {
                lastSeenHtml = `<span style="color: var(--text-muted);">Never</span>`;
            } else {
                const diff = Date.now() - u.lastSeen;
                if (diff < 5 * 60 * 1000) { // 5 minutes
                    lastSeenHtml = `<span style="color: #66ffd9; font-weight: bold; display: inline-flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #66ffd9; box-shadow: 0 0 8px #66ffd9;"></span>Online</span>`;
                } else {
                    lastSeenHtml = `<span style="color: var(--text-muted); font-size: 11px;">${new Date(u.lastSeen).toLocaleString()}</span>`;
                }
            }

            const planLabel = u.subscription_plan === 'none' ? 'free' : u.subscription_plan;

            tr.innerHTML = `
                <td>${emailColHtml}</td>
                <td style="text-transform: capitalize; font-weight: bold;">${planLabel}</td>
                <td>${u.subscription_expiry ? new Date(u.subscription_expiry).toLocaleDateString() : 'Lifetime'}</td>
                <td style="font-family: monospace;">${u.api_usage.toLocaleString()} / ${(u.api_credits !== undefined ? u.api_credits : u.api_quota).toLocaleString()}</td>
                <td>${lastSeenHtml}</td>
                <td><span style="background: ${u.role === 'admin' ? 'rgba(175, 134, 252, 0.15)' : 'rgba(255,255,255,0.05)'}; color: ${u.role === 'admin' ? '#af86fc' : 'var(--text-muted)'}; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase;">${u.role}</span></td>
                <td>-</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Failed to load users: ${err.message}</td></tr>`;
    }
}

async function loadAdminPayments() {
    const tbody = document.getElementById('admin-payments-tbody');
    try {
        const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/payments`, {
            headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        // Support both array and object formats
        const payments = Array.isArray(data) ? data : Object.values(data || {});

        tbody.innerHTML = '';
        if (payments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No payments found</td></tr>`;
            return;
        }
        payments.forEach(p => {
            if (!p) return;
            const tr = document.createElement('tr');
            const date = p.completed_at || p.timestamp ? new Date(p.completed_at || p.timestamp).toLocaleDateString() : 'N/A';
            tr.innerHTML = `
                <td>${date}</td>
                <td>${p.email || 'N/A'}</td>
                <td>${p.productName || p.productId || 'N/A'}</td>
                <td>${p.price_amount_usd ? '$' + p.price_amount_usd : 'N/A'}</td>
                <td style="font-family: monospace; font-size: 11px;">${p.invoice_id || 'N/A'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Failed to load payments: ${err.message}</td></tr>`;
    }
}

// Generate a compensation key for a user (admin only)
window.adminGenerateCompensationKey = async function (email, dailyLimit = 1000, expiryDays = null) {
    try {
        const token = await getAuthToken();
        const body = {
            type: 'compensation',
            projectName: `Comp`,
            dailyLimit,
            email: email.trim().toLowerCase()
        };
        if (expiryDays) body.expiryDays = expiryDays;
        const res = await fetch(window.API.GENERATE_API_KEY, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            return { success: true, apiKey: data.apiKey };
        }
        return { success: false, error: data.error };
    } catch (e) {
        return { success: false, error: e.message };
    }
};
