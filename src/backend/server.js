import express from 'express';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const publicRoot = fileURLToPath(new URL('./public/', import.meta.url));
const tasksFile = join(fileURLToPath(new URL('./data/', import.meta.url)), 'tasks.json');
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer from 1 to 65535.');
}

async function loadTasks() {
  try {
    const savedTasks = JSON.parse(await readFile(tasksFile, 'utf8'));
    if (!Array.isArray(savedTasks) || savedTasks.some((task) => (
      typeof task?.id !== 'string'
      || typeof task.title !== 'string'
      || typeof task.completed !== 'boolean'
    ))) {
      throw new Error('Task data is invalid.');
    }
    return savedTasks;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

let tasks = await loadTasks();
let writeQueue = Promise.resolve();
function saveTasks() {
  const serializedTasks = JSON.stringify(tasks);
  writeQueue = writeQueue.then(async () => {
    await mkdir(dirname(tasksFile), { recursive: true });
    const temporaryFile = `${tasksFile}.${randomUUID()}.tmp`;
    await writeFile(temporaryFile, serializedTasks);
    await rename(temporaryFile, tasksFile);
  });
  return writeQueue;
}

function validateTitle(title) {
  if (typeof title !== 'string') return null;
  const trimmedTitle = title.trim();
  return trimmedTitle && trimmedTitle.length <= 200 ? trimmedTitle : null;
}

function isTaskId(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

const app = express();
app.disable('x-powered-by');
app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '10kb' }));

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', revision: process.env.DEPLOYMENT_SHA || 'local' });
});

app.get('/api/tasks', (_request, response) => {
  response.json(tasks);
});

app.post('/api/tasks', async (request, response, next) => {
  const title = validateTitle(request.body?.title);
  if (!title) {
    response.status(400).json({ error: 'Task title must be non-empty and no more than 200 characters.' });
    return;
  }

  const task = { id: randomUUID(), title, completed: false };
  tasks.push(task);
  try {
    await saveTasks();
    response.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/tasks/:id', async (request, response, next) => {
  if (!isTaskId(request.params.id) || typeof request.body?.completed !== 'boolean') {
    response.status(400).json({ error: 'A valid task ID and completed value are required.' });
    return;
  }

  const task = tasks.find(({ id }) => id === request.params.id);
  if (!task) {
    response.status(404).json({ error: 'Task not found.' });
    return;
  }

  task.completed = request.body.completed;
  try {
    await saveTasks();
    response.json(task);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/tasks/:id', async (request, response, next) => {
  if (!isTaskId(request.params.id)) {
    response.status(400).json({ error: 'A valid task ID is required.' });
    return;
  }

  const taskIndex = tasks.findIndex(({ id }) => id === request.params.id);
  if (taskIndex === -1) {
    response.status(404).json({ error: 'Task not found.' });
    return;
  }

  tasks.splice(taskIndex, 1);
  try {
    await saveTasks();
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'Not found.' });
});
app.use(express.static(publicRoot));
app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    response.status(400).json({ error: 'Request body must be valid JSON.' });
    return;
  }
  console.error('Unable to process request:', error.message);
  response.status(500).json({ error: 'Unable to process this request.' });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Pomodoro app listening on port ${port}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
