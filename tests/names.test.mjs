import { expect, test } from 'bun:test';
import { utilityName } from '../src/names.mjs';

test('utility names read as people search for them', () => {
  expect(utilityName('Cleveland Electric Illum Co')).toBe('Cleveland Electric Illuminating');
  expect(utilityName('Jersey Central Power & Lt Co')).toBe('Jersey Central Power & Light');
  expect(utilityName('City of San Antonio - (TX)')).toBe('City of San Antonio');
  expect(utilityName('Roughrider Electric Cooperativ')).toBe('Roughrider Electric Cooperative');
  expect(utilityName('Middle Tennessee E M C')).toBe('Middle Tennessee EMC');
  expect(utilityName('Duke Energy Carolinas, LLC')).toBe('Duke Energy Carolinas');
  expect(utilityName('The Toledo Edison Co')).toBe('Toledo Edison');
  expect(utilityName('Consolidated Edison Co-NY Inc')).toBe('Con Edison');
  expect(utilityName('Hawaiian Electric Co Inc')).toBe('Hawaiian Electric');
});
