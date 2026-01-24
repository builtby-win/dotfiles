import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows Package Manifest (packages.json)', () => {
  const manifestPath = path.resolve(__dirname, '../windows/packages.json');

  it('should exist', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  it('should contain the core required tools', () => {
    const content = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const required = [
      'Starship.Starship',
      'ajeetdsouza.zoxide',
      'junegunn.fzf',
      'BurntSushi.ripgrep.MSVC',
      'sharkdp.bat',
      'eza-community.eza',
      'Schniz.fnm',
      'gerardog.gsudo',
      'Git.Git',
      'Neovim.Neovim',
      'Anysphere.Cursor'
    ];
    
    expect(content.packages).toEqual(expect.arrayContaining(required));
  });
});
