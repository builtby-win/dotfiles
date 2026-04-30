import { describe, it, expect } from 'vitest';
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
      'chezmoi/dot_hammerspoon/modules/app_launcher.lua',
      'chezmoi/dot_hammerspoon/modules/ghostty.lua',
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(repoRoot, file))).toBe(true);
    }
  });

  it('defines hyper app launcher and Ghostty 4-pane hotkey', () => {
    const initLua = readRepoFile('chezmoi/dot_hammerspoon/init.lua');
    expect(initLua).toContain("hyper = { 'ctrl', 'alt', 'cmd', 'shift' }");
    expect(initLua).toContain("hs.hotkey.bind(hyper, 'space', appLauncher.show)");
    expect(initLua).toContain("hs.hotkey.bind(hyper, '4', ghostty.fourPane)");
    expect(initLua).not.toContain('appLauncher.bindDirectShortcuts(hyper)');
  });

  it('keeps app launcher choices without direct Hyper app shortcuts', () => {
    const appLauncherLua = readRepoFile('chezmoi/dot_hammerspoon/modules/app_launcher.lua');
    expect(appLauncherLua).not.toContain('function M.bindDirectShortcuts(mods)');
    expect(appLauncherLua).not.toContain("subText = 'Hyper+'");
  });

  it('adds hammerspoon to setup.ts app and config catalogs', () => {
    const setupTs = readRepoFile('setup.ts');
    expect(setupTs).toContain('value: "hammerspoon"');
    expect(setupTs).toContain('brewName: "hammerspoon"');
    expect(setupTs).toContain('{ name: "Hammerspoon", value: "hammerspoon"');
    expect(setupTs).toContain('hammerspoon: [".hammerspoon"]');
  });

  it('exposes bb setup hammerspoon helper command', () => {
    const functionsSh = readRepoFile('shell/functions.sh');
    expect(functionsSh).toContain('bb setup hammerspoon');
    expect(functionsSh).toContain('all|shell|zsh|tmux|nvim|hammerspoon|karabiner|ghostty|kanata)');
    expect(functionsSh).toContain('bb setup ${module}: applying chezmoi-managed dotfiles.');
  });
});
