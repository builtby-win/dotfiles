import { describe, it, expect } from 'vitest';
import { readSetupSource } from './helpers/setup-source';
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf-8');
}

describe('Hammerspoon module wiring', () => {
  it('includes chezmoi-managed Hammerspoon config files', () => {
    const expectedFiles = [
      'chezmoi/dot_hammerspoon/init.lua',
      'chezmoi/dot_hammerspoon/builtby-init.lua',
      'chezmoi/dot_hammerspoon/modules/app_toggle.lua',
      'chezmoi/dot_hammerspoon/modules/workspaces.lua',
      'chezmoi/dot_hammerspoon/modules/ui.lua',
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(repoRoot, file))).toBe(true);
    }
  });

  it('drops the launcher, Hyper+Space and 4-pane bindings', () => {
    const initLua = readRepoFile('chezmoi/dot_hammerspoon/builtby-init.lua');
    expect(initLua).toContain("hyper = { 'ctrl', 'alt', 'cmd', 'shift' }");
    expect(initLua).not.toContain("'space'");
    expect(initLua).not.toContain('app_launcher');
    expect(initLua).not.toContain('fourPane');
    expect(initLua).toContain('workspaces.start()');
    expect(initLua).not.toContain('leader');
  });

  it('adds hammerspoon to setup.ts app and config catalogs', () => {
    const setupTs = readSetupSource();
    expect(setupTs).toContain('value: "hammerspoon"');
    expect(setupTs).toContain('brewName: "hammerspoon"');
    expect(setupTs).toContain('{ name: "Hammerspoon", value: "hammerspoon"');
    expect(setupTs).toContain('hammerspoon: [".hammerspoon"]');
  });

  it('exposes bb setup hammerspoon helper command', () => {
    const functionsSh = readRepoFile('shell/functions.sh');
    expect(functionsSh).toContain('bb setup hammerspoon');
    expect(functionsSh).toContain('all|shell|zsh|tmux|nvim|hammerspoon|karabiner|ghostty|iterm2)');
    expect(functionsSh).toContain('bb setup ${module}: applying chezmoi-managed dotfiles.');
  });
});
