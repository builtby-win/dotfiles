#!/usr/bin/swift
import Foundation
import AppKit

struct Args {
    var port: UInt32 = 5829
    var bundleIds: [String] = []
    var pollInterval: TimeInterval = 0.25
}

func parseArgs() -> Args {
    var args = Args()
    var iterator = CommandLine.arguments.dropFirst().makeIterator()
    while let arg = iterator.next() {
        switch arg {
        case "-p", "--port":
            if let value = iterator.next(), let port = UInt32(value) {
                args.port = port
            }
        case "-b", "--bundle-ids":
            if let value = iterator.next() {
                args.bundleIds = value.split(separator: ",").map(String.init).filter { !$0.isEmpty }
            }
        case "--poll-interval":
            if let value = iterator.next(), let interval = TimeInterval(value) {
                args.pollInterval = interval
            }
        case "-h", "--help":
            print("Usage: kanata-vk-agent-poll -p <port> -b <bundle,id,list> [--poll-interval 0.25]")
            exit(0)
        default:
            continue
        }
    }
    return args
}

final class KanataClient {
    let port: UInt32
    let bundleIds: [String]
    private var stream: OutputStream?

    init(port: UInt32, bundleIds: [String]) {
        self.port = port
        self.bundleIds = bundleIds
    }

    func connect() {
        close()
        var readStream: Unmanaged<CFReadStream>?
        var writeStream: Unmanaged<CFWriteStream>?
        CFStreamCreatePairWithSocketToHost(nil, "127.0.0.1" as CFString, port, &readStream, &writeStream)
        guard let retainedWriteStream = writeStream?.takeRetainedValue() else {
            NSLog("kanata-vk-agent-poll: failed to create stream for port \(port)")
            return
        }
        let output = retainedWriteStream as OutputStream
        output.open()
        stream = output
        NSLog("kanata-vk-agent-poll: connected to 127.0.0.1:\(port)")
    }

    func close() {
        stream?.close()
        stream = nil
    }

    func send(name: String, action: String) {
        if stream == nil { connect() }
        let escapedName = name.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"")
        let json = "{\"ActOnFakeKey\":{\"name\":\"\(escapedName)\",\"action\":\"\(action)\"}}\n"
        let bytes = Array(json.utf8)
        let wrote = stream?.write(bytes, maxLength: bytes.count) ?? -1
        if wrote != bytes.count {
            NSLog("kanata-vk-agent-poll: write failed for \(name) \(action), reconnecting")
            connect()
            _ = stream?.write(bytes, maxLength: bytes.count)
        }
    }

    func press(_ name: String) { send(name: name, action: "Press") }
    func release(_ name: String) { send(name: name, action: "Release") }

    func initialize(current: String?) {
        for bundleId in bundleIds {
            if bundleId == current {
                press(bundleId)
            } else {
                release(bundleId)
            }
        }
    }
}

final class AppWatcher {
    let args: Args
    let client: KanataClient
    private var currentVk: String?
    // Kanata forgets fake-key state when its daemon restarts; replay current app context.
    private var lastRefresh = Date.distantPast
    private let refreshInterval: TimeInterval = 1

    init(args: Args) {
        self.args = args
        self.client = KanataClient(port: args.port, bundleIds: args.bundleIds)
    }

    func currentBundleId() -> String? {
        NSWorkspace.shared.frontmostApplication?.bundleIdentifier
    }

    func matchingVk(for bundleId: String?) -> String? {
        guard let bundleId else { return nil }
        return args.bundleIds.contains(bundleId) ? bundleId : nil
    }

    func apply(bundleId: String?) {
        let newVk = matchingVk(for: bundleId)
        let now = Date()
        if newVk == currentVk {
            if let new = newVk, now.timeIntervalSince(lastRefresh) >= refreshInterval {
                client.press(new)
                lastRefresh = now
            }
            return
        }
        if let old = currentVk { client.release(old) }
        if let new = newVk { client.press(new) }
        currentVk = newVk
        lastRefresh = now
        NSLog("kanata-vk-agent-poll: app=\(bundleId ?? "<none>") vk=\(newVk ?? "<none>")")
    }

    func start() {
        client.connect()
        currentVk = matchingVk(for: currentBundleId())
        client.initialize(current: currentVk)

        NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            let app = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication
            self?.apply(bundleId: app?.bundleIdentifier ?? self?.currentBundleId())
        }

        Timer.scheduledTimer(withTimeInterval: args.pollInterval, repeats: true) { [weak self] _ in
            self?.apply(bundleId: self?.currentBundleId())
        }

        RunLoop.main.run()
    }
}

let args = parseArgs()
let watcher = AppWatcher(args: args)
watcher.start()
