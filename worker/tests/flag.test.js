import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;

describe('decorateProxyNames', () => {
  beforeEach(() => {
    mock.reset();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('adds a flag emoji for a known IP address', async () => {
    globalThis.fetch = mock.fn(async () =>
      Response.json({ country_code: 'US' })
    );

    const { decorateProxyNames } = await import('../dist/decorators/flag.js');
    const nameMap = await decorateProxyNames([
      { name: 'node-us', server: '65.49.220.243' },
    ]);

    assert.equal(nameMap.get('node-us'), '🇺🇸 node-us');
    assert.equal(globalThis.fetch.mock.calls.length, 1);
    assert.match(
      String(globalThis.fetch.mock.calls[0].arguments[0]),
      /^https:\/\/get\.geojs\.io\/v1\/ip\/geo\/65\.49\.220\.243\.json$/
    );
  });

  it('skips hostname lookups instead of calling geojs with a domain', async () => {
    globalThis.fetch = mock.fn(async () => {
      throw new Error('fetch failed');
    });

    const { decorateProxyNames } = await import('../dist/decorators/flag.js');
    const nameMap = await decorateProxyNames([
      { name: 'node-host', server: 'c19s1.portablesubmarines.com' },
    ]);

    assert.equal(nameMap.get('node-host'), 'node-host');
    assert.equal(globalThis.fetch.mock.calls.length, 0);
  });

  it('leaves names unchanged when geo lookup fails', async () => {
    globalThis.fetch = mock.fn(async () => {
      throw new Error('fetch failed');
    });

    const { decorateProxyNames } = await import('../dist/decorators/flag.js');
    const nameMap = await decorateProxyNames([
      { name: 'node-down', server: '8.8.8.8' },
    ]);

    assert.equal(nameMap.get('node-down'), 'node-down');
    assert.equal(globalThis.fetch.mock.calls.length, 1);
  });

  it('does not decorate names that already start with an emoji', async () => {
    globalThis.fetch = mock.fn(async () =>
      Response.json({ country_code: 'US' })
    );

    const { decorateProxyNames } = await import('../dist/decorators/flag.js');
    const nameMap = await decorateProxyNames([
      { name: '🇺🇸 already-decorated', server: '8.8.8.8' },
    ]);

    assert.equal(nameMap.get('🇺🇸 already-decorated'), '🇺🇸 already-decorated');
    assert.equal(globalThis.fetch.mock.calls.length, 0);
  });
});
