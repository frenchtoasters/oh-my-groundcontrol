import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A custom command bundled in this repository.
 * Copied from src/commands/ to ~/.config/opencode/command/ during install.
 */
export interface CustomCommand {
  /** Command name (filename without .md extension) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Source path in this repo (relative to project root) */
  sourcePath: string;
}

/**
 * Registry of custom commands bundled in this repository.
 */
export const CUSTOM_COMMANDS: CustomCommand[] = [
  {
    name: 'analyze',
    description:
      'Code review and analysis for uncommitted changes, commits, branches, PRs, or specific files',
    sourcePath: 'src/commands/analyze.md',
  },
];

/**
 * Get the target directory for custom command installation.
 */
export function getCustomCommandsDir(): string {
  return join(homedir(), '.config', 'opencode', 'command');
}

/**
 * Install a custom command by copying from src/commands/ to ~/.config/opencode/command/
 * @param command - The custom command to install
 * @returns True if installation succeeded, false otherwise
 */
export function installCustomCommand(command: CustomCommand): boolean {
  try {
    const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
    const sourcePath = join(packageRoot, command.sourcePath);
    const targetDir = getCustomCommandsDir();
    const targetPath = join(targetDir, `${command.name}.md`);

    // Validate source exists
    if (!existsSync(sourcePath)) {
      console.error(`Custom command source not found: ${sourcePath}`);
      return false;
    }

    // Ensure target directory exists
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // Copy command file
    copyFileSync(sourcePath, targetPath);

    return true;
  } catch (error) {
    console.error(`Failed to install custom command: ${command.name}`, error);
    return false;
  }
}
