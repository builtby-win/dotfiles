import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows optional setup', () => {
  const setupPath = path.resolve(__dirname, '../setup-windows.ts');

  it('keeps recommended defaults selected when a tool is not installed', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('checked: choice.checked || isInstalled(choice)');
  });

  it('recommends Claude Code and OpenCode and detects the standalone Claude executable', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('value: "claude", command: "claude.exe", checked: true');
    expect(content).toContain('value: "opencode", command: "opencode.cmd", checked: true');
  });
});
