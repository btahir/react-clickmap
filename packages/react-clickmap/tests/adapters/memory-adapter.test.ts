import { describe, expect, it } from 'vitest';
import { memoryAdapter } from '../../src/adapters/memory-adapter';
import { createEvent } from '../fixtures';

describe('memoryAdapter', () => {
  it('saves and loads events by query', async () => {
    const adapter = memoryAdapter();

    await adapter.save([
      createEvent({ pathname: '/pricing', timestamp: 1000 }),
      createEvent({ pathname: '/signup', timestamp: 2000 })
    ]);

    const pricingEvents = await adapter.load({ page: '/pricing' });
    expect(pricingEvents).toHaveLength(1);
    expect(pricingEvents[0]?.pathname).toBe('/pricing');

    const recent = await adapter.load({ from: 1500 });
    expect(recent).toHaveLength(1);
    expect(recent[0]?.pathname).toBe('/signup');
  });

  it('supports limit filtering', async () => {
    const adapter = memoryAdapter();

    await adapter.save([
      createEvent({ timestamp: 1000 }),
      createEvent({ timestamp: 2000 }),
      createEvent({ timestamp: 3000 })
    ]);

    const limited = await adapter.load({ limit: 2 });
    expect(limited).toHaveLength(2);
    expect(limited[0]?.timestamp).toBe(2000);
    expect(limited[1]?.timestamp).toBe(3000);
  });
});
