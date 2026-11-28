import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { installApps } from '../lib/app-install';

describe.skipIf(process.platform !== 'darwin')('installApps with a fake brew', () => {
  it('invokes brew install --cask for a missing cask and reports the failure', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fakebrew-'));
    const log = path.join(dir, 'calls.log');
    fs.writeFileSync(
      path.join(dir, 'brew'),
      `#!/bin/bash\necho "$@" >> "${log}"\ncase "$1 $2" in "list --cask") exit 1;; esac\n[ "$1" = install ] && exit 1\nexit 0\n`,
      { mode: 0o755 },
    );
    const oldPath = process.env.PATH;
    process.env.PATH = `${dir}:${oldPath}`;
    try {
      const failed = await installApps(['vicinae']);
      expect(failed).toEqual(['Vicinae']);
      expect(fs.readFileSync(log, 'utf-8')).toContain('install --cask vicinae');
    } finally {
      process.env.PATH = oldPath;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
