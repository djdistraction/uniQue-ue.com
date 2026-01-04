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
      state.currentUser = user;
      
      if (user) {
        console.log('User authenticated:', user.uid);
        hideChatStatus();
        
        // Load brain state from Firestore
        await loadBrainState();
        
        // Initialize UI
        initializeUI();
        
        // Initialize services
        initializeServices();
        
        // Start auto-save
        startAutoSave();
        
        resolve();
      } else {
        console.log('User not authenticated');
        showChatStatus('You must be logged in to use The Qore. Redirecting...', 'error');
        
        // Redirect after 2 seconds
        setTimeout(() => {
          window.location.href = '/profile.html';
        }, 2000);
      }
    });
  });
}

// Show chat status banner
function showChatStatus(message, type = 'error') {
  const banner = document.getElementById('chat-status-banner');
  const messageEl = document.getElementById('chat-status-message');
  
  if (!banner || !messageEl) return;
  
  messageEl.textContent = message;
  banner.className = `px-4 py-2 border-b text-xs ${
    type === 'error' ? 'bg-red-900/50 border-red-500/50 text-red-200' :
    type === 'success' ? 'bg-green-900/50 border-green-500/50 text-green-200' :
    'bg-yellow-900/50 border-yellow-500/50 text-yellow-200'
  }`;
  banner.classList.remove('hidden');
  
  if (type === 'success') {
    setTimeout(() => {
      banner.classList.add('hidden');
    }, 3000);
  }
}

// Hide chat status banner
function hideChatStatus() {
  const banner = document.getElementById('chat-status-banner');
  if (banner) banner.classList.add('hidden');
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
  console.log('Initializing UI...');
  
  // Fix view switching with proper event listeners
  const viewButtons = document.querySelectorAll('[data-view]');
  
  if (viewButtons.length === 0) {
    console.error('No view mode buttons found!');
  }
  
  viewButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      console.log('View button clicked:', view);
      
      if (view) {
        switchView(view);
      } else {
        console.error('Button missing data-view attribute');
      }
    });
  });
  
  // Chat input with improved handling
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-message');
  
  if (!sendBtn || !chatInput) {
    console.error('Send button or input not found!');
    return;
  }
  
  // Visual feedback for button state
  const setButtonState = (loading) => {
    if (loading) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<svg class="w-4 h-4 animate-spin inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Sending...';
    } else {
      sendBtn.disabled = false;
      sendBtn.innerHTML = 'Send <i class="fas fa-paper-plane ml-2"></i>';
    }
  };
  
  const handleSend = async () => {
    const text = chatInput.value.trim();
    if (!text) {
      console.log('Empty message, ignoring');
      return;
    }
    
    console.log('Sending message:', text);
    setButtonState(true);
    
    try {
      await sendMessage();
    } catch (error) {
      console.error('Send error:', error);
      showChatStatus('Failed to send message: ' + error.message, 'error');
    } finally {
      setButtonState(false);
    }
  };
  
  sendBtn.addEventListener('click', handleSend);
  
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  
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
  
  // Wait for Firebase auth and graph data to load, then render
  setTimeout(() => {
    if (state.graph.nodes.length > 0) {
      console.log('Rendering initial graph with', state.graph.nodes.length, 'nodes');
      renderGraph();
    } else {
      console.error('No graph nodes to render!');
    }
  }, 1000);
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
  console.log('Switching to view:', viewName);
  state.activeView = viewName;
  
  // Update buttons - remove active from all, add to clicked
  const viewButtons = document.querySelectorAll('[data-view]');
  viewButtons.forEach(btn => {
    if (btn.dataset.view === viewName) {
      btn.classList.add('bg-brand-accent', 'text-brand-primary');
      btn.classList.remove('bg-brand-secondary', 'text-brand-text-muted');
    } else {
      btn.classList.remove('bg-brand-accent', 'text-brand-primary');
      btn.classList.add('bg-brand-secondary', 'text-brand-text-muted');
    }
  });
  
  // Hide all views
  const allViews = document.querySelectorAll('.view-container');
  allViews.forEach(panel => {
    panel.classList.add('hidden');
  });
  
  // Show selected view
  const viewMap = {
    'GRAPH': 'graph-view',
    'STORYBOARD': 'storyboard-view',
    'IDEAROOM': 'idearoom-view',
    'JOURNAL': 'journal-view'
  };
  
  const targetId = viewMap[viewName];
  const targetView = document.getElementById(targetId);
  
  if (targetView) {
    targetView.classList.remove('hidden');
    console.log('View switched to:', targetId);
  } else {
    console.error('Target view not found:', targetId);
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
  console.log('=== SEND MESSAGE START ===');
  
  const input = document.getElementById('chat-input');
  if (!input) {
    console.error('Chat input not found!');
    return;
  }
  
  const message = input.value.trim();
  if (!message) {
    console.log('Empty message, aborting');
    return;
  }
  
  console.log('Text:', message);
  console.log('Current user:', state.currentUser?.uid);
  console.log('Worker URL:', WORKER_URL);
  
  input.value = '';
  input.disabled = true;
  
  // Add user message
  addMessage('user', message);
  
  // Check for Python command
  if (message.startsWith('/py') || message.startsWith('/python')) {
    const code = message.replace(/^\/(py|python)\s+/, '');
    await handlePythonCommand(code);
    input.disabled = false;
    console.log('=== SEND MESSAGE END (Python) ===');
    return;
  }
  
  // Check for MIDI command
  if (message.startsWith('/midi')) {
    const cmd = message.replace(/^\/midi\s+/, '');
    await handleMidiCommand(cmd);
    input.disabled = false;
    console.log('=== SEND MESSAGE END (MIDI) ===');
    return;
  }
  
  // Check reflexes
  const lowerMsg = message.toLowerCase();
  for (const [trigger, response] of Object.entries(REFLEXES)) {
    if (lowerMsg.includes(trigger)) {
      addMessage('assistant', response);
      input.disabled = false;
      console.log('=== SEND MESSAGE END (Reflex) ===');
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
    console.log('Sending to worker...');
    // Send to AI
    const response = await fetch(`${WORKER_URL}/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
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
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Worker response:', data);
    
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
    console.error('Fetch error:', error);
    const chatContainer = document.getElementById('chat-messages');
    const thinkingMsg = chatContainer.querySelector('.thinking');
    if (thinkingMsg) thinkingMsg.remove();
    
    addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    showChatStatus(`Connection failed: ${error.message}`, 'error');
  }
  
  input.disabled = false;
  input.focus();
  console.log('=== SEND MESSAGE END ===');
}

// Add message to chat
function addMessage(role, content, isThinking = false) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `mb-4 ${role === 'user' ? 'text-right' : 'text-left'} ${isThinking ? 'thinking' : ''}`;
  
  const bubble = document.createElement('div');
  bubble.className = `message-bubble inline-block rounded-lg max-w-[80%] ${
    role === 'user' 
      ? 'message-bubble user' 
      : 'message-bubble model'
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
