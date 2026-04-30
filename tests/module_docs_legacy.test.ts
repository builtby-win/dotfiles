import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('module docs reflect chezmoi-managed modules', () => {
  const docs = [
    path.resolve(__dirname, '../docs/modules/tmux.md'),
    path.resolve(__dirname, '../docs/modules/nvim.md'),
    path.resolve(__dirname, '../docs/modules/hammerspoon.md'),
    path.resolve(__dirname, '../docs/modules/karabiner.md'),
    path.resolve(__dirname, '../docs/modules/ghostty.md'),
  ];

  it('documents module setup as chezmoi apply compatibility aliases', () => {
    for (const doc of docs) {
      const content = fs.readFileSync(doc, 'utf-8');
      expect(content).toContain('Chezmoi apply');
      expect(content).not.toContain('Legacy module install');
      expect(content).not.toContain('Manual stow');
    }
  });
});
