#!/usr/bin/env bash
set -euo pipefail

# Build Kanata with local macOS input fixes:
# - map the Microsoft Sculpt Application/Menu key
# - ignore aggregate HID reports
# - register filtered devices before attachment and capture them on hot-plug

KANATA_VERSION="1.11.0"
PARSER_VERSION="0.1110.0"
DRIVERKIT_VERSION="0.2.2"
REGISTRY_ROOT="${CARGO_HOME:-$HOME/.cargo}/registry/src"

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is required to install patched Kanata" >&2
  exit 1
fi

# Ensure the crate sources exist in the local cargo registry.
cargo install kanata --version "$KANATA_VERSION" --features cmd --force

parser_file="$(find "$REGISTRY_ROOT" -path "*/kanata-parser-${PARSER_VERSION}/src/keys/macos.rs" -print -quit)"
kanata_dir="$(find "$REGISTRY_ROOT" -type d -name "kanata-${KANATA_VERSION}" -print -quit)"
driverkit_dir="$(find "$REGISTRY_ROOT" -type d -name "karabiner-driverkit-${DRIVERKIT_VERSION}" -print -quit)"

if [[ -z "$parser_file" || -z "$kanata_dir" || -z "$driverkit_dir" ]]; then
  echo "Could not locate Kanata ${KANATA_VERSION} dependency sources under $REGISTRY_ROOT" >&2
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

macos_loop_file="$kanata_dir/src/kanata/macos.rs"
python3 - "$macos_loop_file" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
needle = """            let mut key_event = match KeyEvent::try_from(event) {
"""
replacement = """            if event.value > 1 || event.code == 0xffffffff || event.code == 0x1 {
                log::debug!(\"{event:?} is an aggregate HID report; ignoring\");
                continue;
            }

            let mut key_event = match KeyEvent::try_from(event) {
"""

if replacement in text:
    print(f"Kanata macOS event loop already ignores aggregate HID reports: {path}")
elif needle in text:
    text = text.replace(needle, replacement)
    path.write_text(text)
    print(f"Patched Kanata macOS event loop to ignore aggregate HID reports: {path}")
else:
    raise SystemExit(f"Expected macOS event loop block not found in {path}")
PY

macos_input_file="$kanata_dir/src/oskbd/macos.rs"
python3 - "$macos_input_file" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
needle = """            match device_matches(dev) {
                true => Some(dev.to_string()),
                false => {
                    log::warn!(\"'{dev}' doesn't match any connected device\");
                    None
                }
            }
"""
replacement = """            // Register configured identities even while disconnected.
            // DriverKit captures the matching device when macOS attaches it.
            Some(dev.to_string())
"""

if replacement in text:
    print(f"Kanata macOS input already registers disconnected devices: {path}")
elif needle in text:
    path.write_text(text.replace(needle, replacement))
    print(f"Patched Kanata macOS input to register disconnected devices: {path}")
else:
    raise SystemExit(f"Expected macOS device validation block not found in {path}")
PY

driverkit_header="$driverkit_dir/c_src/driverkit.hpp"
driverkit_cpp="$driverkit_dir/c_src/driverkit.cpp"
python3 - "$driverkit_header" "$driverkit_cpp" <<'PY'
from pathlib import Path
import sys

header = Path(sys.argv[1])
cpp = Path(sys.argv[2])

header_needle = """    bool register_device_hash(uint64_t device_hash) {
        return consume_devices([device_hash](mach_port_t current_device) {
            // Don't open karabiner
            if( isSubstring(from_cstr("Karabiner"), get_property(current_device, kIOHIDProductKey) ) )
                return false;
            if ( hash_device(current_device) == device_hash ) {
                registered_devices_hashes.insert(device_hash);
                return true;
            }
            return false;
        });
    }
"""
header_replacement = """    bool register_device_hash(uint64_t device_hash) {
        // Register the requested identity even while it is disconnected.
        // The matching notification captures it when it appears later.
        registered_devices_hashes.insert(device_hash);
        return true;
    }
"""

capture_needle = """bool capture_device(IOHIDDeviceRef device_ref, uint64_t device_hash) {
    kern_return_t kr = IOHIDDeviceOpen(device_ref, kIOHIDOptionsTypeSeizeDevice);
"""
capture_replacement = """bool capture_device(IOHIDDeviceRef device_ref, uint64_t device_hash) {
    if (auto existing = opened_device_refs.find(device_hash); existing != opened_device_refs.end()) {
        IOHIDDeviceUnscheduleFromRunLoop(existing->second, listener_loop, kCFRunLoopDefaultMode);
        IOHIDDeviceClose(existing->second, kIOHIDOptionsTypeSeizeDevice);
        CFRelease(existing->second);
        opened_device_refs.erase(existing);
    }

    kern_return_t kr = IOHIDDeviceOpen(device_ref, kIOHIDOptionsTypeSeizeDevice);
"""

registration_needle = """bool capture_registered_devices() {
    // Register the notification port to the run loop, essential for receiving re-connect events so we can re-capture devices
    CFRunLoopAddSource(listener_loop, IONotificationPortGetRunLoopSource(notification_port), kCFRunLoopDefaultMode);
    return consume_devices([](mach_port_t c) {
        uint64_t device_hash = hash_device(c);
        if ( registered_devices_hashes.find(device_hash) != registered_devices_hashes.end() ) {
            bool captured = capture_device(IOHIDDeviceCreate(kCFAllocatorDefault, c), device_hash);
            if ( captured ) {
                void* dev_hash = reinterpret_cast<void*>(static_cast<uintptr_t>(device_hash));
                subscribe_to_notification(kIOMatchedNotification, dev_hash, device_connected_callback);
            }
            return captured;
        } else return false;
    });
}
"""
registration_replacement = """bool capture_registered_devices() {
    // Register the notification port to the run loop, essential for receiving re-connect events so we can re-capture devices
    CFRunLoopAddSource(listener_loop, IONotificationPortGetRunLoopSource(notification_port), kCFRunLoopDefaultMode);
    bool captured = consume_devices([](mach_port_t c) {
        uint64_t device_hash = hash_device(c);
        if ( registered_devices_hashes.find(device_hash) != registered_devices_hashes.end() )
            return capture_device(IOHIDDeviceCreate(kCFAllocatorDefault, c), device_hash);
        return false;
    });
    for (uint64_t device_hash : registered_devices_hashes) {
        void* dev_hash = reinterpret_cast<void*>(static_cast<uintptr_t>(device_hash));
        subscribe_to_notification(kIOFirstMatchNotification, dev_hash, device_connected_callback);
    }
    return captured || !registered_devices_hashes.empty();
}
"""
registration_previous = registration_replacement.replace(
    "kIOFirstMatchNotification", "kIOMatchedNotification"
)
cpp_text = cpp.read_text()
if registration_previous in cpp_text:
    cpp.write_text(cpp_text.replace(registration_previous, registration_replacement))
    print(f"Updated Kanata DriverKit to first-match device notifications: {cpp}")


patches = (
    (header, "disconnected device registration", header_needle, header_replacement),
    (cpp, "reconnected device replacement", capture_needle, capture_replacement),
    (cpp, "device matching notification", registration_needle, registration_replacement),
)

for path, label, needle, replacement in patches:
    text = path.read_text()
    if replacement in text:
        print(f"Kanata DriverKit already supports {label}: {path}")
    elif needle in text:
        path.write_text(text.replace(needle, replacement))
        print(f"Patched Kanata DriverKit {label}: {path}")
    else:
        raise SystemExit(f"Expected {label} block not found in {path}")
PY

# Build in a fresh target dir: cargo fingerprints registry sources as
# immutable, so a cached kanata-parser artifact silently ignores the patch
# above (config target-dir or CARGO_TARGET_DIR would reuse one).
build_target="$(mktemp -d)"
trap 'rm -rf "$build_target"' EXIT
cargo install --path "$kanata_dir" --features cmd --force --target-dir "$build_target"
codesign --force --sign - --identifier com.builtbywin.kanata "${CARGO_HOME:-$HOME/.cargo}/bin/kanata"

echo "Installed patched Kanata at ${CARGO_HOME:-$HOME/.cargo}/bin/kanata"
