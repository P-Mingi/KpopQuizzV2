import { describe, expect, it } from 'vitest';

import { isPublicAddress, isPublicIPv4, isPublicIPv6, parseIPv6 } from './ssrf';

describe('isPublicIPv4', () => {
  it.each([
    '8.8.8.8', '1.1.1.1', '93.184.216.34', '151.101.1.69', '172.15.255.255', '172.32.0.1', '11.0.0.1', '100.63.255.255', '100.128.0.1', '169.253.1.1', '192.167.1.1', '198.17.0.1', '198.20.0.1',
  ])('allows the public address %s', (ip) => expect(isPublicIPv4(ip)).toBe(true));

  it.each([
    '0.0.0.0', '0.1.2.3', '10.0.0.1', '10.255.255.255', '100.64.0.1', '100.127.255.255', '127.0.0.1', '127.255.255.254', '169.254.169.254', '172.16.0.1', '172.31.255.255',
    '192.0.0.1', '192.0.2.5', '192.168.0.1', '192.168.255.255', '198.18.0.1', '198.19.255.255', '198.51.100.7', '203.0.113.9', '224.0.0.1', '239.255.255.250', '240.0.0.1', '255.255.255.255',
  ])('refuses the private, loopback, link-local, multicast or reserved address %s', (ip) => expect(isPublicIPv4(ip)).toBe(false));

  it('refuses text that is not a dotted address', () => {
    for (const bad of ['', 'localhost', '1.2.3', '1.2.3.4.5', '256.1.1.1', '1.2.3.-4', '0x7f.0.0.1']) expect(isPublicIPv4(bad)).toBe(false);
  });
});

describe('isPublicIPv6', () => {
  it.each(['2606:4700:4700::1111', '2001:4860:4860::8888', '2a00:1450:4001:81b::200e', '2620:fe::fe'])('allows the global unicast address %s', (ip) => expect(isPublicIPv6(ip)).toBe(true));

  it.each([
    '::', '::1', '0:0:0:0:0:0:0:1', 'fe80::1', 'fe80::a00:27ff:fe4e:66a1', 'fc00::1', 'fd12:3456:789a::1', 'fec0::1', 'ff02::1', 'ff00::',
    '2001:db8::1', '2001::1', '2001:1::1', '2001:10::1', '2002:7f00:1::1', '2002:c0a8:101::1', '64:ff9b::7f00:1', '64:ff9b::a00:1', '100::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1',
    '::ffff:7f00:1', '::ffff:a9fe:a9fe', '::127.0.0.1', '3fff::1', '5f00::1', 'fe80::1%eth0', ':::', '1::2::3', 'g::1',
  ])('refuses the loopback, private, link-local, multicast, mapped-private or reserved address %s', (ip) => expect(isPublicIPv6(ip)).toBe(false));

  it('judges an IPv4-mapped and a NAT64 address by the IPv4 inside', () => {
    expect(isPublicIPv6('::ffff:8.8.8.8')).toBe(true);
    expect(isPublicIPv6('::ffff:808:808')).toBe(true);
    expect(isPublicIPv6('64:ff9b::808:808')).toBe(true);
  });

  it('parses compressed forms', () => {
    expect(parseIPv6('::1')).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(parseIPv6('2001:db8::ff00:42:8329')).toEqual([0x2001, 0xdb8, 0, 0, 0, 0xff00, 0x42, 0x8329]);
    expect(parseIPv6('::ffff:1.2.3.4')).toEqual([0, 0, 0, 0, 0, 0xffff, 0x102, 0x304]);
    expect(parseIPv6('1:2:3:4:5:6:7')).toBeNull();
  });
});

describe('isPublicAddress', () => {
  it('routes by family and refuses anything that is not an address', () => {
    expect(isPublicAddress('8.8.8.8')).toBe(true);
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
    expect(isPublicAddress('127.0.0.1')).toBe(false);
    expect(isPublicAddress('::1')).toBe(false);
    expect(isPublicAddress('example.com')).toBe(false);
    expect(isPublicAddress('')).toBe(false);
  });
});
