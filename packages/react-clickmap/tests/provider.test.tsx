import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { memoryAdapter } from '../src/adapters/memory-adapter';
import { ClickmapProvider } from '../src/provider';
import { useClickmap } from '../src/use-clickmap';

function Probe(): JSX.Element {
  const clickmap = useClickmap();
  return <span data-testid="state">{clickmap.isCapturing ? 'on' : 'off'}</span>;
}

describe('ClickmapProvider', () => {
  it('captures pointer click events', async () => {
    const adapter = memoryAdapter();

    render(
      <ClickmapProvider adapter={adapter} capture={['click']} maxBatchSize={1} flushIntervalMs={50}>
        <Probe />
      </ClickmapProvider>
    );

    fireEvent.pointerUp(window, {
      button: 0,
      clientX: 120,
      clientY: 240,
      pointerType: 'mouse'
    });

    await waitFor(() => {
      expect(adapter.inspect().length).toBeGreaterThan(0);
    });

    expect(adapter.inspect()[0]?.type).toBe('click');
  });

  it('does not capture without consent when required', async () => {
    const adapter = memoryAdapter();

    render(
      <ClickmapProvider
        adapter={adapter}
        capture={['click']}
        maxBatchSize={1}
        consentRequired
        hasConsent={false}
      >
        <Probe />
      </ClickmapProvider>
    );

    fireEvent.pointerUp(window, {
      button: 0,
      clientX: 50,
      clientY: 50,
      pointerType: 'mouse'
    });

    await waitFor(() => {
      expect(adapter.inspect()).toHaveLength(0);
    });
  });
});
