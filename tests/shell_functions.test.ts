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

  it('keeps bb setup as a chezmoi-backed compatibility path', () => {
    const content = fs.readFileSync(functionsPath, 'utf-8');
    expect(content).toContain('bb setup                Apply chezmoi-managed dotfiles');
    expect(content).toContain('Compatibility alias for chezmoi apply');
    expect(content).not.toContain('stow -d');
  });

  it('teaches bb update to reapply chezmoi base state', () => {
    const content = fs.readFileSync(functionsPath, 'utf-8');
    expect(content).toContain('Reapplying base chezmoi state');
  });
});
