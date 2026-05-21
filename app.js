// Data Store: Grouped by date key strings (e.g., "11-10-2026")
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
    setLiveDateTimeDefaults(); // Pre-load accurate live tracking context
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

// Sets input field defaults to current precise live moments
function setLiveDateTimeDefaults() {
    const now = new Date();
    const localISODate = now.toLocaleDateString('sv-SE'); // Formats safely to YYYY-MM-DD
    const localTime = now.toTimeString().substring(0, 5); // Formats safely to HH:MM

    ['food', 'water', 'meds', 'notes'].forEach(type => {
        const dateInput = document.getElementById(`${type}-date`);
        const timeInput = document.getElementById(`${type}-time`);
        if (dateInput && !dateInput.value) dateInput.value = localISODate;
        if (timeInput && !timeInput.value) timeInput.value = localTime;
    });
}

// --- Data Management ---

function saveLog(type, data, editId = null, oldDateKey = null, inputDateStr = null, inputTimeStr = null) {
    const now = new Date();
    
    // Parse the designated date setup safely
    let targetParts = inputDateStr.split('-'); 
    let entryDate = new Date(targetParts[0], targetParts[1] - 1, targetParts[2]);
    
    if (inputTimeStr) {
        const [hours, minutes] = inputTimeStr.split(':');
        entryDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }

    // Standardized safe text grouping key representation (MM/DD/YYYY)
    const newDateKey = entryDate.toLocaleDateString('en-US');

    // If an item moved dates via edit adjustments, purge it from its legacy listing context
    if (editId && oldDateKey && oldDateKey !== newDateKey && dayLogs[oldDateKey]) {
        dayLogs[oldDateKey] = dayLogs[oldDateKey].filter(l => l.id !== editId);
        if (dayLogs[oldDateKey].length === 0) delete dayLogs[oldDateKey];
    }
    
    if (!dayLogs[newDateKey]) {
        dayLogs[newDateKey] = [];
    }

    if (editId) {
        const logIndex = dayLogs[newDateKey].findIndex(l => l.id === editId);
        if (logIndex > -1) {
            dayLogs[newDateKey][logIndex] = { 
                ...dayLogs[newDateKey][logIndex], 
                ...data, 
                createdAt: entryDate.toISOString(), 
                editedAt: now.toISOString() 
            };
        } else {
            // Re-injection layout path if migrated into a newly targeted daily area entirely
            dayLogs[newDateKey].push({
                id: editId,
                type: type,
                createdAt: entryDate.toISOString(),
                editedAt: now.toISOString(),
                ...data
            });
        }
    } else {
        const entry = {
            id: Date.now().toString(),
            type: type,
            createdAt: entryDate.toISOString(),
            editedAt: null,
            ...data
        };
        dayLogs[newDateKey].push(entry);
    }

    // Keep items clean chronological: Newest entries always listed first
    dayLogs[newDateKey].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    localStorage.setItem('groupedTimelineLogs', JSON.stringify(dayLogs));
    renderLogs();
    btnCloseMenu.click(); 
}

function clearForms() {
    ['food', 'water', 'meds', 'notes'].forEach(type => {
        const form = document.getElementById(`form-${type}`);
        if(form) form.reset();
        
        const editInput = document.getElementById(`edit-id-${type}`);
        if(editInput) editInput.value = '';
        
        const dateKeyInput = document.getElementById(`date-key-${type}`);
        if(dateKeyInput) dateKeyInput.value = '';
        
        const dInput = document.getElementById(`${type}-date`);
        if(dInput) dInput.value = '';

        const tInput = document.getElementById(`${type}-time`);
        if(tInput) tInput.value = '';
    });
}

// Form Submit Listeners
document.getElementById('form-food').addEventListener('submit', (e) => {
    e.preventDefault();
    saveLog('food', {
        name: document.getElementById('food-name').value,
        cals: document.getElementById('food-cals').value
    }, document.getElementById('edit-id-food').value, document.getElementById('date-key-food').value, document.getElementById('food-date').value, document.getElementById('food-time').value);
});

document.getElementById('form-water').addEventListener('submit', (e) => {
    e.preventDefault();
    saveLog('water', {
        amount: document.getElementById('water-amount').value
    }, document.getElementById('edit-id-water').value, document.getElementById('date-key-water').value, document.getElementById('water-date').value, document.getElementById('water-time').value);
});

document.getElementById('form-meds').addEventListener('submit', (e) => {
    e.preventDefault();
    saveLog('meds', {
        name: document.getElementById('med-name').value,
        dosage: document.getElementById('med-dosage').value
    }, document.getElementById('edit-id-meds').value, document.getElementById('date-key-meds').value, document.getElementById('meds-date').value, document.getElementById('meds-time').value);
});

document.getElementById('form-notes').addEventListener('submit', (e) => {
    e.preventDefault();
    saveLog('notes', {
        text: document.getElementById('note-text').value
    }, document.getElementById('edit-id-notes').value, document.getElementById('date-key-notes').value, document.getElementById('notes-date').value, document.getElementById('notes-time').value);
});

// --- Rendering ---

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function renderLogs() {
    logContainer.innerHTML = '';
    
    // Sort keys so the newest calendar days sit proudly at top level
    const dateKeys = Object.keys(dayLogs).sort((a, b) => new Date(b) - new Date(a));

    if (dateKeys.length === 0) {
        logContainer.innerHTML = '<p style="text-align:center; color:#777; margin-top:2rem;">Your timeline is empty. Start logging!</p>';
        return;
    }

    dateKeys.forEach(dateKey => {
        const items = dayLogs[dateKey];
        if (items.length === 0) return;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'day-group';

        // Swap slashes dynamically to create clean accordion lookups safely
        const htmlSafeID = dateKey.replace(/\//g, '-');

        groupDiv.innerHTML = `
            <div class="day-header" onclick="toggleDay('${dateKey}')">
                <span>📅 ${dateKey}</span>
                <span id="arrow-${htmlSafeID}">▼</span>
            </div>
            <div class="day-content" id="content-${htmlSafeID}">
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
    } else if (log.type === 'water') {
        titleHTML = '💧 Water';
        contentHTML = `Amount: ${log.amount}`;
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

    btnLogDay.click(); // Open system view input
    
    document.querySelector(`[data-tab="tab-${log.type}"]`).click();
    document.getElementById(`edit-id-${log.type}`).value = log.id;
    document.getElementById(`date-key-${log.type}`).value = dateKey;

    // Convert date object values accurately into correct presentation forms
    const dateObj = new Date(log.createdAt);
    const localISODate = dateObj.toLocaleDateString('sv-SE');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const mins = String(dateObj.getMinutes()).padStart(2, '0');
    
    document.getElementById(`${log.type}-date`).value = localISODate;
    document.getElementById(`${log.type}-time`).value = `${hours}:${mins}`;

    if (log.type === 'food') {
        document.getElementById('food-name').value = log.name;
        document.getElementById('food-cals').value = log.cals || '';
    } else if (log.type === 'water') {
        document.getElementById('water-amount').value = log.amount;
    } else if (log.type === 'meds') {
        document.getElementById('med-name').value = log.name;
        document.getElementById('med-dosage').value = log.dosage;
    } else if (log.type === 'notes') {
        document.getElementById('note-text').value = log.text;
    }
};

// Initial Render on startup
renderLogs();
