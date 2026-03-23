---
name: commit-protocol
description: Write concise commit messages with required type(scope) prefix based on current changes and user input.
---

# Commit Protocol Skill

You enforce a strict, NASA-inspired "Traceability First" format for git commit messages.

## When to Use

**Always active.** You MUST use this exact format every time you create a git commit. 

## Protocol Template

All commits must exactly match the following structure. Pay strict attention to the character limits.

```
type(Component): <Brief, imperative summary under 50 chars>

Description:
<Brief 1-2 sentence explanation of why this change is necessary and what it accomplishes. Wrapped at 72 chars.>

Changes:
- <Change 1>
- <Change 2>

Traceability:
- Traces to: [Issue # / REQ ID / None]
```

### 1. Type
Must be one of the following:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries such as documentation generation

### 2. Component
The module or component being modified. 
- If modifying a specific component, use its name (e.g., `api`, `ui`, `auth`).
- If the commit spans multiple components or is repository-wide, use `(global)` or `(core)`.

### 3. Summary Line
- Must use imperative mood ("Add feature", not "Added feature").
- Must not end with a period.
- Must be strictly under 50 characters (including the `type(Component): ` prefix).

### 4. Description
- Explain *why* the change is necessary and *what* it accomplishes.
- Wrap text at 72 characters.

### 5. Changes
- A bulleted list of the specific technical changes made.

### 6. Traceability
- If resolving a specific issue or requirement, state it (e.g., `Issue #42` or `REQ-001`).
- If no specific tracking ID exists, state `None`.

## Examples

### Good Example
```
fix(auth): Prevent token leak on session timeout

Description:
The previous implementation kept the JWT in memory after the session 
timeout event fired, leaving a brief window where it could be extracted.

Changes:
- Cleared token state immediately on timeout event trigger
- Added test coverage for session expiry cleanup

Traceability:
- Traces to: Issue #128
```

### Bad Example (Do Not Do This)
```
Fixed a bug in the auth system where tokens were leaking

I went in and found that the JWT was staying in memory after the session timed out. I fixed it by clearing the state earlier. Also added some tests.
```
*(Reason: Missing type, component, description block, bulleted changes, traceability, and summary exceeds 50 chars).*
