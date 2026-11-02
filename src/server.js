import { createApp } from './app.js';
import { getConfig } from './config/env.js';
import { getPool } from './database/pool.js';

const config = getConfig();
const server = createApp().listen(config.port, () => console.log(`BookVerse API listening on :${config.port}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, async () => { server.close(); await getPool().end(); process.exit(0); });
