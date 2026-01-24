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

  it('should contain logic to copy AI tool templates', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('templates/claude');
    expect(content).toContain('templates/cursor');
  });
});
