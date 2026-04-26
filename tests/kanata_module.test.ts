import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Kanata module', () => {
  const configPath = path.resolve(__dirname, '../stow-packages/kanata/.config/kanata/kanata.kbd');
  const docsPath = path.resolve(__dirname, '../docs/modules/kanata.md');

  it('provides a shared Kanata config', () => {
    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('maps Menu to Hyper and j+k to tmux leader', () => {
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('(defsrc');
    expect(content).toContain('menu j k');
    expect(content).toContain('hyper (multi lctl lalt lsft lmet reverse-release-order)');
    expect(content).toContain('(j k) (macro C-b)');
  });

  it('documents app-scope limitations', () => {
    const content = fs.readFileSync(docsPath, 'utf-8');
    expect(content).toContain('strict app-aware behavior');
    expect(content).toContain('AutoHotkey only for Windows-only gaps');
  });
});
