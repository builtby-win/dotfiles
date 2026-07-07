#!/usr/bin/env bash
set -euo pipefail

# Build Kanata with the local macOS Application/Menu-key input fix.
# Microsoft Sculpt reports its Application key as HID page 0x07/code 0x65,
# which also reaches Kanata's macOS key-code path as keyCode 110.

KANATA_VERSION="1.11.0"
PARSER_VERSION="0.1110.0"
REGISTRY_ROOT="${CARGO_HOME:-$HOME/.cargo}/registry/src"

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is required to install patched Kanata" >&2
  exit 1
fi

# Ensure the crate sources exist in the local cargo registry.
cargo install kanata --version "$KANATA_VERSION" --features cmd --force

parser_file="$(find "$REGISTRY_ROOT" -path "*/kanata-parser-${PARSER_VERSION}/src/keys/macos.rs" -print -quit)"
kanata_dir="$(find "$REGISTRY_ROOT" -type d -name "kanata-${KANATA_VERSION}" -print -quit)"

if [[ -z "$parser_file" || -z "$kanata_dir" ]]; then
  echo "Could not locate Kanata ${KANATA_VERSION} registry sources under $REGISTRY_ROOT" >&2
  exit 1
fi

python3 - "$parser_file" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
page_needle = """            PageCode {
                page: 0x07,
                code: 0x64,
            } => Ok(OsCode::KEY_102ND),
            PageCode {
                page: 0x07,
                code: 0x66,
            } => Ok(OsCode::KEY_POWER),
"""
page_replacement = """            PageCode {
                page: 0x07,
                code: 0x64,
            } => Ok(OsCode::KEY_102ND),
            PageCode {
                page: 0x07,
                code: 0x65,
            } => Ok(OsCode::KEY_COMPOSE),
            PageCode {
                page: 0x07,
                code: 0x66,
            } => Ok(OsCode::KEY_POWER),
"""
keycode_needle = "            110 => Some(OsCode::KEY_INSERT),\n"
keycode_replacement = "            110 => Some(OsCode::KEY_COMPOSE),\n"

changed = False
for label, needle, replacement in (
    ("0x07/0x65 PageCode", page_needle, page_replacement),
    ("macOS keyCode 110", keycode_needle, keycode_replacement),
):
    if replacement in text:
        print(f"Kanata parser already has the {label} input mapping: {path}")
    elif needle in text:
        text = text.replace(needle, replacement)
        changed = True
        print(f"Patched Kanata parser {label} input mapping: {path}")
    else:
        raise SystemExit(f"Expected {label} mapping block not found in {path}")

if changed:
    path.write_text(text)
PY

cargo install --path "$kanata_dir" --features cmd --force
codesign --force --sign - --identifier com.builtbywin.kanata "${CARGO_HOME:-$HOME/.cargo}/bin/kanata"

echo "Installed patched Kanata at ${CARGO_HOME:-$HOME/.cargo}/bin/kanata"
