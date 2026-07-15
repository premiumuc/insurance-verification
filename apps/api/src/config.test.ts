import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from './config.js';

describe('config safety guards', () => {
  it('accepts local auth in development', () => {
    const cfg = loadConfig({ NODE_ENV: 'development', AUTH_MODE: 'local' });
    expect(cfg.AUTH_MODE).toBe('local');
  });

  it('REFUSES local auth in production (exits)', () => {
    // loadConfig calls process.exit(1) on invalid config; assert it does.
    const exit = vi.spyOn(process, 'exit').mockImplementation(((): never => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => loadConfig({ NODE_ENV: 'production', AUTH_MODE: 'local' })).toThrow('exit');
    expect(exit).toHaveBeenCalledWith(1);
    exit.mockRestore();
    err.mockRestore();
  });

  it('requires Cognito settings when AUTH_MODE=cognito', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(((): never => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      loadConfig({ NODE_ENV: 'production', AUTH_MODE: 'cognito' }),
    ).toThrow('exit');
    exit.mockRestore();
    err.mockRestore();
  });

  it('accepts a complete cognito production config', () => {
    const cfg = loadConfig({
      NODE_ENV: 'production',
      AUTH_MODE: 'cognito',
      AWS_REGION: 'us-east-1',
      COGNITO_USER_POOL_ID: 'us-east-1_abc',
      COGNITO_CLIENT_ID: 'client123',
    });
    expect(cfg.AUTH_MODE).toBe('cognito');
  });
});
