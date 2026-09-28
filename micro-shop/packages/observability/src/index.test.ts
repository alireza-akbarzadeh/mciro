import { describe, expect, it, vi } from 'vitest';
import { addLogSink, createLogger, type LogEntry } from './index';

describe('logger', () => {
  it('prefixes console output with the app name', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    createLogger('orders').info('order created', { orderId: '1005' });

    expect(info).toHaveBeenCalledWith('[orders] order created', { orderId: '1005' });
    info.mockRestore();
  });

  it('sends structured entries to every sink, tagged with the app', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const entries: LogEntry[] = [];
    const remove = addLogSink((entry) => entries.push(entry));

    createLogger('shipping').error('remote failed', { remote: 'orders' });
    remove();
    createLogger('shipping').error('after removal');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ app: 'shipping', level: 'error', message: 'remote failed' });
  });

  it('never lets a broken sink break the app that logs', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const remove = addLogSink(() => {
      throw new Error('sink is down');
    });

    expect(() => createLogger('auth').warn('still fine')).not.toThrow();
    remove();
  });
});
