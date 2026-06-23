// WebRTC Debug Helper - mahfel
window.rtcDebug = {
  log: [],
  add: function(msg) {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    this.log.push(entry);
    console.log('🔊 RTC:', entry);
  }
};

// Monkey-patch to debug
const origNewPC = window.newPC;
