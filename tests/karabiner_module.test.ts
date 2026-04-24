import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf-8');
}

describe('Karabiner module wiring', () => {
  it('keeps a stowable Karabiner config in the repo', () => {
    expect(fs.existsSync(path.join(repoRoot, 'stow-packages/karabiner/.config/karabiner/karabiner.json'))).toBe(true);
  });

  it('supports both push and pull sync directions', () => {
    const script = readRepoFile('scripts/sync-karabiner.sh');
    expect(script).toContain('Usage: ./scripts/sync-karabiner.sh [push|pull]');
    expect(script).toContain('push_config()');
    expect(script).toContain('pull_config()');
    expect(script).toContain('Synced Karabiner -> dotfiles');
    expect(script).toContain('Synced dotfiles -> Karabiner');
  });

  it('exposes bb sync karabiner helper command', () => {
    const functionsSh = readRepoFile('shell/functions.sh');
    expect(functionsSh).toContain('bb sync karabiner');
    expect(functionsSh).toContain('Usage: bb sync <target> [push|pull]');
    expect(functionsSh).toContain('"$dotfiles_dir/scripts/sync-karabiner.sh" "$direction"');
  });

  it('documents how to import the live machine config', () => {
    const readme = readRepoFile('README.md');
    const docs = readRepoFile('docs/modules/karabiner.md');

    expect(readme).toContain('bb sync karabiner pull');
    expect(docs).toContain('./scripts/sync-karabiner.sh push');
    expect(docs).toContain('./scripts/sync-karabiner.sh pull');
    expect(docs).toContain('bb sync karabiner pull');
  });
});
