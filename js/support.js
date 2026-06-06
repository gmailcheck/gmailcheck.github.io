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
		const btnResolve = document.getElementById('btn-modal-resolve');

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

		window.supportTicketsWS = null;
		window.supportTicketsList = [];
		let reconnectTimeout = null;

		window.connectTicketsWS = async function (idToken) {
			// No-op: WebSockets are disabled, using HTTP polling instead.
		};

		window.closeTicketsWS = function () {
			// No-op: WebSockets are disabled.
		};

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
			const isPremium = checkIsPremiumUser();

			if (val === 'premium') {
				if (!isPremium) {
					window.showAppNotification('warning', '👑 <strong>Premium Priority Exclusive!</strong> PRO/ULTRA Priority is only available for PRO/ULTRA members. Your ticket has been reset to Medium priority.');
					selectPriority.value = 'medium';
				}
			}
		});

		function checkIsPremiumUser() {
			const badge = document.getElementById('user-badge-display');
			if (!badge) return false;
			const text = badge.textContent.trim();
			return text === 'PRO' || text === 'ULTRA' || text === 'ADMIN';
		}

		// Remove file format restrictions on input elements dynamically
		if (createImagesInput) createImagesInput.removeAttribute('accept');
		if (replyImagesInput) replyImagesInput.removeAttribute('accept');

		// Helper: Client-Side Image Compression using HTML5 Canvas
		async function compressImageIfNeeded(file) {
			if (!file.type.startsWith('image/')) {
				return file; // No compression needed for documents, archives, videos, etc.
			}

			return new Promise((resolve) => {
				const reader = new FileReader();
				reader.onload = (e) => {
					const img = new Image();
					img.onload = () => {
						const canvas = document.createElement('canvas');
						let width = img.width;
						let height = img.height;

						// Limit maximum size to 1600px (preserves exceptional details while reducing file size drastically)
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

						// Output progressive JPEG at 75% quality
						canvas.toBlob((blob) => {
							if (blob) {
								const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
									type: "image/jpeg",
									lastModified: Date.now()
								});
								console.log(`[Compression] "${file.name}" compressed: ${(file.size / 1024).toFixed(1)} KB -> ${(compressedFile.size / 1024).toFixed(1)} KB`);
								// Keep whichever is smaller
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

		// File Attachment Handler: Ticket Creation Form
		if (btnTriggerCreateImages && createImagesInput) {
			btnTriggerCreateImages.addEventListener('click', () => createImagesInput.click());
			createImagesInput.addEventListener('change', async (e) => {
				const files = Array.from(e.target.files);

				// Max limit validation
				if (selectedCreateFiles.length + files.length > 5) {
					window.showAppNotification('danger', '❌ <strong>Maximum 5 Files!</strong> You can only attach up to 5 files total.');
					createImagesInput.value = '';
					return;
				}

				btnTriggerCreateImages.disabled = true;
				const originalHtml = btnTriggerCreateImages.innerHTML;
				btnTriggerCreateImages.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';

				for (const file of files) {
					const processedFile = await compressImageIfNeeded(file);
					selectedCreateFiles.push(processedFile);
				}

				btnTriggerCreateImages.disabled = false;
				btnTriggerCreateImages.innerHTML = originalHtml;
				createImagesInput.value = '';
				renderCreateImagesPreview();
			});
		}

		function renderCreateImagesPreview() {
			createImagesPreview.innerHTML = '';
			if (selectedCreateFiles.length > 0) {
				createImagesCountLabel.textContent = `${selectedCreateFiles.length} file(s) selected`;
				createImagesCountLabel.style.color = '#af86fc';
			} else {
				createImagesCountLabel.textContent = 'No files chosen';
				createImagesCountLabel.style.color = 'var(--text-muted)';
			}

			selectedCreateFiles.forEach((file, index) => {
				const div = document.createElement('div');
				div.style.position = 'relative';
				div.style.width = '60px';
				div.style.height = '60px';
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
							<button type="button" style="position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; border-radius: 50%; background: rgba(0,0,0,0.6); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;" title="Hapus">
								<i class="fa-solid fa-xmark"></i>
							</button>
						`;
						div.querySelector('button').addEventListener('click', () => {
							selectedCreateFiles.splice(index, 1);
							renderCreateImagesPreview();
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
						<i class="fa-solid ${iconClass}" style="font-size: 1.5rem; color: ${iconColor};"></i>
						<button type="button" style="position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; border-radius: 50%; background: rgba(0,0,0,0.6); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;" title="Hapus">
							<i class="fa-solid fa-xmark"></i>
						</button>
					`;
					div.querySelector('button').addEventListener('click', () => {
						selectedCreateFiles.splice(index, 1);
						renderCreateImagesPreview();
					});
				}

				createImagesPreview.appendChild(div);
			});
		}

		// File Attachment Handler: Chat Reply Form
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

		// API CALL: Fetch Tickets List via HTTP GET
		async function loadUserTickets(silent = false) {
			const userInfo = getUserInfo();
			if (!userInfo) return;

			if (!silent && (!window.supportTicketsList || window.supportTicketsList.length === 0)) {
				listContainer.innerHTML = `
					<div style="text-align: center; padding: 40px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 15px;">
						<i class="fa-solid fa-circle-notch fa-spin" style="color: #af86fc;"></i>
						<span style=" ">Loading support tickets...</span>
					</div>
				`;
			}

			try {
				const idToken = await window.getAuthToken();
				if (!idToken) return;

				const response = await fetch(`${API_BASE}/ticket/list`, {
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${idToken}`
					}
				});

				const data = await response.json();
				if (response.ok && data.success) {
					window.supportTicketsList = data.tickets || [];
					renderTicketsList(window.supportTicketsList);
					const hasPending = window.supportTicketsList.some(t => t.status.toLowerCase() === 'pending');
					updatePendingFormState(hasPending);

					// Calculate unreplied support tickets count (status pending, last message from admin)
					const unreplied = (window.supportTicketsList || []).filter(ticket => {
						const statusLower = (ticket.status || '').toLowerCase();
						if (statusLower === 'resolved' || statusLower === 'closed') {
							return false;
						}
						if (!ticket.replies || Object.keys(ticket.replies).length === 0) {
							return false;
						}
						const repliesList = Object.values(ticket.replies);
						repliesList.sort((a, b) => a.createdAt - b.createdAt);
						const latestReply = repliesList[repliesList.length - 1];
						return latestReply.sender === 'Admin' || latestReply.senderType === 'admin';
					});
					window.supportUnrepliedCount = unreplied.length;
					if (window.renderMenu) {
						window.renderMenu();
					}

					if (activeTicketId) {
						const activeTicket = window.supportTicketsList.find(t => t.ticketId === activeTicketId);
						if (activeTicket) {
							updateModalState(activeTicket);
						}
					}
				}
			} catch (err) {
				console.error("Failed to load user tickets via HTTP:", err);
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

				const parsedMsg = parseTicketMessage(ticket.message);

				card.innerHTML = `
					<div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
						<div style="display: flex; align-items: center; gap: 8px;">
							<span style="  color: var(--text-muted);">${ticket.ticketId}</span>
							<span style="color: var(--text-muted); ">${dateStr}</span>
						</div>
						<span style=" color: ${statusColor}; background: ${statusBg}; border: 1px solid ${statusBorder}; padding: 2px 8px; border-radius: 20px;  letter-spacing: 0.5px;">${statusText}</span>
					</div>
					<h4 style="margin: 0; color: var(--text-sharp);  white-space: nowrap;  text-overflow: ellipsis; width: 100%;">${parsedMsg.subject}</h4>
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
		}

		// Helper: Parse raw message "[Subject] Description"
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

		// Update modal live elements
		function updateModalState(ticket) {
			modalId.textContent = ticket.ticketId;
			const parsed = parseTicketMessage(ticket.message);
			modalSubject.textContent = parsed.subject;

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
				if (btnResolve) btnResolve.style.display = 'none';
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
			} else {
				if (btnResolve) btnResolve.style.display = 'block';

				if (!hasAdminReply) {
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
			}

			// Scroll bottom
			setTimeout(() => {
				modalChat.scrollTop = modalChat.scrollHeight;
			}, 50);
		}

		// Helper: Determine Attachment File Type from URL
		function getAttachmentType(url) {
			const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
			if (cleanUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) return 'image';
			if (cleanUrl.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv)$/)) return 'video';
			if (cleanUrl.match(/\.(mp3|wav|ogg|aac|flac|m4a|weba)$/)) return 'audio';
			if (cleanUrl.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf)$/)) return 'document';
			return 'other';
		}

		// Helper: Extract Clean Filename from URL
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

		// Lightbox for Fullscreen Image Preview
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

			// Force layout recalculation
			lightbox.getBoundingClientRect();

			lightbox.classList.remove('hide');
			lightbox.style.opacity = '1';
			lightboxImg.style.transform = 'scale(1)';
		}

		// Fullscreen Document Viewer Overlay (utilizes Google Docs Viewer for doc/docx/xls/xlsx/ppt/pptx and native viewer for PDF)
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

		// Render message bubbles in chat
		function renderChatHistory(messages) {
			modalChat.innerHTML = '';
			messages.forEach((msg, index) => {
				const isAdmin = msg.senderType === 'admin' || msg.sender === 'Admin';

				// Setup dynamic avatar and name
				let userAvatar = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
				let userName = 'Support Agent';

				if (isAdmin) {
					userAvatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="%23af86fc"/><path d="M 35 60 A 25 25 0 0 1 85 60" stroke="%23ffffff" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="25" y="46" width="12" height="28" rx="6" fill="%23ffffff"/><rect x="83" y="46" width="12" height="28" rx="6" fill="%23ffffff"/><path d="M 32 70 Q 34 90 52 86" stroke="%23ffffff" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="52" cy="86" r="4.5" fill="%23ffffff"/></svg>`;
					userName = 'Support Agent';
				} else {
					const currentUser = window.firebaseAuth.currentUser;
					userAvatar = currentUser?.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
					userName = currentUser?.displayName || msg.sender || 'User';
				}

				// Row container
				const msgRow = document.createElement('div');
				msgRow.style.display = 'flex';
				msgRow.style.alignItems = 'flex-end';
				msgRow.style.gap = '10px';
				msgRow.style.width = '100%';
				msgRow.style.marginBottom = '12px';
				msgRow.style.whiteSpace = 'pre-wrap';

				// Create Avatar Image DOM element outside bubble
				const avatarImg = document.createElement('img');
				avatarImg.src = userAvatar;
				avatarImg.style.width = '32px';
				avatarImg.style.height = '32px';
				avatarImg.style.borderRadius = '50%';
				avatarImg.style.objectFit = 'cover';
				avatarImg.style.border = '1px solid var(--border-color)';
				avatarImg.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
				avatarImg.style.flexShrink = '0';

				// Create Bubble
				const bubble = document.createElement('div');
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
					bubble.style.width = '100%';
					bubble.style.maxWidth = 'calc(100% - 45px)'; // Admin bubble takes full width space minus avatar
				} else {
					bubble.style.background = 'linear-gradient(135deg, rgba(175, 134, 252, 0.15) 0%, rgba(126, 83, 201, 0.15) 100%)';
					bubble.style.border = '1px solid rgba(175, 134, 252, 0.2)';
					bubble.style.color = 'var(--text-sharp)';
					bubble.style.borderBottomRightRadius = '2px';
					bubble.style.width = '100%';
					bubble.style.maxWidth = '80%'; // User bubble takes 80%
				}

				const timeObj = new Date(msg.createdAt);
				const timeStr = timeObj.toLocaleDateString() + ' ' + timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

				// Chat Bubble Header with Username
				const header = document.createElement('div');
				header.style.display = 'flex';
				header.style.alignItems = 'center';
				header.style.marginBottom = '2px';
				header.innerHTML = `
					<span style="font-weight: 600; font-size: 0.8rem; color: var(--text-sharp);">${escapeHTML(userName)}</span>
				`;
				bubble.appendChild(header);

				// Chat Bubble Message Body (initial ticket shows description only)
				const bodyText = document.createElement('div');
				bodyText.style.wordBreak = 'break-word';

				let msgText = msg.message || '';
				if (index === 0) {
					const parsed = parseTicketMessage(msgText);
					msgText = parsed.description;
				}
				bodyText.innerHTML = formatUrlsToLinks(msgText);
				bubble.appendChild(bodyText);

				// Process and Render Attachments
				if (msg.images && msg.images.length > 0) {
					const attachmentsContainer = document.createElement('div');
					attachmentsContainer.style.display = 'flex';
					attachmentsContainer.style.flexDirection = 'column';
					attachmentsContainer.style.gap = '8px';
					attachmentsContainer.style.marginTop = '8px';

					const imagesList = [];
					const nonImagesList = [];

					msg.images.forEach(url => {
						const type = getAttachmentType(url);
						if (type === 'image') {
							imagesList.push(url);
						} else {
							nonImagesList.push({ url, type });
						}
					});

					// Render images in a beautiful visual row
					if (imagesList.length > 0) {
						const imageGrid = document.createElement('div');
						imageGrid.style.display = 'flex';
						imageGrid.style.gap = '8px';
						imageGrid.style.flexWrap = 'wrap';

						imagesList.forEach(url => {
							const imgWrapper = document.createElement('div');
							imgWrapper.style.width = '80px';
							imgWrapper.style.height = '80px';
							imgWrapper.style.borderRadius = '8px';
							imgWrapper.style.overflow = 'hidden';
							imgWrapper.style.border = '1px solid var(--border-color)';
							imgWrapper.style.cursor = 'zoom-in';
							imgWrapper.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
							imgWrapper.style.transition = 'transform 0.2s ease, opacity 0.2s';

							const img = document.createElement('img');
							img.src = url;
							img.style.width = '100%';
							img.style.height = '100%';
							img.style.objectFit = 'cover';

							imgWrapper.appendChild(img);

							imgWrapper.addEventListener('mouseover', () => {
								imgWrapper.style.opacity = '0.85';
								imgWrapper.style.transform = 'scale(1.03)';
							});
							imgWrapper.addEventListener('mouseout', () => {
								imgWrapper.style.opacity = '1';
								imgWrapper.style.transform = 'scale(1)';
							});

							imgWrapper.addEventListener('click', (e) => {
								e.preventDefault();
								showImageFullscreen(url);
							});

							imageGrid.appendChild(imgWrapper);
						});
						attachmentsContainer.appendChild(imageGrid);
					}

					// Render non-images (videos, office documents, others)
					nonImagesList.forEach(item => {
						const filename = getAttachmentFileName(item.url);

						if (item.type === 'video') {
							const videoPlayer = document.createElement('video');
							videoPlayer.src = item.url;
							videoPlayer.controls = true;
							videoPlayer.preload = 'metadata';
							videoPlayer.style.maxWidth = '100%';
							videoPlayer.style.maxHeight = '250px';
							videoPlayer.style.borderRadius = '10px';
							videoPlayer.style.border = '1px solid var(--border-color)';
							videoPlayer.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
							videoPlayer.style.background = '#000000';
							videoPlayer.style.outline = 'none';
							videoPlayer.style.marginTop = '4px';
							attachmentsContainer.appendChild(videoPlayer);
						} else if (item.type === 'audio') {
							const audioPlayer = document.createElement('audio');
							audioPlayer.src = item.url;
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
							audioWrapper.style.background = 'rgba(255,255,255,0.03)';
							audioWrapper.style.border = '1px solid var(--border-color)';
							audioWrapper.style.borderRadius = '10px';
							audioWrapper.style.marginTop = '4px';
							audioWrapper.style.width = '100%';
							audioWrapper.style.maxWidth = '320px';

							audioWrapper.innerHTML = `
								<div style="display: flex; align-items: center; gap: 10px;">
									<i class="fa-solid fa-music" style="font-size: 1.4rem; color: #66ffd9;"></i>
									<div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
										<span style="font-size: 0.85rem; font-weight: 500; color: var(--text-sharp);  text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(filename)}</span>
										<span style="font-size: 0.75rem; color: var(--text-muted);">Audio File</span>
									</div>
								</div>
							`;
							audioWrapper.appendChild(audioPlayer);
							attachmentsContainer.appendChild(audioWrapper);
						} else if (item.type === 'document') {
							const docCard = document.createElement('div');
							docCard.style.display = 'flex';
							docCard.style.alignItems = 'center';
							docCard.style.gap = '12px';
							docCard.style.padding = '10px 14px';
							docCard.style.background = 'rgba(255,255,255,0.03)';
							docCard.style.border = '1px solid var(--border-color)';
							docCard.style.borderRadius = '10px';
							docCard.style.marginTop = '4px';

							const isPdf = filename.toLowerCase().endsWith('.pdf');
							const docIcon = isPdf ? 'fa-file-pdf' : 'fa-file-word';
							const docColor = isPdf ? '#ff6666' : '#af86fc';

							docCard.innerHTML = `
								<i class="fa-solid ${docIcon}" style="font-size: 1.8rem; color: ${docColor};"></i>
								<div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
									<span style="font-size: 0.85rem; font-weight: 500; color: var(--text-sharp);  text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(filename)}</span>
									<span style="font-size: 0.75rem; color: var(--text-muted);">${isPdf ? 'PDF Document' : 'Office Document'}</span>
								</div>
								<div style="display: flex; gap: 8px;">
									<button class="btn-view" style="background: linear-gradient(135deg, rgba(175, 134, 252, 0.2) 0%, rgba(126, 83, 201, 0.2) 100%); border: 1px solid rgba(175, 134, 252, 0.4); color: #af86fc; border-radius: 6px; padding: 6px 10px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 5px;">
										<i class="fa-solid fa-eye"></i> View
									</button>
									<a href="${item.url}" target="_blank" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px; padding: 6px 10px; font-size: 0.8rem; text-decoration: none; display: flex; align-items: center; gap: 5px;">
										<i class="fa-solid fa-download"></i> Download
									</a>
								</div>
							`;

							docCard.querySelector('.btn-view').addEventListener('click', () => {
								showDocumentViewer(item.url);
							});

							attachmentsContainer.appendChild(docCard);
						} else {
							// Archive and other files (ZIP, RAR, EXE, etc.)
							const fileCard = document.createElement('div');
							fileCard.style.display = 'flex';
							fileCard.style.alignItems = 'center';
							fileCard.style.gap = '12px';
							fileCard.style.padding = '10px 14px';
							fileCard.style.background = 'rgba(255,255,255,0.03)';
							fileCard.style.border = '1px solid var(--border-color)';
							fileCard.style.borderRadius = '10px';
							fileCard.style.marginTop = '4px';

							fileCard.innerHTML = `
								<i class="fa-solid fa-file-zipper" style="font-size: 1.8rem; color: #ffd700;"></i>
								<div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
									<span style="font-size: 0.85rem; font-weight: 500; color: var(--text-sharp);  text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(filename)}</span>
									<span style="font-size: 0.75rem; color: var(--text-muted);">Archive File</span>
								</div>
								<a href="${item.url}" target="_blank" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px; padding: 6px 10px; font-size: 0.8rem; text-decoration: none; display: flex; align-items: center; gap: 5px;">
									<i class="fa-solid fa-download"></i> Download
								</a>
							`;

							attachmentsContainer.appendChild(fileCard);
						}
					});

					bubble.appendChild(attachmentsContainer);
				}

				// Chat Bubble Footer (Timestamp shifted elegantly to the bottom)
				const footer = document.createElement('div');
				footer.style.color = 'var(--text-muted)';
				footer.style.fontSize = '0.7rem';
				footer.style.textAlign = 'right';
				footer.style.marginTop = '4px';
				footer.style.opacity = '0.75';
				footer.textContent = timeStr;
				bubble.appendChild(footer);

				// Align avatars outside bubble (Left for admin, Right for user)
				if (isAdmin) {
					msgRow.style.justifyContent = 'flex-start';
					msgRow.appendChild(avatarImg);
					msgRow.appendChild(bubble);
				} else {
					msgRow.style.justifyContent = 'flex-end';
					msgRow.appendChild(bubble);
					msgRow.appendChild(avatarImg);
				}

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

		// API CALL: Submit User Chat Reply via HTTP POST
		modalReplyBtn.addEventListener('click', async () => {
			const text = modalReplyInput.value.trim();
			if (!text && selectedReplyFiles.length === 0) return;

			const userInfo = getUserInfo();
			if (!userInfo || !activeTicketId) return;

			// Optimistic UI Update: Render reply instantly!
			const ticket = window.supportTicketsList.find(t => t.ticketId === activeTicketId);
			let tempId = null;
			if (ticket) {
				if (!ticket.replies) ticket.replies = {};
				tempId = `_OPT_${Date.now()}`;
				const newReply = {
					sender: userInfo.username || "User",
					senderType: "user",
					message: text || '[Sending attachment...]',
					images: [],
					createdAt: Date.now()
				};
				ticket.replies[tempId] = newReply;
				ticket.lastActivity = newReply.createdAt;
				updateModalState(ticket); // render langsung di modal
			}

			modalReplyBtn.disabled = true;
			modalReplyBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

			try {
				const formData = new FormData();
				formData.append('ticketId', activeTicketId);
				formData.append('email', userInfo.email);
				formData.append('username', userInfo.username);
				formData.append('message', text || '[Image Attachment]');

				selectedReplyFiles.forEach(file => {
					formData.append('images', file, file.name);
				});

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

				// Immediately trigger loadUserTickets to replace optimistic UI with real data
				await loadUserTickets();

			} catch (err) {
				console.error(err);
				// If optimistic update was made and error occurred, remove it
				if (ticket && tempId && ticket.replies[tempId]) {
					delete ticket.replies[tempId];
					updateModalState(ticket);
				}
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
		});

		// Resolve User Ticket Button Click Handler
		if (btnResolve) {
			btnResolve.addEventListener('click', async () => {
				if (!activeTicketId) return;

				btnResolve.disabled = true;
				btnResolve.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

				try {
					const idToken = await window.getAuthToken();
					if (!idToken) return;

					const response = await fetch(`${API_BASE}/ticket/resolve`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${idToken}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ ticketId: activeTicketId })
					});

					const resData = await response.json();
					if (!response.ok) {
						throw new Error(resData.error || 'Failed to resolve support ticket.');
					}

					window.showAppNotification('success', '✅ <strong>Ticket Closed!</strong> You have resolved this ticket successfully.');

					// Close modal instantly
					modal.classList.add('hide');
					activeTicketId = null;

					// Refresh tickets list silently
					await loadUserTickets(true);

				} catch (err) {
					console.error(err);
					window.showAppNotification('danger', `❌ <strong>Error closing ticket:</strong> ${err.message}`);
				} finally {
					btnResolve.disabled = false;
					btnResolve.innerHTML = '<i class="fa-solid fa-check"></i> Close Ticket';
				}
			});
		}

		// Hook into SPA navigation to auto load tickets
		const originalSetActiveMenu = window.setActiveMenu;
		window.setActiveMenu = function (menuId, pushState = true) {
			originalSetActiveMenu(menuId, pushState);
			if (menuId === 'support' && window.isUserAuthenticated) {
				loadUserTickets();
			}
		};

		// Hook into Auth UI state changes to immediately load tickets and update badge
		const originalApplyAuthUIState = window.applyAuthUIState;
		window.applyAuthUIState = function (user) {
			if (originalApplyAuthUIState) {
				originalApplyAuthUIState(user);
			}
			if (user) {
				// User logged in, fetch tickets list to update the badge immediately
				loadUserTickets(true);
			} else {
				// User logged out, reset count and badge
				window.supportUnrepliedCount = 0;
				if (window.renderMenu) {
					window.renderMenu();
				}
			}
		};
		// Ensure updateAuthUI also uses the patched version for late-firing auth states
		window.updateAuthUI = window.applyAuthUIState;

		// If user is already authenticated when this script loads, fetch tickets immediately
		if (window.isUserAuthenticated) {
			loadUserTickets(true);
		}

		// Expose loadUserTickets globally
		window.loadUserTickets = loadUserTickets;
	});
})();
