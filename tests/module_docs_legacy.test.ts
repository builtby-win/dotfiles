import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('module docs reflect chezmoi default and legacy stow modules', () => {
  const tmuxDoc = path.resolve(__dirname, '../docs/modules/tmux.md');
  const nvimDoc = path.resolve(__dirname, '../docs/modules/nvim.md');
  const hammerspoonDoc = path.resolve(__dirname, '../docs/modules/hammerspoon.md');
  const karabinerDoc = path.resolve(__dirname, '../docs/modules/karabiner.md');
  const ghosttyDoc = path.resolve(__dirname, '../docs/modules/ghostty.md');

  it('marks tmux as a legacy stow module install', () => {
    const content = fs.readFileSync(tmuxDoc, 'utf-8');
    expect(content).toContain('Legacy module install');
  });

  it('marks nvim as a legacy stow module install', () => {
    const content = fs.readFileSync(nvimDoc, 'utf-8');
    expect(content).toContain('Legacy module install');
  });

  it('marks hammerspoon as a legacy stow module install', () => {
    const content = fs.readFileSync(hammerspoonDoc, 'utf-8');
    expect(content).toContain('Legacy module install');
  });

  it('marks karabiner as a legacy stow module install', () => {
    const content = fs.readFileSync(karabinerDoc, 'utf-8');
    expect(content).toContain('Legacy module install');
  });

  it('marks ghostty as a legacy stow module install', () => {
    const content = fs.readFileSync(ghosttyDoc, 'utf-8');
    expect(content).toContain('Legacy module install');
  });
});
