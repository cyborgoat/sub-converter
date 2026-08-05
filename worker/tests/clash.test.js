import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildClashConfig } from '../dist/converters/clash.js';

function convert(entry) {
  return buildClashConfig('test', 'plain', 'utf-8', [entry]);
}

describe('Clash proxy conversion', () => {
  it('preserves required VLESS Reality fields', () => {
    const entry = [
      'vless://11111111-1111-4111-8111-111111111111@example.com:443',
      '?security=reality',
      '&encryption=none',
      '&flow=xtls-rprx-vision',
      '&type=tcp',
      '&sni=www.example.org',
      '&fp=chrome',
      '&pbk=public_key_value',
      '&sid=0123456789abcdef',
      '&packetEncoding=xudp',
      '#Reality%20Node',
    ].join('');

    const { config, skipped } = convert(entry);
    assert.equal(skipped, 0);
    assert.deepEqual(config.proxies[0], {
      name: 'Reality Node',
      type: 'vless',
      server: 'example.com',
      port: 443,
      uuid: '11111111-1111-4111-8111-111111111111',
      udp: true,
      tls: true,
      flow: 'xtls-rprx-vision',
      servername: 'www.example.org',
      'client-fingerprint': 'chrome',
      'packet-encoding': 'xudp',
      encryption: 'none',
      'reality-opts': {
        'public-key': 'public_key_value',
        'short-id': '0123456789abcdef',
      },
      network: 'tcp',
    });
  });

  it('converts VLESS WebSocket transport options', () => {
    const entry = [
      'vless://11111111-1111-4111-8111-111111111111@example.com:443',
      '?security=tls&type=ws&sni=cdn.example.com&host=edge.example.com',
      '&path=%2Fsocket&ed=2048&eh=Sec-WebSocket-Protocol',
      '#WS',
    ].join('');

    const { config, skipped } = convert(entry);
    assert.equal(skipped, 0);
    assert.equal(config.proxies[0].tls, true);
    assert.equal(config.proxies[0].network, 'ws');
    assert.deepEqual(config.proxies[0]['ws-opts'], {
      path: '/socket',
      headers: { Host: 'edge.example.com' },
      'max-early-data': 2048,
      'early-data-header-name': 'Sec-WebSocket-Protocol',
    });
  });

  it('converts VLESS gRPC and XHTTP transport options', () => {
    const grpc = convert(
      'vless://11111111-1111-4111-8111-111111111111@example.com:443' +
      '?security=tls&type=grpc&serviceName=my-service#grpc'
    ).config.proxies[0];
    assert.equal(grpc.network, 'grpc');
    assert.deepEqual(grpc['grpc-opts'], { 'grpc-service-name': 'my-service' });

    const xhttp = convert(
      'vless://11111111-1111-4111-8111-111111111111@example.com:443' +
      '?security=reality&type=xhttp&pbk=key&sid=&path=%2Fx&host=x.example&mode=stream-up#xhttp'
    ).config.proxies[0];
    assert.equal(xhttp.network, 'xhttp');
    assert.deepEqual(xhttp['xhttp-opts'], {
      path: '/x',
      host: 'x.example',
      mode: 'stream-up',
    });
    assert.deepEqual(xhttp['reality-opts'], {
      'public-key': 'key',
      'short-id': '',
    });
  });

  it('skips an incomplete Reality node with a safe diagnostic', () => {
    const entry =
      'vless://11111111-1111-4111-8111-111111111111@example.com:443' +
      '?security=reality&sni=example.org#missing-key';
    const { config, skipped, skippedDetails } = convert(entry);

    assert.equal(config.proxies.length, 0);
    assert.equal(skipped, 1);
    assert.deepEqual(skippedDetails, [{
      index: 1,
      scheme: 'vless',
      reason: 'VLESS Reality node is missing its public key',
    }]);
  });
});
