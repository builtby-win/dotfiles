# Beads (bd) global task management
# builtby.win/dotfiles
#
# Provides global task aggregation across all your repositories using beads CLI.
# See: https://github.com/steveyegge/beads

# Global todos directory
export BD_GLOBAL_DIR="${BD_GLOBAL_DIR:-$HOME/.global-todos}"

# Cleanup legacy repos.additional config key
bd--cleanup-legacy-repos() {
  local global_dir="$BD_GLOBAL_DIR"
  local config_file="$global_dir/.beads/config.yaml"

  if [[ ! -f "$config_file" ]]; then
    return 0
  fi

  if grep -q '^repos\.additional:' "$config_file"; then
    (cd "$global_dir" && bd config unset repos.additional >/dev/null 2>&1)
    grep -v '^repos\.additional:' "$config_file" > "$config_file.tmp" && mv "$config_file.tmp" "$config_file"
  fi
}

# Setup global beads task management
# Creates ~/.global-todos with git repo and initializes beads with GLOBAL prefix
bd-setup-global() {
  local global_dir="$BD_GLOBAL_DIR"

  if [[ -d "$global_dir/.git" ]]; then
    echo "Global todos already initialized at $global_dir"
    echo "Run 'bd-add-repos' to add repositories from zoxide"
    return 0
  fi

  echo "Setting up global beads task management..."
  echo "Directory: $global_dir"
  echo ""

  # Create and initialize the directory
  mkdir -p "$global_dir"
  cd "$global_dir" || return 1

  git init
  echo "# Global Task Repository" > README.md
  echo "" >> README.md
  echo "This repository aggregates tasks from multiple projects using [beads](https://github.com/steveyegge/beads)." >> README.md
  echo "" >> README.md
  echo "## Usage" >> README.md
  echo "" >> README.md
  echo '```bash' >> README.md
  echo "# List all tasks across repos" >> README.md
  echo "bd list" >> README.md
  echo "" >> README.md
  echo "# Add current repo to global tracking" >> README.md
  echo "bd-add-repo" >> README.md
  echo "" >> README.md
  echo "# Sync and view aggregated issues" >> README.md
  echo "bd sync && bd list" >> README.md
  echo '```' >> README.md

  git add README.md
  git commit -m "Initialize global task repository"

  # Initialize beads with GLOBAL prefix
  if command -v bd &> /dev/null; then
    bd init --prefix GLOBAL
    echo ""
    echo "Global beads initialized with prefix GLOBAL"
  else
    echo "Warning: bd command not found. Install beads first."
    cd - > /dev/null
    return 1
  fi

  cd - > /dev/null

  echo ""
  echo "Setup complete!"
  echo ""
  echo "Next steps:"
  echo "  1. Run 'bd-add-repos' to add repositories from zoxide"
  echo "  2. Or manually add repos: bd-add-repo (from any repo)"
  echo "  3. Configure routing in your projects:"
  echo "     cd /path/to/project && bd config set routing.mode auto"
  echo "     bd config set routing.default \"$global_dir\""
}

# Add current repository to global beads config
bd-add-repo() {
  local global_dir="$BD_GLOBAL_DIR"
  local repo_root
  local current_repo

  # Get git root of current directory
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null)

  if [[ -z "$repo_root" ]]; then
    echo "Error: Not in a git repository"
    return 1
  fi

  if [[ ! -d "$global_dir/.git" ]]; then
    echo "Error: Global todos not set up. Run 'bd-setup-global' first."
    return 1
  fi

  current_repo="$repo_root"
  bd--cleanup-legacy-repos

  # Detect monorepo and prefer package dir
  if [[ "$PWD" != "$repo_root" ]]; then
    local cursor="$PWD"
    while [[ "$cursor" != "$repo_root" && "$cursor" != "/" ]]; do
      if [[ -f "$cursor/package.json" ]]; then
        echo "Monorepo detected. Use package directory instead of repo root?"
        echo "- Package: $cursor"
        echo -n "Use this package? [y/N]: "
        read -r reply
        if [[ "$reply" == "y" || "$reply" == "Y" ]]; then
          current_repo="$cursor"
        fi
        break
      fi
      cursor=$(dirname "$cursor")
    done
  fi

  # Add repo to global beads (multi-repo config)
  bt--ensure-bd-init "$current_repo" || return 1

  if (cd "$global_dir" && bd repo list --json 2>/dev/null | grep -q "\"$current_repo\""); then
    echo "Repository already in global config: $current_repo"
    return 0
  fi

  (cd "$global_dir" && bd repo add "$current_repo")

  echo "Added to global beads: $current_repo"

  # Also set up routing in the current repo
  echo ""
  echo "Configuring routing in current repo..."
  (cd "$current_repo" && bd config set routing.mode auto)
  (cd "$current_repo" && bd config set routing.default "$global_dir")
  echo "Routing configured to use global todos"
}

# Add monorepo packages/apps as separate beads repos
bd-add-monorepo() {
  local global_dir="$BD_GLOBAL_DIR"
  local repo_root

  repo_root=$(git rev-parse --show-toplevel 2>/dev/null)
  if [[ -z "$repo_root" ]]; then
    echo "Error: Not in a git repository"
    return 1
  fi

  if [[ ! -d "$global_dir/.git" ]]; then
    echo "Error: Global todos not set up. Run 'bd-setup-global' first."
    return 1
  fi

  if ! command -v fzf &> /dev/null; then
    echo "Error: fzf not installed"
    return 1
  fi

  bd--cleanup-legacy-repos

  local candidates
  if command -v fd &> /dev/null; then
    candidates=$(fd -t f package.json "$repo_root/apps" "$repo_root/packages" "$repo_root/services" "$repo_root/libs" 2>/dev/null | sed 's/\/package.json$//' | sort -u)
  else
    candidates=$(find "$repo_root/apps" "$repo_root/packages" "$repo_root/services" "$repo_root/libs" -name package.json 2>/dev/null | sed 's/\/package.json$//' | sort -u)
  fi

  if [[ -z "$candidates" ]]; then
    echo "No package.json files found in apps/, packages/, services/, or libs/."
    return 1
  fi

  echo "Select apps/packages to add (TAB to select, ENTER to confirm):"
  local selected
  selected=$(echo "$candidates" | fzf --multi --prompt="Packages > " --height=20 --border)

  if [[ -z "$selected" ]]; then
    echo "No packages selected"
    return 0
  fi

  echo "$selected" | while read -r dir; do
    if [[ -z "$dir" ]]; then
      continue
    fi

    if [[ ! -d "$dir/.beads" ]]; then
      echo "bd not initialized in $dir"
      echo -n "Run 'bd init' here? [y/N]: "
      read -r reply
      if [[ "$reply" == "y" || "$reply" == "Y" ]]; then
        (cd "$dir" && bd init)
      else
        echo "Skipped: $dir"
        continue
      fi
    fi

    if (cd "$global_dir" && bd repo list --json 2>/dev/null | grep -q "\"$dir\""); then
      echo "Already configured: $dir"
      continue
    fi

    (cd "$global_dir" && bd repo add "$dir")
    echo "Added: $dir"
  done
}

# Remove current repository from global beads config
bd-remove-repo() {
  local global_dir="$BD_GLOBAL_DIR"
  local current_repo

  current_repo=$(git rev-parse --show-toplevel 2>/dev/null)

  if [[ -z "$current_repo" ]]; then
    echo "Error: Not in a git repository"
    return 1
  fi

  if [[ ! -d "$global_dir/.git" ]]; then
    echo "Error: Global todos not set up."
    return 1
  fi

  bd--cleanup-legacy-repos

  if (cd "$global_dir" && bd repo list --json 2>/dev/null | grep -q "\"$current_repo\""); then
    (cd "$global_dir" && bd repo remove "$current_repo")
    echo "Removed from global beads: $current_repo"
    return 0
  fi

  echo "Repository not in global config: $current_repo"
}

# List all repositories in global beads config
bd-list-repos() {
  local global_dir="$BD_GLOBAL_DIR"

  if [[ ! -d "$global_dir/.git" ]]; then
    echo "Error: Global todos not set up. Run 'bd-setup-global' first."
    return 1
  fi

  bd--cleanup-legacy-repos

  echo "Global todos directory: $global_dir"
  echo ""
  echo "Configured repositories:"

  local repos
  repos=$(cd "$global_dir" && bd repo list --json 2>/dev/null | tr -d '\n' | sed -E 's/.*"additional":\[([^\]]*)\].*/\1/')

  if [[ -z "$repos" ]]; then
    echo "  (none)"
  else
    echo "$repos" | tr ',' '\n' | sed 's/"//g' | while read -r repo; do
      if [[ -n "$repo" ]]; then
        if [[ -d "$repo" ]]; then
          echo "  $repo"
        else
          echo "  $repo (not found)"
        fi
      fi
    done
  fi

  echo ""
  echo "All tasks:"
  (cd "$global_dir" && bd list)
}

# Interactive: Add repos from zoxide to global beads config
bd-add-repos() {
  local global_dir="$BD_GLOBAL_DIR"

  if [[ ! -d "$global_dir/.git" ]]; then
    echo "Error: Global todos not set up. Run 'bd-setup-global' first."
    return 1
  fi

  if ! command -v zoxide &> /dev/null; then
    echo "Error: zoxide not installed"
    return 1
  fi

  if ! command -v fzf &> /dev/null; then
    echo "Error: fzf not installed"
    return 1
  fi

  echo "Select repositories to add (TAB to select, ENTER to confirm):"
  echo ""

  # Get git repos from zoxide (filter to only directories with .git)
  local selected
  selected=$(zoxide query -l | while read -r dir; do
    if [[ -d "$dir/.git" ]]; then
      echo "$dir"
    fi
  done | fzf --multi --preview 'ls -la {} 2>/dev/null | head -20')

  if [[ -z "$selected" ]]; then
    echo "No repositories selected"
    return 0
  fi

  bd--cleanup-legacy-repos

  # Add each selected repo
  echo "$selected" | while read -r repo; do
    if (cd "$global_dir" && bd repo list --json 2>/dev/null | grep -q "\"$repo\""); then
      echo "Already configured: $repo"
    else
      if [[ ! -d "$repo/.beads" ]]; then
        echo "Skipped (no .beads): $repo"
        continue
      fi

      (cd "$global_dir" && bd repo add "$repo")
      echo "Added: $repo"
    fi
  done

  echo ""
  echo "Done! Run 'bd-list-repos' to see all configured repositories."
  echo "Note: You may still need to configure routing in each repo:"
  echo "  cd /path/to/repo && bd config set routing.mode auto"
}

# View global tasks (shortcut to open global todos)
bd-global() {
  local global_dir="$BD_GLOBAL_DIR"

  if [[ ! -d "$global_dir" ]]; then
    echo "Error: Global todos not set up. Run 'bd-setup-global' first."
    return 1
  fi

  cd "$global_dir" && bd "$@"
}

# Sync all repos and show global list
bd-sync-all() {
  local global_dir="$BD_GLOBAL_DIR"

  if [[ ! -d "$global_dir/.git" ]]; then
    echo "Error: Global todos not set up. Run 'bd-setup-global' first."
    return 1
  fi

  echo "Syncing global tasks..."
  (cd "$global_dir" && bd sync)
  echo ""
  echo "All tasks:"
  (cd "$global_dir" && bd list)
}

# Quick add todos via opencode + bd
bt--parse-input() {
  local tags_flag=""
  local args=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --tags)
        shift
        tags_flag="$1"
        shift
        ;;
      --tags=*)
        tags_flag="${1#--tags=}"
        shift
        ;;
      *)
        args+=("$1")
        shift
        ;;
    esac
  done

  local text="${args[*]}"
  local hashtag_tags=""

  if [[ -n "$text" ]]; then
    hashtag_tags=$(echo "$text" | grep -oE '#[A-Za-z0-9_-]+' | tr '\n' ',' | sed 's/,$//')
    text=$(echo "$text" | sed -E 's/#[A-Za-z0-9_-]+//g' | tr -s ' ' | sed -E 's/^ //; s/ $//')
  fi

  local tags="$tags_flag"
  if [[ -n "$hashtag_tags" ]]; then
    if [[ -n "$tags" ]]; then
      tags="$tags,$hashtag_tags"
    else
      tags="$hashtag_tags"
    fi
  fi

  BT_TODO_TEXT="$text"
  BT_TODO_TAGS="$tags"
}

bt--ensure-text() {
  if [[ -z "$BT_TODO_TEXT" ]]; then
    echo -n "Todo: "
    read -r BT_TODO_TEXT
  fi

  if [[ -z "$BT_TODO_TEXT" ]]; then
    echo "Error: todo text required"
    return 1
  fi
}

bt--pick-target() {
  if ! command -v fzf &> /dev/null; then
    echo "Error: fzf not installed"
    return 1
  fi

  local choice
  choice=$(printf "global\ncurrent\nproject\n" | fzf --prompt="Todo target > " --height=10 --border)

  case "$choice" in
    global)
      BT_TARGET_TYPE="global"
      BT_TARGET_PATH="$BD_GLOBAL_DIR"
      ;;
    current)
      BT_TARGET_TYPE="current"
      BT_TARGET_PATH="$PWD"
      ;;
    project)
      if ! command -v zoxide &> /dev/null; then
        echo "Error: zoxide not installed"
        return 1
      fi

      local selected
      selected=$(zoxide query -l | while read -r dir; do
        if [[ -d "$dir/.git" ]]; then
          echo "$dir"
        fi
      done | fzf --prompt="Project > " --height=20 --border)

      if [[ -z "$selected" ]]; then
        echo "No project selected"
        return 1
      fi

      BT_TARGET_TYPE="project"
      BT_TARGET_PATH="$selected"
      ;;
    *)
      echo "No target selected"
      return 1
      ;;
  esac
}

bt--run-opencode() {
  if ! command -v ollama &> /dev/null; then
    echo "Error: ollama not installed"
    return 1
  fi

  echo "Adding todo via bd..."
  echo "- Text: $BT_TODO_TEXT"
  echo "- Tags: ${BT_TODO_TAGS:-none}"
  echo "- Target: $BT_TARGET_TYPE ($BT_TARGET_PATH)"

  local prompt
  prompt=$(cat <<EOF
Use the bd CLI to create a new issue for this todo.

Todo text: $BT_TODO_TEXT
Tags: ${BT_TODO_TAGS:-none}
Invoke directory: $PWD
Target type: $BT_TARGET_TYPE
Target path: $BT_TARGET_PATH

Use 'bd create' (not 'bd add'). Prefer --title "$BT_TODO_TEXT" and include labels from tags when possible (comma-separated).
Do not pass --cwd (unsupported). If target type is global, run in $BD_GLOBAL_DIR. If target type is project, either cd to $BT_TARGET_PATH or use --repo "$BT_TARGET_PATH".
Prefer quiet output: use --silent or --quiet to avoid verbose output.
Include cwd metadata only if bd supports it.

If you need to decide which repo to attach the todo to, use fuzzy matching or fzf against bd list output (or configured repos) to select the best match.

IMPORTANT: Output ONLY the command to run. Do not include markdown formatting (like \`\`\`), explanations, or any other text. The output will be directly executed.
EOF
)

  local cmd
  cmd=$(ollama run gemma3 "$prompt")
  
  # Clean up markdown code blocks if present
  cmd=$(echo "$cmd" | sed 's/^```.*//g' | sed 's/^```//g' | sed 's/`//g')
  
  # Trim whitespace
  cmd=$(echo "$cmd" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

  if [[ -n "$cmd" ]]; then
     echo "Executing: $cmd"
     eval "$cmd"
  else
     echo "Error: No command generated."
  fi
}

bt--ensure-bd-init() {
  local repo_root="$1"

  if [[ -d "$repo_root/.beads" ]]; then
    return 0
  fi

  echo "bd is not initialized in $repo_root"
  echo -n "Run 'bd init' here? [y/N]: "
  read -r reply

  if [[ "$reply" != "y" && "$reply" != "Y" ]]; then
    return 1
  fi

  (cd "$repo_root" && bd init)
}

bt--ensure-global-added() {
  local repo_root="$1"

  if (cd "$BD_GLOBAL_DIR" && bd repo list --json 2>/dev/null | grep -q "\"$repo_root\""); then
    return 0
  fi

  echo "Repo not in global todos: $repo_root"
  echo -n "Add to $BD_GLOBAL_DIR? [y/N]: "
  read -r reply

  if [[ "$reply" != "y" && "$reply" != "Y" ]]; then
    return 1
  fi

  (cd "$BD_GLOBAL_DIR" && bd repo add "$repo_root")
}

bt--add() {
   local target_type="$1"
   local target_path="$2"
   shift 2

   bt--parse-input "$@" || return 1
   bt--ensure-text || return 1

   BT_TARGET_TYPE="$target_type"
   BT_TARGET_PATH="$target_path"

   bt--run-opencode && (cd "$BD_GLOBAL_DIR" && bd sync)
}

bt() {
   bt--parse-input "$@" || return 1
   bt--ensure-text || return 1
   bt--pick-target || return 1
   bt--run-opencode && (cd "$BD_GLOBAL_DIR" && bd sync)
}

# Quick todo: current repo without picker, include cwd metadata
# Usage: tt fix auth #backend --tags urgent
# Usage: gt fix auth #backend --tags urgent

tt() {
  local repo_root
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null)

  if [[ -z "$repo_root" ]]; then
    echo "Error: not in a git repository"
    return 1
  fi

  bd--cleanup-legacy-repos
  bt--ensure-bd-init "$repo_root" || return 1
  bt--ensure-global-added "$repo_root" || return 1

  bt--add "current" "$repo_root" "$@"
}

gt() {
  bt--add "global" "$BD_GLOBAL_DIR" "$@"
}

# Aliases for convenience
alias bdg="bd-global"
alias bds="bd-sync-all"
alias bda="bd-add-repo"
alias bdm="bd-add-monorepo"
alias bdl="bd-list-repos"
