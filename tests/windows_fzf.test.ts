import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows PowerShell FZF Integration (init.ps1)', () => {
  const initPath = path.resolve(__dirname, '../windows/profile/init.ps1');

  it('should contain FZF keybinding configuration', () => {
    const content = fs.readFileSync(initPath, 'utf-8');
    expect(content).toContain('fzf');
    expect(content).toContain('Set-PSReadLineKeyHandler');
  });
});
