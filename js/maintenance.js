// js/maintenance.js

(async function () {
    try {
        // Fetch maintenance status from backend
        const response = await fetch(window.API.MAINTENANCE, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) return; // If endpoint fails, assume not in maintenance
        const data = await response.json();
        
        if (!data.isMT) return; // Maintenance not active
        
        // Prevent double overlay
        if (document.getElementById('maintenance-overlay')) return;
        
        // Parse the start time properly
        function parseDate(dateString) {
            if (!dateString) return new Date();
            let str = dateString.replace(' ', 'T');
            let date = new Date(str);
            if (isNaN(date.getTime())) {
                let parts = dateString.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
                if (parts) {
                    date = new Date(parts[1], parts[2] - 1, parts[3], parts[4], parts[5], parts[6]);
                } else {
                    date = new Date();
                }
            }
            return date;
        }

        const waktuMulai = parseDate(data.startTime);
        const durasiMenit = data.duration || 120;
        const estimasiSelesai = new Date(waktuMulai.getTime() + (durasiMenit * 60000));

        // Save to localStorage
        let savedEndTime = parseInt(localStorage.getItem('maintenance_end_time'));
        let endDate = new Date(savedEndTime);

        if (isNaN(savedEndTime) || savedEndTime !== estimasiSelesai.getTime()) {
            endDate = estimasiSelesai;
            localStorage.setItem('maintenance_end_time', endDate.getTime());
        }

        // Timer updater
        let timerInterval;
        function updateTimer() {
            const now = new Date();
            const diffMs = endDate - now;

            if (diffMs <= 0) {
                document.getElementById('timer-text').innerHTML = 'Maintenance complete! Please refresh the page.';
                document.getElementById('timer-status').innerHTML = '✅ Maintenance finished';
                if (timerInterval) clearInterval(timerInterval);
                return;
            }

            const hours = Math.floor(diffMs / 3600000);
            const minutes = Math.floor((diffMs % 3600000) / 60000);
            const seconds = Math.floor((diffMs % 60000) / 1000);

            let timerString = '';
            if (hours > 0) {
                timerString = `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
            } else {
                timerString = `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
            }

            document.getElementById('timer-text').innerHTML = timerString;
            document.getElementById('estimasi-selesai').innerHTML = `Expected completion: ${endDate.toLocaleString()}`;
            document.getElementById('waktu-mulai').innerHTML = `Maintenance started: ${waktuMulai.toLocaleString()}`;
        }

        // Create UI Overlay
        const overlay = document.createElement('div');
        overlay.id = 'maintenance-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            z-index: 999999;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            text-align: center;
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            backdrop-filter: blur(10px);
        `;

        overlay.innerHTML = `
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 24px; padding: 40px; max-width: 600px; width: 90%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); backdrop-filter: blur(20px);">
                <div style="font-size: 70px; margin-bottom: 20px; animation: float 3s ease-in-out infinite;">🚀</div>
                <h1 style="font-size: 32px; font-weight: 800; margin-bottom: 15px; background: linear-gradient(90deg, #00f0ff, #00ff88); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">System Upgrade in Progress</h1>
                <p style="font-size: 16px; color: #94a3b8; margin-bottom: 30px; line-height: 1.6;">We are currently deploying massive network optimizations and system upgrades to provide you with unprecedented speed and stability.</p>
                
                <div id="waktu-mulai" style="font-size: 14px; color: #64748b; margin-bottom: 25px;"></div>
                
                <div style="background: rgba(0,0,0,0.3); border-radius: 16px; padding: 25px; border: 1px solid rgba(255,255,255,0.03); margin-bottom: 25px;">
                    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #00f0ff; margin-bottom: 15px; font-weight: 600;">Estimated Time Remaining</div>
                    <div id="timer-text" style="font-size: 32px; font-weight: 700; color: #fff; margin-bottom: 5px; font-family: monospace;">-- minutes -- seconds</div>
                    <div id="estimasi-selesai" style="font-size: 13px; color: #64748b; margin-top: 10px;"></div>
                </div>
                
                <div id="timer-status" style="display: inline-block; padding: 8px 20px; background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 30px; font-size: 14px; color: #00f0ff; font-weight: 600; margin-bottom: 20px;">
                    <i class="fa-solid fa-circle-notch fa-spin" style="margin-right: 8px;"></i> Maintenance in progress...
                </div>
                
                <p style="font-size: 14px; color: #64748b; margin-top: 10px;">Thank you for your patience. We'll be back shortly!</p>
            </div>
            <style>
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                    100% { transform: translateY(0px); }
                }
            </style>
        `;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        // Start timer
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);

    } catch (err) {
        console.error("Failed to fetch maintenance status:", err);
    }
})();
