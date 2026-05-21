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

function saveLog(type, data, editItemId = null, targetDateKey = null) {
    const now = new Date();
    // Generate a standardized key for the day (e.g., "2026-05-20")
    const dateKey = targetDateKey || now.toISOString().split('T')[0];
    
    // Initialize the day if it doesn't exist
    if (!dayLogs[dateKey]) {
        dayLogs[dateKey] = {
            dateStr: now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }),
            items: []
        };
    }

    if (editItemId) {
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
    btnCloseMenu.click();
}

function persistAndRender() {
    localStorage.setItem('groupedDayLogs', JSON.stringify(dayLogs));
    renderLogs();
}

function clearForms() {
    document.getElementById('form-food').reset();
    document.getElementById('edit-id-food').value = '';
    document.getElementById('food-date-key').value = '';
    
    document.getElementById('form-meds').reset();
    document.getElementById('edit-id-meds').value = '';
    document.getElementById('meds-date-key').value = '';
    
    document.getElementById('form-notes').reset();
    document.getElementById('edit-id-notes').value = '';
    document.getElementById('notes-date-key').value = '';
}

// Form Submit Listeners
document.getElementById('form-food').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id-food').value;
    const dateKey = document.getElementById('food-date-key').value;
    saveLog('food', {
        name: document.getElementById('food-name').value,
        cals: document.getElementById('food-cals').value
    }, editId, dateKey);
});

document.getElementById('form-meds').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id-meds').value;
    const dateKey = document.getElementById('meds-date-key').value;
    saveLog('meds', {
        name: document.getElementById('med-name').value,
        dosage: document.getElementById('med-dosage').value
    }, editId, dateKey);
});

document.getElementById('form-notes').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id-notes').value;
    const dateKey = document.getElementById('notes-date-key').value;
    saveLog('notes', {
        text: document.getElementById('note-text').value
    }, editId, dateKey);
});

// --- Rendering ---

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderLogs() {
    logContainer.innerHTML = '';
    
    // Get sorted array of dates (newest calendar days first)
    const sortedDateKeys = Object.keys(dayLogs).sort((a, b) => new Date(b) - new Date(a));

    if (sortedDateKeys.length === 0) {
        logContainer.innerHTML = '<p style="text-align:center; color:#777; margin-top:2rem;">No entries logged yet.</p>';
        return;
    }

    sortedDateKeys.forEach(dateKey => {
        const dayData = dayLogs[dateKey];
        if (dayData.items.length === 0) return; // Skip empty days if all items were deleted

        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        
        // Count entries for the badge preview
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
                <button class="action-link edit-link" onclick="editItem('${dateKey}', '${item.id}')">Edit</button>
                <button class="action-link delete-link" onclick="deleteItem('${dateKey}', '${item.id}')">Delete</button>
            </div>
        </div>
    `;
}

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
