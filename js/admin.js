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
            if (targetId !== 'admin-support') {
                stopAdminSupportAutoRefresh();
            }
            if (targetId === 'admin-users') loadAdminUsers();
            if (targetId === 'admin-payments') loadAdminPayments();
            if (targetId === 'admin-support') loadAdminSupport();
        });
    });

    // Expose active tab loading globally for route transitions
    window.loadActiveAdminTab = function () {
        const activeTab = document.querySelector('.db-tab-btn.active[data-tab^="admin-"]');
        if (activeTab) {
            const targetId = activeTab.getAttribute('data-tab');
            if (targetId !== 'admin-support') {
                stopAdminSupportAutoRefresh();
            }
            if (targetId === 'admin-users') loadAdminUsers();
            if (targetId === 'admin-payments') loadAdminPayments();
            if (targetId === 'admin-support') loadAdminSupport();
        }
    };

    // User Directory Sorting Event Listener
    const sortDropdown = document.getElementById('admin-users-sort');
    if (sortDropdown) {
        sortDropdown.addEventListener('change', () => {
            if (typeof renderAdminUsersTable === 'function') {
                renderAdminUsersTable();
            }
        });
    }

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
                    resultEl.innerHTML = `✅ <strong>Key generated:</strong><br><br>${result.apiKey}<br><br><span style="color: var(--text-muted); ">Daily limit: ${dailyLimit} req/day &nbsp;|&nbsp; Expiry: ${expiryLabel}</span>`;
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

    // 6. Support Tickets Event Listeners
    const btnRefreshSupport = document.getElementById('admin-btn-refresh-support');
    if (btnRefreshSupport) {
        btnRefreshSupport.addEventListener('click', () => {
            loadAdminSupport();
            window.showAppNotification('success', '🔄 <strong>Support Tickets Refreshed</strong>');
        });
    }

    const modalCloseBtn = document.getElementById('admin-ticket-modal-close-btn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            document.getElementById('admin-ticket-modal').classList.add('hide');
            activeAdminTicketId = null;
        });
    }

    const btnSubmitReply = document.getElementById('admin-btn-submit-ticket-reply');
    if (btnSubmitReply) {
        btnSubmitReply.addEventListener('click', async () => {
            const input = document.getElementById('admin-ticket-modal-reply-input');
            const text = input.value.trim();
            if (!text || !activeAdminTicketId) return;

            btnSubmitReply.disabled = true;
            btnSubmitReply.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

            try {
                // WebSocket optimized path
                if (adminSupportWS && adminSupportWS.readyState === WebSocket.OPEN) {
                    console.log("⚡ Sending admin reply via WebSocket...");
                    adminSupportWS.send(JSON.stringify({
                        type: "reply",
                        ticketId: activeAdminTicketId,
                        message: text
                    }));

                    // Update local state immediately
                    const ticket = loadedAdminTicketsList.find(t => t.ticketId === activeAdminTicketId);
                    if (ticket) {
                        if (!ticket.replies) ticket.replies = {};
                        const replyId = `RPL-${Date.now()}`;
                        const newReply = {
                            sender: "Admin",
                            senderType: "admin",
                            message: text,
                            images: [],
                            createdAt: Date.now()
                        };
                        ticket.replies[replyId] = newReply;
                        ticket.lastActivity = newReply.createdAt;

                        renderAdminSupportTable();
                        updateAdminModalState(ticket);
                    }

                    input.value = '';
                    window.showAppNotification('success', 'Reply submitted successfully!');
                    return;
                }

                // Fallback to HTTP POST
                const res = await fetch(`${window.API.GC_SUPPORT_BASE}/admin/ticket/reply`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${await getAuthToken()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ticketId: activeAdminTicketId, message: text })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to submit reply');

                input.value = '';
                window.showAppNotification('success', 'Reply submitted successfully!');
                if (data.reply) {
                    const ticket = loadedAdminTicketsList.find(t => t.ticketId === activeAdminTicketId);
                    if (ticket) {
                        if (!ticket.replies) ticket.replies = {};
                        const replyId = data.reply.replyId || `RPL-${Date.now()}`;
                        ticket.replies[replyId] = data.reply;
                        ticket.lastActivity = data.reply.createdAt || Date.now();

                        renderAdminSupportTable();
                        updateAdminModalState(ticket);
                    }
                }
            } catch (err) {
                window.showAppNotification('danger', err.message);
            } finally {
                btnSubmitReply.disabled = false;
                btnSubmitReply.innerHTML = 'Send Reply';
            }
        });
    }

    const btnResolve = document.getElementById('admin-btn-modal-resolve');
    if (btnResolve) {
        btnResolve.addEventListener('click', async () => {
            if (!activeAdminTicketId) return;

            btnResolve.disabled = true;
            btnResolve.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

            try {
                // WebSocket optimized path
                if (adminSupportWS && adminSupportWS.readyState === WebSocket.OPEN) {
                    console.log("⚡ Sending ticket resolve via WebSocket...");
                    adminSupportWS.send(JSON.stringify({
                        type: "resolve",
                        ticketId: activeAdminTicketId
                    }));

                    window.showAppNotification('success', 'Ticket resolved successfully!');
                    const ticket = loadedAdminTicketsList.find(t => t.ticketId === activeAdminTicketId);
                    if (ticket) {
                        ticket.status = "resolved";
                        ticket.lastActivity = Date.now();
                    }
                    renderAdminSupportTable();
                    document.getElementById('admin-ticket-modal').classList.add('hide');
                    activeAdminTicketId = null;
                    return;
                }

                // Fallback to HTTP POST
                const res = await fetch(`${window.API.GC_SUPPORT_BASE}/admin/ticket/resolve`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${await getAuthToken()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ticketId: activeAdminTicketId })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to resolve ticket');

                window.showAppNotification('success', 'Ticket resolved successfully!');
                const ticket = loadedAdminTicketsList.find(t => t.ticketId === activeAdminTicketId);
                if (ticket) {
                    ticket.status = "resolved";
                    ticket.lastActivity = Date.now();
                }
                renderAdminSupportTable();
                document.getElementById('admin-ticket-modal').classList.add('hide');
                activeAdminTicketId = null;
            } catch (err) {
                window.showAppNotification('danger', err.message);
            } finally {
                btnResolve.disabled = false;
                btnResolve.innerHTML = '<i class="fa-solid fa-check"></i> Mark Resolved';
            }
        });
    }
}

async function getAuthToken() {
    return await window.firebaseAuth.currentUser.getIdToken(false);
}

let loadedAdminUsersList = [];
window.adminUsersRefreshInterval = null;

async function loadAdminUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    try {
        const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/users`, {
            headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const users = await res.json();

        // Cache loaded users list in memory for fast frontend-only sorting
        loadedAdminUsersList = users || [];

        // Update Total Users badge
        const totalUsersEl = document.getElementById('admin-total-users');
        if (totalUsersEl) {
            totalUsersEl.textContent = `Total Users: ${loadedAdminUsersList.length}`;
        }

        // Render users list by applying active sort option
        renderAdminUsersTable();

        // Start auto-refresh interval when viewing this tab
        startAdminUsersAutoRefresh();

    } catch (err) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Failed to load users: ${err.message}</td></tr>`;
        }
    }
}

async function silentReloadAdminUsers() {
    try {
        const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/users`, {
            headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
        });
        if (!res.ok) return;
        const users = await res.json();
        loadedAdminUsersList = users || [];

        const totalUsersEl = document.getElementById('admin-total-users');
        if (totalUsersEl) {
            totalUsersEl.textContent = `Total Users: ${loadedAdminUsersList.length}`;
        }

        renderAdminUsersTable();
    } catch (e) {
        // silent fail on background auto-refresh
    }
}

function startAdminUsersAutoRefresh() {
    if (window.adminUsersRefreshInterval) {
        clearInterval(window.adminUsersRefreshInterval);
    }

    window.adminUsersRefreshInterval = setInterval(() => {
        // Only fetch if admin-users tab is active and visible
        const usersTab = document.getElementById('admin-users');
        const adminPage = document.getElementById('page-admin');
        const isUsersTabActive = usersTab && usersTab.classList.contains('active') && !usersTab.classList.contains('hide');
        const isAdminPageActive = adminPage && !adminPage.classList.contains('hide');

        if (isUsersTabActive && isAdminPageActive && window.isUserAuthenticated) {
            silentReloadAdminUsers();
        } else {
            stopAdminUsersAutoRefresh();
        }
    }, 30000); // silent auto-refresh every 30 seconds
}

function stopAdminUsersAutoRefresh() {
    if (window.adminUsersRefreshInterval) {
        clearInterval(window.adminUsersRefreshInterval);
        window.adminUsersRefreshInterval = null;
    }
}

function renderAdminUsersTable() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    const sortType = document.getElementById('admin-users-sort')?.value || 'online';

    // Shallow copy loaded users to perform client-side sorting
    const sortedUsers = [...loadedAdminUsersList];

    // sorting operations
    if (sortType === 'online') {
        const isOnline = (u) => u.status === 'online';
        sortedUsers.sort((a, b) => {
            const aOnline = isOnline(a);
            const bOnline = isOnline(b);
            if (aOnline && !bOnline) return -1;
            if (!aOnline && bOnline) return 1;

            // Fallback: order by last active timestamp (newest active first)
            const aTime = a.lastSeen || 0;
            const bTime = b.lastSeen || 0;
            if (aTime !== bTime) return bTime - aTime;

            // Fallback 2: registration date
            const aReg = a.createdAt || 0;
            const bReg = b.createdAt || 0;
            return bReg - aReg;
        });
    } else if (sortType === 'api_usage') {
        sortedUsers.sort((a, b) => {
            return (b.api_usage || 0) - (a.api_usage || 0);
        });
    } else if (sortType === 'newest') {
        sortedUsers.sort((a, b) => {
            const aReg = a.createdAt || 0;
            const bReg = b.createdAt || 0;
            return bReg - aReg;
        });
    } else if (sortType === 'plan') {
        const getPlanPriority = (plan) => {
            const p = (plan || '').toLowerCase();
            if (p === 'ultra') return 3;
            if (p === 'pro') return 2;
            if (p === 'none' || p === 'free' || p === '') return 0;
            return 1; // special / custom subscription plan
        };
        sortedUsers.sort((a, b) => {
            const pA = getPlanPriority(a.subscription_plan);
            const pB = getPlanPriority(b.subscription_plan);
            if (pA !== pB) return pB - pA;
            // Fallback: active api usage
            return (b.api_usage || 0) - (a.api_usage || 0);
        });
    }

    tbody.innerHTML = '';
    sortedUsers.forEach(u => {
        const tr = document.createElement('tr');

        // Format registration date
        const regDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A';
        const emailColHtml = `
            <div style="display: flex; flex-direction: column;">
                <span style=" color: var(--text-sharp);">${u.email}</span>
                <small style="color: var(--text-muted); margin-top: 2px;">Reg: ${regDate}</small>
            </div>
        `;

        // Format last seen with glowing "Online" indicator if u.status === 'online'
        let lastSeenHtml = '';
        if (u.status === 'online') {
            lastSeenHtml = `<span style="color: #66ffd9;  display: inline-flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #66ffd9; box-shadow: 0 0 8px #66ffd9;"></span>Online</span>`;
        } else {
            if (!u.lastSeen) {
                lastSeenHtml = `<span style="color: var(--text-muted);">Never</span>`;
            } else {
                lastSeenHtml = `<span style="color: var(--text-muted); ">${new Date(u.lastSeen).toLocaleString()}</span>`;
            }
        }

        const planLabel = u.subscription_plan === 'none' ? 'free' : u.subscription_plan;

        tr.innerHTML = `
            <td>${emailColHtml}</td>
            <td style="text-transform: capitalize; ">${planLabel}</td>
            <td>${u.subscription_expiry ? new Date(u.subscription_expiry).toLocaleDateString() : 'Lifetime'}</td>
            <td>${u.api_usage.toLocaleString()} / ${(u.api_credits !== undefined ? u.api_credits : u.api_quota).toLocaleString()}</td>
            <td>${lastSeenHtml}</td>
            <td><span style="background: ${u.role === 'admin' ? 'rgba(175, 134, 252, 0.15)' : 'rgba(255,255,255,0.05)'}; color: ${u.role === 'admin' ? '#af86fc' : 'var(--text-muted)'}; padding: 2px 8px; border-radius: 4px;  text-transform: uppercase;">${u.role}</span></td>
            <td>-</td>
        `;
        tbody.appendChild(tr);
    });
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
                <td>${p.invoice_id || 'N/A'}</td>
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

let loadedAdminTicketsList = [];
let activeAdminTicketId = null;
window.adminSupportRefreshInterval = null;
let adminSupportWS = null;

function updateLocalAdminTicketData(eventData) {
    if (!loadedAdminTicketsList) loadedAdminTicketsList = [];

    const path = eventData.path;
    const data = eventData.data;

    if (path === "/") {
        if (data && typeof data === 'object') {
            if (Object.keys(data).every(k => k.startsWith("TKT-"))) {
                loadedAdminTicketsList = Object.values(data).filter(t => t && t.ticketId);
            } else {
                Object.assign(loadedAdminTicketsList, data);
            }
        }
    } else {
        const parts = path.split("/").filter(Boolean);
        if (parts.length > 0) {
            const ticketId = parts[0];
            let ticket = loadedAdminTicketsList.find(t => t.ticketId === ticketId);

            if (!ticket) {
                if (parts.length === 1 && data && data.ticketId) {
                    ticket = data;
                    loadedAdminTicketsList.push(ticket);
                } else {
                    return;
                }
            }

            if (parts.length === 1) {
                if (data === null) {
                    loadedAdminTicketsList = loadedAdminTicketsList.filter(t => t.ticketId !== ticketId);
                } else {
                    Object.assign(ticket, data);
                }
            } else if (parts.length >= 2 && parts[1] === "replies") {
                if (!ticket.replies) ticket.replies = {};
                if (parts.length === 3) {
                    const replyId = parts[2];
                    if (data === null) {
                        delete ticket.replies[replyId];
                    } else {
                        ticket.replies[replyId] = data;
                    }
                } else if (parts.length === 2) {
                    if (data === null) {
                        ticket.replies = {};
                    } else {
                        Object.assign(ticket.replies, data);
                    }
                }
            } else if (parts.length === 2 && parts[1] === "status") {
                ticket.status = data;
            } else if (parts.length === 2 && parts[1] === "lastActivity") {
                ticket.lastActivity = data;
            }
        }
    }

    loadedAdminTicketsList.sort((a, b) => {
        return (b.lastActivity || b.createdAt || 0) - (a.lastActivity || a.createdAt || 0);
    });
}

async function connectAdminSupportWebSocket() {
    if (adminSupportWS) {
        closeAdminSupportWebSocket();
    }

    const user = window.firebaseAuth.currentUser;
    if (!user) return;

    try {
        const idToken = await user.getIdToken(false);
        const wsBase = window.API.GC_SUPPORT_BASE.replace(/^http/, 'ws');
        const wsUrl = `${wsBase}/ws-admin-tickets?auth=${encodeURIComponent(idToken)}`;

        console.log("🔌 Connecting to Admin Support WebSocket...");
        const ws = new WebSocket(wsUrl);
        adminSupportWS = ws;

        ws.onopen = () => {
            console.log("✅ Admin Support WebSocket connected");
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === "tickets_update") {
                    console.log("📥 Admin tickets update received in real-time:", msg);
                    if (msg.event === "put" || msg.event === "patch") {
                        updateLocalAdminTicketData(msg.data);
                        renderAdminSupportTable();

                        if (activeAdminTicketId) {
                            const activeTicket = loadedAdminTicketsList.find(t => t.ticketId === activeAdminTicketId);
                            if (activeTicket) {
                                updateAdminModalState(activeTicket);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error parsing Admin WS message:", e);
            }
        };

        ws.onclose = (e) => {
            console.log("🔌 Admin Support WebSocket closed.", e.code, e.reason);
        };

        ws.onerror = (err) => {
            console.error("❌ Admin Support WebSocket error:", err);
        };
    } catch (err) {
        console.error("Error establishing Admin Support WebSocket:", err);
    }
}

function closeAdminSupportWebSocket() {
    if (adminSupportWS) {
        console.log("🔌 Closing Admin Support WebSocket...");
        try {
            adminSupportWS.close();
        } catch (_) { }
        adminSupportWS = null;
    }
}

function startAdminSupportAutoRefresh() {
    connectAdminSupportWebSocket();

    if (window.adminSupportRefreshInterval) {
        clearInterval(window.adminSupportRefreshInterval);
    }
    window.adminSupportRefreshInterval = setInterval(() => {
        const supportTab = document.getElementById('admin-support');
        const adminPage = document.getElementById('page-admin');
        const isSupportTabActive = supportTab && supportTab.classList.contains('active') && !supportTab.classList.contains('hide');
        const isAdminPageActive = adminPage && !adminPage.classList.contains('hide');

        if (isSupportTabActive && isAdminPageActive && window.isUserAuthenticated) {
            if (!adminSupportWS || adminSupportWS.readyState !== WebSocket.OPEN) {
                console.log("🔄 Admin WSS not connected. Reconnecting...");
                connectAdminSupportWebSocket();
            }
        } else {
            stopAdminSupportAutoRefresh();
        }
    }, 15000);
}

function stopAdminSupportAutoRefresh() {
    if (window.adminSupportRefreshInterval) {
        clearInterval(window.adminSupportRefreshInterval);
        window.adminSupportRefreshInterval = null;
    }
    closeAdminSupportWebSocket();
}

async function loadAdminSupport() {
    const tbody = document.getElementById('admin-support-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">
        <i class="fa-solid fa-circle-notch fa-spin" style="margin-right: 6px;"></i> Loading tickets...
    </td></tr>`;

    try {
        const res = await fetch(`${window.API.GC_SUPPORT_BASE}/admin/ticket/list`, {
            headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
        });
        if (!res.ok) throw new Error('Failed to fetch tickets');
        const tickets = await res.json();
        loadedAdminTicketsList = tickets || [];

        renderAdminSupportTable();
        startAdminSupportAutoRefresh();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Failed to load tickets: ${err.message}</td></tr>`;
    }
}

function renderAdminSupportTable() {
    const tbody = document.getElementById('admin-support-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (loadedAdminTicketsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No support tickets found.</td></tr>`;
        return;
    }

    loadedAdminTicketsList.forEach(t => {
        const tr = document.createElement('tr');

        const subject = t.message ? t.message.substring(0, 45) + (t.message.length > 45 ? '...' : '') : 'No message';
        const categoryLabel = t.type ? t.type.toUpperCase() : 'GENERAL';

        const statusLower = t.status.toLowerCase();
        const isResolved = statusLower === 'resolved' || statusLower === 'closed';
        const hasAdminReply = t.replies && Object.values(t.replies).some(r => r.sender === 'Admin');

        let statusText = 'PENDING';
        let statusColor = '#af86fc';
        let statusBg = 'rgba(175, 134, 252, 0.1)';
        let statusBorder = 'rgba(175, 134, 252, 0.2)';

        if (isResolved) {
            statusText = 'CLOSED';
            statusColor = '#66ffd9';
            statusBg = 'rgba(102, 255, 217, 0.1)';
            statusBorder = 'rgba(102, 255, 217, 0.2)';
        } else if (hasAdminReply) {
            statusText = 'REPLIED';
            statusColor = '#ffd700';
            statusBg = 'rgba(255, 215, 0, 0.1)';
            statusBorder = 'rgba(255, 215, 0, 0.2)';
        }

        const dateObj = new Date(t.lastActivity || t.createdAt);
        const lastActivityStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        tr.innerHTML = `
            <td style="color: var(--text-sharp);">${t.ticketId}</td>
            <td>
                <div style="display: flex; flex-direction: column;">
                    <span style="">${t.username}</span>
                    <small style="color: var(--text-muted); ">${t.email || ''}</small>
                </div>
            </td>
            <td>
                <div style="display: flex; flex-direction: column;">
                    <span style="">${subject}</span>
                    <small style="color: #af86fc;  text-transform: uppercase;">Category: ${categoryLabel}</small>
                </div>
            </td>
            <td>
                <span style="color: ${statusColor}; background: ${statusBg}; border: 1px solid ${statusBorder}; padding: 2px 8px; border-radius: 20px;   letter-spacing: 0.5px;">${statusText}</span>
            </td>
            <td style="color: var(--text-muted);">${lastActivityStr}</td>
            <td>
                <button class="btn btn-primary btn-open-ticket" data-id="${t.ticketId}" style="width: auto; padding: 4px 10px; border-radius: 4px;">
                    <i class="fa-solid fa-reply"></i> Reply
                </button>
            </td>
        `;

        tr.querySelector('.btn-open-ticket').addEventListener('click', () => {
            openAdminTicketDetails(t);
        });

        tbody.appendChild(tr);
    });
}

function openAdminTicketDetails(ticket) {
    activeAdminTicketId = ticket.ticketId;
    const modal = document.getElementById('admin-ticket-modal');
    if (!modal) return;

    updateAdminModalState(ticket);
    modal.classList.remove('hide');
}

function updateAdminModalState(ticket) {
    document.getElementById('admin-ticket-modal-id').textContent = ticket.ticketId;

    const statusLower = ticket.status.toLowerCase();
    const isResolved = statusLower === 'resolved' || statusLower === 'closed';
    const hasAdminReply = ticket.replies && Object.values(ticket.replies).some(r => r.sender === 'Admin');

    let statusText = 'PENDING';
    let statusColor = '#af86fc';
    let statusBg = 'rgba(175, 134, 252, 0.05)';
    let statusBorder = 'rgba(175, 134, 252, 0.2)';

    if (isResolved) {
        statusText = 'CLOSED';
        statusColor = '#66ffd9';
        statusBg = 'rgba(102, 255, 217, 0.05)';
        statusBorder = 'rgba(102, 255, 217, 0.2)';
    } else if (hasAdminReply) {
        statusText = 'REPLIED';
        statusColor = '#ffd700';
        statusBg = 'rgba(255, 215, 0, 0.05)';
        statusBorder = 'rgba(255, 215, 0, 0.2)';
    }

    const badge = document.getElementById('admin-ticket-modal-status-badge');
    badge.textContent = statusText;
    badge.style.color = statusColor;
    badge.style.background = statusBg;
    badge.style.borderColor = statusBorder;

    const resolveBtn = document.getElementById('admin-btn-modal-resolve');
    if (isResolved) {
        resolveBtn.style.display = 'none';
    } else {
        resolveBtn.style.display = 'block';
    }

    document.getElementById('admin-ticket-modal-subject').textContent = ticket.message;

    const dateObj = new Date(ticket.createdAt);
    const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('admin-ticket-modal-meta').innerHTML = `User: <strong>${ticket.username}</strong> | Category: <strong>${ticket.type || 'general'}</strong> | Date: <strong>${dateStr}</strong>`;

    const chatHistory = document.getElementById('admin-ticket-modal-chat-history');
    chatHistory.innerHTML = '';

    const messagesList = [];
    messagesList.push({
        sender: ticket.username,
        senderType: 'user',
        message: ticket.message,
        images: ticket.images || [],
        createdAt: ticket.createdAt
    });

    if (ticket.replies) {
        Object.values(ticket.replies).forEach(r => {
            messagesList.push({
                sender: r.sender,
                senderType: r.senderType || (r.sender === 'Admin' ? 'admin' : 'user'),
                message: r.message,
                images: r.images || [],
                createdAt: r.createdAt
            });
        });
    }

    messagesList.sort((a, b) => a.createdAt - b.createdAt);

    messagesList.forEach(msg => {
        const isAdmin = msg.senderType === 'admin' || msg.sender === 'Admin';
        const msgRow = document.createElement('div');
        msgRow.style.display = 'flex';
        msgRow.style.justifyContent = isAdmin ? 'flex-end' : 'flex-start';
        msgRow.style.width = '100%';
        msgRow.style.marginBottom = '12px';

        const bubble = document.createElement('div');
        bubble.style.maxWidth = '80%';
        bubble.style.padding = '12px 16px';
        bubble.style.borderRadius = '15px';
        bubble.style.lineHeight = '1.4';
        bubble.style.display = 'flex';
        bubble.style.flexDirection = 'column';
        bubble.style.gap = '8px';

        if (isAdmin) {
            bubble.style.background = 'linear-gradient(135deg, rgba(175, 134, 252, 0.15) 0%, rgba(126, 83, 201, 0.15) 100%)';
            bubble.style.border = '1px solid rgba(175, 134, 252, 0.2)';
            bubble.style.color = 'var(--text-sharp)';
            bubble.style.borderBottomRightRadius = '2px';
        } else {
            bubble.style.background = 'var(--bg-primary)';
            bubble.style.border = '1px solid var(--border-color)';
            bubble.style.color = 'var(--text-primary)';
            bubble.style.borderBottomLeftRadius = '2px';
        }

        const msgTime = new Date(msg.createdAt);
        const msgTimeStr = msgTime.toLocaleDateString() + ' ' + msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let imgHtml = '';
        if (msg.images && msg.images.length > 0) {
            imgHtml = `<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 5px;">`;
            msg.images.forEach(imgUrl => {
                imgHtml += `
                    <a href="${imgUrl}" target="_blank" style="width: 70px; height: 70px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color); display: inline-block;">
                        <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                    </a>
                `;
            });
            imgHtml += `</div>`;
        }

        bubble.innerHTML = `
            <div style="color: var(--text-muted);  text-transform: uppercase;  display: flex; justify-content: space-between; gap: 25px;">
                <span>${isAdmin ? '💼 You (Admin)' : '👤 ' + msg.sender}</span>
                <span>${msgTimeStr}</span>
            </div>
            <div style="word-break: break-word;  ">${msg.message || ''}</div>
            ${imgHtml}
        `;

        msgRow.appendChild(bubble);
        chatHistory.appendChild(msgRow);
    });

    const replyContainer = document.getElementById('admin-ticket-modal-reply-container');
    if (isResolved) {
        replyContainer.style.display = 'none';
        const banner = document.createElement('div');
        banner.style.textAlign = 'center';
        banner.style.padding = '10px';
        banner.style.background = 'rgba(102, 255, 217, 0.05)';
        banner.style.border = '1px solid rgba(102, 255, 217, 0.2)';
        banner.style.color = '#66ffd9';
        banner.style.borderRadius = '10px';
        banner.innerHTML = `<i class="fa-solid fa-lock" style="margin-right: 5px;"></i> This ticket has been marked as RESOLVED.`;
        chatHistory.appendChild(banner);
    } else {
        replyContainer.style.display = 'flex';
    }

    setTimeout(() => {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }, 50);
}


