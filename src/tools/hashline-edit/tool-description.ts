export const HASHLINE_EDIT_DESCRIPTION = `Surgical file editor using LINE#ID anchors from Read output.

## Workflow
1. Read file → output shows lines as \`LINE#ID|content\`
2. Pick operation: replace, append, prepend
3. Submit edits referencing LINE#ID anchors
4. Re-read after editing to get updated LINE#IDs

## Operations

### replace – Replace line(s)
- Single line: \`{op:"replace", pos:"LINE#ID", lines:"new content"}\`
- Range: \`{op:"replace", pos:"START#ID", end:"END#ID", lines:["line1","line2"]}\`
- Boundaries are inclusive; replaced with lines array

### append – Insert after
- After anchor: \`{op:"append", pos:"LINE#ID", lines:"inserted line"}\`
- End of file: \`{op:"append", lines:"appended line"}\` (no pos)

### prepend – Insert before
- Before anchor: \`{op:"prepend", pos:"LINE#ID", lines:"inserted line"}\`
- Start of file: \`{op:"prepend", lines:"prepended line"}\` (no pos)

## LINE#ID Format
\`LINE\` = 1-based line number, \`ID\` = 2-char hash from [ZPMQVRWSNKTXJBYH].
Example: \`42#VK\` → line 42 with hash VK.

## File Operations
- Delete file: \`{filePath:"...", delete:true}\`
- Rename/move: \`{filePath:"...", rename:"new/path", edits:[...]}\`
- Create file: unanchored append/prepend creates missing files

## Content Format
- \`lines\` accepts a string (one line) or string[] (multiple lines)
- Lines are split on real newlines in strings
- null or [] = delete the line(s)

## Rules
1. Keep edits minimal – only change what's needed
2. Preserve original formatting and indentation
3. Prefer append/prepend for insertions over replace
4. Don't submit no-op edits (replacement identical to original)
5. Use structural lines as anchors (function defs, class defs, etc.)
6. Never anchor to blank lines
7. Copy LINE#ID references exactly from Read output
8. Re-read file after hash mismatch errors`;
