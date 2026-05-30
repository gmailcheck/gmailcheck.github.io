(function () {
	// Initialize Support Page UI & Logic connected to real cloud-based backend
	document.addEventListener('DOMContentLoaded', () => {
		const pageSupport = document.getElementById('page-support');
		if (!pageSupport) return;

		// API Base URL
		const API_BASE = window.API.GC_SUPPORT_BASE;

		// Form Selectors
		const inputSubject = document.getElementById('support-subject');
		const selectCategory = document.getElementById('support-category');
		const selectPriority = document.getElementById('support-priority');
		const textareaMessage = document.getElementById('support-message');
		const btnSubmit = document.getElementById('btn-submit-ticket');
		const btnRefresh = document.getElementById('btn-refresh-tickets');
		const listContainer = document.getElementById('tickets-list-container');
		const createTabContent = document.getElementById('support-create-tab');

		// File Selectors for Creation Form
		const createImagesInput = document.getElementById('support-images-input');
		const btnTriggerCreateImages = document.getElementById('btn-trigger-support-images');
		const createImagesCountLabel = document.getElementById('support-images-count-label');
		const createImagesPreview = document.getElementById('support-images-preview-container');

		// Modal Selectors
		const modal = document.getElementById('ticket-modal');
		const modalCloseBtn = document.getElementById('ticket-modal-close-btn');
		const modalId = document.getElementById('ticket-modal-id');
		const modalStatus = document.getElementById('ticket-modal-status-badge');
		const modalSubject = document.getElementById('ticket-modal-subject');
		const modalMeta = document.getElementById('ticket-modal-meta');
		const modalChat = document.getElementById('ticket-modal-chat-history');

		// Modal Reply Selectors
		const modalReplyContainer = document.getElementById('ticket-modal-reply-container');
		const modalReplyInput = document.getElementById('ticket-modal-reply-input');
		const modalReplyBtn = document.getElementById('btn-submit-ticket-reply');
		const replyImagesInput = document.getElementById('ticket-modal-reply-images-input');
		const btnTriggerReplyImages = document.getElementById('btn-trigger-reply-images');
		const replyImagesPreview = document.getElementById('ticket-modal-reply-images-preview');

		let activeTicketId = null;
		let selectedCreateFiles = [];
		let selectedReplyFiles = [];
		let pollingInterval = null;

		function updatePendingFormState(hasPending) {
			let warningEl = document.getElementById('support-pending-warning');
			if (warningEl) warningEl.remove();

			if (hasPending) {
				warningEl = document.createElement('div');
				warningEl.id = 'support-pending-warning';
				warningEl.className = 'pending-ticket-warning';
				warningEl.style.background = 'rgba(255, 102, 102, 0.08)';
				warningEl.style.border = '1px solid rgba(255, 102, 102, 0.25)';
				warningEl.style.color = '#ff6666';
				warningEl.style.padding = '16px';
				warningEl.style.borderRadius = '8px';
				warningEl.style.marginBottom = '20px';
				warningEl.style.display = 'flex';
				warningEl.style.alignItems = 'flex-start';
				warningEl.style.gap = '12px';
				warningEl.style.fontSize = '0.9rem';
				warningEl.style.lineHeight = '1.4';
				warningEl.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';

				warningEl.innerHTML = `
					<i class="fa-solid fa-triangle-exclamation" style="margin-top: 3px; font-size: 1.1rem; color: #ff6666;"></i>
					<div>
						<strong style="display: block; margin-bottom: 4px; color: #ff8888;">Pending Support Ticket Active</strong>
						You already have an active pending support ticket. Please wait for our team to resolve or reply to your existing ticket in the <strong>"Your Support Tickets"</strong> tab before creating a new one.
					</div>
				`;

				if (createTabContent) {
					createTabContent.insertBefore(warningEl, createTabContent.firstChild);
				}

				inputSubject.disabled = true;
				selectCategory.disabled = true;
				selectPriority.disabled = true;
				textareaMessage.disabled = true;
				btnTriggerCreateImages.disabled = true;
				btnSubmit.disabled = true;
				btnSubmit.style.opacity = '0.5';
				btnSubmit.style.cursor = 'not-allowed';
				btnSubmit.title = 'You have an active pending ticket';

				inputSubject.style.opacity = '0.6';
				selectCategory.style.opacity = '0.6';
				selectPriority.style.opacity = '0.6';
				textareaMessage.style.opacity = '0.6';
				btnTriggerCreateImages.style.opacity = '0.6';
				btnTriggerCreateImages.style.cursor = 'not-allowed';
			} else {
				inputSubject.disabled = false;
				selectCategory.disabled = false;
				selectPriority.disabled = false;
				textareaMessage.disabled = false;
				btnTriggerCreateImages.disabled = false;
				btnSubmit.disabled = false;
				btnSubmit.style.opacity = '1';
				btnSubmit.style.cursor = 'pointer';
				btnSubmit.title = '';

				inputSubject.style.opacity = '1';
				selectCategory.style.opacity = '1';
				selectPriority.style.opacity = '1';
				textareaMessage.style.opacity = '1';
				btnTriggerCreateImages.style.opacity = '1';
				btnTriggerCreateImages.style.cursor = 'pointer';
			}
		}

		// Support Tab Switching Logic
		const supportTabs = pageSupport.querySelectorAll('.db-tab-btn[data-tab^="support-"]');
		const supportContents = pageSupport.querySelectorAll('.support-tab-content');

		supportTabs.forEach(tab => {
			tab.addEventListener('click', () => {
				// Remove active from all tabs and hide content
				supportTabs.forEach(t => t.classList.remove('active'));
				supportContents.forEach(c => {
					c.classList.add('hide');
					c.classList.remove('active');
				});

				// Add active to clicked and show content
				tab.classList.add('active');
				const targetId = tab.getAttribute('data-tab');
				const targetContent = document.getElementById(targetId);
				if (targetContent) {
					targetContent.classList.remove('hide');
					targetContent.classList.add('active');
				}
			});
		});

		// Helper: Get Current User Info
		function getUserInfo() {
			const user = window.firebaseAuth.currentUser;
			if (!user) return null;
			return {
				email: user.email,
				username: user.email.split('@')[0]
			};
		}

		// Helper: Check Priority Access based on Membership
		selectPriority.addEventListener('change', () => {
			const val = selectPriority.value;
			const isVip = checkIsVipUser();

			if (val === 'vip') {
				if (!isVip) {
					window.showAppNotification('warning', '👑 <strong>VIP Priority Exclusive!</strong> VIP Priority is only available for VIP members. Your ticket has been reset to Medium priority.');
					selectPriority.value = 'medium';
				}
			}
		});

		function checkIsVipUser() {
			const badge = document.getElementById('user-badge-display');
			return badge && badge.textContent === 'VIP';
		}

		// File Attachment Handler: Ticket Creation Form
		if (btnTriggerCreateImages && createImagesInput) {
			btnTriggerCreateImages.addEventListener('click', () => createImagesInput.click());
			createImagesInput.addEventListener('change', (e) => {
				const files = Array.from(e.target.files);

				// Max limit validation
				if (selectedCreateFiles.length + files.length > 5) {
					window.showAppNotification('danger', '❌ <strong>Maximum 5 Images!</strong> You can only attach up to 5 screenshot images.');
					createImagesInput.value = '';
					return;
				}

				files.forEach(file => {
					if (!file.type.startsWith('image/')) {
						window.showAppNotification('danger', '❌ <strong>Invalid Format!</strong> Only image files are allowed.');
						return;
					}
					selectedCreateFiles.push(file);
				});

				createImagesInput.value = '';
				renderCreateImagesPreview();
			});
		}

		function renderCreateImagesPreview() {
			createImagesPreview.innerHTML = '';
			if (selectedCreateFiles.length > 0) {
				createImagesCountLabel.textContent = `${selectedCreateFiles.length} image(s) selected`;
				createImagesCountLabel.style.color = '#af86fc';
			} else {
				createImagesCountLabel.textContent = 'No files chosen';
				createImagesCountLabel.style.color = 'var(--text-muted)';
			}

			selectedCreateFiles.forEach((file, index) => {
				const reader = new FileReader();
				reader.onload = (e) => {
					const div = document.createElement('div');
					div.style.position = 'relative';
					div.style.width = '60px';
					div.style.height = '60px';
					div.style.borderRadius = '8px';
					div.style.overflow = 'hidden';
					div.style.border = '1px solid var(--border-color)';
					div.style.boxShadow = '0 2px 5px rgba(0,0,0,0.15)';

					div.innerHTML = `
						<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">
						<button type="button" style="position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; border-radius: 50%; background: rgba(0,0,0,0.6); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;" title="Hapus">
							<i class="fa-solid fa-xmark"></i>
						</button>
					`;

					div.querySelector('button').addEventListener('click', () => {
						selectedCreateFiles.splice(index, 1);
						renderCreateImagesPreview();
					});

					createImagesPreview.appendChild(div);
				};
				reader.readAsDataURL(file);
			});
		}

		// File Attachment Handler: Chat Reply Form
		if (btnTriggerReplyImages && replyImagesInput) {
			btnTriggerReplyImages.addEventListener('click', () => replyImagesInput.click());
			replyImagesInput.addEventListener('change', (e) => {
				const files = Array.from(e.target.files);

				if (selectedReplyFiles.length + files.length > 5) {
					window.showAppNotification('danger', '❌ <strong>Maximum 5 Images!</strong> You can only attach up to 5 screenshot images.');
					replyImagesInput.value = '';
					return;
				}

				files.forEach(file => {
					if (!file.type.startsWith('image/')) {
						window.showAppNotification('danger', '❌ <strong>Invalid Format!</strong> Only image files are allowed.');
						return;
					}
					selectedReplyFiles.push(file);
				});

				replyImagesInput.value = '';
				renderReplyImagesPreview();
			});
		}

		function renderReplyImagesPreview() {
			replyImagesPreview.innerHTML = '';
			selectedReplyFiles.forEach((file, index) => {
				const reader = new FileReader();
				reader.onload = (e) => {
					const div = document.createElement('div');
					div.style.position = 'relative';
					div.style.width = '55px';
					div.style.height = '55px';
					div.style.borderRadius = '8px';
					div.style.overflow = 'hidden';
					div.style.border = '1px solid var(--border-color)';
					div.style.boxShadow = '0 2px 5px rgba(0,0,0,0.15)';

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

					replyImagesPreview.appendChild(div);
				};
				reader.readAsDataURL(file);
			});
		}

		// API CALL: Fetch Tickets List
		async function loadUserTickets(silent = false) {
			const userInfo = getUserInfo();
			if (!userInfo) return;

			if (!silent) {
				listContainer.innerHTML = `
					<div style="text-align: center; padding: 40px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 15px;">
						<i class="fa-solid fa-circle-notch fa-spin" style="color: #af86fc;"></i>
						<span style=" ">Connecting to Cloud Support...</span>
					</div>
				`;
			}

			try {
				const response = await fetch(`${API_BASE}/ticket/list?username=${userInfo.username}`);
				if (!response.ok) {
					throw new Error('Failed to load tickets list from server.');
				}
				const tickets = await response.json();
				renderTicketsList(tickets);

				// Check for pending tickets to update the Create Ticket form
				const hasPending = tickets.some(t => t.status.toLowerCase() === 'pending');
				updatePendingFormState(hasPending);

				// Update live chat if open
				if (activeTicketId) {
					const activeTicket = tickets.find(t => t.ticketId === activeTicketId);
					if (activeTicket) {
						updateModalState(activeTicket);
					}
				}
			} catch (err) {
				console.error(err);
				updatePendingFormState(false);
				if (!silent) {
					listContainer.innerHTML = `
						<div style="text-align: center; padding: 40px; color: #ff6666; display: flex; flex-direction: column; align-items: center; gap: 15px;">
							<i class="fa-solid fa-triangle-exclamation" style=""></i>
							<span style=" ">Failed to synchronize support ticket data.</span>
							<button class="btn" id="btn-retry-tickets" style="width: auto; padding: 6px 12px; border-color: #ff6666; color: #ff6666; background: transparent;">Retry Connection</button>
						</div>
					`;
					const btnRetry = document.getElementById('btn-retry-tickets');
					if (btnRetry) {
						btnRetry.addEventListener('click', () => loadUserTickets());
					}
				}
			}
		}

		// Render tickets list on the right side
		function renderTicketsList(tickets) {
			listContainer.innerHTML = '';

			if (!tickets || tickets.length === 0) {
				listContainer.innerHTML = `
					<div style="text-align: center; padding: 40px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 15px;">
						<i class="fa-solid fa-folder-open" style="color: var(--border-color);"></i>
						<span style=" ">No active support tickets found. Create a new one on the left.</span>
					</div>
				`;
				return;
			}

			tickets.forEach(ticket => {
				const card = document.createElement('div');
				card.className = 'task-card';
				card.style.padding = '15px 20px';
				card.style.flexDirection = 'column';
				card.style.gap = '10px';
				card.style.cursor = 'pointer';
				card.style.transition = 'transform 0.2s ease, border-color 0.2s ease';

				// Format Ticket Status
				const statusLower = ticket.status.toLowerCase();
				const isResolved = statusLower === 'resolved' || statusLower === 'closed';

				// Check if there is an Admin reply inside ticket.replies
				const hasAdminReply = ticket.replies && Object.values(ticket.replies).some(r => r.sender === 'Admin');

				// Status badges rendering matching exact states in plans
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

				// Priority styling
				let prioColor = '#999';
				let prioText = 'General';
				const prioLower = (ticket.type || 'General').toLowerCase();
				// Let's use priority value or a default since the backend uses type (kategori). Let's color categories:
				if (ticket.type === 'billing') {
					prioColor = '#ffd700';
					prioText = 'Billing & Payments';
				} else if (ticket.type === 'bug') {
					prioColor = '#ff6666';
					prioText = 'Bug Report';
				} else if (ticket.type === 'feature') {
					prioColor = '#af86fc';
					prioText = 'Feature Request';
				} else {
					prioColor = 'var(--text-muted)';
					prioText = 'General Inquiry';
				}

				// Format Date
				const dateObj = new Date(ticket.createdAt);
				const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

				card.innerHTML = `
					<div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
						<div style="display: flex; align-items: center; gap: 8px;">
							<span style="  color: var(--text-muted);">${ticket.ticketId}</span>
							<span style="color: var(--text-muted); ">${dateStr}</span>
						</div>
						<span style=" color: ${statusColor}; background: ${statusBg}; border: 1px solid ${statusBorder}; padding: 2px 8px; border-radius: 20px;  letter-spacing: 0.5px;">${statusText}</span>
					</div>
					<h4 style="margin: 0; color: var(--text-sharp);  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${ticket.message}</h4>
					<div style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-top: 1px solid var(--border-color); padding-top: 8px; ">
						<span style="color: var(--text-muted);"><i class="fa-solid fa-tags" style="margin-right: 4px;"></i> Category: ${prioText}</span>
						<span style="color: var(--text-muted); ">
							<i class="fa-solid fa-message" style="margin-right: 3px;"></i> ${ticket.replies ? Object.keys(ticket.replies).length + 1 : 1} messages
						</span>
					</div>
				`;

				card.addEventListener('click', () => {
					openTicketDetails(ticket);
				});

				// Hover dynamic scale micro-animation
				card.addEventListener('mouseenter', () => {
					card.style.transform = 'translateY(-2px)';
					card.style.borderColor = 'rgba(175, 134, 252, 0.4)';
				});
				card.addEventListener('mouseleave', () => {
					card.style.transform = 'translateY(0)';
					card.style.borderColor = 'var(--border-color)';
				});

				listContainer.appendChild(card);
			});
		}

		// Open Ticket Detailed Chat Modal
		function openTicketDetails(ticket) {
			activeTicketId = ticket.ticketId;
			updateModalState(ticket);
			modal.classList.remove('hide');

			// Start polling update every 5 minute
			if (pollingInterval) clearInterval(pollingInterval);
			pollingInterval = setInterval(() => {
				loadUserTickets(true);
			}, 300000);
		}

		// Update modal live elements
		function updateModalState(ticket) {
			modalId.textContent = ticket.ticketId;
			modalSubject.textContent = ticket.message.substring(0, 50) + (ticket.message.length > 50 ? '...' : '');

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

			modalStatus.textContent = statusText;
			modalStatus.style.color = statusColor;
			modalStatus.style.background = statusBg;
			modalStatus.style.borderColor = statusBorder;

			const dateObj = new Date(ticket.createdAt);
			const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

			let catText = 'General Inquiry';
			if (ticket.type === 'billing') catText = 'Billing & Payments';
			else if (ticket.type === 'bug') catText = 'Bug Report';
			else if (ticket.type === 'feature') catText = 'Feature Request';

			modalMeta.innerHTML = `Category: <strong>${catText}</strong> | Created: <strong>${dateStr}</strong>`;

			// Construct ordered chat conversation history
			const messagesList = [];

			// 1. Initial ticket creation details
			messagesList.push({
				sender: ticket.username,
				senderType: 'user',
				message: ticket.message,
				images: ticket.images || [],
				createdAt: ticket.createdAt
			});

			// 2. Add all replies
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

			// Sort chronological order
			messagesList.sort((a, b) => a.createdAt - b.createdAt);
			renderChatHistory(messagesList);

			// ==============================================================
			// RULE IMPLEMENTATION FROM RENCANA FILE:
			// - ticket pending (no admin reply) -> sembunyikan chat form
			// - jika sudah dibalas admin -> tampilkan chat form
			// - jika sudah resolved -> sembunyikan chat form
			// ==============================================================
			if (isResolved) {
				// Resolved
				modalReplyContainer.style.display = 'none';
				// Append Closed/Resolved Banner to chat
				const banner = document.createElement('div');
				banner.style.textAlign = 'center';
				banner.style.padding = '10px';
				banner.style.background = 'rgba(102, 255, 217, 0.05)';
				banner.style.border = '1px solid rgba(102, 255, 217, 0.2)';
				banner.style.color = '#66ffd9';
				banner.style.borderRadius = '10px';
				banner.innerHTML = `<i class="fa-solid fa-lock" style="margin-right: 5px;"></i> This ticket has been marked as RESOLVED.`;
				modalChat.appendChild(banner);
			} else if (!hasAdminReply) {
				// Pending (No admin reply yet) -> sembunyikan chat form
				modalReplyContainer.style.display = 'none';
				const banner = document.createElement('div');
				banner.style.textAlign = 'center';
				banner.style.padding = '10px';
				banner.style.background = 'rgba(175, 134, 252, 0.05)';
				banner.style.border = '1px solid rgba(175, 134, 252, 0.2)';
				banner.style.color = '#af86fc';
				banner.style.borderRadius = '10px';
				banner.innerHTML = `<i class="fa-solid fa-clock" style="margin-right: 5px;"></i> Waiting for support agent response before you can reply.`;
				modalChat.appendChild(banner);
			} else {
				// Admin has replied -> show chat form
				modalReplyContainer.style.display = 'flex';
			}

			// Scroll bottom
			setTimeout(() => {
				modalChat.scrollTop = modalChat.scrollHeight;
			}, 50);
		}

		// Render message bubbles in chat
		function renderChatHistory(messages) {
			modalChat.innerHTML = '';
			messages.forEach(msg => {
				const isAdmin = msg.senderType === 'admin' || msg.sender === 'Admin';
				const msgRow = document.createElement('div');
				msgRow.style.display = 'flex';
				msgRow.style.justifyContent = isAdmin ? 'flex-start' : 'flex-end';
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
					bubble.style.background = 'var(--bg-primary)';
					bubble.style.border = '1px solid var(--border-color)';
					bubble.style.color = 'var(--text-primary)';
					bubble.style.borderBottomLeftRadius = '2px';
				} else {
					bubble.style.background = 'linear-gradient(135deg, rgba(175, 134, 252, 0.15) 0%, rgba(126, 83, 201, 0.15) 100%)';
					bubble.style.border = '1px solid rgba(175, 134, 252, 0.2)';
					bubble.style.color = 'var(--text-sharp)';
					bubble.style.borderBottomRightRadius = '2px';
				}

				const timeObj = new Date(msg.createdAt);
				const timeStr = timeObj.toLocaleDateString() + ' ' + timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

				// Render attachments if present
				let imgHtml = '';
				if (msg.images && msg.images.length > 0) {
					imgHtml = `<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 5px;">`;
					msg.images.forEach(imgUrl => {
						imgHtml += `
							<a href="${imgUrl}" target="_blank" style="width: 70px; height: 70px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color); display: inline-block;">
								<img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1">
							</a>
						`;
					});
					imgHtml += `</div>`;
				}

				bubble.innerHTML = `
					<div style="color: var(--text-muted);  text-transform: uppercase;  display: flex; justify-content: space-between; gap: 25px;">
						<span>${isAdmin ? '💼 Staff Specialist' : '👤 You'}</span>
						<span>${timeStr}</span>
					</div>
					<div style="word-break: break-word;  ">${msg.message || ''}</div>
					${imgHtml}
				`;

				msgRow.appendChild(bubble);
				modalChat.appendChild(msgRow);
			});
		}

		// API CALL: Create Ticket Form Submission
		btnSubmit.addEventListener('click', async () => {
			const subject = inputSubject.value.trim();
			const category = selectCategory.value;
			const priority = selectPriority.value;
			const message = textareaMessage.value.trim();

			if (!subject || !message) {
				window.showAppNotification('danger', '❌ <strong>Error:</strong> Please fill in both the subject and the message field!');
				return;
			}

			const userInfo = getUserInfo();
			if (!userInfo) return;

			btnSubmit.disabled = true;
			btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting Ticket...';

			try {
				const formData = new FormData();
				formData.append('email', userInfo.email);
				formData.append('username', userInfo.username);
				formData.append('type', category); // category is stored under "type" in Firebase
				formData.append('message', `[${subject}] ${message}`);

				// Append files
				selectedCreateFiles.forEach(file => {
					formData.append('images', file);
				});

				const response = await fetch(`${API_BASE}/ticket/create`, {
					method: 'POST',
					body: formData
				});

				const resData = await response.json();
				if (!response.ok) {
					throw new Error(resData.error || 'Failed to submit support ticket.');
				}

				window.showAppNotification('success', `🎫 <strong>Ticket Created!</strong> Ticket ${resData.ticket.ticketId} was successfully submitted to support.`);

				// Reset Fields
				inputSubject.value = '';
				textareaMessage.value = '';
				selectCategory.value = 'general';
				selectPriority.value = 'medium';
				selectedCreateFiles = [];
				renderCreateImagesPreview();
				loadUserTickets();

				// Switch to history tab on successful submit
				const historyTabBtn = pageSupport.querySelector('.db-tab-btn[data-tab="support-history-tab"]');
				if (historyTabBtn) {
					historyTabBtn.click();
				}

			} catch (err) {
				console.error(err);
				window.showAppNotification('danger', `❌ <strong>Error:</strong> ${err.message}`);
			} finally {
				btnSubmit.disabled = false;
				btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane" style="margin-right: 6px;"></i> Submit Ticket';
			}
		});

		// API CALL: Submit User Chat Reply
		modalReplyBtn.addEventListener('click', async () => {
			const text = modalReplyInput.value.trim();
			if (!text && selectedReplyFiles.length === 0) return;

			const userInfo = getUserInfo();
			if (!userInfo || !activeTicketId) return;

			modalReplyBtn.disabled = true;
			modalReplyBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

			try {
				console.log('[Reply] selectedReplyFiles count:', selectedReplyFiles.length);
				selectedReplyFiles.forEach((f, i) => console.log(`[Reply] File[${i}]:`, f.name, f.size, f.type));

				const formData = new FormData();
				formData.append('ticketId', activeTicketId);
				formData.append('email', userInfo.email);
				formData.append('username', userInfo.username);
				formData.append('message', text || '[Image Attachment]');

				selectedReplyFiles.forEach(file => {
					// Append dengan nama file eksplisit agar browser include metadata
					formData.append('images', file, file.name);
				});

				console.log('[Reply] FormData keys:', [...formData.keys()]);

				const response = await fetch(`${API_BASE}/ticket/reply`, {
					method: 'POST',
					body: formData
				});

				const resData = await response.json();
				if (!response.ok) {
					throw new Error(resData.error || 'Failed to submit chat reply.');
				}

				modalReplyInput.value = '';
				selectedReplyFiles = [];
				renderReplyImagesPreview();

				// Instantly reload list
				loadUserTickets(true);

			} catch (err) {
				console.error(err);
				window.showAppNotification('danger', `❌ <strong>Failed to reply:</strong> ${err.message}`);
			} finally {
				modalReplyBtn.disabled = false;
				modalReplyBtn.innerHTML = 'Send';
			}
		});

		// Refresh Ticket Button
		btnRefresh.addEventListener('click', () => {
			loadUserTickets();
			window.showAppNotification('success', '🔄 <strong>Tickets Refreshed:</strong> Successfully synced support tickets from Cloud!');
		});

		// Close detailed modal
		modalCloseBtn.addEventListener('click', () => {
			modal.classList.add('hide');
			activeTicketId = null;
			if (pollingInterval) {
				clearInterval(pollingInterval);
				pollingInterval = null;
			}
		});

		// Hook into SPA navigation to auto load tickets
		const originalSetActiveMenu = window.setActiveMenu;
		window.setActiveMenu = function (menuId, pushState = true) {
			originalSetActiveMenu(menuId, pushState);
			if (menuId === 'support' && window.isUserAuthenticated) {
				loadUserTickets();
			}
		};
	});
})();
