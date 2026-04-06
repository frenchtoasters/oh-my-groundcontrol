import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from 'bun:test';
import * as fs from 'node:fs';
import { invalidatePackage } from './cache';

// Mock internal dependencies
mock.module('./constants', () => ({
  CACHE_DIR: '/mock/cache',
  PACKAGE_NAME: '@frenchtoastman/oh-my-groundcontrol',
  OLD_PACKAGE_NAME: 'oh-my-groundcontrol',
}));

mock.module('../../cli/config-manager', () => ({
  stripJsonComments: (s: string) => s,
}));

describe('auto-update-checker/cache', () => {
  let existsMock: ReturnType<typeof spyOn>;
  let readMock: ReturnType<typeof spyOn>;
  let writeMock: ReturnType<typeof spyOn>;
  let rmSyncMock: ReturnType<typeof spyOn>;

  beforeEach(() => {
    existsMock = spyOn(fs, 'existsSync').mockReturnValue(false);
    readMock = spyOn(fs, 'readFileSync').mockReturnValue('');
    writeMock = spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    rmSyncMock = spyOn(fs, 'rmSync').mockImplementation(() => {});
  });

  afterEach(() => {
    existsMock.mockRestore();
    readMock.mockRestore();
    writeMock.mockRestore();
    rmSyncMock.mockRestore();
  });

  describe('invalidatePackage', () => {
    test('returns false when nothing to invalidate', () => {
      existsMock.mockReturnValue(false);

      const result = invalidatePackage();
      expect(result).toBe(false);
    });

    test('returns true and removes directory if node_modules path exists', () => {
      existsMock.mockImplementation((p: string) => p.includes('node_modules'));

      const result = invalidatePackage();

      expect(rmSyncMock).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('removes dependency from package.json if present', () => {
      existsMock.mockImplementation((p: string) => p.includes('package.json'));
      readMock.mockReturnValue(
        JSON.stringify({
          dependencies: {
            '@frenchtoastman/oh-my-groundcontrol': '1.0.0',
            'other-pkg': '1.0.0',
          },
        }),
      );

      const result = invalidatePackage();

      expect(result).toBe(true);
      const callArgs = writeMock.mock.calls[0];
      const savedJson = JSON.parse(callArgs[1]);
      expect(
        savedJson.dependencies['@frenchtoastman/oh-my-groundcontrol'],
      ).toBeUndefined();
      expect(savedJson.dependencies['other-pkg']).toBe('1.0.0');
    });
  });

  afterAll(() => {
    mock.restore();
  });
});
