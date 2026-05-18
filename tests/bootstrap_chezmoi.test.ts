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

    expect(macContent).toContain('Applying base dotfiles');
    expect(linuxContent).toContain('Applying base dotfiles');
  });

  it('checks Xcode Command Line Tools before macOS install work starts', () => {
    const content = fs.readFileSync(macBootstrapPath, 'utf-8');
    const callIndex = content.indexOf('\nensure_xcode_command_line_tools\n');

    expect(content).toContain('ensure_xcode_command_line_tools()');
    expect(content).toContain('xcode-select -p');
    expect(callIndex).toBeGreaterThan(-1);
    expect(callIndex).toBeLessThan(content.indexOf('# Ask for install location'));
    expect(callIndex).toBeLessThan(content.indexOf('# Create directory if it doesn\'t exist'));
    expect(callIndex).toBeLessThan(content.indexOf('# Ensure Git is installed'));
    expect(callIndex).toBeLessThan(content.indexOf('# Install Homebrew if not present'));
  });

  it('does not expose legacy bootstrap modes', () => {
    const macContent = fs.readFileSync(macBootstrapPath, 'utf-8');
    const linuxContent = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    expect(macContent).not.toContain('--legacy-chezmoi');
    expect(linuxContent).not.toContain('--legacy-chezmoi');
    expect(macContent).not.toContain('--legacy-stow');
    expect(linuxContent).not.toContain('--legacy-stow');
  });

  it('documents chezmoi as the default bootstrap path', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('default bootstrap applies the chezmoi-managed source state');
    expect(content).toContain('chezmoi-managed');
    expect(content).not.toContain('legacy stow');
  });
});
