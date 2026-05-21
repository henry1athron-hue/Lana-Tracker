// Data Store: Grouped by Day
let dayLogs = JSON.parse(localStorage.getItem('groupedDayLogs')) || {};

// DOM Elements
const logContainer = document.getElementById('log-container');
const btnLogDay = document.getElementById('btn-log-day');
const loggingMenu = document.getElementById('logging-menu');
const btnCloseMenu = document.getElementById('btn-close-menu');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// --- UI Interactions ---

if (btnLogDay) {
    btnLogDay.addEventListener('click', () => {
        loggingMenu.classList.remove('hidden');
        btnLogDay.style.display = 'none';
        clearForms();
    });
}

if (btnCloseMenu) {
    btnCloseMenu.addEventListener('click', () => {
        loggingMenu.classList.add('hidden');
        btnLogDay.style.display = 'block';
        clearForms();
    });
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const target = document.getElementById(btn.getAttribute('data-tab'));
        if (target) target.classList.add('active');
    });
});

// --- Data Management ---

function saveLog(type, data, editItemId = null, targetDateKey = null) {
    const now = new Date();
    // Use the existing date key if editing, otherwise generate today's date key (YYYY-MM-DD)
    const dateKey = targetDateKey || now.toISOString().split('T')[0];
    
    // Initialize the day if it doesn't exist
    if (!dayLogs[dateKey]) {
        dayLogs[dateKey] = {
            dateStr: now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }),
            items: []
        };
    }

    if (editItemId && editItemId !== "") {
        // Find and update existing item within that specific day
        const itemIndex = dayLogs[dateKey].items.findIndex(item => item.id === editItemId);
        if (itemIndex > -1) {
            dayLogs[dateKey].items[itemIndex] = {
                ...dayLogs[dateKey].items[itemIndex],
                ...data,
                editedAt: now.toISOString()
            };
        }
    } else {
        // Create a new individual entry timestamped to right now
        const newItem = {
            id: Date.now().toString(),
            type: type,
            createdAt: now.toISOString(),
            editedAt: null,
            ...data
        };
        dayLogs[dateKey].items.push(newItem);
    }

    // Sort items inside the day so the newest events appear at the top of the day's timeline
    dayLogs[dateKey].items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    persistAndRender();
    if (btnCloseMenu) btnCloseMenu.click();
}

function persistAndRender() {
    localStorage.setItem('groupedDayLogs', JSON.stringify(dayLogs));
    renderLogs();
}

function clearForms() {
    ['food', 'meds', 'notes'].forEach(type => {
        const form = document.getElementById(`form-${type}`);
        if (form) form.reset();
        
        const editIdInput = document.getElementById(`edit-id-${type}`);
        if (editIdInput) editIdInput.value = '';
        
        const dateKeyInput = document.getElementById(`${type}-date-key`);
        if (dateKeyInput) dateKeyInput.value = '';
    });
}

// Form Submit Listeners
const formFood = document.getElementById('form-food');
if (formFood) {
    formFood.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('edit-id-food').value;
        const dateKey = document.getElementById('food-date-key').value;
        saveLog('food', {
            name: document.getElementById('food-name').value,
            cals: document.getElementById('food-cals').value
        }, editId, dateKey);
    });
}

const formMeds = document.getElementById('form-meds');
if (formMeds) {
    formMeds.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('edit-id-meds').value;
        const dateKey = document.getElementById('meds-date-key').value;
        saveLog('meds', {
            name: document.getElementById('med-name').value,
            dosage: document.getElementById('med-dosage').value
        }, editId, dateKey);
    });
}

const formNotes = document.getElementById('form-notes');
if (formNotes) {
    formNotes.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('edit-id-notes').value;
        const dateKey = document.getElementById('notes-date-key').value;
        saveLog('notes', {
            text: document.getElementById('note-text').value
        }, editId, dateKey);
    });
}

// --- Rendering ---

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderLogs() {
    if (!logContainer) return;
    logContainer.innerHTML = '';
    
    // Get sorted array of dates (newest calendar days first)
    const sortedDateKeys = Object.keys(dayLogs).sort((a, b) => new Date(b) - new Date(a));

    if (sortedDateKeys.length === 0) {
        logContainer.innerHTML = '<p style="text-align:center; color:#777; margin-top:2rem;">No entries logged yet.</p>';
        return;
    }

    sortedDateKeys.forEach(dateKey => {
        const dayData = dayLogs[dateKey];
        if (!dayData || !dayData.items || dayData.items.length === 0) return; 

        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        
        const foodCount = dayData.items.filter(i => i.type === 'food').length;
        const medsCount = dayData.items.filter(i => i.type === 'meds').length;
        const notesCount = dayData.items.filter(i => i.type === 'notes').length;

        dayCard.innerHTML = `
            <div class="day-header" onclick="toggleDayCollapse('${dateKey}')">
                <div class="day-title-container">
                    <span class="arrow-icon" id="arrow-${dateKey}">▶</span>
                    <h3 class="day-title">${dayData.dateStr}</h3>
                </div>
                <div class="day-badges">
                    ${foodCount ? `<span>🍏 ${foodCount}</span>` : ''}
                    ${medsCount ? `<span>💊 ${medsCount}</span>` : ''}
                    ${notesCount ? `<span>📝 ${notesCount}</span>` : ''}
                </div>
            </div>
            <div class="day-content hidden" id="content-${dateKey}">
                <div class="timeline-container">
                    ${dayData.items.map(item => buildItemHTML(item, dateKey)).join('')}
                </div>
                <button class="delete-day-btn" onclick="deleteEntireDay('${dateKey}')">Delete Entire Day</button>
            </div>
        `;
        logContainer.appendChild(dayCard);
    });
}

function buildItemHTML(item, dateKey) {
    let title = '';
    let body = '';
    
    if (item.type === 'food') {
        title = `🍏 ${item.name}`;
        body = item.cals ? `${item.cals} Calories` : 'Logged';
    } else if (item.type === 'meds') {
        title = `💊 ${item.name}`;
        body = `Dosage: ${item.dosage}`;
    } else if (item.type === 'notes') {
        title = `📝 General Note`;
        body = item.text;
    }

    const editStamp = item.editedAt ? `<span class="item-edited"> (Edited ${formatTime(item.editedAt)})</span>` : '';

    return `
        <div class="timeline-item ${item.type}">
            <div class="item-meta">
                <span class="item-time">${formatTime(item.createdAt)}</span>
                ${editStamp}
            </div>
            <div class="item-title">${title}</div>
            <div class="item-body">${body}</div>
            <div class="item-actions">
                <button class="action-link edit-link" onclick="event.stopPropagation(); editItem('${dateKey}', '${item.id}')">Edit</button>
                <button class="action-link delete-link" onclick="event.stopPropagation(); deleteItem('${dateKey}', '${item.id}')">Delete</button>
            </div>
        </div>
    `;
}

// --- Accordion Logic ---

window.toggleDayCollapse = function(dateKey) {
    const content = document.getElementById(`content-${dateKey}`);
    const arrow = document.getElementById(`arrow-${dateKey}`);
    
    if (content && content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        if (arrow) arrow.style.transform = 'rotate(90deg)';
    } else if (content) {
        content.classList.add('hidden');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    }
};

// --- Operations inside Dropdowns ---

window.deleteItem = function(dateKey, itemId) {
    if (confirm('Remove this item from the day?')) {
        dayLogs[dateKey].items = dayLogs[dateKey].items.filter(item => item.id !== itemId);
        if (dayLogs[dateKey].items.length === 0) {
            delete dayLogs[dateKey];
        }
        persistAndRender();
    }
};

window.deleteEntireDay = function(dateKey) {
    if (confirm(`Are you completely sure you want to clear all data for this day?`)) {
        delete dayLogs[dateKey];
        persistAndRender();
    }
};

window.editItem = function(dateKey, itemId) {
    const day = dayLogs[dateKey];
    if (!day) return;
    const item = day.items.find(i => i.id === itemId);
    if (!item) return;

    if (btnLogDay) btnLogDay.click(); // Open menu view
    
    if (item.type === 'food') {
        const tab = document.querySelector('[data-tab="tab-food"]');
        if (tab) tab.click();
        document.getElementById('edit-id-food').value = item.id;
        document.getElementById('food-date-key').value = dateKey;
        document.getElementById('food-name').value = item.name;
        document.getElementById('food-cals').value = item.cals || '';
    } else if (item.type === 'meds') {
        const tab = document.querySelector('[data-tab="tab-meds"]');
        if (tab) tab.click();
        document.getElementById('edit-id-meds').value = item.id;
        document.getElementById('meds-date-key').value = dateKey;
        document.getElementById('med-name').value = item.name;
        document.getElementById('med-dosage').value = item.dosage;
    } else if (item.type === 'notes') {
        const tab = document.querySelector('[data-tab="tab-notes"]');
        if (tab) tab.click();
        document.getElementById('edit-id-notes').value = item.id;
        document.getElementById('notes-date-key').value = dateKey;
        document.getElementById('note-text').value = item.text;
    }
};

// Startup initialization
renderLogs();

// --- Accordion Logic ---

window.toggleDayCollapse = function(dateKey) {
    const content = document.getElementById(`content-${dateKey}`);
    const arrow = document.getElementById(`arrow-${dateKey}`);
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        arrow.style.transform = 'rotate(90deg)';
    } else {
        content.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
    }
};

// --- Operations inside Dropdowns ---

window.deleteItem = function(dateKey, itemId) {
    if (confirm('Remove this item from the day?')) {
        dayLogs[dateKey].items = dayLogs[dateKey].items.filter(item => item.id !== itemId);
        // Clean up empty days entirely
        if (dayLogs[dateKey].items.length === 0) {
            delete dayLogs[dateKey];
        }
        persistAndRender();
