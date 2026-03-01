import { afterEach, describe, expect, it } from "vitest";
import { fetchAdapter } from "../../src/adapters/fetch-adapter";
import { localStorageAdapter } from "../../src/adapters/local-storage-adapter";
import { memoryAdapter } from "../../src/adapters/memory-adapter";
import type { ClickmapAdapter } from "../../src/types";
import { createEvent } from "../fixtures";

interface AdapterCase {
  name: string;
  create: () => ClickmapAdapter;
  cleanup?: () => void;
}

const adapterCases: AdapterCase[] = [
  {
    name: "memoryAdapter",
    create: () => memoryAdapter(),
  },
  {
    name: "localStorageAdapter",
    create: () => localStorageAdapter({ key: "react-clickmap:test-contract" }),
    cleanup: () => window.localStorage.removeItem("react-clickmap:test-contract"),
  },
  {
    name: "fetchAdapter",
    create: () =>
      fetchAdapter({
        endpoint: "/api/clickmap",
        fetchImpl: async (_url, init) => {
          if (init?.method === "GET") {
            return new Response(
              JSON.stringify({ events: [createEvent({ pathname: "/contract" })] }),
              {
                status: 200,
                headers: { "content-type": "application/json" },
              },
            );
          }

          if (init?.method === "DELETE") {
            return new Response(JSON.stringify({ deleted: 1 }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }

          return new Response(null, { status: 200 });
        },
      }),
  },
];

afterEach(() => {
  window.localStorage.removeItem("react-clickmap:test-contract");
});

describe("adapter contract", () => {
  for (const adapterCase of adapterCases) {
    it(`${adapterCase.name} supports save/load/delete contract shape`, async () => {
      const adapter = adapterCase.create();

      await adapter.save([
        createEvent({ pathname: "/contract", timestamp: 1_000 }),
        createEvent({ pathname: "/other", timestamp: 2_000 }),
      ]);

      const loaded = await adapter.load({ page: "/contract" });
      expect(Array.isArray(loaded)).toBe(true);

      if (adapter.deleteEvents) {
        const deleted = await adapter.deleteEvents({ page: "/contract" });
        expect(typeof deleted).toBe("number");
      }

      if (adapter.capabilities) {
        expect(typeof adapter.capabilities.supportsAggregation).toBe("boolean");
        expect(typeof adapter.capabilities.supportsRetention).toBe("boolean");
        expect(typeof adapter.capabilities.supportsIdempotency).toBe("boolean");
      }

      adapterCase.cleanup?.();
    });
  }
});
