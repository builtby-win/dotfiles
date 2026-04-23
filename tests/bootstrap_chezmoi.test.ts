import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('chezmoi-first bootstrap contract', () => {
  const macBootstrapPath = path.resolve(__dirname, '../bootstrap.sh');
  const linuxBootstrapPath = path.resolve(__dirname, '../bootstrap-linux.sh');
  const readmePath = path.resolve(__dirname, '../README.md');

  it('installs chezmoi in the macOS bootstrap', () => {
    const content = fs.readFileSync(macBootstrapPath, 'utf-8');
    expect(content).toContain('install chezmoi');
  });

  it('installs chezmoi in the Linux bootstrap', () => {
    const content = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    expect(content).toContain('chezmoi');
  });

  it('uses chezmoi as the default no-flag bootstrap path', () => {
    const macContent = fs.readFileSync(macBootstrapPath, 'utf-8');
    const linuxContent = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    expect(macContent).toContain('Applying chezmoi base dotfiles');
    expect(linuxContent).toContain('Applying chezmoi base dotfiles');
  });

  it('supports an explicit legacy stow mode in both bootstrap scripts', () => {
    const macContent = fs.readFileSync(macBootstrapPath, 'utf-8');
    const linuxContent = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    expect(macContent).toContain('--legacy-stow');
    expect(linuxContent).toContain('--legacy-stow');
  });

  it('documents chezmoi as the default bootstrap path', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('default bootstrap applies the base chezmoi state');
    expect(content).toContain('legacy stow');
  });
});
