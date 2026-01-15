# Asynchronous Corporate System - Implementation Guide

## Overview

This system transforms uniQue-ue.com into an asynchronous autonomous corporate system using "The Factory Model" - where AI agents accept jobs, process them in the background, and report back.

## Architecture

```
User Request → /chat (Queue Job) → Firestore → Cron Worker → AI Processing → Memory Update
     ↓                                              ↓
  Job ID Returned                            Job Completed
     ↓                                              ↓
  Poll Status ←──────────────────────────── Firestore Update
```

## Components

### 1. Executive Personas

Four specialized AI personas replace generic system prompts:

| Executive | Role | Specialization |
|-----------|------|----------------|
| **Alani** | COIO (Chief Integration Officer) | Manages flow, breaks down complex tasks |
| **Ronan** | CTDO (Chief Technical Development Officer) | Production-ready code, no placeholders |
| **Elias** | CFRO (Chief Financial & Risk Officer) | Profit optimization, risk assessment |
| **Theo** | CCPO (Chief Creative & Product Officer) | Brand voice, creative direction |

### 2. Job Queue System

**Firestore Collection: `job_queue`**

Job Document Structure:
```javascript
{
  job_id: "job_1234567890_abc123",
  user_id: "firebase-user-id",
  message: "User's request",
  mode: "focus mode (optional)",
  history: "[{role, content}, ...]",
  persona: "alani|ronan|elias|theo",
  contextNodes: "[{label, type, content, tags}, ...]",
  status: "PENDING|PROCESSING|COMPLETED",
  created_at: "ISO timestamp",
  processing_started: "ISO timestamp (when PROCESSING)",
  completed_at: "ISO timestamp (when COMPLETED)",
  response: "AI response text",
  processing_time_ms: 1234,
  memory_updated: true
}
```

### 3. Corporate Memory System

**Firestore Collection: `corporate_memory`**

Memory Document Structure:
```javascript
{
  user_id: "firebase-user-id",
  nodes: "[{id, label, type, tags, content}, ...]",
  links: "[{source, target, rel, strength}, ...]",
  created_at: "ISO timestamp"
}
```

**XML Memory Format** (in AI responses):
```xml
<memory_update>
  <nodes>
    <node id="unique_id" label="Short Title" type="CONCEPT|FACT|CORRECTION" tags="tag1,tag2">
      Detailed explanation
    </node>
  </nodes>
  <links>
    <link source="id1" target="id2" rel="relationship" strength="1.0" />
  </links>
</memory_update>
```

### 4. Reflex Layer

Instant responses for simple patterns (no AI call):
- `hello` → "Hello! I'm here to help..."
- `hi` → "Hi there! How can I help you today?"
- `help` → "I can assist with various tasks..."
- `status` → "All systems operational..."
- `ping` → "pong"

## Deployment Steps

### Step 1: Configure Firestore

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `unique-ue-website`
3. Navigate to **Firestore Database**
4. Create the following collections:
   - `job_queue`
   - `corporate_memory`
5. Set up security rules (for development):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Job queue - allow authenticated users to create and read their jobs
    match /job_queue/{jobId} {
      allow create: if request.auth != null;
      allow read: if true; // Allow worker to read
      allow update: if true; // Allow worker to update
    }
    
    // Corporate memory - allow authenticated users to read their memories
    match /corporate_memory/{memoryId} {
      allow read: if request.auth != null;
      allow create, update: if true; // Allow worker to write
    }
  }
}
```

### Step 2: Get Firebase Service Account Credentials

1. In Firebase Console → Project Settings → **Service accounts**
2. Click **Generate new private key** and download the JSON file
3. Keep the JSON secure; you will paste its full contents into the worker secret
4. Your `FIREBASE_PROJECT_ID` is `unique-ue-website`

### Step 3: Configure Cloudflare Worker Secrets

```bash
# Navigate to your project
cd /path/to/uniQue-ue.com

# Set Firebase credentials
wrangler secret put FIREBASE_PROJECT_ID
# Enter: unique-ue-website

wrangler secret put FIREBASE_SERVICE_ACCOUNT
# Paste the full JSON file contents (not the filename).
# Tip: you can also run `wrangler secret put FIREBASE_SERVICE_ACCOUNT < service-account.json`

# Verify existing secrets
wrangler secret list
```

Expected secrets:
- ✅ GEMINI_API_KEY
- ✅ ADMIN_ACCESS_CODE
- ✅ FIREBASE_PROJECT_ID (new)
- ✅ FIREBASE_SERVICE_ACCOUNT (new)

### Step 4: Deploy the Worker

```bash
# Deploy with cron trigger
wrangler deploy

# Verify deployment
curl https://unique-ue-api.unique-ue-ai-proxy.workers.dev/health
```

Expected response:
```json
{
  "status": "Online",
  "model": "gemini-2.5-flash",
  "apiKeyConfigured": true,
  "firestoreConfigured": true,
  "message": "System Ready"
}
```

### Step 5: Test the Async System

**Test 1: Queue a Job**
```bash
curl -X POST https://unique-ue-api.unique-ue-ai-proxy.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, what can you help me with?",
    "persona": "alani",
    "userId": "test-user"
  }'
```

Expected response:
```json
{
  "status": "queued",
  "job_id": "job_1234567890_abc123",
  "message": "Alani has queued this task.",
  "executive": "COIO"
}
```

**Test 2: Check Job Status**
```bash
curl https://unique-ue-api.unique-ue-ai-proxy.workers.dev/job-status/job_1234567890_abc123
```

Expected response (pending):
```json
{
  "job_id": "job_1234567890_abc123",
  "status": "PENDING",
  "response": null,
  "created_at": "2024-01-13T19:00:00.000Z",
  "completed_at": null,
  "processing_time_ms": null
}
```

Expected response (completed, after cron runs):
```json
{
  "job_id": "job_1234567890_abc123",
  "status": "COMPLETED",
  "response": "I'm Alani, Chief Integration Officer...",
  "created_at": "2024-01-13T19:00:00.000Z",
  "completed_at": "2024-01-13T19:01:05.123Z",
  "processing_time_ms": 65123
}
```

### Step 6: Monitor with Overseer Dashboard

1. Open: `https://unique-ue.com/overseer.html`
2. You should see:
   - **Live Job Feed** tab showing active jobs
   - **Corporate Cortex** tab showing memory nodes
   - **Executives** tab showing all 4 personas
3. Jobs auto-refresh every 3 seconds via Firestore real-time listener

## API Reference

### POST /chat
Queue an async job.

**Request:**
```json
{
  "message": "string (required)",
  "persona": "alani|ronan|elias|theo (optional, default: alani)",
  "mode": "string (optional)",
  "history": "[{role, content}] (optional)",
  "contextNodes": "[{label, type, content, tags}] (optional)",
  "userId": "string (optional)"
}
```

**Response:**
```json
{
  "status": "queued",
  "job_id": "string",
  "message": "string",
  "executive": "string"
}
```

### GET /job-status/:jobId
Check job status.

**Response:**
```json
{
  "job_id": "string",
  "status": "PENDING|PROCESSING|COMPLETED",
  "response": "string|null",
  "created_at": "ISO timestamp",
  "completed_at": "ISO timestamp|null",
  "processing_time_ms": "number|null"
}
```

### GET /jobs?userId=
List user's jobs (placeholder - needs full implementation).

### GET /memory?userId=
Get corporate memories (placeholder - needs full implementation).

### GET /health
System health check.

**Response:**
```json
{
  "status": "Online",
  "model": "gemini-2.5-flash",
  "apiKeyConfigured": true,
  "firestoreConfigured": true,
  "message": "System Ready"
}
```

## Cron Trigger

**Schedule:** Every minute (`* * * * *`)

**Process:**
1. Query Firestore for oldest PENDING job
2. Lock job (set status to PROCESSING)
3. Check reflex layer for instant response
4. If no reflex, call Gemini AI with persona context
5. Parse XML memory updates
6. Save memory to `corporate_memory` collection
7. Update job status to COMPLETED with response

**View Logs:**
```bash
wrangler tail
```

## Client Integration

### Example: Update The Qore to use async system

In `qore-core.js`, modify the `sendMessage` function:

```javascript
// Send to AI (async version)
const response = await fetch(`${WORKER_URL}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message,
    mode: state.activeView,
    history: state.messages.slice(-10),
    persona: 'qore',
    contextNodes: contextNodes,
    userId: state.currentUser?.uid
  })
});

const data = await response.json();

if (data.status === 'queued') {
  // Show queued message
  addMessage('assistant', `⏳ ${data.message}`, true);
  
  // Poll for completion
  const jobId = data.job_id;
  const pollInterval = setInterval(async () => {
    const statusResponse = await fetch(`${WORKER_URL}/job-status/${jobId}`);
    const statusData = await statusResponse.json();
    
    if (statusData.status === 'COMPLETED') {
      clearInterval(pollInterval);
      
      // Remove queued message
      const thinkingMsg = chatContainer.querySelector('.thinking');
      if (thinkingMsg) thinkingMsg.remove();
      
      // Add response
      addMessage('assistant', statusData.response);
      parseMemoryUpdates(statusData.response);
    }
  }, 3000); // Poll every 3 seconds
}
```

## Troubleshooting

### Jobs stuck in PENDING
- Check cron trigger is active: `wrangler deployments list`
- View cron logs: `wrangler tail --format pretty`
- Verify Firestore permissions allow worker to read/write

### Firestore connection errors
- Verify `FIREBASE_PROJECT_ID` is correct
- Verify `FIREBASE_API_KEY` is the Web API Key (not server key)
- Check Firestore is enabled in Firebase Console

### Memory updates not saving
- Check AI response contains `<memory_update>` XML block
- View logs to see if parsing succeeded
- Verify `corporate_memory` collection exists

### Reflex not working
- Reflexes are case-insensitive
- Check message matches trigger exactly
- Add more reflexes to `REFLEXES` object in api-worker.js

## Performance Notes

- **Cron Interval:** Currently 1 minute - can be reduced to `*/30 * * * *` (every 30 seconds) for faster processing
- **Reflex Layer:** Bypasses AI call, responds in <100ms
- **Firestore Queries:** Uses indexed orderBy on `created_at` field
- **Real-time Updates:** Overseer uses Firestore onSnapshot for live updates

## Future Enhancements

1. **Priority Queue:** Add priority field to jobs for VIP users
2. **Batch Processing:** Process multiple PENDING jobs per cron run
3. **Job Expiration:** Auto-cleanup old completed jobs
4. **Analytics:** Track processing times, success rates per executive
5. **Webhooks:** Notify users when job completes via email/SMS
6. **Advanced Memory:** Graph visualization with D3.js force-directed layout
7. **Multi-tenant:** Separate job queues per organization

## License

See LICENSE.txt in repository root.
