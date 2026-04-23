import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('chezmoi source tree', () => {
  const chezmoiDir = path.resolve(__dirname, '../chezmoi');
  const zshEntryPath = path.resolve(__dirname, '../chezmoi/dot_zshrc.tmpl');
  const dotfilesPathTemplate = path.resolve(__dirname, '../chezmoi/dot_config/dotfiles/path.tmpl');

  it('adds a dedicated chezmoi source directory', () => {
    expect(fs.existsSync(chezmoiDir)).toBe(true);
  });

  it('defines a shared zsh entrypoint in chezmoi source', () => {
    expect(fs.existsSync(zshEntryPath)).toBe(true);
  });

  it('defines the dotfiles path file in chezmoi source', () => {
    expect(fs.existsSync(dotfilesPathTemplate)).toBe(true);
  });

  it('keeps the chezmoi zsh entrypoint free of hardcoded user paths', () => {
    const content = fs.readFileSync(zshEntryPath, 'utf-8');
    expect(content).toContain('shell/init.sh');
    expect(content).not.toContain('/Users/winstonzhao');
    expect(content).not.toContain('.antigravity');
    expect(content).not.toContain('.opencode/bin');
  });
});
