import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Linux bootstrap workflow', () => {
  const bootstrapPath = path.resolve(__dirname, '../bootstrap.sh');
  const linuxBootstrapPath = path.resolve(__dirname, '../bootstrap-linux.sh');
  const readmePath = path.resolve(__dirname, '../README.md');
  const setupPath = path.resolve(__dirname, '../setup.ts');
  const tipsPath = path.resolve(__dirname, '../shell/tips.txt');
  const shellInitPath = path.resolve(__dirname, '../shell/init.sh');

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

  it('supports non-interactive mode with --yes', () => {
    const content = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    expect(content).toContain('--yes');
    expect(content).toContain('NON_INTERACTIVE=1');
  });

  it('installs pnpm via corepack with npm fallback', () => {
    const content = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    expect(content).toContain('corepack enable');
    expect(content).toContain('corepack prepare pnpm@latest --activate');
    expect(content).toContain('npm install -g pnpm');
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

  it('falls back gracefully when Linux package manager is unavailable', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('Skipping ${name}: no supported Linux package manager and no curl installer is configured');
  });

  it('applies selected configs through chezmoi instead of direct symlink fallback', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('function applyChezmoi(): boolean');
    expect(content).toContain('bash "${applyScript}"');
    expect(content).not.toContain('setupConfigWithoutStow');
    expect(content).not.toContain('configured via symlink fallback');
  });

  it('migrates legacy ~/.zshrc symlinks to a local source file', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('const ZSHRC_MARKER_START = "# === Added from builtby.win/dotfiles (zsh) ==="');
    expect(content).toContain('source "$DOTFILES_DIR/shell/init.sh"');
    expect(content).toContain('unlinkSync(zshrcPath);');
  });

  it('backs up real managed targets before chezmoi apply', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('function backupRealManagedTargets(configs: string[]): void');
    expect(content).toContain('rmSync(targetPath, { recursive: true, force: true });');
    expect(content).toContain('type: "chezmoi"');
  });

  it('creates a machine-local shell overrides file during setup', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('const DOTFILES_LOCAL_SHELL_FILE = join(DOTFILES_CONFIG_DIR, "local.sh")');
    expect(content).toContain('Created local shell overrides at ${DOTFILES_LOCAL_SHELL_FILE}');
  });

  it('keeps unsupported Linux GUI app suggestions out of setup defaults', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('value: "vscode"');
    expect(content).toContain('value: "ghostty"');
    expect(content).toContain('platforms: { macos: true, linux: false, windows: false }');
  });

  it('filters Linux setup suggestions to command-line tools only', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('const linuxCommandCategories = new Set<AppCategory>(["cli", "ai"])');
    expect(content).toContain('platformApps.filter((app) => !app.cask && linuxCommandCategories.has(app.category))');
    expect(content).toContain('const selectableManagedConfigs = currentPlatform === "linux"');
    expect(content).toContain('platformManagedConfigs.filter((config) => config.value === "zsh" || config.value === "tmux" || config.value === "nvim" || config.value === "kanata")');
  });

  it('adds OpenCode CLI install path for Linux', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('name: "OpenCode"');
    expect(content).toContain('value: "opencode"');
    expect(content).toContain('detectCmd: "command -v opencode"');
    expect(content).toContain('curl -fsSL https://opencode.ai/install | bash');
  });

  it('offers shell switch from bash to zsh in setup.ts', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('Set zsh as your default shell');
    expect(content).toContain('chsh -s');
  });

  it('installs fnm via official curl installer', () => {
    const content = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    expect(content).toContain('curl -fsSL https://fnm.vercel.app/install | bash');
  });

  it('sets fnm LTS as default before pnpm setup', () => {
    const content = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    expect(content).toContain('fnm install --lts');
    expect(content).toContain('fnm default lts-latest');
    expect(content).toContain('fnm use lts-latest');
  });

  it('lets setup.ts own the interactive setup path chooser by default', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    const setupContent = fs.readFileSync(setupPath, 'utf-8');

    expect(macBootstrap).not.toContain('How would you like to proceed with setup?');
    expect(linuxBootstrap).not.toContain('How would you like to proceed with setup?');
    expect(setupContent).toContain('message: "How would you like to proceed?"');
  });

  it('only passes setup path handoff flags when bootstrap gets an explicit path', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    const setupContent = fs.readFileSync(setupPath, 'utf-8');

    expect(macBootstrap).not.toContain('SETUP_ARGS=( "$DOTFILES_DIR" --setup-path "$SETUP_PATH"');
    expect(linuxBootstrap).not.toContain('SETUP_ARGS=( "$DOTFILES_DIR" --setup-path "$SETUP_PATH" "$@" )');
    expect(macBootstrap).toContain('if [[ -n "$SETUP_PATH" ]]; then');
    expect(linuxBootstrap).toContain('if [[ -n "$SETUP_PATH" ]]; then');
    expect(setupContent).toContain('function getBootstrapSetupPath(argv: string[]): SetupPathChoice | null');
    expect(setupContent).toContain('const bootstrapSetupPath = getBootstrapSetupPath(process.argv.slice(2));');
    expect(setupContent).toContain('const setupPath = bootstrapSetupPath ?? (isFocusFlag ? "focus" : await select({');
  });

  it('documents the default install as applying the base chezmoi state', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('This installs dependencies, clones the repo, then applies the base chezmoi state by default.');
    expect(content).not.toContain('legacy stow/setup lane');
  });

  it('hands off to interactive setup after the base chezmoi apply in interactive bootstrap runs', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    expect(macBootstrap).toContain('print_step "Launching interactive dotfiles setup..."');
    expect(macBootstrap).toContain('print_success "Interactive setup complete!"');
    expect(macBootstrap).toContain('setup.ts "${SETUP_ARGS[@]}" < /dev/tty');
    expect(linuxBootstrap).toContain('print_step "Launching interactive dotfiles setup..."');
    expect(linuxBootstrap).toContain('print_success "Interactive setup complete"');
    expect(linuxBootstrap).toContain('setup.ts "${SETUP_ARGS[@]}" < /dev/tty');
  });

  it('supports explicit setup path arguments in the macOS/bootstrap wrapper too', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');

    expect(macBootstrap).toContain('--setup-path)');
    expect(macBootstrap).toContain('Unknown setup path: $1');
    expect(macBootstrap).toContain('FORWARDED_ARGS');
  });

  it('keeps Linux non-interactive mode free of new setup path prompts', () => {
    const content = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    expect(content).toContain('if [[ "$NON_INTERACTIVE" -eq 1 ]]; then');
    expect(content).not.toContain('SETUP_ARGS+=( --setup-path standard )');
    expect(content).not.toContain('SETUP_PATH="standard"');
    expect(content).toContain('Skipping interactive setup in non-interactive mode');
  });

  it('gives pnpm install failures explicit disk-space/bootstrap guidance', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    expect(macBootstrap).toContain('This often means disk space ran out or the bootstrap environment is incomplete');
    expect(linuxBootstrap).toContain('This often means disk space ran out or the bootstrap environment is incomplete');
    expect(macBootstrap).toContain('df -h');
    expect(linuxBootstrap).toContain('df -h');
  });

  it('does not silently swallow setup.ts launch failures', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    expect(macBootstrap).not.toContain('setup.ts "$DOTFILES_DIR" "$@" < /dev/tty || true');
    expect(linuxBootstrap).not.toContain('setup.ts "$DOTFILES_DIR" "$@" < /dev/tty || true');
    expect(macBootstrap).toContain('print_error "setup.ts failed"');
    expect(linuxBootstrap).toContain('print_error "setup.ts failed"');
  });

  it('keeps startup tips focused on shell tooling', () => {
    const content = fs.readFileSync(tipsPath, 'utf-8');
    expect(content).not.toContain('Hammerspoon');
    expect(content).not.toContain('Karabiner');
    expect(content).not.toContain('bb setup hammerspoon');
    expect(content).not.toContain('bb setup karabiner');
  });

  it('prompts to set zsh as default shell in interactive setup', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('Set zsh as your default shell');
    expect(content).toContain('chsh -s');
    expect(content).toContain('installLinuxPackages(["zsh"])');
  });

  it('adds ~/.local/bin to shell PATH for user-installed tools', () => {
    const shellInitPath = path.resolve(__dirname, '../shell/init.sh');
    const content = fs.readFileSync(shellInitPath, 'utf-8');
    expect(content).toContain('$HOME/.local/bin');
  });

  it('detects Homebrew from fixed macOS paths before relying on PATH lookup', () => {
    const content = fs.readFileSync(bootstrapPath, 'utf-8');

    expect(content).toContain('/opt/homebrew/bin/brew');
    expect(content).toContain('/usr/local/bin/brew');

    const arm64Index = content.indexOf('/opt/homebrew/bin/brew');
    const intelIndex = content.indexOf('/usr/local/bin/brew');
    const commandVIndex = content.indexOf('command -v brew');

    expect(arm64Index).toBeGreaterThan(-1);
    expect(intelIndex).toBeGreaterThan(-1);
    expect(commandVIndex).toBeGreaterThan(-1);
    expect(arm64Index).toBeLessThan(commandVIndex);
    expect(intelIndex).toBeLessThan(commandVIndex);
  });

  it('prints manual Homebrew shellenv commands instead of auto-evaling them', () => {
    const content = fs.readFileSync(bootstrapPath, 'utf-8');

    expect(content).not.toContain('eval "$(/opt/homebrew/bin/brew shellenv)" ||');
    expect(content).not.toContain('eval "$(/usr/local/bin/brew shellenv)" ||');
    expect(content).toContain('Run these commands yourself if brew is missing in new terminals:');
    expect(content).toContain('local shellenv_cmd=""');
    expect(content).toContain("shellenv_cmd='$(/opt/homebrew/bin/brew shellenv)'");
    expect(content).toContain("shellenv_cmd='$(/usr/local/bin/brew shellenv)'");
    expect(content).toContain('>> ~/.zprofile');
    expect(content).toContain('echo "    echo \'eval \\\"$shellenv_cmd\\\"\' >> ~/.zprofile"');
    expect(content).toContain('echo "    eval \\\"$shellenv_cmd\\\""');
  });

  it('uses the resolved Homebrew binary for macOS package installs', () => {
    const content = fs.readFileSync(bootstrapPath, 'utf-8');

    expect(content).toContain('"$BREW_BIN" install git');
    expect(content).toContain('"$BREW_BIN" install chezmoi');
    expect(content).toContain('"$BREW_BIN" install fnm');
    expect(content).not.toContain('brew install chezmoi');
    expect(content).not.toContain('brew install fnm');
  });

  it('does not hardcode a machine-specific PNPM_HOME in shell init', () => {
    const content = fs.readFileSync(shellInitPath, 'utf-8');
    expect(content).not.toContain('export PNPM_HOME="/Users/winstonzhao/Library/pnpm"');
  });
});
