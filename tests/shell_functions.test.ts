import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('shell helper contract for chezmoi migration', () => {
  const functionsPath = path.resolve(__dirname, '../shell/functions.sh');

  it('adds a bb apply command for chezmoi base state', () => {
    const content = fs.readFileSync(functionsPath, 'utf-8');
    expect(content).toContain('bb apply');
    expect(content).toContain('chezmoi');
  });

  it('keeps bb setup aligned with guided setup vocabulary', () => {
    const content = fs.readFileSync(functionsPath, 'utf-8');
    expect(content).toContain('bb setup                Open guided setup to change apps, configs, or restore backups');
    expect(content).toContain('Apply one selected module intentionally');
    expect(content).not.toContain('stow -d');
  });

  it('teaches bb update to reapply chezmoi base state', () => {
    const content = fs.readFileSync(functionsPath, 'utf-8');
    expect(content).toContain('Reapplying base chezmoi state');
  });
});
