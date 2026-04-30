import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf-8');
}

describe('manual download apps in setup CLI', () => {
  it('lists TypeWhisper, Cotypist, and Neru in setup.ts with install links', () => {
    const setupTs = readRepoFile('setup.ts');

    expect(setupTs).toContain('name: "TypeWhisper"');
    expect(setupTs).toContain('value: "typewhisper"');
    expect(setupTs).toContain('url: "https://www.typewhisper.com/en/"');
    expect(setupTs).toContain('name: "Cotypist"');
    expect(setupTs).toContain('value: "cotypist"');
    expect(setupTs).toContain('url: "https://cotypist.app/"');
    expect(setupTs).toContain('name: "Neru"');
    expect(setupTs).toContain('value: "neru"');
    expect(setupTs).toContain('brewName: "y3owk1n/tap/neru"');
    expect(setupTs).toContain('url: "https://github.com/y3owk1n/neru"');
  });

  it('shows manual download guidance for selected apps without Homebrew packages', () => {
    const setupTs = readRepoFile('setup.ts');

    expect(setupTs).toContain('Manual download required');
    expect(setupTs).toContain('Download these manually:');
  });
});
