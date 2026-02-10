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
  if install_linux_packages fnm && command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --use-on-cd --shell bash)" || print_warning "Could not initialize fnm"
    print_success "fnm installed via ${LINUX_PKG_MANAGER}"
    return
  fi

  print_warning "fnm package not available via ${LINUX_PKG_MANAGER}, using upstream installer"
  if ! run_install_command bash -c "$(curl -fsSL https://fnm.vercel.app/install)"; then
    print_warning "fnm upstream installer failed"
    return
  fi

  if [[ -x "$HOME/.local/share/fnm/fnm" ]]; then
    export PATH="$HOME/.local/share/fnm:$PATH"
  fi

  if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --use-on-cd --shell bash)" || print_warning "Could not initialize fnm"
    print_success "fnm installed"
  else
    print_warning "fnm not available; will install Node.js directly from ${LINUX_PKG_MANAGER}"
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
    print_step "Installing pnpm..."
    npm install -g pnpm || { print_error "Failed to install pnpm"; exit 1; }
  fi

  print_success "Node.js and pnpm ready"
}

if [[ "$(uname -s)" != "Linux" ]]; then
  print_error "bootstrap-linux.sh can only run on Linux"
  exit 1
fi

print_banner
detect_package_manager
print_debug "Detected package manager: ${LINUX_PKG_MANAGER}"

echo -e "Where should we install the dotfiles? ${CYAN}(press enter for ~/dotfiles)${NC}"
read -r -p "> " DOTFILES_DIR < /dev/tty || {
  print_error "Cannot read from terminal. Run this script interactively."
  exit 1
}

DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"
DOTFILES_DIR="${DOTFILES_DIR/#\~/$HOME}"
print_debug "Install directory: ${DOTFILES_DIR}"

mkdir -p "$DOTFILES_DIR" || { print_error "Failed to create ${DOTFILES_DIR}"; exit 1; }

print_step "Ensuring system dependencies..."
ensure_command git git
ensure_command stow stow
ensure_command curl curl

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

echo ""
print_step "[1/3] Installing development tooling..."
setup_fnm
ensure_node_and_pnpm

echo ""
print_step "[2/3] Installing JavaScript dependencies..."
pnpm install --silent || { print_error "pnpm install failed"; exit 1; }
print_success "Dependencies installed"

echo ""
print_step "[3/3] Running interactive setup..."
TSX_BIN="./node_modules/.bin/tsx"
if [[ -x "$TSX_BIN" ]]; then
  "$TSX_BIN" setup.ts "$DOTFILES_DIR" < /dev/tty || true
else
  pnpm exec tsx setup.ts "$DOTFILES_DIR" < /dev/tty || true
fi

print_success "Linux setup complete"
