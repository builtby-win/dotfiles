import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows Bootstrap Script (install.ps1)', () => {
  const scriptPath = path.resolve(__dirname, '../windows/install.ps1');

  it('should exist', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  it('should contain winget check logic', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('winget');
  });

  it('should contain git installation logic', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toMatch(/git/i);
  });

  it('should contain repository cloning logic', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('dotfiles');
    expect(content).toContain('git clone');
  });
});
