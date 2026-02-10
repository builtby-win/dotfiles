import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Linux bootstrap workflow', () => {
  const bootstrapPath = path.resolve(__dirname, '../bootstrap.sh');
  const linuxBootstrapPath = path.resolve(__dirname, '../bootstrap-linux.sh');
  const readmePath = path.resolve(__dirname, '../README.md');
  const setupPath = path.resolve(__dirname, '../setup.ts');

  it('has a dedicated Linux bootstrap script', () => {
    expect(fs.existsSync(linuxBootstrapPath)).toBe(true);
  });

  it('uses apt, dnf, and pacman in Linux bootstrap', () => {
    const content = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    expect(content).toContain('apt-get');
    expect(content).toContain('dnf');
    expect(content).toContain('pacman');
  });

  it('routes Linux installs through the Linux bootstrap script', () => {
    const content = fs.readFileSync(bootstrapPath, 'utf-8');
    expect(content).toContain('bootstrap-linux.sh');
    expect(content).toContain('linux');
  });

  it('documents a separate Linux install command', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('bootstrap-linux.sh');
  });

  it('uses Linux package manager logic in setup.ts', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('getLinuxPackageManager');
    expect(content).toContain('apt-get');
    expect(content).toContain('dnf');
    expect(content).toContain('pacman');
  });

  it('prompts before installing system dependencies', () => {
    const content = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    expect(content).toContain('Install required system packages (git, stow, curl)?');
    expect(content).toContain('ask_yes_no');
  });

  it('supports non-interactive mode with --yes', () => {
    const content = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    expect(content).toContain('--yes');
    expect(content).toContain('NON_INTERACTIVE=1');
  });

  it('installs pnpm without requiring system npm global directories', () => {
    const content = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    expect(content).toContain('corepack');
    expect(content).toContain('npm install -g pnpm --prefix "$HOME/.local"');
  });

  it('installs starship on Linux via official curl installer', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('starship", value: "starship"');
    expect(content).toContain('starship.rs');
    expect(content).toContain('platforms: { macos: true, linux: true, windows: false }');
    expect(content).toContain('const installerUrl = "https://starship.rs/install.sh"');
    expect(content).toContain('curl -sS https://starship.rs/install.sh | sh');
    expect(content).toContain('Cannot access ${installerUrl}');
    expect(content).not.toContain('dnf copr enable -y atim/starship');
    expect(content).not.toContain('cargo install starship --locked');
  });

  it('keeps unsupported Linux GUI app suggestions out of setup defaults', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('value: "vscode"');
    expect(content).toContain('value: "ghostty"');
    expect(content).toContain('platforms: { macos: true, linux: false, windows: false }');
  });

  it('offers shell switch from bash to zsh on Linux', () => {
    const content = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    expect(content).toContain('Switch your default shell to zsh for this dotfiles setup?');
    expect(content).toContain('chsh -s');
    expect(content).toContain('install_linux_packages zsh');
  });

  it('installs fnm via official curl installer with URL error message', () => {
    const content = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    expect(content).toContain('curl -fsSL https://fnm.vercel.app/install | bash');
    expect(content).toContain('Cannot access https://fnm.vercel.app/install');
    expect(content).not.toContain('fnm installed via ${LINUX_PKG_MANAGER}');
  });

  it('adds ~/.local/bin to shell PATH for user-installed tools', () => {
    const shellInitPath = path.resolve(__dirname, '../shell/init.sh');
    const content = fs.readFileSync(shellInitPath, 'utf-8');
    expect(content).toContain('$HOME/.local/bin');
  });
});
