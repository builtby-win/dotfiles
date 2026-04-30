#!/bin/sh

PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH}"
export PATH

path=$1
command=$2

if [ -z "$path" ]; then
  printf '%s\n' "shell"
  exit 0
fi

if [ ! -d "$path" ]; then
  path=$(dirname "$path")
fi

dir_name=$(basename "$path")
if [ -z "$dir_name" ] || [ "$dir_name" = "/" ]; then
  dir_name="$path"
fi

label="$dir_name"

if command -v git >/dev/null 2>&1; then
  git_root=$(git -C "$path" rev-parse --show-toplevel 2>/dev/null || true)
  if [ -n "$git_root" ]; then
    worktree_name=$(basename "$git_root")
    branch=$(git -C "$path" symbolic-ref --quiet --short HEAD 2>/dev/null || true)
    if [ -z "$branch" ]; then
      branch=$(git -C "$path" rev-parse --short HEAD 2>/dev/null || true)
    fi
    branch_short=${branch##*/}

    if [ "$dir_name" != "$worktree_name" ]; then
      label="$dir_name"
    else
      case "$branch" in
        ""|main|master|trunk|develop|dev)
          label="$worktree_name"
          ;;
        *)
          if [ -n "$branch_short" ]; then
            label="$branch_short"
          else
            label="$worktree_name"
          fi
          ;;
      esac
    fi
  fi
fi

max_len=24
case "$command" in
  ssh|*/ssh)
    label="ssh:${label}"
    ;;
esac

if [ ${#label} -gt "$max_len" ]; then
  label=$(printf '%s' "$label" | cut -c1-"$max_len")
fi

printf '%s\n' "$label"
