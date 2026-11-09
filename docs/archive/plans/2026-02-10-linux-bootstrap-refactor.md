# Linux Bootstrap Refactor

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `bootstrap-linux.sh` a thin shim that just gets Node running, then let `setup.ts` handle all Linux package installation with proper interactive prompts and testable TypeScript logic.

**Architecture:** The bash script shrinks to ~80 lines: detect package manager, install git+curl+node+pnpm, clone repo, run `tsx setup.ts`. All Linux package installation logic (stow, zsh, starship, tmux, etc.) stays in `setup.ts` where it's already partially implemented. The package management functions in `setup.ts` get extracted into `lib/linux.ts` so they can be unit-tested with dependency injection.

**Tech Stack:** Bash (bootstrap shim), TypeScript (setup logic), Vitest (tests)

---

### Task 1: Extract Linux package management into `lib/linux.ts`

Move the Linux-specific functions out of `setup.ts` into a testable module with dependency injection.

**Files:**
- Create: `lib/linux.ts`
- Modify: `setup.ts` (re-export from lib/linux)
- Create: `tests/linux.test.ts`

**Step 1: Create `lib/linux.ts` with dependency injection**

Extract these functions from `setup.ts` into `lib/linux.ts`:
- `LinuxPackageManager` type
- `getLinuxPackageManager()` 
- `getLinuxPackageName()`
- `installLinuxPackages()`
- `getInstalledLinuxPackages()`
- `ensureLocalBinInPath()`

Add a `SystemCommands` interface for dependency injection:

```typescript
export interface SystemCommands {
  runCommand(cmd: string, silent?: boolean): boolean;
  getCommandOutput(cmd: string): string | null;
  commandExists(cmd: string): boolean;
}

export function createLinuxPackageManager(sys: SystemCommands) {
  // ... all the functions, using sys instead of execSync directly
}
```

**Step 2: Write tests for the extracted module**

```typescript
// tests/linux.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createLinuxPackageManager } from '../lib/linux';

function mockSystem(overrides: Partial<SystemCommands> = {}): SystemCommands {
  return {
    runCommand: vi.fn().mockReturnValue(true),
    getCommandOutput: vi.fn().mockReturnValue(null),
    commandExists: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

describe('Linux package manager detection', () => {
  it('detects apt when apt-get is available', () => {
    const sys = mockSystem({
      commandExists: vi.fn((cmd) => cmd === 'apt-get'),
    });
    const pm = createLinuxPackageManager(sys);
    expect(pm.detect()).toBe('apt');
  });

  it('detects dnf when dnf is available', () => { ... });
  it('detects pacman when pacman is available', () => { ... });
  it('returns null when no package manager found', () => { ... });
  it('prefers apt over dnf if both exist', () => { ... });
});

describe('installPackages', () => {
  it('runs apt-get update before first apt install', () => { ... });
  it('does not run apt-get update twice', () => { ... });
  it('uses correct flags for dnf', () => { ... });
  it('uses --noconfirm --needed for pacman', () => { ... });
  it('returns false when install command fails', () => { ... });
  it('skips empty package list', () => { ... });
});

describe('getLinuxPackageName', () => {
  it('returns override for known package', () => { ... });
  it('returns name as-is when no override exists', () => { ... });
});

describe('getInstalledPackages', () => {
  it('uses dpkg-query for apt', () => { ... });
  it('uses rpm -qa for dnf', () => { ... });
  it('uses pacman -Qq for pacman', () => { ... });
});
```

**Step 3: Run tests**

Run: `pnpm test -- tests/linux.test.ts`
Expected: All pass

**Step 4: Update `setup.ts` to import from `lib/linux.ts`**

Replace the inline functions in `setup.ts` with imports from `lib/linux.ts`. The `setup.ts` creates a concrete `SystemCommands` using `execSync` and passes it in.

**Step 5: Run full test suite**

Run: `pnpm test`
Expected: All pass (existing tests still work)

**Step 6: Commit**

```bash
git add lib/linux.ts tests/linux.test.ts setup.ts
git commit -m "refactor: extract Linux package management into testable lib/linux.ts"
```

---

### Task 2: Extract Node/pnpm installation into `lib/node-setup.ts`

Move the Node.js and pnpm installation logic from bash into TypeScript so it can be tested and shared.

**Files:**
- Create: `lib/node-setup.ts`
- Create: `tests/node-setup.test.ts`

**Step 1: Create `lib/node-setup.ts`**

This module handles:
- Detecting if node/npm/pnpm are available
- Installing node via fnm (if available) or system package manager
- Installing pnpm via corepack → system package → npm fallback chain
- PNPM_HOME normalization for Linux

```typescript
export interface NodeSetupDeps {
  sys: SystemCommands;
  platform: 'linux' | 'macos';
  home: string;
  env: Record<string, string | undefined>;
  installLinuxPackages: (pkgs: string[]) => boolean;
}

export function createNodeSetup(deps: NodeSetupDeps) {
  return {
    ensurePnpmHome(): string | null { ... },
    installPnpm(): boolean { ... },
    installNode(): boolean { ... },
    ensureNodeAndPnpm(): boolean { ... },
  };
}
```

**Step 2: Write tests**

```typescript
describe('ensurePnpmHome', () => {
  it('uses XDG_DATA_HOME when set', () => { ... });
  it('defaults to ~/.local/share/pnpm', () => { ... });
  it('rejects macOS paths on Linux', () => { ... });
});

describe('installPnpm', () => {
  it('tries corepack first', () => { ... });
  it('falls back to package manager if corepack fails', () => { ... });
  it('falls back to npm --prefix if package manager fails', () => { ... });
  it('returns false if all methods fail', () => { ... });
  it('skips if pnpm already installed', () => { ... });
});

describe('installNode', () => {
  it('uses fnm when available', () => { ... });
  it('falls back to system package manager', () => { ... });
  it('skips if node already installed', () => { ... });
});
```

**Step 3: Run tests**

Run: `pnpm test -- tests/node-setup.test.ts`
Expected: All pass

**Step 4: Commit**

```bash
git add lib/node-setup.ts tests/node-setup.test.ts
git commit -m "feat: add testable Node/pnpm installation module"
```

---

### Task 3: Rewrite `bootstrap-linux.sh` as a thin shim

Gut the bash script down to the bare minimum needed to get `tsx setup.ts` running.

**Files:**
- Modify: `bootstrap-linux.sh`

**Step 1: Rewrite bootstrap-linux.sh**

The new script should be ~80 lines and do only:

1. Parse args (`-y`/`--yes`, `-h`/`--help`)
2. Detect package manager (apt/dnf/pacman)
3. Install git + curl if missing
4. Clone repo (or update if exists)
5. Install node via fnm curl installer (single method, not a fallback chain)
6. Install pnpm via corepack (single method)
7. Run `pnpm install --silent`
8. Exec into `tsx setup.ts --linux` (hand off everything else)

Remove from bash:
- `ensure_linux_pnpm_home` (moves to TypeScript)
- `install_pnpm_without_root` multi-fallback chain (simplify to corepack only)
- `ensure_zsh_available` / `maybe_switch_default_shell_to_zsh` (already in setup.ts)
- `ensure_node_and_pnpm` complex fallback (simplify)
- Step-by-step interactive prompts for what to install (setup.ts handles this)

Keep the `ask_yes_no` for the repo clone/update flow since that runs before TypeScript is available.

**Step 2: Verify it still works with existing tests**

The `tests/linux_bootstrap.test.ts` string-matching tests will need updates since the file content changed. Update them to match the new structure.

**Step 3: Run tests**

Run: `pnpm test`
Expected: All pass

**Step 4: Commit**

```bash
git add bootstrap-linux.sh tests/linux_bootstrap.test.ts
git commit -m "refactor: slim bootstrap-linux.sh to thin shim, delegate to setup.ts"
```

---

### Task 4: Add `--linux` flag to `setup.ts` for bootstrap handoff

When `bootstrap-linux.sh` hands off to `setup.ts`, it should run the full interactive flow including system package installation (stow, zsh, etc.) -- not just the app selection menu.

**Files:**
- Modify: `setup.ts`

**Step 1: Add a `--linux-bootstrap` flag**

When setup.ts is called with `--linux-bootstrap`, it runs a streamlined flow:
1. Detect what's already installed
2. Show interactive prompts for system packages (git, stow, curl, zsh)
3. Show interactive prompts for CLI tools (fzf, ripgrep, bat, eza, etc.)
4. Show interactive prompts for stow configs (zsh, tmux)
5. Offer to set zsh as default shell
6. Run the normal setup flow

This replaces the step-by-step `ask_yes_no` prompts that were in the bash script with the existing `@inquirer/prompts` interactive UI.

**Step 2: Write test**

```typescript
// In tests/linux_bootstrap.test.ts or new test file
describe('setup.ts --linux-bootstrap integration', () => {
  it('accepts --linux-bootstrap flag', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('--linux-bootstrap');
  });

  it('includes system dependency installation in bootstrap flow', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('installLinuxPackages');
    expect(content).toContain('ensureStowInstalled');
  });
});
```

**Step 3: Run tests**

Run: `pnpm test`
Expected: All pass

**Step 4: Commit**

```bash
git add setup.ts tests/linux_bootstrap.test.ts
git commit -m "feat: add --linux-bootstrap flag for full interactive Linux setup"
```

---

### Task 5: Add integration-style tests for Linux install functions

Replace the current string-matching tests with proper unit tests that exercise the actual logic through the dependency-injected interfaces.

**Files:**
- Modify: `tests/linux_bootstrap.test.ts`
- Create: `tests/linux-install-flows.test.ts`

**Step 1: Create `tests/linux-install-flows.test.ts`**

Test the full installation flows with mocked system commands:

```typescript
describe('Linux bootstrap flow', () => {
  it('installs starship via curl installer on all distros', () => {
    const sys = mockSystem({ ... });
    const pm = createLinuxPackageManager(sys);
    // Test that starship install uses curl, not package manager
  });

  it('handles missing sudo gracefully', () => { ... });
  it('handles network-unreachable gracefully for curl installers', () => { ... });
  it('installs stow as prerequisite for config linking', () => { ... });
  it('skips already-installed packages', () => { ... });
});

describe('Node setup on Linux', () => {
  it('full flow: fnm → node → corepack → pnpm', () => { ... });
  it('full flow without fnm: system node → corepack → pnpm', () => { ... });
  it('handles corepack not available', () => { ... });
});
```

**Step 2: Clean up `tests/linux_bootstrap.test.ts`**

Keep the structural tests that verify file presence and key patterns, but remove tests that were just checking for string content that moved. Update to match the new thin bootstrap script.

**Step 3: Run tests**

Run: `pnpm test`
Expected: All pass

**Step 4: Commit**

```bash
git add tests/linux_bootstrap.test.ts tests/linux-install-flows.test.ts
git commit -m "test: add proper unit tests for Linux install flows"
```

---

### Task 6: Update README and push

**Files:**
- Modify: `README.md`

**Step 1: Update Linux section in README**

Update the Linux install instructions to reflect the new flow. The one-liner `curl | bash` still works, but document that the bash script is just a shim that hands off to the interactive TypeScript setup.

**Step 2: Final test run**

Run: `pnpm test`
Expected: All pass

**Step 3: Commit and push**

```bash
git add README.md
git commit -m "docs: update Linux install docs for new bootstrap flow"
git push
```
