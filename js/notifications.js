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

                const unreadNotifs = window.dashboardProfile.notifications.filter(n => !n.read).map(n => n.id);
                if (unreadNotifs.length === 0) return;

                try {
                    const idToken = await window.firebaseAuth.currentUser.getIdToken(true);
                    await fetch(`${window.API.GC_SERVER_BASE}/notifications/mark-read`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notifIds: unreadNotifs })
                    });

                    // Optimistic update
                    window.dashboardProfile.notifications.forEach(n => n.read = true);
                    window.dashboardProfile.unread_notifications = 0;
                    renderNotifications(window.dashboardProfile.notifications, 0);
                } catch (e) {
                    console.error('Failed to mark read', e);
                }
            });
        }
    }
}

window.renderNotifications = function (notifications = [], unreadCount = 0) {
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');

    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hide');
        } else {
            badge.classList.add('hide');
        }
    }

    if (list) {
        if (notifications.length === 0) {
            list.innerHTML = `<div style="color: var(--text-muted); text-align: center; font-size: 12px;">No new notifications</div>`;
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

            card.style.cssText = `padding: 8px; border-radius: 6px; background: ${bg}; border-left: 3px solid ${color}; position: relative; font-size: 12px; word-break: break-word; display: flex; flex-direction: column; transition: all 0.3s ease;`;
            if (!n.read) {
                card.style.borderLeftWidth = '5px';
            }

            // Create Header
            const header = document.createElement('div');
            header.style.cssText = `display: flex; justify-content: space-between; align-items: flex-start; cursor: pointer; user-select: none; width: 100%;`;
            header.innerHTML = `
                <strong style="color: var(--text-sharp); display: block; font-size: 12px; flex-grow: 1; text-align: left; padding-right: 8px; line-height: 1.35;">${n.title}</strong>
                <i class="fa-solid fa-chevron-down notif-chevron" style="font-size: 10px; color: var(--text-muted); transition: transform 0.2s ease; margin-top: 3px; flex-shrink: 0;"></i>
            `;

            // Create Body
            const body = document.createElement('div');
            body.className = 'notif-body';
            body.style.cssText = `max-height: 0px; overflow: hidden; transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, margin-top 0.2s ease; opacity: 0; margin-top: 0px; white-space: pre-wrap;`;
            body.innerHTML = `
                <span style="color: var(--text-primary); display: block; line-height: 1.35; font-size: 11px;">${n.message}</span>
                <small style="color: var(--text-muted); font-size: 9px; margin-top: 4px; display: block;">${new Date(n.createdAt).toLocaleString()}</small>
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

                // If it was collapsed, expand it
                if (!isExpanded) {
                    card.classList.add('expanded');
                    body.style.maxHeight = body.scrollHeight + 'px';
                    body.style.opacity = '1';
                    body.style.marginTop = '6px';
                    if (chevron) chevron.style.transform = 'rotate(180deg)';
                }
            });

            list.appendChild(card);
        });
    }
}

// Note: renderNotifications is invoked directly in js/dashboard.js upon profile data load.
