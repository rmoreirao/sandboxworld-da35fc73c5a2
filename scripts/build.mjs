import { cp, mkdir, rm } from 'node:fs/promises';

const source = new URL('../src/frontend/', import.meta.url);
const destination = new URL('../src/backend/public/', import.meta.url);

export async function build() {
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
  console.log('Packaged src/frontend into src/backend/public.');
}

await build();
