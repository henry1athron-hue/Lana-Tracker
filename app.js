// Data Store
let logs = JSON.parse(localStorage.getItem('timelineLogs')) || [];

// DOM Elements
const logContainer = document.getElementById('log-container');
const btnLogDay = document.getElementById('btn-log-day');
const loggingMenu = document.getElementById('logging-menu');
const btnCloseMenu = document.getElementById('btn-close-menu');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// --- UI Interactions ---

btnLogDay.addEventListener('click', () => {
    loggingMenu.classList.remove('hidden');
    btnLogDay.style.display = 'none';
    clearForms();
});

btnCloseMenu.addEventListener('click', () => {
    loggingMenu.classList.add('hidden');
    btnLogDay.style.display = 'block';
    clearForms();
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// --- Data Management ---

function saveLog(type, data, editId = null) {
    const now = new Date().toISOString();
    
    if (editId) {
        // Update existing log
        const logIndex = logs.findIndex(l => l.id === editId);
        if (logIndex > -1) {
            logs[logIndex] = { ...logs[logIndex], ...data, editedAt: now };
        }
    } else {
        // Create new log
        const entry = {
            id: Date.now().toString(),
            type: type,
            createdAt: now,
            editedAt: null,
            ...data
        };
        logs.push(entry);
    }

    // Sort by creation time, newest first
    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    localStorage.setItem('timelineLogs', JSON.stringify(logs));
    
    renderLogs();
    btnCloseMenu.click();
}

function clearForms() {
    document.getElementById('form-food').reset();
    document.getElementById('edit-id-food').value = '';
    
    document.getElementById('form-meds').reset();
    document.getElementById('edit-id-meds').value = '';
    
    document.getElementById('form-notes').reset();
    document.getElementById('edit-id-notes').value = '';
}

// Form Listeners
document.getElementById('form-food').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id-food').value;
    saveLog('food', {
        name: document.getElementById('food-name').value,
        cals: document.getElementById('food-cals').value
    }, editId);
});

document.getElementById('form-meds').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id-meds').value;
    saveLog('meds', {
        name: document.getElementById('med-name').value,
        dosage: document.getElementById('med-dosage').value
    }, editId);
});

document.getElementById('form-notes').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id-notes').value;
    saveLog('notes', {
        text: document.getElementById('note-text').value
    }, editId);
});

// --- Rendering ---

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function renderLogs() {
    logContainer.innerHTML = '';
    
    if (logs.length === 0) {
        logContainer.innerHTML = '<p style="text-align:center; color:#777; margin-top:2rem;">Your day is empty. Start logging!</p>';
        return;
    }

    logs.forEach(log => {
        const div = document.createElement('div');
        div.className = `log-card ${log.type}`;

        let contentHTML = '';
        let titleHTML = '';

        if (log.type === 'food') {
            titleHTML = '🍏 ' + log.name;
            contentHTML = log.cals ? `${log.cals} Calories` : 'No calories noted';
        } else if (log.type === 'meds') {
            titleHTML = '💊 ' + log.name;
            contentHTML = `Dosage: ${log.dosage}`;
        } else if (log.type === 'notes') {
            titleHTML = '📝 Note';
            contentHTML = log.text;
        }

        const editTimeHTML = log.editedAt ? `<div class="log-edit-time">Last edited: ${formatTime(log.editedAt)}</div>` : '';

        div.innerHTML = `
            <div class="log-header">
                <div>
                    <div class="log-title">${titleHTML}</div>
                    <div class="log-time">Added: ${formatTime(log.createdAt)}</div>
                    ${editTimeHTML}
                </div>
            </div>
            <div class="log-body">${contentHTML}</div>
            <div class="card-actions">
                <button class="btn-small btn-edit" onclick="editLog('${log.id}')">Edit</button>
                <button class="btn-small btn-delete" onclick="deleteLog('${log.id}')">Delete</button>
            </div>
        `;
        logContainer.appendChild(div);
    });
}

// --- Edit & Delete ---

window.deleteLog = function(id) {
    if(confirm('Are you sure you want to delete this?')) {
        logs = logs.filter(l => l.id !== id);
        localStorage.setItem('timelineLogs', JSON.stringify(logs));
        renderLogs();
    }
};

window.editLog = function(id) {
    const log = logs.find(l => l.id === id);
    if (!log) return;

    btnLogDay.click(); // Open menu
    
    // Switch to correct tab and populate
    if (log.type === 'food') {
        document.querySelector('[data-tab="tab-food"]').click();
        document.getElementById('edit-id-food').value = log.id;
        document.getElementById('food-name').value = log.name;
        document.getElementById('food-cals').value = log.cals || '';
    } else if (log.type === 'meds') {
        document.querySelector('[data-tab="tab-meds"]').click();
        document.getElementById('edit-id-meds').value = log.id;
        document.getElementById('med-name').value = log.name;
        document.getElementById('med-dosage').value = log.dosage;
    } else if (log.type === 'notes') {
        document.querySelector('[data-tab="tab-notes"]').click();
        document.getElementById('edit-id-notes').value = log.id;
        document.getElementById('note-text').value = log.text;
    }
};

// Initial Render
renderLogs();
