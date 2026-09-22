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
    console.error(`Unable to load task data from ${tasksFile}: ${error.message}`);
    return [];
  }
}

let tasks = await loadTasks();
let taskMutationQueue = Promise.resolve();
function saveTasks(nextTasks) {
  const serializedTasks = JSON.stringify(nextTasks);
  return (async () => {
    await mkdir(dirname(tasksFile), { recursive: true });
    const temporaryFile = `${tasksFile}.${randomUUID()}.tmp`;
    await writeFile(temporaryFile, serializedTasks);
    await rename(temporaryFile, tasksFile);
  })();
}

function mutateTasks(mutation) {
  const queuedMutation = taskMutationQueue.then(async () => {
    const change = mutation(tasks);
    if (!change) return null;
    await saveTasks(change.tasks);
    tasks = change.tasks;
    return change.result;
  });
  taskMutationQueue = queuedMutation.catch(() => {});
  return queuedMutation;
}

function validateTitle(title) {
  if (typeof title !== 'string') return null;
  const trimmedTitle = title.trim();
  return trimmedTitle && trimmedTitle.length <= 200 ? trimmedTitle : null;
}

function isTaskId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= 64;
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
  try {
    const savedTask = await mutateTasks((currentTasks) => ({
      tasks: [...currentTasks, task],
      result: task,
    }));
    response.status(201).json(savedTask);
  } catch (error) {
    next(error);
  }
});
app.all('/api/tasks', (_request, response) => {
  response.set('Allow', 'GET, POST').status(405).json({ error: 'Method not allowed.' });
});

app.patch('/api/tasks/:id', async (request, response, next) => {
  if (!isTaskId(request.params.id) || typeof request.body?.completed !== 'boolean') {
    response.status(400).json({ error: 'A valid task ID and completed value are required.' });
    return;
  }

  try {
    const task = await mutateTasks((currentTasks) => {
      const taskIndex = currentTasks.findIndex(({ id }) => id === request.params.id);
      if (taskIndex === -1) return null;
      const updatedTask = { ...currentTasks[taskIndex], completed: request.body.completed };
      const updatedTasks = [...currentTasks];
      updatedTasks[taskIndex] = updatedTask;
      return { tasks: updatedTasks, result: updatedTask };
    });
    if (!task) {
      response.status(404).json({ error: 'Task not found.' });
      return;
    }
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

  try {
    const task = await mutateTasks((currentTasks) => {
      const taskIndex = currentTasks.findIndex(({ id }) => id === request.params.id);
      if (taskIndex === -1) return null;
      return {
        tasks: currentTasks.filter((_task, index) => index !== taskIndex),
        result: currentTasks[taskIndex],
      };
    });
    if (!task) {
      response.status(404).json({ error: 'Task not found.' });
      return;
    }
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});
app.all('/api/tasks/:id', (_request, response) => {
  response.set('Allow', 'PATCH, DELETE').status(405).json({ error: 'Method not allowed.' });
});

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'Not found.' });
});
app.use(express.static(publicRoot));
app.use((_request, response) => {
  response.status(404).type('text').send('Not found. Run npm run build before npm start.');
});
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
