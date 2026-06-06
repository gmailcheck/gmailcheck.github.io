/**
 * Gmail Checker - Anonymous Demo Client Side Logic
 * Provides real-time email check preview with Turnstile validation & IP rate limits.
 */

(function () {
    let turnstileWidgetId = null;
    let isChecking = false;

    // Wait for DOM to load
    document.addEventListener("DOMContentLoaded", () => {
        initDemoElements();
        initTurnstileWidget();
    });

    function initDemoElements() {
        const btnCheck = document.getElementById("btn-run-demo-check");
        if (btnCheck) {
            btnCheck.addEventListener("click", handleDemoCheck);
        }

        // Initialize line numbers for the demo textarea if the utility exists
        if (window.initTextareaLineNumbers) {
            window.initTextareaLineNumbers('demo-emails-input', 'demo-line-numbers', 'demo-input-container');
        }
    }

    function initTurnstileWidget() {
        // Attempt to render Turnstile after api.js is loaded
        const container = document.getElementById("demo-turnstile-container");
        if (!container) return;

        // If turnstile is not loaded yet, retry shortly
        if (typeof turnstile === "undefined") {
            setTimeout(initTurnstileWidget, 500);
            return;
        }

        try {
            // Use window.API_TURNSTILE_SITE_KEY if configured, otherwise fallback to standard testing sitekey (Always Pass)
            const siteKey = "0x4AAAAAADf1ZYuJw2OV4dUZ";

            turnstileWidgetId = turnstile.render("#demo-turnstile-container", {
                sitekey: siteKey,
                theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
                callback: function (token) {
                    window.demoTurnstileToken = token;
                },
                "expired-callback": function () {
                    window.demoTurnstileToken = null;
                },
                "error-callback": function () {
                    window.demoTurnstileToken = null;
                }
            });
        } catch (e) {
            console.error("Failed to render Cloudflare Turnstile:", e);
        }
    }

    async function handleDemoCheck() {
        if (isChecking) return;

        const inputArea = document.getElementById("demo-emails-input");
        const modeSelect = document.getElementById("demo-checker-type");
        const btnCheck = document.getElementById("btn-run-demo-check");

        const progressContainer = document.getElementById("demo-progress-container");
        const progressBarFill = document.getElementById("demo-progress-bar-fill");
        const progressText = document.getElementById("demo-progress-text");
        const progressPercent = document.getElementById("demo-progress-percent");

        const resultsContainer = document.getElementById("demo-results-container");
        const listContainer = document.getElementById("demo-results-list");

        // Parse and clean emails
        const emailsText = inputArea.value || "";
        const emails = emailsText.split("\n")
            .map(e => e.trim())
            .filter(e => e.length > 0);

        if (emails.length === 0) {
            showDemoAlert("warning", "Input Error", "Please enter at least one Gmail address to check.");
            return;
        }

        // Run sanitizer Web Worker to validate emails and show toast on invalid input
        try {
            const validation = await sanitizeEmails(emailsText);
            if (validation.invalidEmails && validation.invalidEmails.length > 0) {
                const firstInvalid = validation.invalidEmails[0];
                const msg = `Line ${firstInvalid.lineNumber} ("${firstInvalid.text}"): ${firstInvalid.message}`;
                showDemoAlert("warning", "Validation Error", msg);
                return;
            }
        } catch (err) {
            console.error("Sanitizer worker failed:", err);
        }

        if (emails.length > 20) {
            showDemoAlert("warning", "Batch Limit Exceeded", "Demo mode is limited to 20 emails per request. Please shorten your list.");
            return;
        }

        const turnstileToken = window.demoTurnstileToken;
        if (!turnstileToken) {
            // Optional bypass Turnstile captcha if bypass configured or commented out on server
            showDemoAlert("warning", "Captcha Required", "Please complete the Turnstile challenge to verify you are human.");
            return;
        }

        // Lock UI
        isChecking = true;
        btnCheck.disabled = true;
        btnCheck.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Checking...`;

        // Reset and show progress
        progressContainer.classList.remove("hide");
        progressBarFill.style.width = "0%";
        progressText.textContent = "Connecting to verification server...";
        progressPercent.textContent = "0%";

        resultsContainer.classList.add("hide");
        listContainer.innerHTML = "";

        // Fake progress animation for smooth experience
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += Math.floor(Math.random() * 10) + 5;
                if (progress > 90) progress = 90;
                progressBarFill.style.width = `${progress}%`;
                progressPercent.textContent = `${progress}%`;

                if (progress > 60) {
                    progressText.textContent = "Almost finished...";
                } else if (progress > 30) {
                    progressText.textContent = "Verifying email address...";
                }
            }
        }, 300);

        const mode = modeSelect.value;
        const endpoint = mode === "deep" ? "/demo-deepcheck" : "/demo-fastcheck";
        const base = window.API ? window.API.GC_CHECKER_BASE : "https://gmail-checker.blacksoftchild.workers.dev";
        const url = `${base}${endpoint}`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    mail: emails,
                    turnstileToken: turnstileToken || "",
                    clientId: getOrCreateClientId()
                })
            });

            clearInterval(progressInterval);

            const isQuotaExceeded = response.status === 429;
            let errData = null;
            if (!response.ok) {
                errData = await response.json().catch(() => ({}));
                const isQuotaError = isQuotaExceeded || (errData && errData.error && errData.error.toLowerCase().includes("quota"));

                if (isQuotaError) {
                    showDemoAlert("warning", "Quota Exceeded", "Demo limit exceeded (100 checks/day). Redirecting to login page...");
                    setTimeout(() => {
                        if (window.setActiveMenu) {
                            window.setActiveMenu('login', true);
                        }
                    }, 1500); // Redirect directly with no alert popup blocking it
                    return;
                }

                throw new Error(errData.message || errData.error || `Server returned status ${response.status}`);
            }

            const data = await response.json();

            // Finish progress bar
            progressBarFill.style.width = "100%";
            progressPercent.textContent = "100%";
            progressText.textContent = "Check completed!";

            setTimeout(() => {
                progressContainer.classList.add("hide");
                displayResults(data, mode);
            }, 500);

        } catch (error) {
            clearInterval(progressInterval);
            progressContainer.classList.add("hide");
            showDemoAlert("danger", "Check Failed", error.message || "An unexpected error occurred.");
            resetTurnstile();
        } finally {
            isChecking = false;
            btnCheck.disabled = false;
            btnCheck.innerHTML = `<i class="fa-solid fa-play"></i> Start Checking`;
        }
    }

    function displayResults(results, mode) {
        const resultsContainer = document.getElementById("demo-results-container");
        const listContainer = document.getElementById("demo-results-list");
        const statsContainer = document.querySelector(".demo-results-stats");
        const headerContainer = document.querySelector(".demo-results-list-header");

        listContainer.innerHTML = "";

        // Copy button markup & binding
        if (headerContainer) {
            headerContainer.innerHTML = `
                <span>Email Address</span>
                <button id="btn-copy-demo-results" class="btn btn-secondary btn-copy-results" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 6px; display: flex; align-items: center; gap: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); cursor: pointer; transition: all 0.2s ease;">
                    <i class="fa-regular fa-copy"></i> Copy Results
                </button>
                <span>Status</span>
            `;

            const btnCopy = document.getElementById("btn-copy-demo-results");
            if (btnCopy) {
                btnCopy.addEventListener("click", () => {
                    const formatted = results.map(item => {
                        const email = item.email;
                        const status = getNormalizedStatus(item.status, mode);
                        return `${email} - ${status}`;
                    }).join("\n");

                    navigator.clipboard.writeText(formatted).then(() => {
                        btnCopy.innerHTML = `<i class="fa-solid fa-check" style="color: #00ff88;"></i> Copied!`;
                        setTimeout(() => {
                            btnCopy.innerHTML = `<i class="fa-regular fa-copy"></i> Copy Results`;
                        }, 2000);
                    }).catch(err => {
                        console.error("Failed to copy text: ", err);
                    });
                });
            }
        }

        if (mode === "fast") {
            let goodCount = 0;
            let badCount = 0;
            let failedCount = 0;

            results.forEach(item => {
                const email = item.email;
                const normalized = getNormalizedStatus(item.status, "fast");

                if (normalized === "GOOD") goodCount++;
                else if (normalized === "BAD") badCount++;
                else failedCount++;

                appendResultRow(listContainer, email, normalized);
            });

            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="demo-stat-box live">
                        <span class="demo-stat-num" style="color: #00ff88;">${goodCount}</span>
                        <span class="demo-stat-lbl">GOOD</span>
                    </div>
                    <div class="demo-stat-box bad">
                        <span class="demo-stat-num" style="color: #ff4757;">${badCount}</span>
                        <span class="demo-stat-lbl">BAD</span>
                    </div>
                    <div class="demo-stat-box" style="border-color: rgba(255, 255, 255, 0.1); background: var(--bg-secondary);">
                        <span class="demo-stat-num" style="color: var(--text-muted);">${failedCount}</span>
                        <span class="demo-stat-lbl">FAILED</span>
                    </div>
                `;
            }
        } else {
            // Deep mode
            let liveCount = 0;
            let verCount = 0;
            let disabledCount = 0;
            let unregisteredCount = 0;
            let failedCount = 0;

            results.forEach(item => {
                const email = item.email;
                const normalized = getNormalizedStatus(item.status, "deep");

                if (normalized === "LIVE") liveCount++;
                else if (normalized === "VER") verCount++;
                else if (normalized === "DISABLED") disabledCount++;
                else if (normalized === "UNREGISTERED") unregisteredCount++;
                else failedCount++;

                appendResultRow(listContainer, email, normalized);
            });

            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="demo-stat-box live">
                        <span class="demo-stat-num" style="color: #00ff88;">${liveCount}</span>
                        <span class="demo-stat-lbl">LIVE</span>
                    </div>
                    <div class="demo-stat-box" style="border-color: rgba(0, 240, 255, 0.25);">
                        <span class="demo-stat-num" style="color: #00f0ff;">${verCount}</span>
                        <span class="demo-stat-lbl">VER</span>
                    </div>
                    <div class="demo-stat-box disabled">
                        <span class="demo-stat-num" style="color: #ffd200;">${disabledCount}</span>
                        <span class="demo-stat-lbl">DISABLED</span>
                    </div>
                    <div class="demo-stat-box bad">
                        <span class="demo-stat-num" style="color: #ff4757;">${unregisteredCount}</span>
                        <span class="demo-stat-lbl">UNREGISTERED</span>
                    </div>
                    <div class="demo-stat-box" style="border-color: rgba(255, 255, 255, 0.1); background: var(--bg-secondary);">
                        <span class="demo-stat-num" style="color: var(--text-muted);">${failedCount}</span>
                        <span class="demo-stat-lbl">FAILED</span>
                    </div>
                `;
            }
        }

        // Show results container
        resultsContainer.classList.remove("hide");

        // Smoothly scroll results into view
        setTimeout(() => {
            resultsContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 100);

        resetTurnstile();
    }

    function getNormalizedStatus(rawStatus, mode) {
        const status = (rawStatus || "failed").toLowerCase().trim();

        if (mode === "fast") {
            if (status === "live" || status === "good") return "GOOD";
            if (status === "disabled" || status === "bad" || status === "unregistered") return "BAD";
            return "FAILED";
        } else {
            // Deep mode
            if (status === "live" || status === "good") return "LIVE";
            if (status === "ver" || status === "verified") return "VER";
            if (status === "disabled") return "DISABLED";
            if (status === "unregistered" || status === "bad") return "UNREGISTERED";
            return "FAILED";
        }
    }

    function appendResultRow(container, email, status) {
        const row = document.createElement("div");
        row.className = "demo-result-row";

        // CSS class matching normalized statuses
        let cssClass = status.toLowerCase();
        if (status === "GOOD") cssClass = "live";
        if (status === "VER") cssClass = "ver";
        if (status === "UNREGISTERED") cssClass = "bad";
        if (status === "BAD") cssClass = "bad";

        row.innerHTML = `
            <span class="demo-result-email" title="${escapeHTML(email)}">${escapeHTML(email)}</span>
            <span class="demo-result-status ${cssClass}">${status}</span>
        `;
        container.appendChild(row);
    }

    function resetTurnstile() {
        window.demoTurnstileToken = null;
        if (typeof turnstile !== "undefined" && turnstileWidgetId !== null) {
            try {
                turnstile.reset(turnstileWidgetId);
            } catch (e) {
                console.error("Failed to reset Turnstile widget:", e);
            }
        }
    }

    function getOrCreateClientId() {
        let clientId = localStorage.getItem("demo_client_id");
        if (!clientId || !/^demo_[a-zA-Z0-9]{10,50}$/.test(clientId)) {
            const rand = Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
            clientId = "demo_" + rand;
            localStorage.setItem("demo_client_id", clientId);
        }
        return clientId;
    }

    function showDemoAlert(type, title, message) {
        // ALWAYS use custom premium toast popup for the Demo widget so it is always visible even when scrolled
        let toast = document.getElementById("demo-fallback-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "demo-fallback-toast";
            toast.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: rgba(30, 30, 36, 0.95);
                border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
                border-radius: 12px;
                padding: 16px 20px;
                z-index: 99999;
                display: flex;
                align-items: center;
                gap: 12px;
                font-family: system-ui, sans-serif;
                font-size: 0.9rem;
                color: #fff;
                transform: translateY(150%);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                max-width: 350px;
                pointer-events: auto;
            `;
            document.body.appendChild(toast);
        }

        let color = "#af86fc";
        let icon = "fa-circle-info";
        if (type === "success") {
            color = "#00ff88";
            icon = "fa-circle-check";
        } else if (type === "danger" || type === "error") {
            color = "#ff4757";
            icon = "fa-circle-exclamation";
        } else if (type === "warning") {
            color = "#ffd200";
            icon = "fa-triangle-exclamation";
        }

        toast.style.borderLeft = `4px solid ${color}`;
        toast.innerHTML = `
            <i class="fa-solid ${icon}" style="color: ${color}; font-size: 1.2rem; flex-shrink: 0;"></i>
            <div style="flex-grow: 1;">
                <strong style="display: block; font-size: 0.75rem; text-transform: uppercase; color: #aaa; margin-bottom: 2px;">${title}</strong>
                <span style="display: block; line-height: 1.4; color: #eee;">${message}</span>
            </div>
            <button style="background: none; border: none; color: #777; cursor: pointer; padding: 0 4px; font-size: 1rem; transition: color 0.2s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#777'" onclick="this.parentElement.style.transform='translateY(150%)'"><i class="fa-solid fa-times"></i></button>
        `;

        toast.offsetHeight; // force reflow
        toast.style.transform = "translateY(0)";

        clearTimeout(toast.timeoutId);
        toast.timeoutId = setTimeout(() => {
            toast.style.transform = "translateY(150%)";
        }, 4000);
    }

    function sanitizeEmails(content) {
        return new Promise((resolve) => {
            const basePath = window.BASE_PATH || "";
            const workerPath = (basePath.endsWith("/") ? basePath : basePath + "/") + "js/apps/sanitizerWorker.js";
            const worker = new Worker(workerPath);
            worker.postMessage(content);
            worker.onmessage = function (e) {
                worker.terminate();
                resolve(e.data);
            };
            worker.onerror = function (err) {
                worker.terminate();
                resolve({ validEmails: [], invalidEmails: [] });
            };
        });
    }

    function escapeHTML(str) {
        if (!str) return "";
        return str.replace(/[&<>'"]/g,
            tag => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;"
            }[tag] || tag)
        );
    }
})();
