// Email Extractor & Deduplicator App Module
let extractorLineNumbersTimer = null;

// Extractor main runner function
function runExtractor() {
    const rawInput = document.getElementById('email-extractor-input').value;
    if (!rawInput.trim()) {
        if (window.showAppNotification) window.showAppNotification('warning', 'Please paste some raw text to extract emails from!');
        return;
    }

    // Regex for matching emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = rawInput.match(emailRegex) || [];

    if (matches.length === 0) {
        if (window.showAppNotification) window.showAppNotification('danger', 'No email addresses found in the provided text!');
        return;
    }

    // Convert to lowercase & Deduplicate (Case-insensitive)
    let processedEmails = [...new Set(matches.map(email => email.toLowerCase().trim()))];

    // Stats calculations before filtering
    const totalExtractedCount = matches.length;

    // Apply Domain Filters
    const domainFilter = document.getElementById('extractor-domain-filter').value;
    if (domainFilter === 'gmail') {
        processedEmails = processedEmails.filter(email => email.endsWith('@gmail.com') || email.endsWith('@googlemail.com'));
    } else if (domainFilter === 'nongmail') {
        processedEmails = processedEmails.filter(email => !email.endsWith('@gmail.com') && !email.endsWith('@googlemail.com'));
    } else if (domainFilter === 'custom') {
        const customDomain = document.getElementById('extractor-custom-domain').value.trim().toLowerCase();
        if (customDomain) {
            const cleanDomain = customDomain.startsWith('@') ? customDomain : '@' + customDomain;
            processedEmails = processedEmails.filter(email => email.endsWith(cleanDomain));
        }
    }

    // Apply Sorting Options
    const sortOption = document.getElementById('extractor-sort-option').value;
    if (sortOption === 'asc') {
        processedEmails.sort((a, b) => a.localeCompare(b));
    } else if (sortOption === 'desc') {
        processedEmails.sort((a, b) => b.localeCompare(a));
    } else if (sortOption === 'shuffle') {
        for (let i = processedEmails.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [processedEmails[i], processedEmails[j]] = [processedEmails[j], processedEmails[i]];
        }
    }

    // Calculate final counts
    const uniqueCount = processedEmails.length;
    const gmailCount = processedEmails.filter(email => email.endsWith('@gmail.com') || email.endsWith('@googlemail.com')).length;
    const otherCount = uniqueCount - gmailCount;

    // Apply Output Formatter
    const outputFormat = document.getElementById('extractor-output-format').value;
    let formattedOutput = '';
    if (outputFormat === 'comma') {
        formattedOutput = processedEmails.join(', ');
    } else if (outputFormat === 'semicolon') {
        formattedOutput = processedEmails.join('; ');
    } else {
        formattedOutput = processedEmails.join('\n');
    }

    // Populate Results
    const resultsContainer = document.getElementById('results-container-app5');
    const outputTextarea = document.getElementById('email-extractor-output');
    if (outputTextarea) {
        outputTextarea.value = formattedOutput;
    }

    if (resultsContainer) {
        resultsContainer.classList.remove('hide');
    }

    // Show copy & download buttons
    const btnCopy = document.getElementById('btn-extractor-copy');
    const btnDownload = document.getElementById('btn-extractor-download');
    if (btnCopy) btnCopy.classList.remove('hide');
    if (btnDownload) btnDownload.classList.remove('hide');

    // Populate Stats
    document.getElementById('stats-extractor-total').textContent = totalExtractedCount;
    document.getElementById('stats-extractor-unique').textContent = uniqueCount;
    document.getElementById('stats-extractor-gmail').textContent = gmailCount;
    document.getElementById('stats-extractor-other').textContent = otherCount;

    // Initialize/sync line numbers for the output viewport
    window.initTextareaLineNumbers('email-extractor-output', 'line-numbers-app5-results', 'results-container-app5');

    if (window.showAppNotification) {
        window.showAppNotification('success', `Success! Extracted <strong>${totalExtractedCount}</strong> emails. <strong>${uniqueCount}</strong> clean unique emails saved.`);
    }

    if (window.saveHistoryEntry) {
        window.saveHistoryEntry('app4', 'Email Extractor', uniqueCount, formattedOutput, 'emails');
    }
}

// Reset/Clear Extractor
function clearExtractor() {
    const input = document.getElementById('email-extractor-input');
    const output = document.getElementById('email-extractor-output');
    const resultsContainer = document.getElementById('results-container-app5');
    
    if (input) input.value = '';
    if (output) output.value = '';
    
    if (resultsContainer) {
        resultsContainer.classList.add('hide');
    }

    const btnCopy = document.getElementById('btn-extractor-copy');
    const btnDownload = document.getElementById('btn-extractor-download');
    if (btnCopy) btnCopy.classList.add('hide');
    if (btnDownload) btnDownload.classList.add('hide');

    document.getElementById('stats-extractor-total').textContent = '0';
    document.getElementById('stats-extractor-unique').textContent = '0';
    document.getElementById('stats-extractor-gmail').textContent = '0';
    document.getElementById('stats-extractor-other').textContent = '0';

    // Synchronize custom line numbers
    window.initTextareaLineNumbers('email-extractor-input', 'line-numbers-app5', 'email-input-container-app5');
}

// Copy to clipboard
function copyExtractedEmails() {
    const output = document.getElementById('email-extractor-output');
    if (!output || !output.value) return;

    navigator.clipboard.writeText(output.value).then(() => {
        if (window.showAppNotification) window.showAppNotification('success', 'Clean list copied to clipboard!');
    });
}

// Download list as file
function downloadExtractedEmails() {
    const output = document.getElementById('email-extractor-output');
    if (!output || !output.value) return;

    const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'extracted-emails-clean.txt';
    link.click();
    URL.revokeObjectURL(link.href);

    if (window.showAppNotification) window.showAppNotification('success', 'Clean list downloaded successfully!');
}

// Initializer
function initEmailExtractor() {
    // Buttons listeners
    const btnRun = document.getElementById('btn-extractor-run');
    if (btnRun) btnRun.addEventListener('click', runExtractor);

    const btnClear = document.getElementById('btn-extractor-clear');
    if (btnClear) btnClear.addEventListener('click', clearExtractor);

    const btnCopy = document.getElementById('btn-extractor-copy');
    if (btnCopy) btnCopy.addEventListener('click', copyExtractedEmails);

    const btnDownload = document.getElementById('btn-extractor-download');
    if (btnDownload) btnDownload.addEventListener('click', downloadExtractedEmails);

    // Domain filter change listener
    const domainFilter = document.getElementById('extractor-domain-filter');
    const customDomainContainer = document.getElementById('custom-domain-filter-container');
    if (domainFilter && customDomainContainer) {
        domainFilter.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customDomainContainer.classList.remove('hide');
            } else {
                customDomainContainer.classList.add('hide');
            }
        });
    }

    // Initialize line numbers synchronization
    window.initTextareaLineNumbers('email-extractor-input', 'line-numbers-app5', 'email-input-container-app5');
}

// Bootstrapping
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmailExtractor);
} else {
    initEmailExtractor();
}
