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

  it('marks bb setup as the legacy setup path', () => {
    const content = fs.readFileSync(functionsPath, 'utf-8');
    expect(content).toContain('Legacy interactive setup');
    expect(content).toContain('legacy stow module install');
  });

  it('teaches bb update to reapply chezmoi base state', () => {
    const content = fs.readFileSync(functionsPath, 'utf-8');
    expect(content).toContain('Reapplying base chezmoi state');
  });
});
