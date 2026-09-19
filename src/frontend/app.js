const health = document.querySelector('#health');

try {
  const response = await fetch('/health');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (result.status !== 'ok') throw new Error('Backend is not healthy');
  health.textContent = `Backend ready · Revision: ${result.revision}`;
} catch {
  health.textContent = 'Backend unavailable. Check the terminal, then reload this page.';
}

// TODO: Add task interactions and timer state after agreeing the functional brief.
