import { buildApp } from './app.js';
import { loadConfig } from './config.js';

/** Process entrypoint: load config, build the app, listen. */
async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp(config);

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutting_down');
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch (err) {
    app.log.error({ err }, 'failed_to_start');
    process.exit(1);
  }
}

void main();
