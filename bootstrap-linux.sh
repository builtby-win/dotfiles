#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

print_banner() {
  echo ""
  echo -e "${CYAN}${BOLD}"
  echo "  +-------------------------------------------+"
  echo "  |         builtby.win/dotfiles              |"
  echo "  +-------------------------------------------+"
  echo -e "${NC}"
}

print_step() {
  echo -e "${BLUE}==>${NC} ${BOLD}$1${NC}"
}

print_success() {
  echo -e "${GREEN}[ok]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[warn]${NC} $1"
}

print_error() {
  echo -e "${RED}[error]${NC} $1"
}

print_debug() {
  echo -e "${CYAN}[debug]${NC} $1"
}

ensure_sudo_ready() {
  local reason="${1:-installing system packages}"

  if [[ "$(id -u)" -eq 0 ]]; then
    return 0
  fi

  if ! command -v sudo >/dev/null 2>&1; then
    print_error "Administrator access is required for ${reason}, but sudo is not installed."
    exit 1
  fi

  if sudo -n -v >/dev/null 2>&1; then
    return 0
  fi

  if [[ "${NON_INTERACTIVE:-0}" -eq 1 ]]; then
    print_error "Administrator access is required for ${reason}."
    print_error "Run sudo -v first, then rerun this installer without --yes or with cached sudo credentials."
    exit 1
  fi

  if [[ ! -r /dev/tty ]]; then
    print_error "Administrator access is required for ${reason}."
    print_error "Open a terminal and run: sudo -v"
    print_error "Then rerun this installer."
    exit 1
  fi

  echo ""
  print_step "Checking administrator access..."
  echo "  This installer needs administrator access for ${reason}."
  echo "  If this is your first time using sudo, Linux may show a short safety message."
  echo "  Enter your computer password when prompted; it will not show as you type."
  echo "  Safe manual check: sudo -v"

  if sudo -v < /dev/tty; then
    print_success "Administrator access confirmed"
    return 0
  fi

  print_error "Could not confirm administrator access."
  print_error "Use an administrator account, or run this first: sudo -v"
  exit 1
}

setup_node_tool_paths() {
  export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
  mkdir -p "$HOME/.local/bin" "$PNPM_HOME"
  export PATH="$HOME/.local/bin:$PNPM_HOME:$PATH"
}

ensure_pnpm_available() {
  setup_node_tool_paths

  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi

  if command -v corepack >/dev/null 2>&1; then
    corepack enable --install-directory "$HOME/.local/bin" 2>/dev/null || true
    corepack prepare pnpm@10.28.2 --activate 2>/dev/null || true
  fi

  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi

  if command -v npm >/dev/null 2>&1; then
    npm install --global --prefix "$HOME/.local" pnpm@10.28.2 2>/dev/null || true
  fi

  command -v pnpm >/dev/null 2>&1
}

install_project_dependencies() {
  if ensure_pnpm_available; then
    pnpm install --silent && return 0
  fi

  return 1
}

prompt_shell_refresh() {
  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    return 0
  fi

  if [[ ! -r /dev/tty || -z "${SHELL:-}" || ! -x "$SHELL" ]]; then
    print_warning "Open a new terminal or run exec \"\$SHELL\" -l to refresh your PATH."
    return 0
  fi

  echo ""
  echo -e "${BOLD}Refresh your shell now?${NC} This loads the updated dotfiles and PATH."
  read -r -p "Run exec \"\$SHELL\" -l now? [y/N] " refresh_shell < /dev/tty || return 0
  case "$refresh_shell" in
    y|Y|yes|YES)
      # Redirect stdin from /dev/tty so the login shell is interactive.
      # Without this, curl | bash leaves stdin as a closed pipe and the
      # shell immediately exits (never reads .zshrc / init.sh).
      exec "$SHELL" -l < /dev/tty
      ;;
    *)
      print_warning "Open a new terminal or run exec \"\$SHELL\" -l when you are ready."
      ;;
  esac
}

confirm_install_plan() {
  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    return 0
  fi

  echo ""
  echo -e "${BOLD}Before anything changes, here is the plan:${NC}"
  echo "  1. Use this folder for the dotfiles repo: $DOTFILES_DIR"
  echo "  2. Install or reuse the required tools: Git, curl, unzip, chezmoi, fnm, Node.js, and pnpm"
  echo "     If system packages need to be installed, we will first check admin access with sudo -v."
  echo "  3. Apply the base chezmoi-managed shell/config files"
  echo "  4. Open a guided setup where you review optional commands and configs"
  echo ""
  echo -e "${BOLD}Safety:${NC} guided setup backs up managed files before optional replacements."
  echo "You can later change selections or restore backups from: bb setup"
  echo ""
  read -r -p "Continue with this install? [Y/n] " confirm < /dev/tty || {
    print_error "Cannot read from terminal. Make sure you're running this script interactively."
    exit 1
  }
  case "$confirm" in
    ""|y|Y|yes|YES)
      ;;
    *)
      print_error "Aborted before making changes."
      exit 1
      ;;
  esac
}

REPO_URL="https://github.com/builtby-win/dotfiles.git"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd 2>/dev/null || echo "")"
LINUX_PKG_MANAGER=""
NON_INTERACTIVE=0
SETUP_PATH=""
SETUP_PATH_FROM_ARGS=0

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -y|--yes)
        NON_INTERACTIVE=1
        ;;
      --focus)
        SETUP_PATH="focus"
        SETUP_PATH_FROM_ARGS=1
        ;;
      --setup-path)
        shift
        case "$1" in
          focus|standard|minimal|customize|ai_agent)
            SETUP_PATH="$1"
            SETUP_PATH_FROM_ARGS=1
            ;;
          *)
            print_error "Unknown setup path: $1"
            exit 1
            ;;
        esac
        ;;
      -h|--help)
        echo "Usage: bootstrap-linux.sh [options]"
        echo "  -y, --yes   Run non-interactively (auto-approve all prompts)"
        echo "  --focus     Run focused Back2Vibing setup"
        echo "  --setup-path <path>  Use focus, standard, minimal, customize, or ai_agent"
        echo "  -h, --help  Show this help message"
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        exit 1
        ;;
    esac
    shift
  done
}

detect_package_manager() {
  if command -v apt-get >/dev/null 2>&1; then
    LINUX_PKG_MANAGER="apt"
  elif command -v dnf >/dev/null 2>&1; then
    LINUX_PKG_MANAGER="dnf"
  elif command -v pacman >/dev/null 2>&1; then
    LINUX_PKG_MANAGER="pacman"
  else
    print_error "Could not find a supported package manager (apt-get, dnf, pacman)"
    exit 1
  fi
}

install_packages() {
  ensure_sudo_ready "installing packages with ${LINUX_PKG_MANAGER}"

  case "$LINUX_PKG_MANAGER" in
    apt) sudo apt-get update -qq && sudo apt-get install -y "$@" ;;
    dnf) sudo dnf install -y "$@" ;;
    pacman) sudo pacman -S --noconfirm --needed "$@" ;;
  esac
}

ensure_command() {
  local cmd="$1" pkg="${2:-$1}"
  command -v "$cmd" >/dev/null 2>&1 && return 0
  print_step "Installing ${cmd}..."
  install_packages "$pkg"
  command -v "$cmd" >/dev/null 2>&1 || { print_error "Failed to install ${cmd}"; exit 1; }
  print_success "${cmd} installed"
}

# === Main flow ===

[[ "$(uname -s)" != "Linux" ]] && { print_error "This script is for Linux only"; exit 1; }

parse_args "$@"
print_banner
detect_package_manager
print_debug "Detected package manager: ${LINUX_PKG_MANAGER}"

if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
  DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"
  print_debug "Non-interactive mode enabled (--yes)"
else
  echo -e "Where should we install the dotfiles? ${CYAN}(press enter for ~/dotfiles)${NC}"
  read -r -p "> " DOTFILES_DIR < /dev/tty || { print_error "Cannot read from terminal"; exit 1; }
fi

DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"
DOTFILES_DIR="${DOTFILES_DIR/#\~/$HOME}"

if [[ -n "$SETUP_PATH" ]]; then
  print_debug "Setup path override: ${SETUP_PATH}"
fi

confirm_install_plan

mkdir -p "$DOTFILES_DIR" || { print_error "Failed to create ${DOTFILES_DIR}"; exit 1; }

ensure_command git git
ensure_command curl curl
ensure_command chezmoi chezmoi

print_step "Preparing dotfiles repository..."
if [[ -d "$DOTFILES_DIR/.git" ]]; then
  cd "$DOTFILES_DIR" && git pull --rebase
  print_success "Dotfiles updated"
elif [[ -d "$DOTFILES_DIR" && -n "$(ls -A "$DOTFILES_DIR")" ]]; then
  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    print_warning "Directory ${DOTFILES_DIR} exists and is not empty, continuing anyway"
  else
    print_warning "Directory ${DOTFILES_DIR} exists and is not empty"
    echo -e "  ${CYAN}[b]${NC}ackup & continue | ${CYAN}[c]${NC}ontinue anyway | ${CYAN}[q]${NC}uit"
    read -r -p "  > " choice < /dev/tty || { print_error "Cannot read from terminal"; exit 1; }
    case "$choice" in
      b|B)
        backup_dir="${DOTFILES_DIR}.backup.$(date +%Y%m%d%H%M%S)"
        mv "$DOTFILES_DIR" "$backup_dir" || { print_error "Failed to create backup"; exit 1; }
        print_success "Backed up to ${backup_dir}"
        git clone "$REPO_URL" "$DOTFILES_DIR" || { print_error "git clone failed"; exit 1; }
        ;;
      c|C)
        print_warning "Continuing with existing directory"
        ;;
      *)
        print_error "Aborted."
        exit 1
        ;;
    esac
  fi
elif [[ -n "$SCRIPT_DIR" && -f "$SCRIPT_DIR/setup.ts" ]]; then
  DOTFILES_DIR="$SCRIPT_DIR"
  print_success "Using local dotfiles at ${DOTFILES_DIR}"
else
  git clone "$REPO_URL" "$DOTFILES_DIR" || { print_error "git clone failed"; exit 1; }
  print_success "Cloned to ${DOTFILES_DIR}"
fi

cd "$DOTFILES_DIR"

print_step "[1/4] Preparing required installer tools..."

if ! command -v fnm >/dev/null 2>&1; then
  command -v unzip >/dev/null 2>&1 || install_packages unzip
  if curl -fsSL https://fnm.vercel.app/install | bash 2>/dev/null; then
    [[ -x "$HOME/.local/share/fnm/fnm" ]] && export PATH="$HOME/.local/share/fnm:$PATH"
    command -v fnm >/dev/null 2>&1 && eval "$(fnm env --use-on-cd --shell bash)" || true
  fi
fi

if command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env --use-on-cd --shell bash)" 2>/dev/null || true
  fnm install --lts >/dev/null 2>&1 || { print_error "Failed to install Node.js LTS via fnm"; exit 1; }
  fnm default lts-latest >/dev/null 2>&1 || { print_error "Failed to set fnm default Node.js version"; exit 1; }
  fnm use lts-latest >/dev/null 2>&1 || { print_error "Failed to activate Node.js LTS via fnm"; exit 1; }
fi

if ! command -v node >/dev/null 2>&1; then
  install_packages nodejs npm
fi

command -v node >/dev/null 2>&1 || { print_error "Failed to install Node.js"; exit 1; }
print_success "Node.js ready ($(node -v))"

if ensure_pnpm_available; then
  print_success "pnpm ready"
else
  print_warning "pnpm is not available; dependency install requires pnpm"
fi

print_step "[2/4] Installing project dependencies..."
install_project_dependencies || {
  print_error "Dependency install failed"
  print_error "This often means disk space ran out or the bootstrap environment is incomplete"
  print_error "Check available space with: df -h"
  print_error "Try running manually: cd $DOTFILES_DIR && npm install"
  print_error "Then resume with: cd $DOTFILES_DIR && ./bootstrap-linux.sh"
  exit 1
}
print_success "Dependencies installed"

echo ""
print_step "[3/4] Applying base dotfiles"

if ! bash "$DOTFILES_DIR/scripts/apply-chezmoi.sh"; then
  print_error "chezmoi apply failed"
  print_error "Fix the message above, then resume with: cd $DOTFILES_DIR && ./bootstrap-linux.sh"
  exit 1
fi
print_success "Chezmoi dotfiles applied"

if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
  print_warning "Skipping interactive setup in non-interactive mode"
else
  print_step "[4/4] Opening guided setup..."

  # Try login shell first (ideal when $SHELL matches the real login
  # shell), then fall back to direct pnpm exec, tsx, or npm exec.
  if "$SHELL" -l -c "cd '$DOTFILES_DIR' && exec pnpm exec tsx setup.ts '$DOTFILES_DIR'${SETUP_PATH:+ --setup-path '$SETUP_PATH'}" < /dev/tty 2>&1; then
    print_success "Interactive setup complete"
  elif cd "$DOTFILES_DIR" && pnpm exec tsx setup.ts "$DOTFILES_DIR" ${SETUP_PATH:+ --setup-path "$SETUP_PATH"} < /dev/tty 2>&1; then
    print_success "Interactive setup complete"
  elif "$DOTFILES_DIR/node_modules/.bin/tsx" "$DOTFILES_DIR/setup.ts" "$DOTFILES_DIR" ${SETUP_PATH:+ --setup-path "$SETUP_PATH"} < /dev/tty 2>&1; then
    print_success "Interactive setup complete"
  elif (cd "$DOTFILES_DIR" && npm exec --yes tsx -- setup.ts "$DOTFILES_DIR" ${SETUP_PATH:+ --setup-path "$SETUP_PATH"}) < /dev/tty 2>&1; then
    print_success "Interactive setup complete"
  else
    print_error "Interactive setup did not launch automatically."
    print_error "Run: cd $DOTFILES_DIR && pnpm exec tsx setup.ts $DOTFILES_DIR"
    exit 1
  fi
fi

print_success "Linux bootstrap complete"
prompt_shell_refresh
