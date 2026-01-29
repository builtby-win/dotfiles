# Agent Config Distribution Functions
# builtby.win/dotfiles
#
# Provides functions to symlink agent configs to repositories.
# Usage: agent-link claude gemini   - Link specific agents
#        agent-link all             - Link all agents
#        agent-status               - Check linked status
#        agent-update               - Pull dotfiles updates

# Get dotfiles directory
AGENTS_DOTFILES_DIR="${DOTFILES_DIR:-$(cat ~/.config/dotfiles/path 2>/dev/null)}"

# Available agents and their config files
# Format: agent_name:config_filename
AGENT_CONFIGS=(
  "claude:CLAUDE.md"
  "gemini:GEMINI.md"
  "opencode:AGENTS.md"
)

# Link agent configs to current repo
agent-link() {
  if [[ -z "$AGENTS_DOTFILES_DIR" ]]; then
    echo "Error: DOTFILES_DIR not set. Run dotfiles setup first."
    return 1
  fi

  local repo_root
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null)

  if [[ -z "$repo_root" ]]; then
    echo "Error: Not in a git repository"
    return 1
  fi

  local agents_to_link=()

  if [[ $# -eq 0 ]]; then
    # Interactive mode with fzf if available
    if command -v fzf &>/dev/null; then
      local selected
      selected=$(printf '%s\n' "${AGENT_CONFIGS[@]%%:*}" | fzf --multi --prompt="Select agents > " --height=10 --border)
      if [[ -z "$selected" ]]; then
        echo "No agents selected"
        return 0
      fi
      while IFS= read -r agent; do
        agents_to_link+=("$agent")
      done <<< "$selected"
    else
      echo "Available agents:"
      for config in "${AGENT_CONFIGS[@]}"; do
        echo "  - ${config%%:*}"
      done
      echo ""
      echo "Usage: agent-link <agent1> [agent2] ..."
      echo "       agent-link all"
      return 0
    fi
  elif [[ "$1" == "all" ]]; then
    for config in "${AGENT_CONFIGS[@]}"; do
      agents_to_link+=("${config%%:*}")
    done
  else
    agents_to_link=("$@")
  fi

  local linked=0
  for agent in "${agents_to_link[@]}"; do
    local config_file=""
    for config in "${AGENT_CONFIGS[@]}"; do
      if [[ "${config%%:*}" == "$agent" ]]; then
        config_file="${config#*:}"
        break
      fi
    done

    if [[ -z "$config_file" ]]; then
      echo "Unknown agent: $agent"
      continue
    fi

    local source_path="$AGENTS_DOTFILES_DIR/agents/$agent/$config_file"
    local target_path="$repo_root/$config_file"

    if [[ ! -f "$source_path" ]]; then
      echo "Template not found: $source_path"
      continue
    fi

    # Check if already a symlink to our file
    if [[ -L "$target_path" ]]; then
      local current_link
      current_link=$(readlink "$target_path")
      if [[ "$current_link" == "$source_path" ]]; then
        echo "✓ $config_file already linked"
        ((linked++))
        continue
      fi
    fi

    # Backup existing file if present
    if [[ -e "$target_path" ]]; then
      local backup_path="${target_path}.backup.$(date +%s)"
      mv "$target_path" "$backup_path"
      echo "  Backed up: $config_file → $(basename "$backup_path")"
    fi

    # Create symlink
    ln -s "$source_path" "$target_path"
    echo "✓ Linked $config_file → dotfiles/agents/$agent/"
    ((linked++))
  done

  echo ""
  echo "Linked $linked agent config(s) to $repo_root"
}

# Update agent configs by pulling dotfiles
agent-update() {
  if [[ -z "$AGENTS_DOTFILES_DIR" ]]; then
    echo "Error: DOTFILES_DIR not set"
    return 1
  fi

  echo "Updating agent configs from dotfiles..."
  (cd "$AGENTS_DOTFILES_DIR" && git pull --rebase)
  
  echo ""
  echo "Done! All symlinked repos are now up to date."
}

# Show status of agent configs across repos
agent-status() {
  if [[ -z "$AGENTS_DOTFILES_DIR" ]]; then
    echo "Error: DOTFILES_DIR not set"
    return 1
  fi

  echo "Agent Config Status"
  echo "==================="
  echo ""

  # Current repo
  local repo_root
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null)

  if [[ -n "$repo_root" ]]; then
    echo "Current repo: $repo_root"
    for config in "${AGENT_CONFIGS[@]}"; do
      local agent="${config%%:*}"
      local file="${config#*:}"
      local target_path="$repo_root/$file"

      if [[ -L "$target_path" ]]; then
        local link_target
        link_target=$(readlink "$target_path")
        if [[ "$link_target" == *"dotfiles/agents"* ]]; then
          echo "  ✓ $file (symlinked)"
        else
          echo "  ⚠ $file (symlink to: $link_target)"
        fi
      elif [[ -f "$target_path" ]]; then
        echo "  • $file (local file, not symlinked)"
      else
        echo "  ✗ $file (not present)"
      fi
    done
  else
    echo "Not in a git repository"
  fi

  echo ""
  echo "Template source: $AGENTS_DOTFILES_DIR/agents/"
}

# Quick alias
alias al="agent-link"
alias au="agent-update"
alias as="agent-status"
