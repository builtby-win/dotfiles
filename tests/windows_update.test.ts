import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows update flow', () => {
  const updatePath = path.resolve(__dirname, '../windows/update.ps1');

  it('should exist', () => {
    expect(fs.existsSync(updatePath)).toBe(true);
  });

  it('should pull, install dependencies, and reapply install script', () => {
    const content = fs.readFileSync(updatePath, 'utf-8');
    expect(content).toContain('git pull --rebase --autostash');
    expect(content).toContain('pnpm install --silent');
    expect(content).toContain('windows/install.ps1');
    expect(content).toContain('. (Join-Path $dotfilesDir "windows/install.ps1")');
  });
});
