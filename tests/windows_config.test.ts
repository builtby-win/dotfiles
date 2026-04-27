import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows Configuration Linking (install.ps1)', () => {
  const scriptPath = path.resolve(__dirname, '../windows/install.ps1');

  it('should contain logic to copy starship configuration', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('starship.toml');
    expect(content).toContain('.config');
  });

  it('should contain logic to link Kanata configuration', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('kanata.kbd');
    expect(content).toContain('stow-packages/kanata');
  });

  it('should contain logic to install Kanata CLI', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('cargo install kanata');
    expect(content).toContain('.cargo/bin');
  });

  it('should contain logic to sync tmux config for psmux', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('stow-packages/tmux/.config/tmux');
    expect(content).toContain('.tmux.conf');
    expect(content).toContain('bootstrap.basic.conf');
  });

  it('should contain logic to copy AI tool templates', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('templates/claude');
    expect(content).toContain('templates/cursor');
  });
});
