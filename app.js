// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log("Service Worker Registered"))
        .catch(err => console.error("Service Worker Failed", err));
}

// Navigation Logic
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');
const headerTitle = document.getElementById('header-title');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active nav button
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Switch view
        const targetId = btn.getAttribute('data-target');
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        // Update header
        headerTitle.textContent = btn.getAttribute('data-title');

        if(targetId === 'view-history') {
            renderLogs();
        }
    });
});

// Data Management
let logs = JSON.parse(localStorage.getItem('wellnessLogs')) || [];

function saveLog(type, data) {
    const entry = {
        id: Date.now().toString(),
        type: type,
        timestamp: new Date().toISOString(),
        ...data
    };
    logs.unshift(entry); // Add to beginning
    localStorage.setItem('wellnessLogs', JSON.stringify(logs));
}

// Form Submissions
document.getElementById('form-food').addEventListener('submit', (e) => {
    e.preventDefault();
    saveLog('food', {
        name: document.getElementById('food-name').value,
        details: document.getElementById('food-details').value
    });
    e.target.reset();
    alert('Food logged!');
});

document.getElementById('form-meds').addEventListener('submit', (e) => {
    e.preventDefault();
    saveLog('meds', {
        name: document.getElementById('med-name').value,
        dosage: document.getElementById('med-dosage').value
    });
    e.target.reset();
    alert('Medication logged!');
});

document.getElementById('form-notes').addEventListener('submit', (e) => {
    e.preventDefault();
    saveLog('notes', {
        text: document.getElementById('note-text').value
    });
    e.target.reset();
    alert('Note saved!');
});

// History Rendering
const logContainer = document.getElementById('log-container');
const historyFilter = document.getElementById('history-filter');

historyFilter.addEventListener('change', renderLogs);

function renderLogs() {
    logContainer.innerHTML = '';
    const filter = historyFilter.value;
    
    const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.type === filter);

    if (filteredLogs.length === 0) {
        logContainer.innerHTML = '<p style="text-align:center; color:#7f8c8d;">No entries found.</p>';
        return;
    }

    filteredLogs.forEach(log => {
        const dateObj = new Date(log.timestamp);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const div = document.createElement('div');
        div.className = `log-card ${log.type}`;

        let contentHTML = '';
        if (log.type === 'food') {
            contentHTML = `<div><div class="log-title">🍏 ${log.name}</div><div class="log-detail">${log.details || ''}</div></div>`;
        } else if (log.type === 'meds') {
            contentHTML = `<div><div class="log-title">💊 ${log.name}</div><div class="log-detail">${log.dosage}</div></div>`;
        } else if (log.type === 'notes') {
            contentHTML = `<div><div class="log-title">📝 Note</div><div class="log-detail">${log.text}</div></div>`;
        }

        div.innerHTML = `
            <div style="flex:1;">
                <div class="log-meta">${dateStr}</div>
                ${contentHTML}
            </div>
            <button class="delete-btn" onclick="deleteLog('${log.id}')">X</button>
        `;
        logContainer.appendChild(div);
    });
}

window.deleteLog = function(id) {
    if(confirm('Delete this entry?')) {
        logs = logs.filter(log => log.id !== id);
        localStorage.setItem('wellnessLogs', JSON.stringify(logs));
        renderLogs();
    }
}