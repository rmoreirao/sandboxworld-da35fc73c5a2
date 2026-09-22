const taskForm = document.querySelector('#task-form');
const taskTitle = document.querySelector('#task-title');
const taskList = document.querySelector('#task-list');
const taskMessage = document.querySelector('#task-message');
const countdown = document.querySelector('#countdown');
const startTimer = document.querySelector('#start-timer');
const pauseTimer = document.querySelector('#pause-timer');
const resetTimer = document.querySelector('#reset-timer');

const FOCUS_DURATION_SECONDS = 25 * 60;
let tasks = [];
let remainingSeconds = FOCUS_DURATION_SECONDS;
let timerInterval;
let timerEndTime;

function showMessage(message) {
  taskMessage.textContent = message;
}

function renderTasks() {
  taskList.replaceChildren();
  for (const task of tasks) {
    const listItem = document.createElement('li');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => updateTask(task.id, checkbox.checked));
    label.append(checkbox, document.createTextNode(task.title));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', `Delete ${task.title}`);
    deleteButton.addEventListener('click', () => deleteTask(task.id));

    listItem.classList.toggle('completed', task.completed);
    listItem.append(label, deleteButton);
    taskList.append(listItem);
  }
}

async function request(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Unable to update tasks.');
  }
  return response.status === 204 ? null : response.json();
}

async function loadTasks() {
  try {
    const loadedTasks = await request('/api/tasks');
    tasks = Array.isArray(loadedTasks) ? loadedTasks : [];
    renderTasks();
  } catch {
    showMessage('Tasks are unavailable. Reload to try again.');
  }
}

async function addTask(title) {
  const task = await request('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  tasks.push(task);
  renderTasks();
}

async function updateTask(id, completed) {
  try {
    const task = await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
    tasks = tasks.map((currentTask) => currentTask.id === id ? task : currentTask);
    renderTasks();
  } catch (error) {
    showMessage(error.message);
    renderTasks();
  }
}

async function deleteTask(id) {
  try {
    await request(`/api/tasks/${id}`, { method: 'DELETE' });
    tasks = tasks.filter((task) => task.id !== id);
    renderTasks();
  } catch (error) {
    showMessage(error.message);
  }
}

function renderTimer() {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  countdown.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  startTimer.setAttribute('aria-disabled', String(Boolean(timerInterval) || remainingSeconds === 0));
  pauseTimer.setAttribute('aria-disabled', String(!timerInterval));
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = undefined;
  timerEndTime = undefined;
}

function updateCountdown() {
  if (!timerEndTime) return;
  remainingSeconds = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
  if (remainingSeconds === 0) stopTimer();
  renderTimer();
}

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = taskTitle.value.trim();
  if (!title) {
    showMessage('Enter a task title.');
    return;
  }

  try {
    await addTask(title);
    taskForm.reset();
    showMessage('');
    taskTitle.focus();
  } catch (error) {
    showMessage(error.message);
  }
});

startTimer.addEventListener('click', () => {
  if (timerInterval || remainingSeconds === 0) return;
  timerEndTime = Date.now() + (remainingSeconds * 1000);
  timerInterval = setInterval(updateCountdown, 250);
  renderTimer();
});
pauseTimer.addEventListener('click', () => {
  if (!timerInterval) return;
  updateCountdown();
  stopTimer();
  renderTimer();
});
resetTimer.addEventListener('click', () => {
  stopTimer();
  remainingSeconds = FOCUS_DURATION_SECONDS;
  renderTimer();
});

renderTimer();
loadTasks();
