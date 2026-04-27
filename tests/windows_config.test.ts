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
    expect(content).toContain('windows-binaries-$arch.zip');
    expect(content).toContain('kanata_windows_tty_winIOv2_$arch.exe');
    expect(content).toContain('windows/bin');
    expect(content).toContain('cargo install kanata');
    expect(content).toContain('.cargo/bin');
    expect(content).toContain('Install-KanataCli');
    expect(content).toContain('Cleaning Cargo cache and retrying once');
  });

  it('should initialize fnm and pnpm during install', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('Initialize-NodeSession');
    expect(content).toContain('fnm env --use-on-cd');
    expect(content).toContain('npm install -g pnpm');
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
