// qore-midi.js
// Web MIDI service for MIDI command execution

export class QoreMidiService {
  constructor() {
    this.midiAccess = null;
    this.outputPort = null;
    this.isReady = false;
  }

  async initialize() {
    if (this.isReady) return { status: 'ready', message: 'MIDI already initialized' };

    try {
      // Request MIDI access
      this.midiAccess = await navigator.requestMIDIAccess();
      
      // Get first output port
      const outputs = Array.from(this.midiAccess.outputs.values());
      if (outputs.length > 0) {
        this.outputPort = outputs[0];
        this.isReady = true;
        return {
          status: 'ready',
          message: `MIDI initialized: ${this.outputPort.name}`,
          ports: outputs.map(port => ({ id: port.id, name: port.name }))
        };
      } else {
        return {
          status: 'no_devices',
          message: 'No MIDI output devices found',
          ports: []
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `MIDI not available: ${error.message}`,
        error: error.message
      };
    }
  }

  async executeCommand(command) {
    if (!this.isReady) {
      const initResult = await this.initialize();
      if (initResult.status !== 'ready') {
        return initResult;
      }
    }

    try {
      const parts = command.trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      
      switch (cmd) {
        case 'note_on':
          return this.noteOn(parseInt(parts[1]) || 60, parseInt(parts[2]) || 100);
        
        case 'note_off':
          return this.noteOff(parseInt(parts[1]) || 60);
        
        case 'cc':
          return this.controlChange(parseInt(parts[1]) || 1, parseInt(parts[2]) || 64);
        
        case 'fade':
          return this.fade(
            parseInt(parts[1]) || 1,
            parseInt(parts[2]) || 0,
            parseInt(parts[3]) || 127,
            parseInt(parts[4]) || 1000
          );
        
        case 'sequence':
          return this.playSequence(parts.slice(1));
        
        default:
          return {
            success: false,
            message: `Unknown MIDI command: ${cmd}`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `MIDI error: ${error.message}`
      };
    }
  }

  noteOn(note, velocity) {
    if (!this.outputPort) return { success: false, message: 'No MIDI output' };
    
    // MIDI Note On: 0x90 (144)
    this.outputPort.send([0x90, note, velocity]);
    return {
      success: true,
      message: `Note On: ${note} @ ${velocity}`
    };
  }

  noteOff(note) {
    if (!this.outputPort) return { success: false, message: 'No MIDI output' };
    
    // MIDI Note Off: 0x80 (128)
    this.outputPort.send([0x80, note, 0]);
    return {
      success: true,
      message: `Note Off: ${note}`
    };
  }

  controlChange(controller, value) {
    if (!this.outputPort) return { success: false, message: 'No MIDI output' };
    
    // MIDI CC: 0xB0 (176)
    this.outputPort.send([0xB0, controller, value]);
    return {
      success: true,
      message: `CC ${controller} = ${value}`
    };
  }

  async fade(controller, startValue, endValue, durationMs) {
    if (!this.outputPort) return { success: false, message: 'No MIDI output' };
    
    const steps = 50;
    const stepTime = durationMs / steps;
    const stepValue = (endValue - startValue) / steps;
    
    let currentValue = startValue;
    
    for (let i = 0; i <= steps; i++) {
      this.outputPort.send([0xB0, controller, Math.round(currentValue)]);
      currentValue += stepValue;
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, stepTime));
    }
    
    return {
      success: true,
      message: `Faded CC ${controller} from ${startValue} to ${endValue} over ${durationMs}ms`
    };
  }

  async playSequence(notes) {
    if (!this.outputPort) return { success: false, message: 'No MIDI output' };
    
    for (const noteStr of notes) {
      const note = parseInt(noteStr);
      if (isNaN(note)) continue;
      
      this.noteOn(note, 100);
      await new Promise(resolve => setTimeout(resolve, 300));
      this.noteOff(note);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return {
      success: true,
      message: `Played sequence: ${notes.join(' ')}`
    };
  }

  getStatus() {
    if (!navigator.requestMIDIAccess) {
      return {
        available: false,
        ready: false,
        message: 'Web MIDI API not supported'
      };
    }
    
    return {
      available: true,
      ready: this.isReady,
      port: this.outputPort ? this.outputPort.name : 'None',
      message: this.isReady ? 'MIDI ready' : 'MIDI not initialized'
    };
  }
}
