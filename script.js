const calendarGrid = document.querySelector(".calendar-grid");
const monthTitle = document.getElementById("monthDisplay");
const taskInput = document.getElementById("taskInput");
const noteInput = document.getElementById("noteInput");
const taskList = document.getElementById("taskList");
const panelDateTitle = document.getElementById("panelDateTitle");
const appContainer = document.getElementById("app-container");
const globalSearch = document.getElementById("globalSearch");
const quickNotes = document.getElementById("quickNotes");
const saveStatus = document.getElementById("saveStatus");
const rightPanel = document.getElementById("rightPanel");

// Елементи авторизації
const authScreen = document.getElementById("auth-screen");
const usernameInput = document.getElementById("usernameInput");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Змінні стану
let currentUser = localStorage.getItem("flow_user") || null;
let tasksByDate = {}; 
let currentViewDate = new Date();
let selectedDateKey = formatDateKey(new Date());
let currentFilter = 'all'; 
let currentCategoryFilter = 'all'; 

const CATEGORY_NAMES = {
    home: 'Дім',
    work: 'Робота',
    other: 'Інше',
    none: ''
};

function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Функція ініціалізації при вході
function initApp() {
    if (currentUser) {
        authScreen.style.display = "none";
        appContainer.classList.remove("hidden");
        // Завантаження даних конкретного користувача
        tasksByDate = JSON.parse(localStorage.getItem(`tasks_${currentUser}`)) || {};
        quickNotes.value = localStorage.getItem(`notes_${currentUser}`) || "";
        updateGlobalStats();
        renderCalendar();
        renderTasks();
    } else {
        authScreen.style.display = "flex";
        appContainer.classList.add("hidden");
    }
}

function save() {
    if (currentUser) {
        // Збереження завдань конкретного користувача
        localStorage.setItem(`tasks_${currentUser}`, JSON.stringify(tasksByDate));
        updateGlobalStats();
    }
}

// --- АВТОРИЗАЦІЯ ---
loginBtn.addEventListener("click", () => {
    const user = usernameInput.value.trim();
    if (user) {
        currentUser = user;
        localStorage.setItem("flow_user", user);
        initApp();
    }
});

logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("flow_user");
    location.reload(); 
});

// --- ЗАМЕТКИ ---
quickNotes.addEventListener("input", () => {
    if (!currentUser) return;
    saveStatus.textContent = "Друкує...";
    saveStatus.classList.add("saving");
    localStorage.setItem(`notes_${currentUser}`, quickNotes.value);
    setTimeout(() => {
        saveStatus.textContent = "Збережено";
        saveStatus.classList.remove("saving");
    }, 800);
});

// --- НАВІГАЦІЯ ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const pageId = btn.getAttribute('data-page');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
        document.getElementById(`${pageId}-view`).classList.add('active');

        if (pageId === 'all-tasks') {
            appContainer.classList.add('all-tasks-mode');
            rightPanel.classList.remove('hidden-panel');
            renderSmartFeed();
        } else {
            appContainer.classList.remove('all-tasks-mode');
            rightPanel.classList.add('hidden-panel');
        }
    });
});

// --- ПОШУК ТА ФІЛЬТРИ КАТЕГОРІЙ ---
globalSearch.addEventListener('input', () => {
    renderSmartFeed(globalSearch.value.toLowerCase());
});

document.querySelectorAll('.cat-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategoryFilter = btn.getAttribute('data-cat');
        renderSmartFeed(globalSearch.value.toLowerCase());
    });
});

function updateGlobalStats() {
    let total = 0;
    Object.values(tasksByDate).forEach(dayTasks => total += dayTasks.length);
    const el = document.getElementById("global-total-count");
    if(el) el.textContent = total;
}

// --- SMART FEED ---
function renderSmartFeed(searchTerm = "") {
    const feedContainer = document.getElementById("smartFeed");
    feedContainer.innerHTML = "";
    const sortedDates = Object.keys(tasksByDate).sort();
    let currentMonthHeader = "";

    const filteredDates = sortedDates.filter(dateKey => {
        const tasks = tasksByDate[dateKey];
        return tasks.some(t => {
            const matchesSearch = t.text.toLowerCase().includes(searchTerm) || (t.note && t.note.toLowerCase().includes(searchTerm));
            const matchesCat = currentCategoryFilter === 'all' || t.category === currentCategoryFilter;
            return matchesSearch && matchesCat;
        });
    });

    filteredDates.forEach(dateKey => {
        const dateObj = new Date(dateKey);
        const monthYear = dateObj.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
        
        if (monthYear !== currentMonthHeader) {
            currentMonthHeader = monthYear;
            const divider = document.createElement("div");
            divider.className = "month-divider";
            divider.textContent = currentMonthHeader;
            feedContainer.appendChild(divider);
        }

        const tasksCount = tasksByDate[dateKey].filter(t => {
            const matchesCat = currentCategoryFilter === 'all' || t.category === currentCategoryFilter;
            return matchesCat;
        }).length;

        if (tasksCount === 0) return;

        const card = document.createElement("div");
        card.className = `feed-card ${dateKey === selectedDateKey ? 'active-card' : ''}`;
        card.innerHTML = `
            <div class="feed-card-date">
                <span class="day-info">${dateObj.toLocaleDateString('uk-UA', { weekday: 'long' })}, ${dateObj.getDate()}</span>
                <span class="month-info">${dateObj.toLocaleDateString('uk-UA', { month: 'long' })}</span>
            </div>
            <div class="feed-card-count">${tasksCount} задач</div>
        `;
        card.addEventListener('click', () => {
            selectedDateKey = dateKey;
            renderTasks(); renderCalendar();
            document.querySelectorAll('.feed-card').forEach(c => c.classList.remove('active-card'));
            card.classList.add('active-card');
        });
        feedContainer.appendChild(card);
    });
}

// --- РЕДАКТИРОВАНИЕ ---
window.editTask = (idx, spanElement) => {
    const currentText = spanElement.textContent;
    const input = document.createElement("input");
    input.className = "edit-task-input";
    input.value = currentText;
    spanElement.replaceWith(input);
    input.focus();
    const saveEdit = () => {
        const nt = input.value.trim();
        if (nt) tasksByDate[selectedDateKey][idx].text = nt;
        save(); renderTasks();
    };
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', e => { if(e.key==='Enter') saveEdit(); });
};

window.editNote = (idx, noteElement) => {
    const currentNote = noteElement.textContent === 'Додати замітку...' ? '' : noteElement.textContent;
    const input = document.createElement("input");
    input.className = "edit-note-input";
    input.value = currentNote;
    noteElement.replaceWith(input);
    input.focus();
    const saveNote = () => {
        tasksByDate[selectedDateKey][idx].note = input.value.trim();
        save(); renderTasks();
    };
    input.addEventListener('blur', saveNote);
    input.addEventListener('keydown', e => { if(e.key==='Enter') saveNote(); });
};

// --- КАЛЕНДАРЬ ---
function renderCalendar() {
    calendarGrid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    monthTitle.textContent = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(currentViewDate);
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const shift = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < shift; i++) calendarGrid.appendChild(document.createElement("div"));
    for (let d = 1; d <= daysInMonth; d++) {
        const key = formatDateKey(new Date(year, month, d));
        const dayEl = document.createElement("div");
        dayEl.className = "day";
        dayEl.textContent = d;
        if (key === formatDateKey(new Date())) dayEl.classList.add("today");
        if (key === selectedDateKey) dayEl.classList.add("active-day");
        if (tasksByDate[key]?.length > 0) dayEl.classList.add("has-tasks");
        dayEl.addEventListener("click", () => { selectedDateKey = key; renderCalendar(); renderTasks(); });
        calendarGrid.appendChild(dayEl);
    }
}

// --- СПИСОК ЗАДАЧ ---
function renderTasks() {
    taskList.innerHTML = "";
    let tasks = tasksByDate[selectedDateKey] || [];
    panelDateTitle.textContent = new Date(selectedDateKey).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });

    let filtered = tasks;
    if (currentFilter === 'pending') filtered = tasks.filter(t => !t.completed);
    if (currentFilter === 'completed') filtered = tasks.filter(t => t.completed);

    filtered.forEach((task) => {
        const realIdx = tasks.indexOf(task);
        const div = document.createElement("div");
        div.className = `task ${task.completed ? 'completed' : ''}`;
        const noteText = task.note || (task.completed ? '' : 'Додати замітку...');
        
        const catLabel = task.category && task.category !== 'none' 
            ? `<span class="task-cat-tag cat-${task.category}">${CATEGORY_NAMES[task.category]}</span>` 
            : '';

        div.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${realIdx})">
                <div class="task-text-group">
                    <div class="task-main-row">
                        <span ondblclick="editTask(${realIdx}, this)">${task.text}</span>
                        ${catLabel}
                    </div>
                    <div class="task-note" ondblclick="event.stopPropagation(); editNote(${realIdx}, this)">${noteText}</div>
                </div>
            </div>
            <button class="delete-btn" onclick="deleteTask(${realIdx})">&times;</button>
        `;
        taskList.appendChild(div);
    });
    updateProgress();
}

function updateProgress() {
    const all = tasksByDate[selectedDateKey] || [];
    const done = all.filter(t => t.completed).length;
    document.querySelector(".progress-fill").style.width = (all.length === 0 ? 0 : (done/all.length)*100) + "%";
    document.querySelector(".progress-text").textContent = `${done} з ${all.length} задач`;
    document.getElementById("stat-total").textContent = all.length;
    document.getElementById("stat-pending").textContent = all.length - done;
    document.getElementById("stat-completed").textContent = done;
}

window.toggleTask = idx => { tasksByDate[selectedDateKey][idx].completed = !tasksByDate[selectedDateKey][idx].completed; save(); renderTasks(); };
window.deleteTask = idx => { 
    tasksByDate[selectedDateKey].splice(idx, 1); 
    if(!tasksByDate[selectedDateKey].length) delete tasksByDate[selectedDateKey];
    save(); renderTasks(); renderCalendar();
};

document.getElementById("addTaskBtn").addEventListener("click", () => {
    const val = taskInput.value.trim();
    const nVal = noteInput.value.trim();
    const catVal = document.querySelector('input[name="cat"]:checked').value;
    if (!val) return;
    if (!tasksByDate[selectedDateKey]) tasksByDate[selectedDateKey] = [];
    tasksByDate[selectedDateKey].push({ 
        text: val, 
        note: nVal, 
        category: catVal,
        completed: false 
    });
    taskInput.value = ""; noteInput.value = "";
    document.querySelector('input[name="cat"][value="none"]').checked = true;
    save(); renderTasks(); renderCalendar();
});

document.getElementById("prevMonth").addEventListener("click", () => { currentViewDate.setMonth(currentViewDate.getMonth()-1); renderCalendar(); });
document.getElementById("nextMonth").addEventListener("click", () => { currentViewDate.setMonth(currentViewDate.getMonth()+1); renderCalendar(); });

document.querySelectorAll('.filter-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.filter-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        currentFilter = card.getAttribute('data-filter');
        renderTasks();
    });
});

// Запуск ініціалізації
initApp();