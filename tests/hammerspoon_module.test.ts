import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf-8');
}

describe('Hammerspoon module wiring', () => {
  it('includes stowable Hammerspoon config files', () => {
    const expectedFiles = [
      'stow-packages/hammerspoon/.hammerspoon/init.lua',
      'stow-packages/hammerspoon/.hammerspoon/modules/app_launcher.lua',
      'stow-packages/hammerspoon/.hammerspoon/modules/ghostty.lua',
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(repoRoot, file))).toBe(true);
    }
  });

  it('defines hyper app launcher and Ghostty 4-pane hotkey', () => {
    const initLua = readRepoFile('stow-packages/hammerspoon/.hammerspoon/init.lua');
    expect(initLua).toContain("hyper = { 'ctrl', 'alt', 'cmd', 'shift' }");
    expect(initLua).toContain("hs.hotkey.bind(hyper, 'space', appLauncher.show)");
    expect(initLua).toContain("hs.hotkey.bind(hyper, '4', ghostty.fourPane)");
  });

  it('adds hammerspoon to setup.ts app and config catalogs', () => {
    const setupTs = readRepoFile('setup.ts');
    expect(setupTs).toContain('value: "hammerspoon"');
    expect(setupTs).toContain('brewName: "hammerspoon"');
    expect(setupTs).toContain('{ name: "Hammerspoon", value: "hammerspoon"');
    expect(setupTs).toContain('hammerspoon: [".hammerspoon/init.lua"]');
  });

  it('exposes bb setup hammerspoon helper command', () => {
    const functionsSh = readRepoFile('shell/functions.sh');
    expect(functionsSh).toContain('bb setup hammerspoon');
    expect(functionsSh).toContain('hammerspoon)');
  });
});
