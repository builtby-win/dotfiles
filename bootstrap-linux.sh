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

REPO_URL="https://github.com/builtby-win/dotfiles.git"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd 2>/dev/null || echo "")"
LINUX_PKG_MANAGER=""
NON_INTERACTIVE=0

print_usage() {
  cat <<'EOF'
Usage: bootstrap-linux.sh [options]

Options:
  -y, --yes   Run non-interactively (auto-approve all prompts)
  -h, --help  Show this help message
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -y|--yes)
        NON_INTERACTIVE=1
        ;;
      -h|--help)
        print_usage
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        print_usage
        exit 1
        ;;
    esac
    shift
  done
}

ask_yes_no() {
  local prompt="$1"
  local default_answer="${2:-y}"

  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    print_debug "Auto-approving in --yes mode: ${prompt}"
    return 0
  fi

  local suffix="[Y/n]"
  if [[ "$default_answer" == "n" ]]; then
    suffix="[y/N]"
  fi

  while true; do
    read -r -p "${prompt} ${suffix} " response < /dev/tty || return 1
    response="${response,,}"

    if [[ -z "$response" ]]; then
      response="$default_answer"
    fi

    case "$response" in
      y|yes) return 0 ;;
      n|no) return 1 ;;
      *) echo "Please answer y or n." ;;
    esac
  done
}

print_plan() {
  echo ""
  print_step "Install plan"
  echo "  1) Install required system packages (git, stow, curl)"
  echo "  2) Prepare dotfiles repo (clone or update)"
  echo "  3) Optionally install Node tooling (fnm/node/pnpm)"
  echo "  4) Optionally run pnpm install"
  echo "  5) Optionally run interactive setup.ts"
  echo ""
}

detect_package_manager() {
  if command -v apt-get >/dev/null 2>&1; then
    LINUX_PKG_MANAGER="apt"
    return
  fi
  if command -v dnf >/dev/null 2>&1; then
    LINUX_PKG_MANAGER="dnf"
    return
  fi
  if command -v pacman >/dev/null 2>&1; then
    LINUX_PKG_MANAGER="pacman"
    return
  fi

  print_error "Could not find a supported package manager."
  print_error "Supported: apt-get, dnf, pacman"
  exit 1
}

run_install_command() {
  set +e
  "$@"
  local status=$?
  set -e
  return $status
}

install_linux_packages() {
  local packages=("$@")

  if [[ ${#packages[@]} -eq 0 ]]; then
    return 0
  fi

  print_debug "Installing via ${LINUX_PKG_MANAGER}: ${packages[*]}"

  case "$LINUX_PKG_MANAGER" in
    apt)
      run_install_command sudo apt-get update || return 1
      run_install_command sudo apt-get install -y "${packages[@]}" || return 1
      ;;
    dnf)
      run_install_command sudo dnf install -y "${packages[@]}" || return 1
      ;;
    pacman)
      run_install_command sudo pacman -S --noconfirm --needed "${packages[@]}" || return 1
      ;;
    *)
      print_error "Unknown package manager: ${LINUX_PKG_MANAGER}"
      return 1
      ;;
  esac
}

ensure_command() {
  local cmd_name="$1"
  local pkg_name="$2"

  if command -v "$cmd_name" >/dev/null 2>&1; then
    return 0
  fi

  print_step "Installing ${cmd_name}..."
  if ! install_linux_packages "$pkg_name"; then
    print_error "Failed to install ${pkg_name} using ${LINUX_PKG_MANAGER}"
    return 1
  fi

  if ! command -v "$cmd_name" >/dev/null 2>&1; then
    print_error "${cmd_name} still not available after installation"
    return 1
  fi

  print_success "${cmd_name} installed"
}

setup_fnm() {
  if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --use-on-cd --shell bash)" || print_warning "Could not initialize fnm"
    print_success "fnm already installed"
    return
  fi

  print_step "Installing fnm (Node version manager)..."

  if ! run_install_command bash -c "curl -fsSL https://fnm.vercel.app/install > /dev/null"; then
    print_error "Cannot access https://fnm.vercel.app/install"
    print_error "Third-party URL access is required to install fnm on Linux"
    return
  fi

  if ! command -v unzip >/dev/null 2>&1; then
    print_step "Installing unzip (required by fnm installer)..."
    if ! install_linux_packages unzip || ! command -v unzip >/dev/null 2>&1; then
      print_error "fnm installer requires unzip but it is not available"
      return
    fi
  fi

  if ! run_install_command bash -c "curl -fsSL https://fnm.vercel.app/install | bash"; then
    print_error "fnm installer failed"
    return
  fi

  if [[ -x "$HOME/.local/share/fnm/fnm" ]]; then
    export PATH="$HOME/.local/share/fnm:$PATH"
  fi

  if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --use-on-cd --shell bash)" || print_warning "Could not initialize fnm"
    print_success "fnm installed"
  else
    print_error "fnm installer completed but fnm was not found in PATH"
  fi
}

ensure_local_bin_path() {
  case ":$PATH:" in
    *":$HOME/.local/bin:"*) ;;
    *) export PATH="$HOME/.local/bin:$PATH" ;;
  esac
}

install_pnpm_without_root() {
  print_step "Installing pnpm..."

  ensure_local_bin_path

  if command -v corepack >/dev/null 2>&1; then
    if run_install_command corepack enable --install-directory "$HOME/.local/bin" \
      && run_install_command corepack prepare pnpm@latest --activate \
      && command -v pnpm >/dev/null 2>&1; then
      print_success "pnpm installed via corepack"
      return 0
    fi

    print_warning "corepack setup failed, trying other pnpm install methods"
  fi

  if install_linux_packages pnpm && command -v pnpm >/dev/null 2>&1; then
    print_success "pnpm installed via ${LINUX_PKG_MANAGER}"
    return 0
  fi

  if run_install_command npm install -g pnpm --prefix "$HOME/.local"; then
    ensure_local_bin_path
    if command -v pnpm >/dev/null 2>&1; then
      print_success "pnpm installed in $HOME/.local/bin"
      return 0
    fi
  fi

  return 1
}

ensure_zsh_available() {
  if command -v zsh >/dev/null 2>&1; then
    return 0
  fi

  if ! ask_yes_no "zsh is not installed. Install zsh now?" "y"; then
    return 1
  fi

  if install_linux_packages zsh && command -v zsh >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

maybe_switch_default_shell_to_zsh() {
  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    print_debug "Skipping default shell change in --yes mode"
    return
  fi

  if [[ "${SHELL##*/}" == "zsh" ]]; then
    return
  fi

  if ! ask_yes_no "Switch your default shell to zsh for this dotfiles setup?" "y"; then
    print_warning "Keeping current default shell: ${SHELL}"
    return
  fi

  if ! ensure_zsh_available; then
    print_warning "Could not install zsh automatically"
    print_warning "Install zsh and run: chsh -s \"$(command -v zsh)\" \"$USER\""
    return
  fi

  local zsh_path
  zsh_path="$(command -v zsh)"

  if run_install_command chsh -s "$zsh_path" "$USER"; then
    print_success "Default shell changed to zsh"
    print_warning "Open a new terminal or run: exec zsh"
  else
    print_warning "Could not change default shell automatically"
    print_warning "Run manually: chsh -s \"$zsh_path\" \"$USER\""
  fi
}

ensure_node_and_pnpm() {
  if ! command -v node >/dev/null 2>&1; then
    print_step "Installing Node.js..."

    if command -v fnm >/dev/null 2>&1; then
      fnm install --lts || { print_error "Failed to install Node.js LTS via fnm"; exit 1; }
      fnm use lts-latest || { print_error "Failed to activate Node.js LTS via fnm"; exit 1; }
    else
      install_linux_packages nodejs npm || { print_error "Failed to install nodejs/npm"; exit 1; }
    fi
  fi

  if ! command -v npm >/dev/null 2>&1; then
    install_linux_packages npm || { print_error "npm is required but could not be installed"; exit 1; }
  fi

  if ! command -v pnpm >/dev/null 2>&1; then
    if ! install_pnpm_without_root; then
      print_error "Failed to install pnpm"
      print_error "Tried corepack, ${LINUX_PKG_MANAGER}, and npm --prefix $HOME/.local"
      exit 1
    fi
  fi

  print_success "Node.js and pnpm ready"
}

if [[ "$(uname -s)" != "Linux" ]]; then
  print_error "bootstrap-linux.sh can only run on Linux"
  exit 1
fi

parse_args "$@"

print_banner
detect_package_manager
print_debug "Detected package manager: ${LINUX_PKG_MANAGER}"

if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
  DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"
  print_debug "Non-interactive mode enabled (--yes)"
else
  echo -e "Where should we install the dotfiles? ${CYAN}(press enter for ~/dotfiles)${NC}"
  read -r -p "> " DOTFILES_DIR < /dev/tty || {
    print_error "Cannot read from terminal. Run this script interactively."
    exit 1
  }
fi

DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"
DOTFILES_DIR="${DOTFILES_DIR/#\~/$HOME}"
print_debug "Install directory: ${DOTFILES_DIR}"

mkdir -p "$DOTFILES_DIR" || { print_error "Failed to create ${DOTFILES_DIR}"; exit 1; }

print_plan
if ! ask_yes_no "Proceed with this install plan?" "y"; then
  print_warning "Setup cancelled"
  exit 0
fi

INSTALL_SYSTEM_DEPS=1
INSTALL_DEV_TOOLING=1
INSTALL_JS_DEPS=1
RUN_INTERACTIVE_SETUP=1

if [[ "$NON_INTERACTIVE" -ne 1 ]]; then
  ask_yes_no "Install required system packages (git, stow, curl)?" "y" || INSTALL_SYSTEM_DEPS=0
  ask_yes_no "Install Node tooling (fnm, node, pnpm) if missing?" "y" || INSTALL_DEV_TOOLING=0
  ask_yes_no "Run pnpm install in the dotfiles repo?" "y" || INSTALL_JS_DEPS=0
  ask_yes_no "Run interactive setup.ts now?" "y" || RUN_INTERACTIVE_SETUP=0
fi

if [[ "$INSTALL_SYSTEM_DEPS" -eq 1 ]]; then
  print_step "Ensuring system dependencies..."
  ensure_command git git
  ensure_command stow stow
  ensure_command curl curl
else
  print_warning "Skipping system dependency installation"
fi

if ! command -v git >/dev/null 2>&1; then
  print_error "git is required to clone/update dotfiles"
  print_error "Re-run and allow system package install, or install git manually"
  exit 1
fi

print_step "Preparing dotfiles repository..."
if [[ -d "$DOTFILES_DIR/.git" ]]; then
  print_debug "Updating existing repository"
  cd "$DOTFILES_DIR" || { print_error "Failed to enter ${DOTFILES_DIR}"; exit 1; }
  git pull --rebase || { print_error "git pull failed"; exit 1; }
  print_success "Dotfiles updated"
elif [[ -d "$DOTFILES_DIR" && -n "$(ls -A "$DOTFILES_DIR")" ]]; then
  print_warning "Directory ${DOTFILES_DIR} exists and is not empty"
  echo -e "  ${CYAN}[b]${NC}ackup & continue | ${CYAN}[c]${NC}ontinue anyway | ${CYAN}[q]${NC}uit"
  read -r -p "  > " choice < /dev/tty || {
    print_error "Cannot read from terminal"
    exit 1
  }
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
elif [[ -n "$SCRIPT_DIR" && -f "$SCRIPT_DIR/setup.ts" ]]; then
  DOTFILES_DIR="$SCRIPT_DIR"
  print_success "Using local dotfiles at ${DOTFILES_DIR}"
else
  git clone "$REPO_URL" "$DOTFILES_DIR" || { print_error "git clone failed"; exit 1; }
  print_success "Cloned to ${DOTFILES_DIR}"
fi

cd "$DOTFILES_DIR" || { print_error "Failed to enter ${DOTFILES_DIR}"; exit 1; }

if [[ "$INSTALL_DEV_TOOLING" -eq 1 ]]; then
  echo ""
  print_step "[1/3] Installing development tooling..."
  setup_fnm
  ensure_node_and_pnpm
else
  print_warning "Skipping Node tooling installation"
fi

if [[ "$INSTALL_JS_DEPS" -eq 1 ]]; then
  echo ""
  print_step "[2/3] Installing JavaScript dependencies..."
  if ! command -v pnpm >/dev/null 2>&1; then
    print_error "pnpm is required for dependency install"
    print_error "Install Node tooling first or run with --yes"
    exit 1
  fi
  pnpm install --silent || { print_error "pnpm install failed"; exit 1; }
  print_success "Dependencies installed"
else
  print_warning "Skipping pnpm install"
fi

if [[ "$RUN_INTERACTIVE_SETUP" -eq 1 ]]; then
  echo ""
  print_step "[3/3] Running interactive setup..."
  TSX_BIN="./node_modules/.bin/tsx"
  if [[ -x "$TSX_BIN" ]]; then
    "$TSX_BIN" setup.ts "$DOTFILES_DIR" < /dev/tty || true
  elif command -v pnpm >/dev/null 2>&1; then
    pnpm exec tsx setup.ts "$DOTFILES_DIR" < /dev/tty || true
  else
    print_warning "Cannot run setup.ts because pnpm is unavailable"
    print_warning "Run this later after installing Node tooling"
  fi
else
  print_warning "Skipping interactive setup"
fi

maybe_switch_default_shell_to_zsh

print_success "Linux setup complete"
