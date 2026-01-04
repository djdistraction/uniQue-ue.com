// qore-python.js
// Python execution service using Pyodide WebAssembly runtime

export class QorePythonService {
  constructor() {
    this.pyodide = null;
    this.isReady = false;
    this.isLoading = false;
    this.outputBuffer = '';
  }

  async initialize() {
    if (this.isReady) return;
    if (this.isLoading) {
      // Wait for loading to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    try {
      this.isLoading = true;
      
      // Load Pyodide
      this.pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
      });

      // Redirect stdout to buffer
      await this.pyodide.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
      `);

      // Load common packages
      await this.pyodide.loadPackage(['numpy', 'pandas', 'micropip']);

      this.isReady = true;
      this.isLoading = false;
      
      return { status: 'ready', message: 'Python runtime initialized' };
    } catch (error) {
      this.isLoading = false;
      throw new Error(`Failed to initialize Python: ${error.message}`);
    }
  }

  async execute(code) {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      // Clear output buffer
      await this.pyodide.runPythonAsync(`
sys.stdout = StringIO()
      `);

      // Execute code
      const result = await this.pyodide.runPythonAsync(code);

      // Get stdout
      const output = await this.pyodide.runPythonAsync(`
sys.stdout.getvalue()
      `);

      return {
        success: true,
        result: result !== undefined ? String(result) : '',
        output: output || '',
        error: null
      };
    } catch (error) {
      return {
        success: false,
        result: '',
        output: '',
        error: error.message
      };
    }
  }

  getStatus() {
    if (this.isReady) return 'ready';
    if (this.isLoading) return 'loading';
    return 'not_initialized';
  }
}
