// js/notifications.js
document.addEventListener('DOMContentLoaded', () => {
    initNotifications();
});

function initNotifications() {
    const notifContainer = document.getElementById('notif-container');
    const notifDropdown = document.getElementById('notif-dropdown');
    const markReadBtn = document.getElementById('notif-mark-read');

    if (notifContainer && notifDropdown) {
        // Toggle dropdown
        notifContainer.addEventListener('click', (e) => {
            if (e.target.closest('#notif-dropdown')) return;
            if (e.target.closest('#notif-mark-read')) return;
            notifDropdown.classList.toggle('hide');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!notifContainer.contains(e.target)) {
                notifDropdown.classList.add('hide');
            }
        });

        if (markReadBtn) {
            markReadBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!window.dashboardProfile || !window.dashboardProfile.notifications) return;

                let notifList = window.dashboardProfile.notifications;
                if (notifList && typeof notifList === 'object' && !Array.isArray(notifList)) {
                    notifList = Object.values(notifList);
                }
                if (!Array.isArray(notifList)) return;

                const unreadNotifs = notifList.filter(n => !n.read).map(n => n.id);
                if (unreadNotifs.length === 0) return;

                // Persist read status locally in LocalStorage immediately
                const localReadIds = JSON.parse(localStorage.getItem('read_notification_ids') || '[]');
                const updatedReadIds = Array.from(new Set([...localReadIds, ...unreadNotifs]));
                localStorage.setItem('read_notification_ids', JSON.stringify(updatedReadIds));

                try {
                    const idToken = await window.getAuthToken();
                    if (!idToken) throw new Error("Not logged in");
                    await fetch(`${window.API.GC_SERVER_BASE}/notifications/mark-read`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notifIds: unreadNotifs })
                    });
                } catch (err) {
                    console.error('Failed to mark read on server', err);
                }

                // Optimistic UI update
                notifList.forEach(n => n.read = true);
                window.dashboardProfile.unread_notifications = 0;
                renderNotifications(notifList, 0);
            });
        }
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

window.renderNotifications = function (notifications = [], unreadCount = 0) {
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');

    // Convert object (such as Firebase Realtime DB object map) to array
    if (notifications && typeof notifications === 'object' && !Array.isArray(notifications)) {
        notifications = Object.values(notifications);
    }
    if (!Array.isArray(notifications)) {
        notifications = [];
    }

    // Filter out invalid/empty notifications (title/message is undefined or null)
    notifications = notifications.filter(n => n && n.title && n.message);

    // Retrieve locally read notification IDs from LocalStorage
    const localReadIds = JSON.parse(localStorage.getItem('read_notification_ids') || '[]');

    // Apply LocalStorage read states
    notifications.forEach(n => {
        if (localReadIds.includes(n.id)) {
            n.read = true;
        }
    });

    // Calculate actual unread count based on both server and local storage states
    const actualUnreadCount = notifications.filter(n => !n.read).length;

    if (badge) {
        if (actualUnreadCount > 0) {
            badge.textContent = actualUnreadCount;
            badge.classList.remove('hide');
        } else {
            badge.classList.add('hide');
        }
    }

    if (list) {
        if (notifications.length === 0) {
            list.innerHTML = `<div style="color: var(--text-muted); text-align: center; ">No new notifications</div>`;
            return;
        }

        list.innerHTML = '';
        notifications.forEach(n => {
            const card = document.createElement('div');
            const colorMap = {
                info: '#af86fc',
                success: '#379e56ff',
                warning: '#f1c40f',
                danger: '#ff4757'
            };
            const color = colorMap[n.type] || colorMap.info;
            const bgMap = {
                info: 'rgba(175, 134, 252, 0.1)',
                success: 'rgba(55, 158, 86, 0.1)',
                warning: 'rgba(241, 196, 15, 0.1)',
                danger: 'rgba(255, 71, 87, 0.1)'
            };
            const bg = bgMap[n.type] || bgMap.info;

            card.style.cssText = `padding: 8px; border-radius: 6px; background: ${bg}; border-left: 3px solid ${color}; position: relative; word-break: break-word; display: flex; flex-direction: column; transition: all 0.3s ease;`;
            if (!n.read) {
                card.style.borderLeftWidth = '5px';
            }

            // Create Header
            const header = document.createElement('div');
            header.style.cssText = `display: flex; justify-content: space-between; align-items: flex-start; cursor: pointer; user-select: none; width: 100%;`;
            header.innerHTML = `
                <strong style="color: var(--text-sharp); display: block; flex-grow: 1; text-align: left; padding-right: 8px; line-height: 1.35;">${escapeHTML(n.title)}</strong>
                <i class="fa-solid fa-chevron-down notif-chevron" style="color: var(--text-muted); transition: transform 0.2s ease; margin-top: 3px; flex-shrink: 0;"></i>
            `;

            // Create Body
            const body = document.createElement('div');
            body.className = 'notif-body';
            body.style.cssText = `max-height: 0px;  transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, margin-top 0.2s ease; opacity: 0; margin-top: 0px; white-space: pre-wrap;`;
            body.innerHTML = `
                <span style="color: var(--text-primary); display: block; line-height: 1.35; ">${escapeHTML(n.message)}</span>
                <small style="color: var(--text-muted); margin-top: 4px; display: block;">${new Date(n.createdAt).toLocaleString()}</small>
            `;

            card.appendChild(header);
            card.appendChild(body);

            // Accordion click handling
            header.addEventListener('click', (e) => {
                e.stopPropagation();

                const isExpanded = card.classList.contains('expanded');
                const chevron = header.querySelector('.notif-chevron');

                // Collapse all sibling cards
                const siblingCards = list.children;
                for (let sibling of siblingCards) {
                    sibling.classList.remove('expanded');
                    const siblingBody = sibling.querySelector('.notif-body');
                    const siblingChevron = sibling.querySelector('.notif-chevron');
                    if (siblingBody && siblingChevron) {
                        siblingBody.style.maxHeight = '0px';
                        siblingBody.style.opacity = '0';
                        siblingBody.style.marginTop = '0px';
                        siblingChevron.style.transform = 'rotate(0deg)';
                    }
                }

                // If it was collapsed, expand it and mark it as read!
                if (!isExpanded) {
                    card.classList.add('expanded');
                    body.style.maxHeight = body.scrollHeight + 'px';
                    body.style.opacity = '1';
                    body.style.marginTop = '6px';
                    body.style.maxHeight = '200px';
                    body.style.overflowY = 'auto';
                    if (chevron) chevron.style.transform = 'rotate(180deg)';

                    // Save read status to LocalStorage & Server immediately upon reading
                    if (!n.read) {
                        n.read = true;

                        // LocalStorage Persistence
                        const currentReadIds = JSON.parse(localStorage.getItem('read_notification_ids') || '[]');
                        if (!currentReadIds.includes(n.id)) {
                            currentReadIds.push(n.id);
                            localStorage.setItem('read_notification_ids', JSON.stringify(currentReadIds));
                        }

                        // Fire and forget server persistence in the background
                        window.getAuthToken().then(idToken => {
                            if (idToken) {
                                fetch(`${window.API.GC_SERVER_BASE}/notifications/mark-read`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ notifIds: [n.id] })
                                }).catch(err => console.error('Failed to sync mark read', err));
                            }
                        }).catch(err => console.error('Token fetch failed', err));

                        // Instantly update UI indicators
                        card.style.borderLeftWidth = '3px';

                        // Recalculate and update the badge indicator
                        const recalculatedUnreadCount = notifications.filter(notif => !notif.read).length;
                        const notifBadge = document.getElementById('notif-badge');
                        if (notifBadge) {
                            if (recalculatedUnreadCount > 0) {
                                notifBadge.textContent = recalculatedUnreadCount;
                                notifBadge.classList.remove('hide');
                            } else {
                                notifBadge.classList.add('hide');
                            }
                        }
                    }

                    // Smoothly scroll the card into view within the dropdown after the transition starts
                    setTimeout(() => {
                        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                }
            });

            list.appendChild(card);
        });
    }
};

// Note: renderNotifications is invoked directly in js/dashboard.js upon profile data load.
