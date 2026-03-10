import { describe, expect, test } from 'bun:test';
import { validateAllowedProviders } from './validate-providers';

describe('validateAllowedProviders', () => {
  describe('when allowedProviders is not set', () => {
    test('returns null when allowedProviders is undefined', () => {
      const result = validateAllowedProviders(undefined, [
        'openai',
        'anthropic',
      ]);
      expect(result).toBeNull();
    });

    test('returns null when allowedProviders is empty array', () => {
      const result = validateAllowedProviders([], ['openai', 'anthropic']);
      expect(result).toBeNull();
    });

    test('returns null when both are undefined', () => {
      const result = validateAllowedProviders(undefined, undefined);
      expect(result).toBeNull();
    });

    test('returns null when allowedProviders is empty and enabled is undefined', () => {
      const result = validateAllowedProviders([], undefined);
      expect(result).toBeNull();
    });
  });

  describe('when allowedProviders is set and matches', () => {
    test('returns null for exact match with single provider', () => {
      const result = validateAllowedProviders(
        ['groundcontrol'],
        ['groundcontrol'],
      );
      expect(result).toBeNull();
    });

    test('returns null for exact match with multiple providers', () => {
      const result = validateAllowedProviders(
        ['openai', 'anthropic'],
        ['openai', 'anthropic'],
      );
      expect(result).toBeNull();
    });

    test('returns null when providers match but in different order', () => {
      const result = validateAllowedProviders(
        ['anthropic', 'openai', 'google'],
        ['google', 'openai', 'anthropic'],
      );
      expect(result).toBeNull();
    });
  });

  describe('when allowedProviders is set and does NOT match', () => {
    test('returns error when enabled_providers is undefined', () => {
      const result = validateAllowedProviders(['groundcontrol'], undefined);
      expect(result).not.toBeNull();
      expect(result).toContain('FATAL');
      expect(result).toContain('enabled_providers mismatch');
      expect(result).toContain('groundcontrol');
    });

    test('returns error when enabled_providers is empty', () => {
      const result = validateAllowedProviders(['groundcontrol'], []);
      expect(result).not.toBeNull();
      expect(result).toContain('FATAL');
    });

    test('returns error when enabled has extra providers', () => {
      const result = validateAllowedProviders(
        ['openai'],
        ['openai', 'anthropic'],
      );
      expect(result).not.toBeNull();
      expect(result).toContain('Expected: [openai]');
      expect(result).toContain('Actual:   [anthropic, openai]');
    });

    test('returns error when enabled is missing providers', () => {
      const result = validateAllowedProviders(
        ['openai', 'anthropic'],
        ['openai'],
      );
      expect(result).not.toBeNull();
      expect(result).toContain('Expected: [anthropic, openai]');
      expect(result).toContain('Actual:   [openai]');
    });

    test('returns error when providers are completely different', () => {
      const result = validateAllowedProviders(['groundcontrol'], ['openai']);
      expect(result).not.toBeNull();
      expect(result).toContain('Expected: [groundcontrol]');
      expect(result).toContain('Actual:   [openai]');
    });

    test('returns error with helpful message to fix config', () => {
      const result = validateAllowedProviders(['groundcontrol'], ['openai']);
      expect(result).toContain('Set "enabled_providers" in opencode.jsonc');
    });
  });

  describe('edge cases', () => {
    test('handles duplicate entries in allowedProviders', () => {
      const result = validateAllowedProviders(
        ['openai', 'openai'],
        ['openai', 'openai'],
      );
      expect(result).toBeNull();
    });

    test('duplicate in allowed but not in enabled causes mismatch', () => {
      const result = validateAllowedProviders(['openai', 'openai'], ['openai']);
      expect(result).not.toBeNull();
    });

    test('handles many providers', () => {
      const providers = [
        'openai',
        'anthropic',
        'google',
        'github-copilot',
        'groundcontrol',
        'kimi-for-coding',
        'chutes',
        'opencode',
      ];
      const result = validateAllowedProviders(
        providers,
        [...providers].reverse(),
      );
      expect(result).toBeNull();
    });

    test('is case-sensitive', () => {
      const result = validateAllowedProviders(['OpenAI'], ['openai']);
      expect(result).not.toBeNull();
    });
  });
});
