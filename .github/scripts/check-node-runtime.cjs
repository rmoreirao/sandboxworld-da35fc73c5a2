const { readFileSync } = require('node:fs');

const runtimes = JSON.parse(readFileSync(0, 'utf8'));
if (!Array.isArray(runtimes)) {
  throw new Error('Unexpected Azure runtime response: expected an array.');
}

const supported = runtimes.some(runtime => {
  const config = typeof runtime === 'string'
    ? runtime
    : runtime && runtime.os === 'Linux' && ['Active', 'Near', 'n/a'].includes(runtime.support)
      ? runtime.config
      : undefined;
  return typeof config === 'string' && /^node[|:]24-lts$/i.test(config);
});

if (!supported) {
  throw new Error(`Azure App Service did not report a supported Linux NODE|24-lts runtime. Reported runtimes: ${JSON.stringify(runtimes)}`);
}
console.log('Azure App Service reports a supported Linux NODE|24-lts runtime.');
