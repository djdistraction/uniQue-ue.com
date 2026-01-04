// qore-core.js
// Main application logic for The Qore neural interface

import { auth, db, WORKER_URL } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { QorePythonService } from './qore-python.js';
import { QoreMidiService } from './qore-midi.js';

// Global state
export const state = {
  currentUser: null,
  graph: {
    nodes: [],
    links: []
  },
  messages: [],
  activeView: 'GRAPH',
  scenes: [],
  journalContent: '',
  neurochemistry: {
    dopamine: 50,
    serotonin: 50,
    acetylcholine: 50,
    norepinephrine: 50
  },
  activeContext: new Set(),
  lastSynced: null
};

// Services
export const pythonService = new QorePythonService();
export const midiService = new QoreMidiService();

// D3 simulation
let simulation = null;
let svg = null;
let g = null;

// Reflexes - instant local responses
const REFLEXES = {
  'hello': 'Hello! I\'m The Qore, your cognitive interface.',
  'hi': 'Hi there! How can I help you think today?',
  'help': 'I can help you build a knowledge graph, manage ideas, and think more clearly. Try asking me something or just start chatting!',
  'what are you': 'I\'m The Qore - a neural interface that helps you think. I maintain a graph of your memories and ideas, and I learn from our conversations.',
  'how do you work': 'I store your thoughts as nodes in a graph, connected by relationships. When you talk to me, I find relevant context and update the graph based on our conversation.'
};

// Initialize the application
export async function initialize() {
  console.log('Initializing The Qore...');
  
  // Check authentication
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Redirect to profile if not logged in
        window.location.href = '/profile.html';
        return;
      }
      
      state.currentUser = user;
      console.log('User authenticated:', user.email);
      
      // Load brain state from Firestore
      await loadBrainState();
      
      // Initialize UI
      initializeUI();
      
      // Initialize services
      initializeServices();
      
      // Start auto-save
      startAutoSave();
      
      resolve();
    });
  });
}

// Load brain state from Firestore
async function loadBrainState() {
  try {
    const brainRef = doc(db, 'brains', state.currentUser.uid);
    const brainSnap = await getDoc(brainRef);
    
    if (brainSnap.exists()) {
      const data = brainSnap.data();
      state.graph = data.graph || state.graph;
      state.messages = data.messages || [];
      state.scenes = data.scenes || [];
      state.journalContent = data.journalContent || '';
      state.lastSynced = data.lastSynced || null;
      
      console.log('Brain state loaded:', state.graph.nodes.length, 'nodes');
    } else {
      // Create initial brain with core nodes
      state.graph = createInitialGraph();
      console.log('Created initial brain');
    }
  } catch (error) {
    console.error('Error loading brain state:', error);
    state.graph = createInitialGraph();
  }
}

// Create initial knowledge graph
function createInitialGraph() {
  return {
    nodes: [
      {
        id: 'core-identity',
        label: 'The Qore',
        type: 'CONCEPT',
        content: 'I am The Qore - a cognitive interface that learns with you.',
        tags: 'identity,core',
        x: 400,
        y: 300
      },
      {
        id: 'apples-standard',
        label: 'The Apples Standard',
        type: 'CONCEPT',
        content: 'Never give superficial answers. Always analyze: Physics (what properties?), Context (who/why?), Potential (what can this become?)',
        tags: 'protocol,core',
        x: 300,
        y: 200
      },
      {
        id: 'capacitive-knowledge',
        label: 'Capacitive Knowledge',
        type: 'CONCEPT',
        content: 'Knowledge that stores potential energy, ready to discharge when connected to the right context.',
        tags: 'protocol,core',
        x: 500,
        y: 200
      }
    ],
    links: [
      {
        source: 'core-identity',
        target: 'apples-standard',
        rel: 'follows',
        strength: 1.0
      },
      {
        source: 'core-identity',
        target: 'capacitive-knowledge',
        rel: 'uses',
        strength: 1.0
      }
    ]
  };
}

// Save brain state to Firestore
export async function saveBrainState() {
  if (!state.currentUser) return;
  
  try {
    const brainRef = doc(db, 'brains', state.currentUser.uid);
    await setDoc(brainRef, {
      graph: state.graph,
      messages: state.messages.slice(-50), // Keep last 50 messages
      scenes: state.scenes,
      journalContent: state.journalContent,
      lastSynced: new Date().toISOString()
    });
    
    state.lastSynced = new Date().toISOString();
    console.log('Brain state saved');
    
    // Update sync indicator
    const syncIndicator = document.getElementById('sync-indicator');
    if (syncIndicator) {
      syncIndicator.textContent = '✓ Synced';
      syncIndicator.className = 'text-green-400 text-sm';
    }
  } catch (error) {
    console.error('Error saving brain state:', error);
    const syncIndicator = document.getElementById('sync-indicator');
    if (syncIndicator) {
      syncIndicator.textContent = '⚠ Sync failed';
      syncIndicator.className = 'text-red-400 text-sm';
    }
  }
}

// Start auto-save interval
function startAutoSave() {
  setInterval(() => {
    saveBrainState();
  }, 5000); // Every 5 seconds
}

// Initialize UI
function initializeUI() {
  // View switching
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      switchView(view);
    });
  });
  
  // Chat input
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-message');
  
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }
  
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  
  // Initialize graph view
  initializeGraph();
  
  // Welcome message
  addMessage('assistant', 'Welcome to The Qore. I\'m ready to help you think. What\'s on your mind?');
}

// Initialize D3 graph
function initializeGraph() {
  const container = document.getElementById('graph-container');
  if (!container) return;
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  // Create SVG
  svg = d3.select('#graph-container')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .call(d3.zoom().on('zoom', (event) => {
      g.attr('transform', event.transform);
    }));
  
  g = svg.append('g');
  
  // Create force simulation
  simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d.id).distance(100))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(30));
  
  // Render graph
  renderGraph();
}

// Render graph
export function renderGraph() {
  if (!g) return;
  
  // Clear existing
  g.selectAll('*').remove();
  
  // Draw links
  const link = g.append('g')
    .selectAll('line')
    .data(state.graph.links)
    .join('line')
    .attr('stroke', d => state.activeContext.has(d.source.id) && state.activeContext.has(d.target.id) ? '#00F6FF' : '#444')
    .attr('stroke-width', d => d.strength * 2)
    .attr('stroke-opacity', d => state.activeContext.has(d.source.id) && state.activeContext.has(d.target.id) ? 0.8 : 0.3);
  
  // Draw nodes
  const node = g.append('g')
    .selectAll('g')
    .data(state.graph.nodes)
    .join('g')
    .call(d3.drag()
      .on('start', dragStarted)
      .on('drag', dragged)
      .on('end', dragEnded))
    .on('click', (event, d) => {
      event.stopPropagation();
      openNodeInspector(d);
    });
  
  // Node circles
  node.append('circle')
    .attr('r', 15)
    .attr('fill', d => getNodeColor(d.type))
    .attr('stroke', d => state.activeContext.has(d.id) ? '#00F6FF' : '#666')
    .attr('stroke-width', d => state.activeContext.has(d.id) ? 3 : 1)
    .style('filter', d => state.activeContext.has(d.id) ? 'url(#glow)' : 'none');
  
  // Node labels
  node.append('text')
    .text(d => d.label)
    .attr('x', 20)
    .attr('y', 5)
    .attr('font-size', '12px')
    .attr('fill', '#E5E7EB');
  
  // Add glow filter
  const defs = svg.append('defs');
  const filter = defs.append('filter')
    .attr('id', 'glow');
  filter.append('feGaussianBlur')
    .attr('stdDeviation', '3')
    .attr('result', 'coloredBlur');
  const feMerge = filter.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'coloredBlur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  
  // Update simulation
  simulation.nodes(state.graph.nodes)
    .on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  
  simulation.force('link').links(state.graph.links);
  simulation.alpha(1).restart();
}

// Get node color based on type
function getNodeColor(type) {
  const colors = {
    'CONCEPT': '#00F6FF',
    'FACT': '#9EFFFD',
    'CORRECTION': '#F000B8',
    'TRACK': '#FFD700',
    'PROJECT': '#7CFC00'
  };
  return colors[type] || '#888';
}

// Drag handlers
function dragStarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragEnded(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

// Switch view
export function switchView(viewName) {
  state.activeView = viewName;
  
  // Update buttons
  document.querySelectorAll('[data-view]').forEach(btn => {
    if (btn.dataset.view === viewName) {
      btn.classList.add('bg-brand-accent', 'text-brand-primary');
      btn.classList.remove('bg-brand-secondary', 'text-brand-text-muted');
    } else {
      btn.classList.remove('bg-brand-accent', 'text-brand-primary');
      btn.classList.add('bg-brand-secondary', 'text-brand-text-muted');
    }
  });
  
  // Show/hide views
  document.querySelectorAll('.view-container').forEach(view => {
    view.classList.add('hidden');
  });
  
  const activeView = document.getElementById(`${viewName.toLowerCase()}-view`);
  if (activeView) {
    activeView.classList.remove('hidden');
  }
  
  // Initialize view-specific content
  if (viewName === 'STORYBOARD') {
    renderStoryboard();
  } else if (viewName === 'JOURNAL') {
    renderJournal();
  } else if (viewName === 'IDEAROOM') {
    initializeIdeaRoom();
  }
}

// Send message
export async function sendMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  
  const message = input.value.trim();
  if (!message) return;
  
  input.value = '';
  input.disabled = true;
  
  // Add user message
  addMessage('user', message);
  
  // Check for Python command
  if (message.startsWith('/py') || message.startsWith('/python')) {
    const code = message.replace(/^\/(py|python)\s+/, '');
    await handlePythonCommand(code);
    input.disabled = false;
    return;
  }
  
  // Check for MIDI command
  if (message.startsWith('/midi')) {
    const cmd = message.replace(/^\/midi\s+/, '');
    await handleMidiCommand(cmd);
    input.disabled = false;
    return;
  }
  
  // Check reflexes
  const lowerMsg = message.toLowerCase();
  for (const [trigger, response] of Object.entries(REFLEXES)) {
    if (lowerMsg.includes(trigger)) {
      addMessage('assistant', response);
      input.disabled = false;
      return;
    }
  }
  
  // Get context
  const contextNodes = getContextForQuery(message);
  state.activeContext = new Set(contextNodes.map(n => n.id));
  renderGraph();
  
  // Add thinking indicator
  addMessage('assistant', '...', true);
  
  try {
    // Send to AI
    const response = await fetch(`${WORKER_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        mode: state.activeView,
        history: state.messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        persona: 'qore',
        contextNodes: contextNodes.map(n => ({
          label: n.label,
          type: n.type,
          content: n.content,
          tags: n.tags
        }))
      })
    });
    
    const data = await response.json();
    
    // Remove thinking indicator
    const chatContainer = document.getElementById('chat-messages');
    const thinkingMsg = chatContainer.querySelector('.thinking');
    if (thinkingMsg) thinkingMsg.remove();
    
    // Add AI response
    addMessage('assistant', data.reply);
    
    // Parse memory updates
    parseMemoryUpdates(data.reply);
    
    // Update neurochemistry
    updateNeurochemistry('chat');
    
  } catch (error) {
    console.error('Chat error:', error);
    const chatContainer = document.getElementById('chat-messages');
    const thinkingMsg = chatContainer.querySelector('.thinking');
    if (thinkingMsg) thinkingMsg.remove();
    
    addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
  }
  
  input.disabled = false;
  input.focus();
}

// Add message to chat
function addMessage(role, content, isThinking = false) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `mb-4 ${role === 'user' ? 'text-right' : 'text-left'} ${isThinking ? 'thinking' : ''}`;
  
  const bubble = document.createElement('div');
  bubble.className = `inline-block px-4 py-2 rounded-lg max-w-[80%] ${
    role === 'user' 
      ? 'bg-brand-accent text-brand-primary' 
      : 'bg-brand-secondary text-brand-text'
  }`;
  
  if (isThinking) {
    bubble.innerHTML = '<div class="animate-pulse">...</div>';
  } else {
    // Render markdown
    bubble.innerHTML = marked.parse(content);
  }
  
  msgDiv.appendChild(bubble);
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
  
  // Store in state
  if (!isThinking) {
    state.messages.push({ role, content, timestamp: Date.now() });
  }
}

// Get context nodes for query
function getContextForQuery(query) {
  const words = query.toLowerCase().split(/\s+/);
  const scored = state.graph.nodes.map(node => {
    let score = 0;
    const nodeText = `${node.label} ${node.content} ${node.tags}`.toLowerCase();
    
    words.forEach(word => {
      if (nodeText.includes(word)) score += 1;
    });
    
    return { node, score };
  });
  
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.node);
}

// Parse memory updates from XML
function parseMemoryUpdates(text) {
  const memoryMatch = text.match(/<memory_update>([\s\S]*?)<\/memory_update>/);
  if (!memoryMatch) return;
  
  const xmlText = memoryMatch[1];
  
  // Parse nodes
  const nodeRegex = /<node id="([^"]+)" label="([^"]+)" type="([^"]+)" tags="([^"]*)">([^<]*)<\/node>/g;
  let match;
  
  while ((match = nodeRegex.exec(xmlText)) !== null) {
    const [, id, label, type, tags, content] = match;
    
    // Check if node exists
    const existingNode = state.graph.nodes.find(n => n.id === id);
    if (existingNode) {
      existingNode.content = content.trim();
      existingNode.tags = tags;
    } else {
      state.graph.nodes.push({
        id,
        label,
        type,
        content: content.trim(),
        tags,
        x: Math.random() * 600 + 100,
        y: Math.random() * 400 + 100
      });
    }
  }
  
  // Parse links
  const linkRegex = /<link source="([^"]+)" target="([^"]+)" rel="([^"]+)" strength="([^"]+)" \/>/g;
  
  while ((match = linkRegex.exec(xmlText)) !== null) {
    const [, source, target, rel, strength] = match;
    
    // Check if link exists (handle both string IDs and D3 node objects)
    const existingLink = state.graph.links.find(l => {
      const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
      const targetId = typeof l.target === 'string' ? l.target : l.target.id;
      return sourceId === source && targetId === target;
    });
    
    if (existingLink) {
      existingLink.strength = parseFloat(strength);
    } else {
      state.graph.links.push({
        source,
        target,
        rel,
        strength: parseFloat(strength)
      });
    }
  }
  
  // Re-render graph
  renderGraph();
}

// Update neurochemistry
function updateNeurochemistry(action) {
  const changes = {
    'chat': { dopamine: 2, serotonin: 1, acetylcholine: 3 },
    'create': { dopamine: 5, serotonin: 2 },
    'learn': { acetylcholine: 5, norepinephrine: 3 }
  };
  
  const change = changes[action] || {};
  
  Object.keys(change).forEach(chem => {
    state.neurochemistry[chem] = Math.min(100, state.neurochemistry[chem] + change[chem]);
  });
  
  // Decay over time
  Object.keys(state.neurochemistry).forEach(chem => {
    state.neurochemistry[chem] = Math.max(0, state.neurochemistry[chem] - 0.5);
  });
  
  renderNeurochemistry();
}

// Render neurochemistry
function renderNeurochemistry() {
  Object.keys(state.neurochemistry).forEach(chem => {
    const bar = document.getElementById(`${chem}-bar`);
    if (bar) {
      bar.style.width = `${state.neurochemistry[chem]}%`;
    }
  });
}

// Open node inspector
export function openNodeInspector(node) {
  const modal = document.getElementById('node-inspector');
  if (!modal) return;
  
  document.getElementById('node-label').textContent = node.label;
  document.getElementById('node-type').textContent = node.type;
  document.getElementById('node-content').textContent = node.content;
  document.getElementById('node-tags').textContent = node.tags;
  
  // Store current node
  modal.dataset.nodeId = node.id;
  
  modal.classList.remove('hidden');
}

// Close node inspector
export function closeNodeInspector() {
  const modal = document.getElementById('node-inspector');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Analyze potential (divergent thinking)
export async function analyzeNodePotential() {
  const modal = document.getElementById('node-inspector');
  const nodeId = modal.dataset.nodeId;
  const node = state.graph.nodes.find(n => n.id === nodeId);
  
  if (!node) return;
  
  const prompt = `Given this concept: "${node.label}" (${node.content}), what are 5 creative potential applications or connections? Be brief.`;
  
  addMessage('assistant', '🔮 Analyzing potential...', true);
  
  try {
    const response = await fetch(`${WORKER_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        persona: 'qore'
      })
    });
    
    const data = await response.json();
    
    const chatContainer = document.getElementById('chat-messages');
    const thinkingMsg = chatContainer.querySelector('.thinking');
    if (thinkingMsg) thinkingMsg.remove();
    
    addMessage('assistant', data.reply);
  } catch (error) {
    console.error('Analyze error:', error);
  }
}

// Dream protocol (lateral connections)
export function dreamProtocol() {
  const modal = document.getElementById('node-inspector');
  const nodeId = modal.dataset.nodeId;
  const node = state.graph.nodes.find(n => n.id === nodeId);
  
  if (!node) return;
  
  // Find random unconnected nodes (handle both string IDs and D3 node objects)
  const connectedIds = new Set(
    state.graph.links
      .filter(l => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
        const targetId = typeof l.target === 'string' ? l.target : l.target.id;
        return sourceId === nodeId || targetId === nodeId;
      })
      .map(l => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
        const targetId = typeof l.target === 'string' ? l.target : l.target.id;
        return sourceId === nodeId ? targetId : sourceId;
      })
  );
  
  const unconnected = state.graph.nodes.filter(n => 
    n.id !== nodeId && !connectedIds.has(n.id)
  );
  
  if (unconnected.length > 0) {
    const randomNode = unconnected[Math.floor(Math.random() * unconnected.length)];
    
    state.graph.links.push({
      source: nodeId,
      target: randomNode.id,
      rel: 'dream_connection',
      strength: 0.3
    });
    
    addMessage('assistant', `💭 Dream connection: "${node.label}" ↔ "${randomNode.label}"`);
    renderGraph();
  }
}

// Delete node
export function deleteNode() {
  const modal = document.getElementById('node-inspector');
  const nodeId = modal.dataset.nodeId;
  
  if (!confirm('Delete this node and all its connections?')) return;
  
  state.graph.nodes = state.graph.nodes.filter(n => n.id !== nodeId);
  // Handle both string IDs and D3 node objects
  state.graph.links = state.graph.links.filter(l => {
    const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
    const targetId = typeof l.target === 'string' ? l.target : l.target.id;
    return sourceId !== nodeId && targetId !== nodeId;
  });
  );
  
  closeNodeInspector();
  renderGraph();
  addMessage('assistant', '🗑️ Node deleted');
}

// Python command handler
async function handlePythonCommand(code) {
  const terminalOutput = document.getElementById('terminal-output');
  const terminal = document.getElementById('python-terminal');
  
  if (terminal) {
    terminal.classList.remove('hidden');
  }
  
  if (terminalOutput) {
    terminalOutput.textContent = 'Executing...\n';
  }
  
  try {
    const result = await pythonService.execute(code);
    
    if (terminalOutput) {
      if (result.success) {
        terminalOutput.textContent = result.output || result.result || 'Execution complete';
      } else {
        terminalOutput.textContent = `Error: ${result.error}`;
      }
    }
    
    addMessage('assistant', `Python: ${result.success ? '✓' : '✗'} ${result.output || result.error}`);
  } catch (error) {
    if (terminalOutput) {
      terminalOutput.textContent = `Error: ${error.message}`;
    }
    addMessage('assistant', `Python error: ${error.message}`);
  }
}

// MIDI command handler
async function handleMidiCommand(command) {
  try {
    const result = await midiService.executeCommand(command);
    addMessage('assistant', `MIDI: ${result.message}`);
  } catch (error) {
    addMessage('assistant', `MIDI error: ${error.message}`);
  }
}

// Initialize services
async function initializeServices() {
  // Python status
  const pythonStatus = document.getElementById('python-status');
  if (pythonStatus) {
    pythonStatus.textContent = 'Initializing...';
    try {
      await pythonService.initialize();
      pythonStatus.textContent = 'Python: Ready';
      pythonStatus.className = 'text-green-400 text-sm';
    } catch (error) {
      pythonStatus.textContent = 'Python: Unavailable';
      pythonStatus.className = 'text-red-400 text-sm';
    }
  }
  
  // MIDI status
  const midiStatus = document.getElementById('midi-status');
  if (midiStatus) {
    const status = await midiService.initialize();
    midiStatus.textContent = `MIDI: ${status.message}`;
    midiStatus.className = status.status === 'ready' ? 'text-green-400 text-sm' : 'text-yellow-400 text-sm';
  }
}

// Storyboard rendering
function renderStoryboard() {
  const container = document.getElementById('storyboard-scenes');
  if (!container) return;
  
  container.innerHTML = '';
  
  state.scenes.forEach((scene, index) => {
    const sceneDiv = document.createElement('div');
    sceneDiv.className = 'bg-brand-secondary p-4 rounded-lg border border-brand-accent/20';
    sceneDiv.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <h3 class="font-bold text-brand-accent">Scene ${index + 1}</h3>
        <button onclick="deleteScene(${index})" class="text-red-400 hover:text-red-300">✕</button>
      </div>
      <p class="text-sm text-brand-text-muted">${scene.description}</p>
      <div class="mt-2 text-xs text-brand-text-muted">${scene.dialogue || ''}</div>
    `;
    container.appendChild(sceneDiv);
  });
}

// Journal rendering
function renderJournal() {
  const editor = document.getElementById('journal-editor');
  const preview = document.getElementById('journal-preview');
  
  if (editor) {
    editor.value = state.journalContent;
    
    editor.oninput = () => {
      state.journalContent = editor.value;
      if (preview) {
        preview.innerHTML = marked.parse(state.journalContent);
      }
    };
  }
  
  if (preview) {
    preview.innerHTML = marked.parse(state.journalContent);
  }
}

// Idea Room initialization
function initializeIdeaRoom() {
  const canvas = document.getElementById('idea-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  ctx.strokeStyle = '#00F6FF';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  canvas.onmousedown = (e) => {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
  };
  
  canvas.onmousemove = (e) => {
    if (!isDrawing) return;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
  };
  
  canvas.onmouseup = () => isDrawing = false;
  canvas.onmouseout = () => isDrawing = false;
  
  // Color picker
  const colorPicker = document.getElementById('canvas-color');
  if (colorPicker) {
    colorPicker.onchange = (e) => {
      ctx.strokeStyle = e.target.value;
    };
  }
}

// Make functions available globally
window.closeNodeInspector = closeNodeInspector;
window.analyzeNodePotential = analyzeNodePotential;
window.dreamProtocol = dreamProtocol;
window.deleteNode = deleteNode;
