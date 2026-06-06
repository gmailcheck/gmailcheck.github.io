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
            if (targetId === 'admin-overview') loadAdminOverview();
            if (targetId === 'admin-users') loadAdminUsers();
            if (targetId === 'admin-payments') loadAdminPayments();
            if (targetId === 'admin-support') loadAdminSupport();
            if (targetId === 'admin-event') loadAdminEventConfig();
        });
    });

    // Expose active tab loading globally for route transitions
    window.loadActiveAdminTab = function () {
        const activeTab = document.querySelector('.db-tab-btn.active[data-tab^="admin-"]');
        if (activeTab) {
            const targetId = activeTab.getAttribute('data-tab');
            if (targetId === 'admin-overview') loadAdminOverview();
            if (targetId === 'admin-users') loadAdminUsers();
            if (targetId === 'admin-payments') loadAdminPayments();
            if (targetId === 'admin-support') loadAdminSupport();
            if (targetId === 'admin-event') loadAdminEventConfig();
        }
    };

    // Auto-update top scrollbar range on window resize
    window.addEventListener('resize', () => {
        const usersTab = document.getElementById('admin-users');
        if (usersTab && !usersTab.classList.contains('hide')) {
            const tableContainer = document.querySelector('#page-admin .table-responsive');
            const topScrollbar = document.getElementById('admin-users-top-scrollbar');
            const topScrollbarDummy = document.getElementById('admin-users-top-scrollbar-dummy');

            if (tableContainer && topScrollbar && topScrollbarDummy) {
                const hasHorizontalScroll = tableContainer.scrollWidth > tableContainer.clientWidth;
                if (hasHorizontalScroll) {
                    topScrollbar.style.display = 'block';
                    const tableScrollWidth = tableContainer.scrollWidth;
                    const tableClientWidth = tableContainer.clientWidth;
                    const topClientWidth = topScrollbar.clientWidth;

                    const dummyWidth = tableScrollWidth - tableClientWidth + topClientWidth;
                    topScrollbarDummy.style.width = dummyWidth + 'px';
                    topScrollbar.scrollLeft = tableContainer.scrollLeft;
                } else {
                    topScrollbar.style.display = 'none';
                }
            }
        }
    });

    // User Directory Sorting Event Listener
    const sortDropdown = document.getElementById('admin-users-sort');
    if (sortDropdown) {
        sortDropdown.addEventListener('change', () => {
            if (typeof renderAdminUsersTable === 'function') {
                renderAdminUsersTable();
            }
        });
    }

    // User Directory Search Event Listener
    const searchInput = document.getElementById('admin-users-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (typeof renderAdminUsersTable === 'function') {
                renderAdminUsersTable();
            }
        });
    }

    // Support Tickets Status & Category Filter Event Listeners
    const supportFilterStatus = document.getElementById('admin-support-filter-status');
    if (supportFilterStatus) {
        supportFilterStatus.addEventListener('change', () => {
            if (typeof renderAdminSupportTable === 'function') {
                renderAdminSupportTable();
            }
        });
    }
    const supportFilterCategory = document.getElementById('admin-support-filter-category');
    if (supportFilterCategory) {
        supportFilterCategory.addEventListener('change', () => {
            if (typeof renderAdminSupportTable === 'function') {
                renderAdminSupportTable();
            }
        });
    }

    // Save Maintenance Settings Event Listener
    const btnSaveMt = document.getElementById('admin-btn-save-mt');
    if (btnSaveMt) {
        btnSaveMt.addEventListener('click', async () => {
            const isMT = document.getElementById('admin-mt-status').value === 'true';
            const startTime = document.getElementById('admin-mt-start-time').value;
            const duration = document.getElementById('admin-mt-duration').value;

            try {
                btnSaveMt.disabled = true;
                const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/maintenance-config`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${await getAuthToken()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isMT, startTime, duration })
                });
                const data = await res.json();
                if (res.ok) {
                    window.showAppNotification('success', 'System maintenance config updated successfully!');
                } else {
                    window.showAppNotification('danger', data.error || 'Failed to update system config');
                }
            } catch (err) {
                window.showAppNotification('danger', 'Network error: ' + err.message);
            } finally {
                btnSaveMt.disabled = false;
            }
        });
    }

    // Force Confirm Payment Event Listener
    const btnForcePay = document.getElementById('admin-btn-force-pay');
    if (btnForcePay) {
        btnForcePay.addEventListener('click', async () => {
            const invoiceId = document.getElementById('admin-manual-pay-invoice-id').value.trim();
            if (!invoiceId) return window.showAppNotification('warning', 'Please enter an Invoice ID');

            if (!confirm(`Are you sure you want to force approve payment for Invoice ID: ${invoiceId}?`)) return;

            try {
                btnForcePay.disabled = true;
                const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/manual-complete-payment`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${await getAuthToken()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ invoiceId })
                });
                const data = await res.json();
                if (res.ok) {
                    window.showAppNotification('success', 'Invoice manually approved and credited successfully!');
                    document.getElementById('admin-manual-pay-invoice-id').value = '';
                    if (document.querySelector('.db-tab-btn.active[data-tab="admin-overview"]')) {
                        loadAdminOverview();
                    }
                } else {
                    window.showAppNotification('danger', data.error || 'Failed to approve invoice');
                }
            } catch (err) {
                window.showAppNotification('danger', 'Network error: ' + err.message);
            } finally {
                btnForcePay.disabled = false;
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

    // 5b. Event Settings Listeners
    const useRangeCheckbox = document.getElementById('admin-event-use-range');
    if (useRangeCheckbox) {
        useRangeCheckbox.addEventListener('change', () => {
            const dateInputsContainer = document.getElementById('admin-event-date-inputs');
            if (dateInputsContainer) {
                if (useRangeCheckbox.checked) {
                    dateInputsContainer.classList.remove('hide');
                } else {
                    dateInputsContainer.classList.add('hide');
                }
            }
        });
    }

    const btnSaveEvent = document.getElementById('admin-event-save-btn');
    if (btnSaveEvent) {
        btnSaveEvent.addEventListener('click', async () => {
            const active = document.getElementById('admin-event-active').checked;
            const useDateRange = document.getElementById('admin-event-use-range').checked;
            const startDate = document.getElementById('admin-event-start-date').value;
            const endDate = document.getElementById('admin-event-end-date').value;

            if (useDateRange && (!startDate || !endDate)) {
                return window.showAppNotification('warning', 'Please specify both start and end dates.');
            }

            try {
                btnSaveEvent.disabled = true;
                btnSaveEvent.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

                const res = await fetch(window.API.EVENT_CONFIG, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${await getAuthToken()}`, 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ active, useDateRange, startDate, endDate })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    window.showAppNotification('success', '🎁 <strong>Event settings saved successfully!</strong>');
                } else {
                    throw new Error(data.error || 'Failed to save event settings');
                }
            } catch (err) {
                window.showAppNotification('danger', 'Error: ' + err.message);
            } finally {
                btnSaveEvent.disabled = false;
                btnSaveEvent.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Event Settings';
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

    const userModalCloseBtn = document.getElementById('admin-user-modal-close-btn');
    if (userModalCloseBtn) {
        userModalCloseBtn.addEventListener('click', () => {
            document.getElementById('admin-user-modal').classList.add('hide');
        });
    }

    // Selected files state for admin reply modal
    let selectedReplyFiles = [];
    const replyImagesInput = document.getElementById('admin-ticket-modal-reply-images-input');
    const btnTriggerReplyImages = document.getElementById('admin-btn-trigger-reply-images');
    const replyImagesPreview = document.getElementById('admin-ticket-modal-reply-images-preview');

    if (replyImagesInput) replyImagesInput.removeAttribute('accept');

    if (btnTriggerReplyImages && replyImagesInput) {
        btnTriggerReplyImages.addEventListener('click', () => replyImagesInput.click());
        replyImagesInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);

            if (selectedReplyFiles.length + files.length > 5) {
                window.showAppNotification('danger', '❌ <strong>Maximum 5 Files!</strong> You can only attach up to 5 files total.');
                replyImagesInput.value = '';
                return;
            }

            btnTriggerReplyImages.disabled = true;
            const originalHtml = btnTriggerReplyImages.innerHTML;
            btnTriggerReplyImages.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

            for (const file of files) {
                const processedFile = await compressImageIfNeeded(file);
                selectedReplyFiles.push(processedFile);
            }

            btnTriggerReplyImages.disabled = false;
            btnTriggerReplyImages.innerHTML = originalHtml;
            replyImagesInput.value = '';
            renderReplyImagesPreview();
        });
    }

    function renderReplyImagesPreview() {
        if (!replyImagesPreview) return;
        replyImagesPreview.innerHTML = '';
        selectedReplyFiles.forEach((file, index) => {
            const div = document.createElement('div');
            div.style.position = 'relative';
            div.style.width = '55px';
            div.style.height = '55px';
            div.style.borderRadius = '8px';
            div.style.border = '1px solid var(--border-color)';
            div.style.boxShadow = '0 2px 5px rgba(0,0,0,0.15)';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'center';
            div.style.background = 'rgba(255,255,255,0.02)';
            div.title = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    div.innerHTML = `
                        <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">
                        <button type="button" style="position: absolute; top: 2px; right: 2px; width: 15px; height: 15px; border-radius: 50%; background: rgba(0,0,0,0.7); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;" title="Hapus">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    `;
                    div.querySelector('button').addEventListener('click', () => {
                        selectedReplyFiles.splice(index, 1);
                        renderReplyImagesPreview();
                    });
                };
                reader.readAsDataURL(file);
            } else {
                let iconClass = 'fa-file-lines';
                let iconColor = '#af86fc';

                if (file.type.startsWith('video/')) {
                    iconClass = 'fa-file-video';
                    iconColor = '#66ffd9';
                } else if (file.type === 'application/pdf') {
                    iconClass = 'fa-file-pdf';
                    iconColor = '#ff6666';
                } else if (file.type.includes('zip') || file.type.includes('rar')) {
                    iconClass = 'fa-file-zipper';
                    iconColor = '#ffd700';
                }

                div.innerHTML = `
                    <i class="fa-solid ${iconClass}" style="font-size: 1.3rem; color: ${iconColor};"></i>
                    <button type="button" style="position: absolute; top: 2px; right: 2px; width: 15px; height: 15px; border-radius: 50%; background: rgba(0,0,0,0.7); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;" title="Hapus">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                `;
                div.querySelector('button').addEventListener('click', () => {
                    selectedReplyFiles.splice(index, 1);
                    renderReplyImagesPreview();
                });
            }

            replyImagesPreview.appendChild(div);
        });
    }

    const btnSubmitReply = document.getElementById('admin-btn-submit-ticket-reply');
    if (btnSubmitReply) {
        btnSubmitReply.addEventListener('click', async () => {
            const input = document.getElementById('admin-ticket-modal-reply-input');
            const text = input.value.trim();
            if (!text && selectedReplyFiles.length === 0) return;
            if (!activeAdminTicketId) return;

            // Optimistic UI Update: Render reply instantly!
            const ticket = loadedAdminTicketsList.find(t => t.ticketId === activeAdminTicketId);
            const tempId = `_OPT_${Date.now()}`;
            if (ticket) {
                if (!ticket.replies) ticket.replies = {};
                const newReply = {
                    sender: "Admin",
                    senderType: "admin",
                    message: text || '[Sending attachments...]',
                    images: [],
                    createdAt: Date.now()
                };
                ticket.replies[tempId] = newReply;
                ticket.lastActivity = newReply.createdAt;

                renderAdminSupportTable();
                updateAdminModalState(ticket);
            }

            btnSubmitReply.disabled = true;
            btnSubmitReply.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

            try {
                const formData = new FormData();
                formData.append('ticketId', activeAdminTicketId);
                formData.append('message', text || '[Attachment Only]');

                selectedReplyFiles.forEach(file => {
                    formData.append('images', file, file.name);
                });

                const res = await fetch(`${window.API.GC_SUPPORT_BASE}/admin/ticket/reply`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${await getAuthToken()}`
                    },
                    body: formData
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to submit reply');

                input.value = '';
                selectedReplyFiles = [];
                renderReplyImagesPreview();

                window.showAppNotification('success', 'Reply submitted successfully!');

                // Refresh list silently
                await loadAdminSupport(true);
            } catch (err) {
                // If optimistic update succeeded and request failed, remove it
                if (ticket && ticket.replies[tempId]) {
                    delete ticket.replies[tempId];
                    renderAdminSupportTable();
                    if (activeAdminTicketId === ticket.ticketId) {
                        updateAdminModalState(ticket);
                    }
                }
                window.showAppNotification('danger', err.message);
            } finally {
                btnSubmitReply.disabled = false;
                btnSubmitReply.innerHTML = 'Send Reply';
            }
        });
    }
    // Admin Reply Templates
    const btnTriggerTemplates = document.getElementById('admin-btn-trigger-templates');
    const templatesPopover = document.getElementById('admin-templates-popover');
    const btnCloseTemplates = document.getElementById('admin-btn-close-templates');
    const btnAddTemplate = document.getElementById('admin-btn-add-template');
    const newTemplateInput = document.getElementById('admin-new-template-input');
    const templatesList = document.getElementById('admin-templates-list');
    const replyInput = document.getElementById('admin-ticket-modal-reply-input');

    if (btnTriggerTemplates && templatesPopover) {
        btnTriggerTemplates.addEventListener('click', () => {
            templatesPopover.classList.toggle('hide');
            if (!templatesPopover.classList.contains('hide')) {
                renderAdminTemplates();
            }
        });

        if (btnCloseTemplates) {
            btnCloseTemplates.addEventListener('click', () => {
                templatesPopover.classList.add('hide');
            });
        }

        if (btnAddTemplate && newTemplateInput) {
            btnAddTemplate.addEventListener('click', () => {
                const text = newTemplateInput.value.trim();
                if (!text) return;

                let savedTemplates = [];
                try { savedTemplates = JSON.parse(localStorage.getItem('adminReplyTemplates') || '[]'); } catch (e) { }
                savedTemplates.push(text);
                localStorage.setItem('adminReplyTemplates', JSON.stringify(savedTemplates));

                newTemplateInput.value = '';
                renderAdminTemplates();
                window.showAppNotification('success', 'Template saved!');
            });
        }

        function renderAdminTemplates() {
            if (!templatesList) return;
            let savedTemplates = [];
            try { savedTemplates = JSON.parse(localStorage.getItem('adminReplyTemplates') || '[]'); } catch (e) { }

            templatesList.innerHTML = '';
            if (savedTemplates.length === 0) {
                templatesList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 10px;">No templates saved yet.</div>';
                return;
            }

            savedTemplates.forEach((templateText, index) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.gap = '8px';
                item.style.alignItems = 'center';
                item.style.background = 'rgba(255,255,255,0.02)';
                item.style.padding = '8px';
                item.style.borderRadius = '6px';
                item.style.border = '1px solid var(--border-color)';

                const textDiv = document.createElement('div');
                textDiv.style.flex = '1';
                textDiv.style.fontSize = '0.85rem';
                textDiv.style.color = 'var(--text-primary)';
                textDiv.style.whiteSpace = 'nowrap';
                textDiv.style.overflow = 'hidden';
                textDiv.style.textOverflow = 'ellipsis';
                textDiv.style.cursor = 'pointer';
                textDiv.title = templateText;
                textDiv.textContent = templateText;

                textDiv.addEventListener('click', () => {
                    if (replyInput) {
                        replyInput.value = templateText;
                        templatesPopover.classList.add('hide');
                        replyInput.focus();
                    }
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn';
                deleteBtn.style.padding = '4px 8px';
                deleteBtn.style.fontSize = '0.75rem';
                deleteBtn.style.background = 'rgba(255, 102, 102, 0.15)';
                deleteBtn.style.color = '#ff6666';
                deleteBtn.style.border = 'none';
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';

                deleteBtn.addEventListener('click', () => {
                    savedTemplates.splice(index, 1);
                    localStorage.setItem('adminReplyTemplates', JSON.stringify(savedTemplates));
                    renderAdminTemplates();
                });

                item.appendChild(textDiv);
                item.appendChild(deleteBtn);
                templatesList.appendChild(item);
            });
        }
    }

    const btnResolve = document.getElementById('admin-btn-modal-resolve');
    if (btnResolve) {
        btnResolve.addEventListener('click', async () => {
            if (!activeAdminTicketId) return;

            btnResolve.disabled = true;
            btnResolve.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

            try {
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
    return await window.getAuthToken();
}

async function loadAdminEventConfig() {
    try {
        const res = await fetch(window.API.EVENT_CONFIG, {
            headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
        });
        if (!res.ok) throw new Error('Failed to fetch event settings');
        const config = await res.json();

        const activeCheckbox = document.getElementById('admin-event-active');
        const useRangeCheckbox = document.getElementById('admin-event-use-range');
        const startDateInput = document.getElementById('admin-event-start-date');
        const endDateInput = document.getElementById('admin-event-end-date');
        const dateInputsContainer = document.getElementById('admin-event-date-inputs');

        if (activeCheckbox) activeCheckbox.checked = !!config.active;
        if (useRangeCheckbox) useRangeCheckbox.checked = !!config.useDateRange;
        if (startDateInput) startDateInput.value = config.startDate || '';
        if (endDateInput) endDateInput.value = config.endDate || '';

        if (dateInputsContainer) {
            if (config.useDateRange) {
                dateInputsContainer.classList.remove('hide');
            } else {
                dateInputsContainer.classList.add('hide');
            }
        }
    } catch (err) {
        window.showAppNotification('danger', 'Failed to load event config: ' + err.message);
    }
}

async function loadAdminOverview() {
    try {
        const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/dashboard-metrics`, {
            headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
        });
        if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
        const metrics = await res.json();

        document.getElementById('admin-metrics-revenue').textContent = metrics.totalRevenue !== undefined ? `$${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
        document.getElementById('admin-metrics-users').textContent = metrics.totalUsers !== undefined ? metrics.totalUsers.toLocaleString() : '0';
        document.getElementById('admin-metrics-active').textContent = metrics.activeUsers !== undefined ? metrics.activeUsers.toLocaleString() : '0';
        document.getElementById('admin-metrics-usage').textContent = metrics.totalApiUsage !== undefined ? metrics.totalApiUsage.toLocaleString() : '0';

    } catch (err) {
        window.showAppNotification('danger', 'Failed to load dashboard metrics: ' + err.message);
    }

    try {
        const res = await fetch(`${window.API.GC_SERVER_BASE}/maintenance`);
        if (res.ok) {
            const config = await res.json();
            document.getElementById('admin-mt-status').value = config.isMT ? 'true' : 'false';
            
            // Set default start time input to current local time first
            const now = new Date();
            const offset = now.getTimezoneOffset();
            const adjustedNow = new Date(now.getTime() - (offset * 60 * 1000));
            const defaultFormattedNow = adjustedNow.toISOString().substring(0, 16);
            document.getElementById('admin-mt-start-time').value = defaultFormattedNow;

            // If maintenance is currently active and has a valid saved start time, override input with it
            if (config.isMT && config.startTime) {
                try {
                    const localDate = new Date(config.startTime);
                    if (!isNaN(localDate.getTime())) {
                        const offsetTime = localDate.getTimezoneOffset();
                        const adjustedDate = new Date(localDate.getTime() - (offsetTime * 60 * 1000));
                        const formatted = adjustedDate.toISOString().substring(0, 16);
                        document.getElementById('admin-mt-start-time').value = formatted;
                    } else {
                        console.warn("Server returned invalid date format:", config.startTime);
                    }
                } catch (e) {
                    console.error("Format date failed:", e);
                }
            }
            if (config.duration) {
                document.getElementById('admin-mt-duration').value = config.duration;
            }
        }
    } catch (e) {
        console.error("Fetch maintenance config failed:", e);
    }
}

let loadedAdminUsersList = [];
window.adminUsersWS = null;
window.adminUsersWSInterval = null;

async function loadAdminUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    
    // If WebSocket is already open, just request users
    if (window.adminUsersWS && window.adminUsersWS.readyState === WebSocket.OPEN) {
        window.adminUsersWS.send(JSON.stringify({ type: "get_users" }));
        return;
    }
    
    // Display loading state first time
    if (tbody && (!loadedAdminUsersList || loadedAdminUsersList.length === 0)) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 30px;">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: #00f0ff; margin-bottom: 10px; display: block;"></i>
                    <span style="color: var(--text-muted);">Connecting Users Stream...</span>
                </td>
            </tr>
        `;
    }
    
    // Connect WebSocket
    await connectAdminUsersWS();
}

async function connectAdminUsersWS() {
    const idToken = await getAuthToken();
    if (!idToken) return;

    if (window.adminUsersWS) {
        if (window.adminUsersWS.readyState === WebSocket.OPEN || window.adminUsersWS.readyState === WebSocket.CONNECTING) {
            return;
        }
    }

    try {
        const wsBase = window.API.GC_SERVER_BASE.replace(/^http/, 'ws');
        const wsUrl = `${wsBase}/admin/ws-users?auth=${encodeURIComponent(idToken)}`;
        const ws = new WebSocket(wsUrl);
        window.adminUsersWS = ws;

        ws.onopen = () => {
            console.log("[Admin-WS] Connected to admin users stream.");
            ws.send(JSON.stringify({ type: "get_users" }));

            // Clean existing interval
            if (window.adminUsersWSInterval) {
                clearInterval(window.adminUsersWSInterval);
            }

            // Periodic heartbeat & data sync (e.g. every 30s to keep open, and sync full data)
            window.adminUsersWSInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    // Send ping to keep connection alive
                    ws.send(JSON.stringify({ type: "ping" }));
                    
                    // Also periodically request full sync to catch up on credit changes, registration, country etc.
                    const usersTab = document.getElementById('admin-users');
                    const adminPage = document.getElementById('page-admin');
                    const isUsersTabActive = usersTab && usersTab.classList.contains('active') && !usersTab.classList.contains('hide');
                    const isAdminPageActive = adminPage && !adminPage.classList.contains('hide');

                    if (isUsersTabActive && isAdminPageActive && window.isUserAuthenticated) {
                        ws.send(JSON.stringify({ type: "get_users" }));
                    } else {
                        // If admin is no longer on the users tab, close the WebSocket to save resources!
                        console.log("[Admin-WS] Admin left users tab, closing WebSocket stream.");
                        ws.close();
                    }
                }
            }, 30000);
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === "users_list") {
                    loadedAdminUsersList = msg.users || [];
                    const totalUsersEl = document.getElementById('admin-total-users');
                    if (totalUsersEl) {
                        totalUsersEl.textContent = `Total Users: ${loadedAdminUsersList.length}`;
                    }
                    renderAdminUsersTable();
                } else if (msg.type === "status_update") {
                    const user = loadedAdminUsersList.find(u => u.email === msg.email);
                    if (user) {
                        user.status = msg.status;
                        user.lastSeen = msg.lastSeen;
                        renderAdminUsersTable();
                    }
                } else if (msg.type === "user_details") {
                    if (window.onAdminUserDetailsReceived) {
                        window.onAdminUserDetailsReceived(msg.user);
                    }
                }
            } catch (err) {
                console.error("[Admin-WS] message parsing error:", err);
            }
        };

        ws.onclose = () => {
            console.log("[Admin-WS] Connection closed.");
            if (window.adminUsersWSInterval) {
                clearInterval(window.adminUsersWSInterval);
                window.adminUsersWSInterval = null;
            }
            // Auto-reconnect if admin tab is still active after 5 seconds
            setTimeout(() => {
                const usersTab = document.getElementById('admin-users');
                const adminPage = document.getElementById('page-admin');
                const isUsersTabActive = usersTab && usersTab.classList.contains('active') && !usersTab.classList.contains('hide');
                const isAdminPageActive = adminPage && !adminPage.classList.contains('hide');
                if (isUsersTabActive && isAdminPageActive && window.isUserAuthenticated) {
                    connectAdminUsersWS();
                }
            }, 5000);
        };

        ws.onerror = (err) => {
            console.error("[Admin-WS] Connection error:", err);
            try { ws.close(); } catch(e){}
        };

    } catch (e) {
        console.error("[Admin-WS] Connection initialization failed:", e);
        fallbackLoadAdminUsers();
    }
}

// Fallback method using traditional REST API
async function fallbackLoadAdminUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    try {
        const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/users?_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const users = await res.json();
        loadedAdminUsersList = users || [];
        const totalUsersEl = document.getElementById('admin-total-users');
        if (totalUsersEl) {
            totalUsersEl.textContent = `Total Users: ${loadedAdminUsersList.length}`;
        }
        renderAdminUsersTable();
    } catch (err) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: red;">Failed to load users: ${err.message}</td></tr>`;
        }
    }
}

// Legacy compatibility stubs
function startAdminUsersAutoRefresh() {}
function stopAdminUsersAutoRefresh() {}

function renderAdminUsersTable() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    const sortType = document.getElementById('admin-users-sort')?.value || 'online';
    const searchQuery = document.getElementById('admin-users-search')?.value.trim().toLowerCase() || '';

    // Shallow copy loaded users to perform client-side sorting & searching
    let sortedUsers = [...loadedAdminUsersList];

    // search filter
    if (searchQuery) {
        sortedUsers = sortedUsers.filter(u =>
            (u.email && u.email.toLowerCase().includes(searchQuery)) ||
            (u.username && u.username.toLowerCase().includes(searchQuery))
        );
    }

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
    if (sortedUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No users matched search criteria</td></tr>`;
        return;
    }

    sortedUsers.forEach(u => {
        const tr = document.createElement('tr');

        // Format registration date
        const regDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A';
        // Country Flag & Subscription Badge rendering
        const countryCode = u.country || 'unknown';
        let flagHtml = '';
        if (countryCode !== 'unknown' && countryCode !== 'XX') {
            flagHtml = `<img src="https://flagcdn.com/32x24/${countryCode.toLowerCase()}.png" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color); flex-shrink: 0;" alt="${countryCode}">`;
        } else {
            flagHtml = `<div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--text-muted); font-weight: bold; flex-shrink: 0;">?</div>`;
        }

        let planBadge = '';
        const planLower = (u.subscription_plan || 'free').toLowerCase();
        if (planLower.includes('ultra')) {
            planBadge = `<span style="background: rgba(188, 59, 247, 0.15); color: #af86fc; border: 1px solid rgba(188, 59, 247, 0.25); padding: 1px 5px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; display: inline-block; vertical-align: middle;">ULTRA</span>`;
        } else if (planLower.includes('pro')) {
            planBadge = `<span style="background: rgba(102, 255, 217, 0.15); color: #66ffd9; border: 1px solid rgba(102, 255, 217, 0.25); padding: 1px 5px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; display: inline-block; vertical-align: middle;">PRO</span>`;
        } else if (planLower !== 'free' && planLower !== 'none' && planLower !== '') {
            planBadge = `<span style="background: rgba(255, 215, 0, 0.15); color: #ffd700; border: 1px solid rgba(255, 215, 0, 0.25); padding: 1px 5px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; display: inline-block; vertical-align: middle;">${planLower.replace('_subs', '').toUpperCase()}</span>`;
        } else {
            planBadge = `<span style="background: rgba(255, 255, 255, 0.05); color: var(--text-muted); border: 1px solid rgba(255, 255, 255, 0.1); padding: 1px 5px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; display: inline-block; vertical-align: middle;">FREE</span>`;
        }

        let abuseBadge = '';
        if (u.ip_user_count && u.ip_user_count >= 5) {
            abuseBadge = `<span style="background: rgba(255, 102, 102, 0.15); color: #ff6666; border: 1px solid rgba(255, 102, 102, 0.25); padding: 1px 5px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; display: inline-block; vertical-align: middle; margin-left: 6px;" title="Shared IP abuse: ${u.ip_user_count} accounts on this IP/subnet"><i class="fa-solid fa-triangle-exclamation"></i> ABUSE (${u.ip_user_count})</span>`;
        } else if (u.ip_user_count && u.ip_user_count >= 2) {
            abuseBadge = `<span style="background: rgba(255, 215, 0, 0.15); color: #ffd700; border: 1px solid rgba(255, 215, 0, 0.25); padding: 1px 5px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; display: inline-block; vertical-align: middle; margin-left: 6px;" title="Multiple accounts: ${u.ip_user_count} accounts on this IP/subnet"><i class="fa-solid fa-circle-exclamation"></i> MULTI (${u.ip_user_count})</span>`;
        }

        const emailColHtml = `
            <div class="user-clickable-email" data-email="${u.email}" style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                ${flagHtml}
                <div style="display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="color: #00f0ff; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; transition: color 0.2s;" onmouseover="this.style.color='#af86fc'" onmouseout="this.style.color='#00f0ff'">${u.email}</span>
                        ${planBadge}
                        ${abuseBadge}
                    </div>
                    <small style="color: var(--text-muted); margin-top: 2px;">Reg: ${regDate}</small>
                </div>
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

        const banBtnText = u.banned ? '<i class="fa-solid fa-unlock"></i> Unban' : '<i class="fa-solid fa-ban"></i> Ban';
        const banBtnBg = u.banned ? 'rgba(102, 255, 217, 0.1)' : 'rgba(255, 102, 102, 0.1)';
        const banBtnColor = u.banned ? '#66ffd9' : '#ff6666';
        const banBtnBorder = u.banned ? 'rgba(102, 255, 217, 0.2)' : 'rgba(255, 102, 102, 0.2)';

        tr.innerHTML = `
            <td>${emailColHtml}</td>
            <td>${lastSeenHtml}</td>
            <td>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn btn-ban-user" data-email="${u.email}" data-banned="${!!u.banned}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; background: ${banBtnBg}; color: ${banBtnColor}; border: 1px solid ${banBtnBorder}; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        ${banBtnText}
                    </button>
                    <button class="btn btn-role-user" data-email="${u.email}" data-role="${u.role}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; background: rgba(0, 240, 255, 0.1); color: #00f0ff; border: 1px solid rgba(0, 240, 255, 0.2); cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-user-gear"></i> Role
                    </button>
                    <button class="btn btn-notify-user" data-email="${u.email}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; background: rgba(175, 134, 252, 0.15); color: #af86fc; border: 1px solid rgba(175, 134, 252, 0.25); cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-bell"></i> Notify
                    </button>
                    <button class="btn btn-delete-user" data-email="${u.email}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; background: rgba(255, 102, 102, 0.15); color: #ff6666; border: 1px solid rgba(255, 102, 102, 0.25); cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        tr.querySelector('.user-clickable-email').addEventListener('click', (e) => {
            const email = e.currentTarget.getAttribute('data-email');
            openAdminUserDetails(email);
        });

        tr.querySelector('.btn-ban-user').addEventListener('click', async (e) => {
            const email = e.currentTarget.getAttribute('data-email');
            const wasBanned = e.currentTarget.getAttribute('data-banned') === 'true';
            const actionText = wasBanned ? 'unban' : 'ban';
            if (!confirm(`Are you sure you want to ${actionText} ${email}?`)) return;

            try {
                const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/ban-user`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${await getAuthToken()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, banned: !wasBanned })
                });
                const data = await res.json();
                if (res.ok) {
                    window.showAppNotification('success', `User ${email} has been ${wasBanned ? 'unbanned' : 'banned'}.`);
                    loadAdminUsers();
                } else {
                    window.showAppNotification('danger', data.error || 'Action failed');
                }
            } catch (err) {
                window.showAppNotification('danger', 'Network error');
            }
        });

        tr.querySelector('.btn-role-user').addEventListener('click', async (e) => {
            const email = e.currentTarget.getAttribute('data-email');
            const currentRole = e.currentTarget.getAttribute('data-role');
            const newRole = currentRole === 'admin' ? 'user' : 'admin';
            if (!confirm(`Are you sure you want to change role of ${email} to ${newRole.toUpperCase()}?`)) return;

            try {
                const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/update-role`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${await getAuthToken()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, role: newRole })
                });
                const data = await res.json();
                if (res.ok) {
                    window.showAppNotification('success', `Role of ${email} updated to ${newRole.toUpperCase()}.`);
                    loadAdminUsers();
                } else {
                    window.showAppNotification('danger', data.error || 'Action failed');
                }
            } catch (err) {
                window.showAppNotification('danger', 'Network error');
            }
        });

        tr.querySelector('.btn-notify-user').addEventListener('click', (e) => {
            const email = e.currentTarget.getAttribute('data-email');

            // Switch to push notification tab
            const notifTabBtn = document.querySelector('.db-tab-btn[data-tab="admin-notif"]');
            if (notifTabBtn) {
                notifTabBtn.click();
            }

            // Pre-fill email
            const emailInput = document.getElementById('admin-notif-email');
            if (emailInput) {
                emailInput.value = email;
            }

            // Focus on title input
            const titleInput = document.getElementById('admin-notif-title');
            if (titleInput) {
                titleInput.focus();
            }
        });

        tr.querySelector('.btn-delete-user').addEventListener('click', async (e) => {
            const email = e.currentTarget.getAttribute('data-email');
            if (!confirm(`CRITICAL WARNING:\nAre you sure you want to permanently delete user account: ${email}?\nThis action cannot be undone.`)) return;

            try {
                const res = await fetch(`${window.API.GC_SERVER_BASE}/admin/delete-user`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${await getAuthToken()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (res.ok) {
                    window.showAppNotification('success', `User account ${email} deleted successfully.`);
                    loadAdminUsers();
                } else {
                    window.showAppNotification('danger', data.error || 'Action failed');
                }
            } catch (err) {
                window.showAppNotification('danger', 'Network error');
            }
        });

        tbody.appendChild(tr);
    });

    // Setup double scrollbar synchronization
    setTimeout(() => {
        const tableContainer = document.querySelector('#page-admin .table-responsive');
        const topScrollbar = document.getElementById('admin-users-top-scrollbar');
        const topScrollbarDummy = document.getElementById('admin-users-top-scrollbar-dummy');

        if (tableContainer && topScrollbar && topScrollbarDummy) {
            const hasHorizontalScroll = tableContainer.scrollWidth > tableContainer.clientWidth;
            if (hasHorizontalScroll) {
                topScrollbar.style.display = 'block';

                // Rumus matematika agar rentang scroll maksimum sama persis:
                // maxScroll(top) = dummyWidth - clientWidth(top)
                // maxScroll(table) = tableScrollWidth - clientWidth(table)
                // dummyWidth = tableScrollWidth - clientWidth(table) + clientWidth(top)
                const tableScrollWidth = tableContainer.scrollWidth;
                const tableClientWidth = tableContainer.clientWidth;
                const topClientWidth = topScrollbar.clientWidth;

                const dummyWidth = tableScrollWidth - tableClientWidth + topClientWidth;
                topScrollbarDummy.style.width = dummyWidth + 'px';

                // Sync top -> bottom
                topScrollbar.onscroll = () => {
                    tableContainer.scrollLeft = topScrollbar.scrollLeft;
                };
                // Sync bottom -> top
                tableContainer.onscroll = () => {
                    topScrollbar.scrollLeft = tableContainer.scrollLeft;
                };
            } else {
                topScrollbar.style.display = 'none';
            }
        }
    }, 100);
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
let adminSupportPollingInterval = null;

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

window.onAdminTicketsUpdate = function (msg) {
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
};

async function loadAdminSupport(silent = false) {
    const tbody = document.getElementById('admin-support-tbody');
    if (!tbody) return;

    if (!silent && (!loadedAdminTicketsList || loadedAdminTicketsList.length === 0)) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">
            <i class="fa-solid fa-circle-notch fa-spin" style="margin-right: 6px;"></i> Loading Support Channel...
        </td></tr>`;
    }

    try {
        const idToken = await getAuthToken();
        if (!idToken) return;

        const res = await fetch(`${window.API.GC_SUPPORT_BASE}/admin/ticket/list`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        const data = await res.json();
        if (res.ok && data.success) {
            loadedAdminTicketsList = data.tickets || [];
            renderAdminSupportTable();

            if (activeAdminTicketId) {
                const activeTicket = loadedAdminTicketsList.find(t => t.ticketId === activeAdminTicketId);
                if (activeTicket) {
                    updateAdminModalState(activeTicket);
                }
            }
        }
    } catch (err) {
        if (!silent) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Failed to load support tickets: ${err.message}</td></tr>`;
        }
    }
}



function renderAdminSupportTable() {
    const tbody = document.getElementById('admin-support-tbody');
    if (!tbody) return;

    const filterStatus = document.getElementById('admin-support-filter-status')?.value || 'all';
    const filterCategory = document.getElementById('admin-support-filter-category')?.value || 'all';

    tbody.innerHTML = '';

    // Filter loaded tickets
    let filteredTickets = [...loadedAdminTicketsList];
    if (filterStatus !== 'all') {
        filteredTickets = filteredTickets.filter(t => {
            const statusLower = t.status.toLowerCase();
            const isResolved = statusLower === 'resolved' || statusLower === 'closed';
            const hasAdminReply = t.replies && Object.values(t.replies).some(r => r.sender === 'Admin');

            if (filterStatus === 'resolved') return isResolved;
            if (filterStatus === 'replied') return !isResolved && hasAdminReply;
            if (filterStatus === 'pending') return !isResolved && !hasAdminReply;
            return true;
        });
    }
    if (filterCategory !== 'all') {
        filteredTickets = filteredTickets.filter(t => (t.type || 'general').toLowerCase() === filterCategory);
    }

    if (filteredTickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No support tickets found matching the filters.</td></tr>`;
        return;
    }

    filteredTickets.forEach(t => {
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
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-primary btn-open-ticket" data-id="${t.ticketId}" style="width: auto; padding: 4px 10px; border-radius: 4px; display: flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-reply"></i> Reply
                    </button>
                    <button class="btn btn-delete-ticket" data-id="${t.ticketId}" style="width: auto; padding: 4px 10px; border-radius: 4px; background: rgba(255, 102, 102, 0.15); color: #ff6666; border: 1px solid rgba(255, 102, 102, 0.25); cursor: pointer;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        tr.querySelector('.btn-open-ticket').addEventListener('click', () => {
            openAdminTicketDetails(t);
        });

        tr.querySelector('.btn-delete-ticket').addEventListener('click', async (e) => {
            e.stopPropagation();
            const ticketId = e.currentTarget.getAttribute('data-id');
            if (!confirm(`Are you sure you want to permanently delete support ticket ${ticketId}?`)) return;

            try {
                const res = await fetch(`${window.API.GC_SUPPORT_BASE}/admin/ticket/delete`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${await getAuthToken()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ticketId })
                });
                const data = await res.json();
                if (res.ok) {
                    window.showAppNotification('success', `Support ticket ${ticketId} has been deleted.`);
                    loadAdminSupport();
                } else {
                    window.showAppNotification('danger', data.error || 'Failed to delete ticket');
                }
            } catch (err) {
                window.showAppNotification('danger', 'Network error');
            }
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

    const parsedSubject = parseTicketMessage(ticket.message);
    document.getElementById('admin-ticket-modal-subject').textContent = parsedSubject.subject;

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

    messagesList.forEach((msg, index) => {
        const isAdmin = msg.senderType === 'admin' || msg.sender === 'Admin';

        // 1:1 dynamic avatars
        let avatarUrl = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
        if (isAdmin) {
            avatarUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="%23af86fc"/><path d="M 35 60 A 25 25 0 0 1 85 60" stroke="%23ffffff" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="25" y="46" width="12" height="28" rx="6" fill="%23ffffff"/><rect x="83" y="46" width="12" height="28" rx="6" fill="%23ffffff"/><path d="M 32 70 Q 34 90 52 86" stroke="%23ffffff" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="52" cy="86" r="4.5" fill="%23ffffff"/></svg>`;
        } else {
            // Check if user has a profile picture (since we cannot easily read currentUser google photo in admin list, fallback gracefully)
            avatarUrl = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
        }

        const msgRow = document.createElement('div');
        msgRow.style.display = 'flex';
        msgRow.style.alignItems = 'flex-end';
        msgRow.style.gap = '10px';
        msgRow.style.width = '100%';
        msgRow.style.marginBottom = '12px';
        msgRow.style.whiteSpace = 'pre-wrap';

        const avatarImg = document.createElement('img');
        avatarImg.src = avatarUrl;
        avatarImg.style.width = '32px';
        avatarImg.style.height = '32px';
        avatarImg.style.borderRadius = '50%';
        avatarImg.style.objectFit = 'cover';
        avatarImg.style.border = '1px solid var(--border-color)';
        avatarImg.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
        avatarImg.style.flexShrink = '0';

        const bubble = document.createElement('div');
        bubble.style.padding = '12px 16px';
        bubble.style.borderRadius = '15px';
        bubble.style.lineHeight = '1.4';
        bubble.style.display = 'flex';
        bubble.style.flexDirection = 'column';
        bubble.style.gap = '8px';
        bubble.style.width = '100%';

        if (isAdmin) {
            bubble.style.background = 'linear-gradient(135deg, rgba(175, 134, 252, 0.15) 0%, rgba(126, 83, 201, 0.15) 100%)';
            bubble.style.border = '1px solid rgba(175, 134, 252, 0.2)';
            bubble.style.color = 'var(--text-sharp)';
            bubble.style.borderBottomRightRadius = '2px';
            bubble.style.maxWidth = '80%';
        } else {
            bubble.style.background = 'var(--bg-primary)';
            bubble.style.border = '1px solid var(--border-color)';
            bubble.style.color = 'var(--text-primary)';
            bubble.style.borderBottomLeftRadius = '2px';
            bubble.style.maxWidth = 'calc(100% - 45px)';
        }

        const msgTime = new Date(msg.createdAt);
        const msgTimeStr = msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Filter subject on message index 0
        let displayMessageText = msg.message || '';
        if (index === 0) {
            displayMessageText = parseTicketMessage(msg.message).description;
        }

        // Render message text body
        const textContainer = document.createElement('div');
        textContainer.style.wordBreak = 'break-word';
        textContainer.innerHTML = formatUrlsToLinks(displayMessageText);
        bubble.appendChild(textContainer);

        // Rich attachments container
        if (msg.images && msg.images.length > 0) {
            const attachmentsContainer = document.createElement('div');
            attachmentsContainer.style.display = 'flex';
            attachmentsContainer.style.flexDirection = 'column';
            attachmentsContainer.style.gap = '8px';
            attachmentsContainer.style.marginTop = '4px';

            msg.images.forEach(url => {
                const type = getAttachmentType(url);
                const filename = getAttachmentFileName(url);

                if (type === 'image') {
                    const img = document.createElement('img');
                    img.src = url;
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '240px';
                    img.style.borderRadius = '10px';
                    img.style.cursor = 'zoom-in';
                    img.style.objectFit = 'contain';
                    img.style.border = '1px solid var(--border-color)';
                    img.style.marginTop = '4px';
                    img.addEventListener('click', () => showImageFullscreen(url));
                    attachmentsContainer.appendChild(img);
                } else if (type === 'video') {
                    const video = document.createElement('video');
                    video.src = url;
                    video.controls = true;
                    video.style.maxWidth = '100%';
                    video.style.maxHeight = '240px';
                    video.style.borderRadius = '10px';
                    video.style.border = '1px solid var(--border-color)';
                    video.style.marginTop = '4px';
                    attachmentsContainer.appendChild(video);
                } else if (type === 'audio') {
                    const audioPlayer = document.createElement('audio');
                    audioPlayer.src = url;
                    audioPlayer.controls = true;
                    audioPlayer.preload = 'metadata';
                    audioPlayer.style.width = '100%';
                    audioPlayer.style.borderRadius = '8px';
                    audioPlayer.style.marginTop = '8px';
                    audioPlayer.style.outline = 'none';

                    const audioWrapper = document.createElement('div');
                    audioWrapper.style.display = 'flex';
                    audioWrapper.style.flexDirection = 'column';
                    audioWrapper.style.gap = '8px';
                    audioWrapper.style.padding = '12px 14px';
                    audioWrapper.style.background = 'rgba(255, 255, 255, 0.03)';
                    audioWrapper.style.border = '1px solid var(--border-color)';
                    audioWrapper.style.borderRadius = '10px';
                    audioWrapper.style.marginTop = '4px';
                    audioWrapper.style.width = '100%';
                    audioWrapper.style.maxWidth = '320px';

                    audioWrapper.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-music" style="font-size: 1.4rem; color: #66ffd9;"></i>
                            <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                                <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-sharp);  text-overflow: ellipsis; white-space: nowrap;">${filename}</span>
                                <span style="font-size: 0.75rem; color: var(--text-muted);">Audio File</span>
                            </div>
                        </div>
                    `;
                    audioWrapper.appendChild(audioPlayer);
                    attachmentsContainer.appendChild(audioWrapper);
                } else if (type === 'document') {
                    const docCard = document.createElement('div');
                    docCard.style.display = 'flex';
                    docCard.style.alignItems = 'center';
                    docCard.style.gap = '12px';
                    docCard.style.padding = '10px 14px';
                    docCard.style.background = 'rgba(255, 255, 255, 0.03)';
                    docCard.style.border = '1px solid var(--border-color)';
                    docCard.style.borderRadius = '10px';
                    docCard.style.marginTop = '4px';
                    docCard.style.cursor = 'pointer';

                    docCard.innerHTML = `
                        <i class="fa-solid fa-file-pdf" style="font-size: 1.8rem; color: #ff6666;"></i>
                        <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                            <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-sharp);  text-overflow: ellipsis; white-space: nowrap;">${filename}</span>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Document File</span>
                        </div>
                        <i class="fa-solid fa-up-right-from-square" style="color: var(--text-muted); font-size: 0.9rem;"></i>
                    `;

                    docCard.addEventListener('click', () => showDocumentViewer(url));
                    attachmentsContainer.appendChild(docCard);
                } else {
                    const fileCard = document.createElement('div');
                    fileCard.style.display = 'flex';
                    fileCard.style.alignItems = 'center';
                    fileCard.style.gap = '12px';
                    fileCard.style.padding = '10px 14px';
                    fileCard.style.background = 'rgba(255, 255, 255, 0.03)';
                    fileCard.style.border = '1px solid var(--border-color)';
                    fileCard.style.borderRadius = '10px';
                    fileCard.style.marginTop = '4px';

                    fileCard.innerHTML = `
                        <i class="fa-solid fa-file-zipper" style="font-size: 1.8rem; color: #ffd700;"></i>
                        <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                            <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-sharp);  text-overflow: ellipsis; white-space: nowrap;">${filename}</span>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Archive File</span>
                        </div>
                        <a href="${url}" target="_blank" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px; padding: 6px 10px; font-size: 0.8rem; text-decoration: none; display: flex; align-items: center; gap: 5px;">
                            <i class="fa-solid fa-download"></i> Download
                        </a>
                    `;

                    attachmentsContainer.appendChild(fileCard);
                }
            });

            bubble.appendChild(attachmentsContainer);
        }

        // Timestamp at the bottom right corner
        const footer = document.createElement('div');
        footer.style.color = 'var(--text-muted)';
        footer.style.fontSize = '0.7rem';
        footer.style.textAlign = 'right';
        footer.style.marginTop = '4px';
        footer.style.opacity = '0.75';
        footer.textContent = msgTimeStr;
        bubble.appendChild(footer);

        if (isAdmin) {
            msgRow.style.justifyContent = 'flex-end';
            msgRow.appendChild(bubble);
            msgRow.appendChild(avatarImg);
        } else {
            msgRow.style.justifyContent = 'flex-start';
            msgRow.appendChild(avatarImg);
            msgRow.appendChild(bubble);
        }

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

// ==============================================================
// RICH ATTACHMENTS & IMAGE COMPRESSION UTILITIES FOR ADMIN 1:1
// ==============================================================

function parseTicketMessage(rawMessage) {
    const match = (rawMessage || '').trim().match(/^\[(.*?)\]\s*([\s\S]*)$/);
    if (match) {
        return {
            subject: match[1].trim(),
            description: match[2].trim()
        };
    }
    return {
        subject: "Support Ticket",
        description: (rawMessage || '').trim()
    };
}

function getAttachmentType(url) {
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    if (cleanUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) return 'image';
    if (cleanUrl.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv)$/)) return 'video';
    if (cleanUrl.match(/\.(mp3|wav|ogg|aac|flac|m4a|weba)$/)) return 'audio';
    if (cleanUrl.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf)$/)) return 'document';
    return 'other';
}

function getAttachmentFileName(url) {
    try {
        const decoded = decodeURIComponent(url);
        const parts = decoded.split('/');
        const lastPart = parts[parts.length - 1].split('?')[0].split('#')[0];
        return lastPart || 'Attachment';
    } catch (e) {
        return 'Attachment';
    }
}

// Helper: Format URLs to clickable links safely
function formatUrlsToLinks(text) {
    if (!text) return '';
    const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    return escaped.replace(urlRegex, (url) => {
        let href = url;
        if (!/^https?:\/\//i.test(url)) {
            href = 'http://' + url;
        }
        return `<a href="${href}" target="_blank" style="color: #0098a3ff; text-decoration: underline; word-break: break-all;">${url}</a>`;
    });
}

function showImageFullscreen(imgUrl) {
    let lightbox = document.getElementById('support-lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'support-lightbox';
        lightbox.style.position = 'fixed';
        lightbox.style.top = '0';
        lightbox.style.left = '0';
        lightbox.style.width = '100vw';
        lightbox.style.height = '100vh';
        lightbox.style.background = 'rgba(10, 8, 16, 0.95)';
        lightbox.style.display = 'flex';
        lightbox.style.alignItems = 'center';
        lightbox.style.justifyContent = 'center';
        lightbox.style.zIndex = '99999';
        lightbox.style.opacity = '0';
        lightbox.style.transition = 'opacity 0.25s ease';
        lightbox.style.cursor = 'zoom-out';

        lightbox.innerHTML = `
            <img id="support-lightbox-img" src="" style="max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); transform: scale(0.95); transition: transform 0.25s ease;">
            <button style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 50%; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; cursor: pointer; transition: background 0.2s; border: none;" title="Close">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        lightbox.addEventListener('click', () => {
            lightbox.style.opacity = '0';
            lightbox.querySelector('img').style.transform = 'scale(0.95)';
            setTimeout(() => {
                lightbox.classList.add('hide');
                lightbox.remove();
            }, 250);
        });

        lightbox.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            lightbox.click();
        });

        document.body.appendChild(lightbox);
    }

    const lightboxImg = lightbox.querySelector('#support-lightbox-img');
    lightboxImg.src = imgUrl;

    lightbox.getBoundingClientRect();
    lightbox.classList.remove('hide');
    lightbox.style.opacity = '1';
    lightboxImg.style.transform = 'scale(1)';
}

function showDocumentViewer(docUrl) {
    let viewerModal = document.getElementById('support-doc-viewer');
    if (!viewerModal) {
        viewerModal = document.createElement('div');
        viewerModal.id = 'support-doc-viewer';
        viewerModal.style.position = 'fixed';
        viewerModal.style.top = '0';
        viewerModal.style.left = '0';
        viewerModal.style.width = '100vw';
        viewerModal.style.height = '100vh';
        viewerModal.style.background = 'rgba(10, 8, 16, 0.96)';
        viewerModal.style.display = 'flex';
        viewerModal.style.flexDirection = 'column';
        viewerModal.style.alignItems = 'center';
        viewerModal.style.justifyContent = 'center';
        viewerModal.style.zIndex = '99999';
        viewerModal.style.opacity = '0';
        viewerModal.style.transition = 'opacity 0.25s ease';

        viewerModal.innerHTML = `
            <div style="width: 90%; height: 85%; background: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border-color);  display: flex; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.5); transform: scale(0.97); transition: transform 0.25s ease;" id="support-doc-container">
                <div style="padding: 15px 20px; background: var(--bg-primary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: var(--text-sharp); display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-file-lines" style="color: #af86fc;"></i> Document Viewer
                    </span>
                    <div style="display: flex; gap: 10px;">
                        <a id="support-doc-download-btn" href="" target="_blank" class="btn btn-secondary" style="padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; text-decoration: none;">
                            <i class="fa-solid fa-download"></i> Download
                        </a>
                        <button id="support-doc-close-btn" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 0.85rem;">
                            <i class="fa-solid fa-xmark"></i> Close
                        </button>
                    </div>
                </div>
                <div style="flex: 1; background: #ffffff; display: flex; align-items: center; justify-content: center; position: relative;">
                    <div id="support-doc-loader" style="position: absolute; display: flex; flex-direction: column; align-items: center; gap: 15px; color: #555;">
                        <i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color: #af86fc;"></i>
                        <span>Loading document...</span>
                    </div>
                    <iframe id="support-doc-iframe" src="" style="width: 100%; height: 100%; border: none; opacity: 0; transition: opacity 0.3s;" allowfullscreen></iframe>
                </div>
            </div>
        `;

        const closeViewer = () => {
            viewerModal.style.opacity = '0';
            document.getElementById('support-doc-container').style.transform = 'scale(0.97)';
            setTimeout(() => {
                viewerModal.classList.add('hide');
                viewerModal.remove();
            }, 250);
        };

        viewerModal.addEventListener('click', (e) => {
            if (e.target === viewerModal) closeViewer();
        });

        viewerModal.querySelector('#support-doc-close-btn').addEventListener('click', closeViewer);

        document.body.appendChild(viewerModal);
    }

    const iframe = viewerModal.querySelector('#support-doc-iframe');
    const loader = viewerModal.querySelector('#support-doc-loader');
    const downloadBtn = viewerModal.querySelector('#support-doc-download-btn');

    downloadBtn.href = docUrl;

    const isPdf = docUrl.split('?')[0].split('#')[0].toLowerCase().endsWith('.pdf');
    const viewerUrl = isPdf
        ? docUrl
        : `https://docs.google.com/gview?url=${encodeURIComponent(docUrl)}&embedded=true`;

    iframe.src = viewerUrl;
    iframe.style.opacity = '0';
    loader.style.display = 'flex';

    iframe.onload = () => {
        loader.style.display = 'none';
        iframe.style.opacity = '1';
    };

    viewerModal.getBoundingClientRect();
    viewerModal.classList.remove('hide');
    viewerModal.style.opacity = '1';
    document.getElementById('support-doc-container').style.transform = 'scale(1)';
}

async function compressImageIfNeeded(file) {
    if (!file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                const MAX_SIZE = 1600;
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height = Math.round((height * MAX_SIZE) / width);
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width = Math.round((width * MAX_SIZE) / height);
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: "image/jpeg",
                            lastModified: Date.now()
                        });
                        console.log(`[Compression Admin] "${file.name}" compressed: ${(file.size / 1024).toFixed(1)} KB -> ${(compressedFile.size / 1024).toFixed(1)} KB`);
                        resolve(compressedFile.size < file.size ? compressedFile : file);
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', 0.75);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

async function openAdminUserDetails(email) {
    const modal = document.getElementById('admin-user-modal');
    if (!modal) return;

    // Reset fields to loading state
    document.getElementById('admin-user-modal-email').textContent = email;
    
    const roleBadge = document.getElementById('admin-user-modal-role-badge');
    roleBadge.textContent = 'LOADING...';
    roleBadge.style.background = 'rgba(255, 255, 255, 0.05)';
    roleBadge.style.color = 'var(--text-muted)';

    const statusBadge = document.getElementById('admin-user-modal-status-badge');
    statusBadge.textContent = 'LOADING...';
    statusBadge.style.background = 'rgba(255, 255, 255, 0.05)';
    statusBadge.style.color = 'var(--text-muted)';

    document.getElementById('admin-user-modal-plan').textContent = '...';
    document.getElementById('admin-user-modal-expiry').textContent = '...';
    document.getElementById('admin-user-modal-credits').textContent = '...';
    document.getElementById('admin-user-modal-country').textContent = '...';
    document.getElementById('admin-user-modal-ip').textContent = '...';
    document.getElementById('admin-user-modal-pro-credits').textContent = '...';
    document.getElementById('admin-user-modal-ultra-credits').textContent = '...';
    document.getElementById('admin-user-modal-last-seen').textContent = '...';
    document.getElementById('admin-user-modal-keys-container').innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-muted);">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 1.5rem; color: #00f0ff;"></i>
            <span style="display: block; margin-top: 8px;">Fetching user details...</span>
        </div>
    `;

    modal.classList.remove('hide');

    const handleUserDetails = (u) => {
        // Update basic details
        document.getElementById('admin-user-modal-email').textContent = u.email;
        
        // Role badge styling
        roleBadge.textContent = u.role || 'user';
        if (u.role === 'admin') {
            roleBadge.style.background = 'rgba(175, 134, 252, 0.15)';
            roleBadge.style.color = '#af86fc';
        } else {
            roleBadge.style.background = 'rgba(255, 255, 255, 0.05)';
            roleBadge.style.color = 'var(--text-muted)';
        }

        // Status badge styling
        const now = Date.now();
        const isActuallyOnline = u.status === 'online' && u.lastSeen && (now - u.lastSeen < 75000);
        const computedStatus = isActuallyOnline ? 'online' : 'offline';
        statusBadge.textContent = computedStatus.toUpperCase();
        if (computedStatus === 'online') {
            statusBadge.style.background = 'rgba(102, 255, 217, 0.1)';
            statusBadge.style.color = '#66ffd9';
        } else {
            statusBadge.style.background = 'rgba(255, 255, 255, 0.05)';
            statusBadge.style.color = 'var(--text-muted)';
        }

        // Registration date
        const regDate = u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A';
        document.getElementById('admin-user-modal-reg-date').textContent = `Registered: ${regDate}`;

        // Subscription details
        const planLabel = u.subscription_plan === 'none' ? 'free' : (u.subscription_plan || 'free');
        const planEl = document.getElementById('admin-user-modal-plan');
        planEl.textContent = planLabel;
        if (planLabel.toLowerCase() !== 'free') {
            planEl.style.color = '#bc3bf7';
        } else {
            planEl.style.color = 'var(--text-muted)';
        }

        document.getElementById('admin-user-modal-expiry').textContent = u.subscription_expiry ? new Date(u.subscription_expiry).toLocaleDateString() : 'Lifetime';
        
        const apiCredits = u.api_credits !== undefined ? u.api_credits : (u.api_quota || 0);
        const freeCredits = u.free_credits !== undefined ? u.free_credits : 0;
        document.getElementById('admin-user-modal-credits').textContent = `${freeCredits.toLocaleString()} / ${apiCredits.toLocaleString()}`;
        
        // Country with Flag
        const countryCode = u.country || 'unknown';
        const countryEl = document.getElementById('admin-user-modal-country');
        countryEl.innerHTML = '';
        if (countryCode && countryCode !== 'unknown' && countryCode !== 'XX') {
            const flagImg = document.createElement('img');
            flagImg.src = `https://flagcdn.com/20x15/${countryCode.toLowerCase()}.png`;
            flagImg.alt = countryCode;
            flagImg.style.borderRadius = '2px';
            flagImg.style.verticalAlign = 'middle';
            
            const textSpan = document.createElement('span');
            textSpan.textContent = countryCode.toUpperCase();
            
            countryEl.appendChild(flagImg);
            countryEl.appendChild(textSpan);
        } else {
            countryEl.textContent = 'N/A';
        }

        // CF IP Address
        const ipEl = document.getElementById('admin-user-modal-ip');
        const ipVal = u.ip || 'N/A';
        const userCount = u.ip_user_count || 1;
        if (ipVal !== 'N/A' && userCount >= 2) {
            let warnColor = '#ffd700'; // MULTI
            let icon = 'fa-circle-exclamation';
            let label = 'Shared';
            if (userCount >= 5) {
                warnColor = '#ff6666'; // ABUSE
                icon = 'fa-triangle-exclamation';
                label = 'Potential Abuse';
            }
            ipEl.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: flex-start;">
                    <span>${ipVal}</span>
                    <div style="color: ${warnColor}; font-size: 0.72rem; font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
                        <i class="fa-solid ${icon}"></i> ${label}: ${userCount} accounts
                    </div>
                </div>
            `;
        } else {
            ipEl.textContent = ipVal;
        }

        // Pro & Ultra Credits
        const proCredits = u.pro_subs_credits !== undefined ? u.pro_subs_credits : 0;
        document.getElementById('admin-user-modal-pro-credits').textContent = proCredits.toLocaleString();

        const ultraCredits = u.ultra_subs_credits !== undefined ? u.ultra_subs_credits : 0;
        document.getElementById('admin-user-modal-ultra-credits').textContent = ultraCredits.toLocaleString();

        document.getElementById('admin-user-modal-last-seen').textContent = u.lastSeen ? new Date(u.lastSeen).toLocaleString() : 'Never';

        // Render owned API Keys
        const keysContainer = document.getElementById('admin-user-modal-keys-container');
        keysContainer.innerHTML = '';
        if (!u.apiKeys || u.apiKeys.length === 0) {
            keysContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px; text-align: center;">No API Keys found for this user.</div>';
        } else {
            u.apiKeys.forEach(k => {
                const keyCard = document.createElement('div');
                keyCard.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; position: relative;';
                
                const typeLabel = k.type === 'compensation' ? '<span style="background: rgba(255, 215, 0, 0.1); color: #ffd700; border: 1px solid rgba(255, 215, 0, 0.2); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase;">Compensation</span>' : '<span style="background: rgba(0, 240, 255, 0.1); color: #00f0ff; border: 1px solid rgba(0, 240, 255, 0.2); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase;">API Key</span>';
                
                keyCard.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: var(--text-primary); font-size: 0.9rem;">${k.projectName || 'Unnamed Project'}</strong>
                        ${typeLabel}
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color);">
                        <code style="font-family: monospace; font-size: 0.85rem; color: #ffd700; flex: 1; word-break: break-all; user-select: all;">${k.key}</code>
                        <button class="btn btn-copy-key" data-key="${k.key}" style="padding: 4px 8px; font-size: 0.8rem; background: rgba(255,255,255,0.05); color: var(--text-primary); border: 1px solid var(--border-color); cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center;" title="Copy Key">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    </div>
                    <div style="display: flex; gap: 15px; font-size: 0.8rem; color: var(--text-muted);">
                        <span>Usage: <strong style="color: var(--text-primary);">${(k.usage || 0).toLocaleString()}</strong></span>
                        ${k.daily_limit ? `<span>Daily Limit: <strong style="color: var(--text-primary);">${k.daily_limit.toLocaleString()}</strong></span>` : ''}
                        <span>Expires: <strong style="color: var(--text-primary);">${k.expiresAt === 'lifetime' ? 'Lifetime' : new Date(k.expiresAt).toLocaleDateString()}</strong></span>
                    </div>
                `;
                
                keyCard.querySelector('.btn-copy-key').addEventListener('click', (e) => {
                    const keyVal = e.currentTarget.getAttribute('data-key');
                    navigator.clipboard.writeText(keyVal).then(() => {
                        window.showAppNotification('success', 'API Key copied to clipboard!');
                    }).catch(() => {
                        window.showAppNotification('danger', 'Failed to copy API key.');
                    });
                });
                
                keysContainer.appendChild(keyCard);
            });
        }
    };

    // WebSocket attempt
    if (window.adminUsersWS && window.adminUsersWS.readyState === WebSocket.OPEN) {
        window.onAdminUserDetailsReceived = handleUserDetails;
        window.adminUsersWS.send(JSON.stringify({ type: "get_user_details", email }));
        return;
    }

    // Fallback to REST
    try {
        const response = await fetch(`${window.API.GC_SERVER_BASE}/admin/user?email=${encodeURIComponent(email)}&_t=${Date.now()}`, {
            headers: {
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to load user details');
        }

        const u = await response.json();
        handleUserDetails(u);
    } catch (err) {
        document.getElementById('admin-user-modal-keys-container').innerHTML = `
            <div style="text-align: center; padding: 20px; color: #ff6666;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
                <span style="display: block;">Error: ${err.message}</span>
            </div>
        `;
    }
}


