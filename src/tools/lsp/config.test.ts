import { afterAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { join } from 'node:path';
import { findServerForExtension, isServerInstalled } from './config';

describe('config', () => {
  const existsSyncSpy = spyOn(fs, 'existsSync');
  const homedirSpy = spyOn(os, 'homedir').mockReturnValue(
    '/home/user' as never,
  );

  beforeEach(() => {
    existsSyncSpy.mockReset();
    existsSyncSpy.mockReturnValue(false);
  });

  describe('isServerInstalled', () => {
    test('should return false if command is empty', () => {
      expect(isServerInstalled([])).toBe(false);
    });

    test('should detect absolute paths', () => {
      existsSyncSpy.mockImplementation(
        (path: any) => path === '/usr/bin/lsp-server',
      );
      expect(isServerInstalled(['/usr/bin/lsp-server'])).toBe(true);
      expect(isServerInstalled(['/usr/bin/missing'])).toBe(false);
    });

    test('should detect server in PATH', () => {
      const originalPath = process.env.PATH;
      process.env.PATH = '/usr/local/bin:/usr/bin';

      existsSyncSpy.mockImplementation(
        (path: any) => path === join('/usr/bin', 'typescript-language-server'),
      );

      expect(isServerInstalled(['typescript-language-server'])).toBe(true);

      process.env.PATH = originalPath;
    });

    test('should detect server in local node_modules', () => {
      const cwd = process.cwd();
      const localBin = join(
        cwd,
        'node_modules',
        '.bin',
        'typescript-language-server',
      );

      existsSyncSpy.mockImplementation((path: any) => path === localBin);

      expect(isServerInstalled(['typescript-language-server'])).toBe(true);
    });

    test('should detect server in global opencode bin', () => {
      const globalBin = join(
        '/home/user',
        '.config',
        'opencode',
        'bin',
        'typescript-language-server',
      );

      existsSyncSpy.mockImplementation((path: any) => path === globalBin);

      expect(isServerInstalled(['typescript-language-server'])).toBe(true);
    });
  });

  describe('findServerForExtension', () => {
    test('should return found for .ts extension if installed', () => {
      existsSyncSpy.mockReturnValue(true);
      const result = findServerForExtension('.ts');
      expect(result.status).toBe('found');
      if (result.status === 'found') {
        expect(result.server.id).toBe('typescript');
      }
    });

    test('should return found for .py extension if installed (prefers basedpyright)', () => {
      existsSyncSpy.mockReturnValue(true);
      const result = findServerForExtension('.py');
      expect(result.status).toBe('found');
      if (result.status === 'found') {
        expect(result.server.id).toBe('basedpyright');
      }
    });

    test('should return not_configured for unknown extension', () => {
      const result = findServerForExtension('.unknown');
      expect(result.status).toBe('not_configured');
    });

    test('should return not_installed if server not in PATH', () => {
      existsSyncSpy.mockReturnValue(false);
      const result = findServerForExtension('.ts');
      expect(result.status).toBe('not_installed');
      if (result.status === 'not_installed') {
        expect(result.server.id).toBe('typescript');
        expect(result.installHint).toContain(
          'npm install -g typescript-language-server',
        );
      }
    });
  });

  afterAll(() => {
    existsSyncSpy.mockRestore();
    homedirSpy.mockRestore();
  });
});
