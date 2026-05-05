import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('chezmoi source tree', () => {
  const chezmoiDir = path.resolve(__dirname, '../chezmoi');
  const zshEntryPath = path.resolve(__dirname, '../chezmoi/create_dot_zshrc.tmpl');
  const dotfilesPathTemplate = path.resolve(__dirname, '../chezmoi/dot_config/dotfiles/path.tmpl');
  const applyScriptPath = path.resolve(__dirname, '../scripts/apply-chezmoi.sh');

  it('adds a dedicated chezmoi source directory', () => {
    expect(fs.existsSync(chezmoiDir)).toBe(true);
  });

  it('defines a create-only zsh entrypoint in chezmoi source', () => {
    expect(fs.existsSync(zshEntryPath)).toBe(true);
    expect(fs.existsSync(path.resolve(__dirname, '../chezmoi/dot_zshrc.tmpl'))).toBe(false);
  });

  it('defines the dotfiles path file in chezmoi source', () => {
    expect(fs.existsSync(dotfilesPathTemplate)).toBe(true);
  });

  it('covers platform-specific and helper outputs in chezmoi source', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../chezmoi/dot_config/ghostty/config'))).toBe(true);
    expect(fs.existsSync(path.resolve(__dirname, '../chezmoi/Library/Application Support/com.mitchellh.ghostty/config'))).toBe(true);
    expect(fs.existsSync(path.resolve(__dirname, '../chezmoi/dot_local/bin/executable_tmux-smart'))).toBe(true);
    expect(fs.existsSync(path.resolve(__dirname, '../chezmoi/dot_config/tmux/executable_sesh-picker.sh'))).toBe(true);
  });

  it('keeps Ghostty Catppuccin flavor consistent across platform paths', () => {
    const xdgGhosttyConfig = fs.readFileSync(path.resolve(__dirname, '../chezmoi/dot_config/ghostty/config'), 'utf-8');
    const macGhosttyConfig = fs.readFileSync(path.resolve(__dirname, '../chezmoi/Library/Application Support/com.mitchellh.ghostty/config'), 'utf-8');

    expect(xdgGhosttyConfig).toContain('theme = Catppuccin Frappe');
    expect(macGhosttyConfig).toContain('theme = Catppuccin Frappe');
    expect(macGhosttyConfig).not.toContain('Catppuccin Mocha');
    expect(macGhosttyConfig).not.toContain('Catppuccin Latte');
  });

  it('keeps the chezmoi zsh entrypoint free of hardcoded user paths', () => {
    const content = fs.readFileSync(zshEntryPath, 'utf-8');
    expect(content).toContain('shell/init.sh');
    expect(content).not.toContain('/Users/winstonzhao');
    expect(content).not.toContain('.antigravity');
    expect(content).not.toContain('.opencode/bin');
  });

  it('removes legacy stow symlinks before applying chezmoi directly', () => {
    const content = fs.readFileSync(applyScriptPath, 'utf-8');
    expect(content).toContain('remove_legacy_stow_symlink "$HOME/.config/tmux"');
    expect(content).toContain('remove_legacy_stow_symlink "$HOME/.config/nvim"');
    expect(content).toContain('remove_legacy_stow_symlink "$HOME/.hammerspoon"');
    expect(content).toContain('remove_legacy_stow_symlink "$HOME/.local/bin/tmux-smart"');
    expect(content).toContain('rm "$target"');
    expect(content).not.toContain('rm -r "$target"');
  });
});
