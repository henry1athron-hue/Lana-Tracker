// Data Store: Grouped by date (e.g., "11/10/2026")
let dayLogs = JSON.parse(localStorage.getItem('groupedTimelineLogs')) || {};

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

function saveLog(type, data, editId = null, existingDateKey = null, customTime = null) {
    const now = new Date();
    const dateKey = existingDateKey || now.toLocaleDateString();
    
    // Determine the exact time of the log
    let entryDate = new Date();
    if (customTime) {
        // If user selected a custom time, apply it to the date being logged
        const [hours, minutes] = customTime.split(':');
        entryDate = existingDateKey ? new Date(existingDateKey) : new Date();
        entryDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }
    
    // Create the day array if it doesn't exist
    if (!dayLogs[dateKey]) {
        dayLogs[dateKey] = [];
    }

    if (editId) {
        // Find existing log inside that day
        const logIndex = dayLogs[dateKey].findIndex(l => l.id === editId);
        if (logIndex > -1) {
            dayLogs[dateKey][logIndex] = { 
                ...dayLogs[dateKey][logIndex], 
                ...data, 
                createdAt: entryDate.toISOString(), // Update if time was changed
                editedAt: now.toISOString() 
            };
        }
    } else {
        // Add new log to the day
        const entry = {
            id: Date.now().toString(),
            type: type,
            createdAt: entryDate.toISOString(),
            editedAt: null,
            ...data
        };
        dayLogs[dateKey].push(entry);
    }

    // Sort logs within the day: newest time at the top
    dayLogs[dateKey].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    localStorage.setItem('groupedTimelineLogs', JSON.stringify(dayLogs));
    renderLogs();
    btnCloseMenu.click(); // Hide menu, show main button
}

function clearForms() {
    ['food', 'meds', 'notes'].forEach(type => {
        document.getElementById(`form-${type}`).reset();
        document.getElementById(`edit-id-${type}`).value = '';
        document.getElementById(`date-key-${type}`).value = '';
        document.getElementById(`${type}-time`).value = '';
    });
}

// Form Submit Listeners
document.getElementById('form-food').addEventListener('submit', (e) => {
    e.preventDefault();
    saveLog('food', {
        name: document.getElementById('food-name').value,
        cals: document.getElementById('food-cals').value
    }, 
    document.getElementById('edit-id-food').value, 
    document.getElementById('date-key-food').value,
    document.getElementById('food-time').value);
});

document.getElementById('form-meds').addEventListener('submit', (e) => {
    e.preventDefault();
    saveLog('meds', {
        name: document.getElementById('med-name').value,
        dosage: document.getElementById('med-dosage').value
    }, 
    document.getElementById('edit-id-meds').value, 
    document.getElementById('date-key-meds').value,
    document.getElementById('meds-time').value);
});

document.getElementById('form-notes').addEventListener('submit', (e) => {
    e.preventDefault();
    saveLog('notes', {
        text: document.getElementById('note-text').value
    }, 
    document.getElementById('edit-id-notes').value, 
    document.getElementById('date-key-notes').value,
    document.getElementById('notes-time').value);
});

// --- Rendering ---

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function renderLogs() {
    logContainer.innerHTML = '';
    
    // Sort days so newest calendar day is at the top
    const dateKeys = Object.keys(dayLogs).sort((a, b) => new Date(b) - new Date(a));

    if (dateKeys.length === 0) {
        logContainer.innerHTML = '<p style="text-align:center; color:#777; margin-top:2rem;">Your timeline is empty. Start logging!</p>';
        return;
    }

    dateKeys.forEach(dateKey => {
        const items = dayLogs[dateKey];
        if (items.length === 0) return;

        // Create the expandable Day Group
        const groupDiv = document.createElement('div');
        groupDiv.className = 'day-group';

        groupDiv.innerHTML = `
            <div class="day-header" onclick="toggleDay('${dateKey}')">
                <span>📅 ${dateKey}</span>
                <span id="arrow-${dateKey.replace(/\//g, '-')}">▼</span>
            </div>
            <div class="day-content" id="content-${dateKey.replace(/\//g, '-')}">
                ${items.map(item => buildLogCard(item, dateKey)).join('')}
            </div>
        `;
        logContainer.appendChild(groupDiv);
    });
}

function buildLogCard(log, dateKey) {
    let titleHTML = '';
    let contentHTML = '';

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

    const editTimeHTML = log.editedAt ? `<span class="log-edit-time"> (Edited at ${formatTime(log.editedAt)})</span>` : '';

    return `
        <div class="log-card ${log.type}">
            <div class="log-meta">Added: ${formatTime(log.createdAt)}${editTimeHTML}</div>
            <div class="log-title">${titleHTML}</div>
            <div class="log-body">${contentHTML}</div>
            <div class="card-actions">
                <button class="btn-small btn-edit" onclick="editItem('${dateKey}', '${log.id}')">Edit</button>
                <button class="btn-small btn-delete" onclick="deleteItem('${dateKey}', '${log.id}')">Delete</button>
            </div>
        </div>
    `;
}

// --- Accordion Toggle ---
window.toggleDay = function(dateKey) {
    const safeKey = dateKey.replace(/\//g, '-');
    const content = document.getElementById(`content-${safeKey}`);
    const arrow = document.getElementById(`arrow-${safeKey}`);
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        arrow.textContent = '▼';
    } else {
        content.classList.add('hidden');
        arrow.textContent = '▶';
    }
};

// --- Edit & Delete ---
window.deleteItem = function(dateKey, id) {
    if(confirm('Are you sure you want to delete this?')) {
        dayLogs[dateKey] = dayLogs[dateKey].filter(l => l.id !== id);
        if (dayLogs[dateKey].length === 0) delete dayLogs[dateKey];
        localStorage.setItem('groupedTimelineLogs', JSON.stringify(dayLogs));
        renderLogs();
    }
};

window.editItem = function(dateKey, id) {
    const log = dayLogs[dateKey].find(l => l.id === id);
    if (!log) return;

    btnLogDay.click(); // Open the menu
    
    // Switch to correct tab and populate ID/Dates
    document.querySelector(`[data-tab="tab-${log.type}"]`).click();
    document.getElementById(`edit-id-${log.type}`).value = log.id;
    document.getElementById(`date-key-${log.type}`).value = dateKey;

    // Convert saved ISO string back into HH:MM format for the input
    const dateObj = new Date(log.createdAt);
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const mins = String(dateObj.getMinutes()).padStart(2, '0');
    document.getElementById(`${log.type}-time`).value = `${hours}:${mins}`;

    // Populate specific form fields
    if (log.type === 'food') {
        document.getElementById('food-name').value = log.name;
        document.getElementById('food-cals').value = log.cals || '';
    } else if (log.type === 'meds') {
        document.getElementById('med-name').value = log.name;
        document.getElementById('med-dosage').value = log.dosage;
    } else if (log.type === 'notes') {
        document.getElementById('note-text').value = log.text;
    }
};

// Initial Render
renderLogs();
