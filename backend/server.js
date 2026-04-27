import app from './app.js';
import { env } from './config/env.js';
import { initializeStore } from './models/store.js';

await initializeStore();

app.listen(env.port, () => {
  console.log(`Backend running at http://localhost:${env.port}`);
});
