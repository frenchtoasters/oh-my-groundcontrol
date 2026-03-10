/**
 * Validate that opencodeConfig.enabled_providers exactly matches
 * the plugin's allowedProviders list.
 *
 * @returns null if valid, or an error message string if mismatched.
 */
export function validateAllowedProviders(
  allowedProviders: string[] | undefined,
  enabledProviders: string[] | undefined,
): string | null {
  if (!allowedProviders || allowedProviders.length === 0) {
    return null;
  }

  const allowed = [...allowedProviders].sort();
  const actual = [...(enabledProviders ?? [])].sort();

  if (JSON.stringify(allowed) !== JSON.stringify(actual)) {
    return [
      '[oh-my-groundcontrol] FATAL: enabled_providers mismatch.',
      `  Expected: [${allowed.join(', ')}]`,
      `  Actual:   [${actual.join(', ')}]`,
      'Set "enabled_providers" in opencode.jsonc to match allowedProviders.',
    ].join('\n');
  }

  return null;
}
