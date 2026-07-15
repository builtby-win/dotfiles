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

  it('installs pnpm into stable user-local paths via corepack with npm fallback', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    for (const content of [macBootstrap, linuxBootstrap]) {
      expect(content).toContain('export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"');
      expect(content).toContain('mkdir -p "$HOME/.local/bin" "$PNPM_HOME"');
      expect(content).toContain('export PATH="$HOME/.local/bin:$PNPM_HOME:$PATH"');
      expect(content).toContain('corepack enable --install-directory "$HOME/.local/bin"');
      expect(content).toContain('corepack prepare pnpm@10.28.2 --activate');
      expect(content).toContain('npm install --global --prefix "$HOME/.local" pnpm@10.28.2');
    }
  });

  it('requires pnpm for dependency install while keeping npm exec only for setup launch recovery', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    expect(macBootstrap).toContain('install_project_dependencies() {');
    expect(linuxBootstrap).toContain('install_project_dependencies() {');
    expect(macBootstrap).not.toContain('npm install && return 0');
    expect(linuxBootstrap).not.toContain('npm install && return 0');
    expect(macBootstrap).toContain('pnpm is not available; dependency install requires pnpm');
    expect(linuxBootstrap).toContain('pnpm is not available; dependency install requires pnpm');
    // Setup now launches in a login shell via pnpm exec — no more manual npm fallback chain
    expect(macBootstrap).toContain('exec pnpm exec tsx setup.ts');
    expect(linuxBootstrap).toContain('exec pnpm exec tsx setup.ts');
  });

  it('offers an interactive login-shell refresh after bootstrap completes', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    for (const content of [macBootstrap, linuxBootstrap]) {
      expect(content).toContain('prompt_shell_refresh() {');
      expect(content).toContain('Run exec \\\"\\$SHELL\\\" -l now? [y/N]');
      expect(content).toContain('exec "$SHELL" -l');
      expect(content).toContain('Open a new terminal or run exec \\\"\\$SHELL\\\" -l');
    }
    expect(linuxBootstrap).toContain('if [[ "$NON_INTERACTIVE" -eq 1 ]]; then');
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
    expect(content).toContain('function applyChezmoi(configs: string[]): boolean');
    expect(content).toContain('bash "${applyScript}" ${quotedTargets}');
    expect(content).not.toContain('setupConfigWithoutStow');
    expect(content).not.toContain('configured via symlink fallback');
  });

  it('keeps setup navigation Enter-friendly while preserving back actions', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');

    expect(content).toContain('message: "Next step?"');
    expect(content).toContain('{ name: "Continue to step 2 (configs)", value: "next" as const },');
    expect(content).toContain('{ name: "Back to main menu", value: "menu" as const },');
    expect(content).toContain('{ name: "Continue to step 3 (optional features)", value: "next" as const },');
    expect(content).toContain('{ name: "Back to step 1 (apps)", value: "back" as const },');
    expect(content).toContain('{ name: "Continue to step 4 (review selections)", value: "next" as const },');
    expect(content).toContain('{ name: "Back to step 2 (configs)", value: "back" as const },');
  });

  it('makes selected configs drive the chezmoi targets that are applied', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');

    expect(content).toContain('function selectedChezmoiApplyTargets(configs: string[]): string[]');
    expect(content).toContain('applyChezmoi(chezmoiConfigs)');
    expect(content).toContain('No selected chezmoi targets to apply');
    expect(content).toContain('Will not touch:');
  });

  it('uses action-first setup path labels', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');

    expect(content).toContain('Recommended full AI/dev workflow');
    expect(content).toContain('Keep detected setup');
    expect(content).toContain('Customize manually');
    expect(content).toContain('Setup starts with the recommended full AI/dev workflow, with iTerm2 as the first terminal and OpenCode as the default AI coding CLI.');
    expect(content).not.toContain('Install the recommended shell and dev tools - Standard setup');
    expect(content).not.toContain('Set up only shell basics - Minimal setup');
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

  it('lets setup.ts own the simplified interactive setup by default', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    const setupContent = fs.readFileSync(setupPath, 'utf-8');

    expect(macBootstrap).not.toContain('How would you like to proceed with setup?');
    expect(linuxBootstrap).not.toContain('How would you like to proceed with setup?');
    expect(setupContent).not.toContain('message: "Choose your setup path:"');
    expect(setupContent).toContain('message: "Use the recommended setup or keep what is already here?"');
  });

  it('only passes setup path handoff flags when bootstrap gets an explicit path', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    const setupContent = fs.readFileSync(setupPath, 'utf-8');

    // SETUP_PATH is forwarded via bash parameter expansion in the login shell command
    expect(macBootstrap).not.toContain('SETUP_ARGS=( "$DOTFILES_DIR" --setup-path "$SETUP_PATH"');
    expect(linuxBootstrap).not.toContain('SETUP_ARGS=( "$DOTFILES_DIR" --setup-path "$SETUP_PATH" "$@" )');
    expect(macBootstrap).toContain('SETUP_PATH:+ --setup-path');
    expect(linuxBootstrap).toContain('SETUP_PATH:+ --setup-path');
    expect(setupContent).toContain('function getBootstrapSetupPath(argv: string[]): SetupPathChoice | null');
    expect(setupContent).toContain('const bootstrapSetupPath = getBootstrapSetupPath(process.argv.slice(2));');
    expect(setupContent).toContain('let setupPath: SetupPathChoice | "use_detected" = bootstrapSetupPath ?? (isFocusFlag ? "focus" : "focus");');
  });

  it('documents the default install as applying the base chezmoi state', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('This installs dependencies, clones the repo, applies the base chezmoi state, then opens the guided setup checklist.');
    expect(content).not.toContain('legacy stow/setup lane');
  });

  it('explains the install plan and recovery path for first-time users', () => {
    const readme = fs.readFileSync(readmePath, 'utf-8');
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    expect(readme).toContain('What happens during install:');
    expect(readme).toContain('Setup backs up managed files before optional replacements.');
    expect(macBootstrap).toContain('Before anything changes, here is the plan:');
    expect(linuxBootstrap).toContain('Before anything changes, here is the plan:');
    expect(macBootstrap).toContain('Continue with this install? [Y/n]');
  });

  it('uses clear four-phase bootstrap progress labels', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    expect(macBootstrap).toContain('[1/4] Preparing required installer tools');
    expect(macBootstrap).toContain('[2/4] Installing project dependencies');
    expect(macBootstrap).toContain('[3/4] Applying base dotfiles');
    expect(macBootstrap).toContain('[4/4] Opening guided setup');
    expect(linuxBootstrap).toContain('[1/4] Preparing required installer tools');
    expect(linuxBootstrap).toContain('[4/4] Opening guided setup');
  });

  it('shows safety and recovery context in the setup review and success screens', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');

    expect(content).toContain('Setup starts with the recommended full AI/dev workflow, with iTerm2 as the first terminal and OpenCode as the default AI coding CLI. You can also select Codex before install.');
    expect(content).toContain('Will modify or create:');
    expect(content).toContain('DOTFILES_PATH_FILE');
    expect(content).toContain('WORKMUX_CONFIG_PATH');
    expect(content).toContain('Restore later with: bb setup revert');
    expect(content).toContain('Apply these installs and file changes?');
    expect(content).toContain('Change or restore setup later:');
  });

  it('hands off to interactive setup through a fresh login shell after chezmoi apply', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    expect(macBootstrap).toContain('print_step "[4/4] Opening guided setup..."');
    expect(macBootstrap).toContain('"$SHELL" -l -c "cd \'$DOTFILES_DIR\' && exec pnpm exec tsx setup.ts');
    expect(linuxBootstrap).toContain('print_step "[4/4] Opening guided setup..."');
    expect(linuxBootstrap).toContain('"$SHELL" -l -c "cd \'$DOTFILES_DIR\' && exec pnpm exec tsx setup.ts');
  });

  it('launches setup through a login shell with absolute DOTFILES_DIR paths', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    // Both scripts delegate to a login shell so fnm/brew PATH entries are active
    expect(macBootstrap).toContain('"$SHELL" -l -c "cd \'$DOTFILES_DIR\' && exec pnpm exec tsx setup.ts');
    expect(linuxBootstrap).toContain('"$SHELL" -l -c "cd \'$DOTFILES_DIR\' && exec pnpm exec tsx setup.ts');
    // The DOTFILES_DIR is passed as absolute path to setup.ts
    expect(macBootstrap).toContain("setup.ts '$DOTFILES_DIR'");
    expect(linuxBootstrap).toContain("setup.ts '$DOTFILES_DIR'");
  });

  it('prints the exact setup resume command if automatic launch fails', () => {
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');

    expect(macBootstrap).toContain('Interactive setup did not launch automatically.');
    expect(macBootstrap).toContain('cd $DOTFILES_DIR && pnpm exec tsx setup.ts $DOTFILES_DIR');
    expect(linuxBootstrap).toContain('Interactive setup did not launch automatically.');
    expect(linuxBootstrap).toContain('cd $DOTFILES_DIR && pnpm exec tsx setup.ts $DOTFILES_DIR');
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

    // The login shell approach still exits on failure — no silent swallows
    expect(macBootstrap).not.toContain('setup.ts "$DOTFILES_DIR" "$@" < /dev/tty || true');
    expect(linuxBootstrap).not.toContain('setup.ts "$DOTFILES_DIR" "$@" < /dev/tty || true');
    expect(macBootstrap).toContain('SHELL" -l -c "cd \'$DOTFILES_DIR\' && exec pnpm exec tsx setup.ts');
    expect(macBootstrap).toContain('exit 1');
    expect(linuxBootstrap).toContain('SHELL" -l -c "cd \'$DOTFILES_DIR\' && exec pnpm exec tsx setup.ts');
    expect(linuxBootstrap).toContain('exit 1');
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
