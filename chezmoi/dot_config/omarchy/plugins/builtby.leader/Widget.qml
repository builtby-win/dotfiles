import QtQuick
import Quickshell.Hyprland
import qs.Commons
import qs.Commons as Commons
import qs.Ui

// Pill in the bar while a leader submap from linux/hypr/leader.lua is open:
//   leader        waiting for the action key
//   leader-resize sticky resize mode
// leader-mux (first jk went to herdr / tmux as its prefix) is deliberately not
// shown: that is the app's prefix, not the window leader.
BarWidget {
  id: root
  moduleName: "builtby.leader"

  property string submap: ""
  readonly property string label: submap === "leader" ? "LEADER"
    : submap === "leader-resize" ? "RESIZE" : ""
  readonly property color pillColor: submap === "leader-resize" ? Commons.Color.urgent : Commons.Color.accent

  visible: label !== ""
  implicitWidth: visible ? pill.width + Style.space(4) : 0
  implicitHeight: barSize

  Connections {
    target: Hyprland
    function onRawEvent(event) {
      if (event && event.name === "submap") root.submap = String(event.data || "")
    }
  }

  Rectangle {
    id: pill
    anchors.centerIn: parent
    width: text.implicitWidth + Style.space(12)
    height: text.implicitHeight + Style.space(4)
    radius: height / 2
    color: root.pillColor

    Text {
      id: text
      anchors.centerIn: parent
      text: root.label
      color: Commons.Color.background
      font.family: root.bar ? root.bar.fontFamily : Style.font.family
      font.pixelSize: Style.font.bodySmall
      font.bold: true
    }
  }
}
