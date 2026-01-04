# Subscription & Monetization System - Implementation Guide

## Overview

This document describes the complete subscription and monetization system implemented for uniQue-ue.com, including all 5 tiers, payment integration points, and feature access control.

---

## System Architecture

### Tier Structure

#### 1. FREE TIER ($0)
**Features:**
- ✅ Full Writer's Room access
- ✅ Full Graphics Studio access
- ✅ All utility tools
- ❌ No project saving
- ❌ No Qore memory persistence

**Access Control:**
- No authentication required
- Limited to browser session only
- No persistent data storage

#### 2. PRO TIER ($14.99/mo or $143.90/yr)
**Features:**
- ✅ Everything in Free
- ✅ The Qore access with persistent memory
- ✅ Unlimited project saves
- ✅ Auto context passing between tools
- ✅ Cloud sync
- ✅ Can purchase tools à la carte

**Access Control:**
- Requires user authentication
- `subscriptionManager.canAccessQore()` → true
- `subscriptionManager.canSaveProjects()` → true
- Individual tool access via purchases

#### 3. CREATOR TIER ($49.99/mo or $479.90/yr)
**Features:**
- ✅ Everything in Pro
- ✅ ALL tools unlocked automatically
- ✅ Commercial usage rights
- ✅ Monthly limits:
  - 500 images/month
  - 100 animations/month
  - 10,000 API calls/month
- ✅ Extend limits: +$4.99/mo per increment adds:
  - +500 images
  - +100 animations
  - +10,000 API calls

**Access Control:**
- All tools unlocked by default
- Usage tracking enabled
- Limit extension management via billing page

#### 4. LIFETIME TIER ($499 one-time)
**Features:**
- ✅ Everything unlocked
- ✅ NO LIMITS ever
- ✅ Early access to features (30 days)
- ✅ Lifetime updates
- ✅ API access
- ✅ Never pay again

**Access Control:**
- All tools and features unlocked
- No usage tracking
- `subscriptionManager.getMonthlyLimits()` → Infinity

#### 5. DEVELOPER TIER (Invitation Only)
**Access Control:**
- Hardcoded email check: `djdistraction@unique-ue.com`
- OR database flag: `isDeveloper === true`
- Cannot be revoked

**Features:**
- ✅ Everything in Lifetime
- ✅ Truly unlimited - no caps
- ✅ Admin panel (`/admin.html`)
- ✅ Backend database access
- ✅ Debug mode with system logs
- ✅ User impersonation
- ✅ Revenue dashboard
- ✅ Feature flag toggles

---

## File Structure

### New Pages

#### `/pricing.html`
- Main pricing page with tier cards
- Billing toggle (Monthly/Yearly with 20% savings)
- À la carte tools grid
- Creator limit extension section
- Responsive design with particle background

#### `/billing.html`
- User billing dashboard
- Current tier display
- Usage statistics (Creator tier)
- Limit extension manager
- Active subscriptions list
- Payment method management
- Invoice history

#### `/projects.html`
- Project manager (Pro+ only)
- Create/rename/delete projects
- Search and filter functionality
- Project cards with tool icons
- Integrates with Firestore

#### `/tools.html`
- Tool marketplace
- Lock/unlock status indicators
- Tool descriptions and features
- Demo links
- Filter by status (all/locked/unlocked)

#### `/admin.html`
- Developer-only admin panel
- Revenue dashboard (MRR, active subs, lifetime revenue)
- User management table
- System status monitors
- Feature flag toggles
- Activity log
- Database tools

### Core System Files

#### `/subscription-manager.js`
**SubscriptionManager class:**
```javascript
class SubscriptionManager {
  // Tier checking
  canAccessQore()
  canSaveProjects()
  canAccessTool(toolId)
  
  // Usage management
  getMonthlyLimits()
  hasReachedLimit(type)
  incrementUsage(type, amount)
  resetMonthlyUsage()
  
  // Tool management
  unlockTool(toolId)
  
  // Limit extensions (Creator only)
  updateLimitExtensions(type, count)
  
  // Admin
  isAdmin()
}
```

**Functions:**
```javascript
getCurrentSubscriptionManager()
initSubscriptionManager()
```

**Constants:**
```javascript
TIERS = {
  FREE: 'free',
  PRO: 'pro',
  CREATOR: 'creator',
  LIFETIME: 'lifetime',
  DEVELOPER: 'developer'
}

TOOLS = {
  MIDI_CONTROLLER: 'midi_controller',
  ANIMATION_STUDIO: 'animation_studio',
  ADVANCED_GRAPHICS: 'advanced_graphics',
  PYTHON_RUNTIME: 'python_runtime',
  DATA_ANALYZER: 'data_analyzer',
  VOICE_SYNTHESIS: 'voice_synthesis',
  WEB_SCRAPER: 'web_scraper'
}
```

### Modified Files

#### `/_header.html`
- Added pricing link to navigation
- Added tier badge container
- Mobile tier badge container

#### `/app.js`
- Import subscription-manager
- Initialize subscription manager on auth state change
- Display tier badge in header
- Global subscription manager access

#### `/profile.html`
- Enhanced profile view with subscription info
- Current tier display
- Upgrade CTA for lower tiers
- Quick links to billing and projects
- Admin panel link for developers

#### `/the-qore.html`
- Tier check modal on load
- Blocks access for Free tier
- Redirects to pricing for upgrade

#### `/api-worker.js`
Added endpoints:
```javascript
// Subscription endpoints
POST /api/subscribe
POST /api/purchase-tool
POST /api/update-limits
POST /api/webhook

// Admin endpoints
POST /api/admin/verify
GET /api/admin/revenue
GET /api/admin/users
```

---

## Firebase/Firestore Schema

### Users Collection: `/users/{userId}`
```javascript
{
  email: "user@example.com",
  subscriptionTier: "free" | "pro" | "creator" | "lifetime" | "developer",
  isDeveloper: false,
  stripeCustomerId: "cus_xxx",
  subscriptionStatus: "active" | "cancelled" | "past_due",
  unlockedTools: ["midi_controller", "animation_studio"],
  usage: {
    images: 45,
    animations: 12,
    apiCalls: 3421
  },
  limitExtensions: {
    images: 2,  // 2 x $4.99/mo
    animations: 1,
    apiCalls: 0
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Projects Collection: `/projects/{userId}/userProjects/{projectId}`
```javascript
{
  name: "My Novel",
  tool: "writer-room" | "graphics-studio" | "qore",
  content: { ... },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## Payment Integration (Stripe)

### Required Environment Variables

**Cloudflare Worker Secrets:**
```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put ADMIN_ACCESS_CODE
```

### Stripe Products/Prices to Create

#### Subscription Products
1. Pro Monthly: $14.99/mo (recurring)
2. Pro Yearly: $143.90/yr (recurring, 20% off)
3. Creator Monthly: $49.99/mo (recurring)
4. Creator Yearly: $479.90/yr (recurring, 20% off)
5. Lifetime: $499 (one-time)

#### À La Carte Tool Products
Each tool requires 3 price points:
- One-time purchase
- Monthly subscription
- Yearly subscription (20% off)

Tools:
1. MIDI Controller: $49 / $4.99/mo / $47.90/yr
2. Animation Studio: $39 / $3.99/mo / $38.30/yr
3. Advanced Graphics: $29 / $2.99/mo / $28.70/yr
4. Python Runtime: $29 / $2.99/mo / $28.70/yr
5. Data Analyzer: $19 / $1.99/mo / $19.10/yr
6. Voice Synthesis: $39 / $3.99/mo / $38.30/yr
7. Web Scraper: $29 / $2.99/mo / $28.70/yr

#### Limit Extension
- Creator Limit Extension: $4.99/mo (recurring)

### Webhook Events to Handle

```javascript
// Subscription events
'customer.subscription.created'
'customer.subscription.updated'
'customer.subscription.deleted'
'customer.subscription.trial_will_end'

// Payment events
'invoice.payment_succeeded'
'invoice.payment_failed'

// Checkout events
'checkout.session.completed'
```

### Implementation Flow

#### 1. Subscribe to Plan
```javascript
// Frontend
const response = await fetch(`${WORKER_URL}/api/subscribe`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tier: 'pro',
    billingCycle: 'monthly',
    userId: user.uid
  })
});

// Backend creates Stripe checkout session
// Redirect user to Stripe checkout
// After payment, webhook updates user tier
```

#### 2. Purchase Tool
```javascript
// Frontend
const response = await fetch(`${WORKER_URL}/api/purchase-tool`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    toolId: 'midi_controller',
    billingType: 'onetime',
    userId: user.uid
  })
});

// Backend creates Stripe checkout session
// After payment, webhook adds tool to unlockedTools array
```

---

## Access Control Examples

### Checking Tier Access
```javascript
import { initSubscriptionManager } from './subscription-manager.js';

// Initialize
const manager = await initSubscriptionManager();

// Check access
if (manager.canAccessQore()) {
  // Show The Qore
} else {
  // Show upgrade modal
}

if (manager.canSaveProjects()) {
  // Enable save button
} else {
  // Disable save button
}

if (manager.canAccessTool('midi_controller')) {
  // Allow tool usage
} else {
  // Show lock icon and upgrade prompt
}
```

### Checking Usage Limits
```javascript
// Get limits
const limits = manager.getMonthlyLimits();
console.log(limits); // { images: 500, animations: 100, apiCalls: 10000 }

// Check if limit reached
if (manager.hasReachedLimit('images')) {
  alert('You have reached your monthly image limit!');
  return;
}

// Increment usage
await manager.incrementUsage('images', 1);
```

### Admin Access
```javascript
if (manager.isAdmin()) {
  // Show admin panel link
  // Enable debug features
}
```

---

## Testing Checklist

### Tier Restrictions
- [ ] Free tier cannot access The Qore
- [ ] Free tier cannot save projects
- [ ] Pro tier can access The Qore
- [ ] Pro tier can save projects
- [ ] Pro tier cannot access locked tools
- [ ] Creator tier has all tools unlocked
- [ ] Creator tier has usage limits
- [ ] Lifetime tier has no limits
- [ ] Developer tier has admin access

### Payment Flows
- [ ] Subscribe to Pro Monthly
- [ ] Subscribe to Pro Yearly
- [ ] Subscribe to Creator Monthly
- [ ] Subscribe to Creator Yearly
- [ ] Purchase Lifetime
- [ ] Purchase tool one-time
- [ ] Subscribe to tool monthly
- [ ] Subscribe to tool yearly
- [ ] Add limit extension
- [ ] Remove limit extension
- [ ] Cancel subscription
- [ ] Downgrade subscription

### Project Management
- [ ] Create project (Pro+)
- [ ] Rename project
- [ ] Delete project
- [ ] Open project
- [ ] Search projects
- [ ] Filter by tool
- [ ] Sort projects

### Admin Panel
- [ ] Access with developer email
- [ ] View revenue dashboard
- [ ] View users table
- [ ] Search users
- [ ] Toggle feature flags
- [ ] View activity log

---

## Future Enhancements

### Phase 2 (Stripe Integration)
- Complete Stripe checkout implementation
- Webhook processing
- Customer portal integration
- Invoice generation
- Email notifications

### Phase 3 (PayPal Integration)
- PayPal checkout flow
- PayPal webhook handling
- Multi-payment method support

### Phase 4 (Advanced Features)
- Usage analytics dashboard
- A/B testing for pricing
- Referral system
- Team/organization accounts
- Custom enterprise pricing

---

## Troubleshooting

### User Cannot Access The Qore
1. Check user is logged in
2. Verify subscriptionTier in Firestore
3. Check if tier is 'pro', 'creator', 'lifetime', or 'developer'
4. Clear browser cache and reload

### Tier Badge Not Showing
1. Ensure user is logged in
2. Check subscription-manager.js is imported
3. Verify initSubscriptionManager() is called
4. Check browser console for errors

### Project Save Failing
1. Verify user tier is Pro or higher
2. Check Firestore permissions
3. Verify project data structure
4. Check browser console for errors

### Admin Panel Access Denied
1. Verify user email matches developer email
2. Check isDeveloper flag in Firestore
3. Ensure user is logged in
4. Clear browser cache

---

## Contact

For questions or issues related to the subscription system:
- Developer: djdistraction@unique-ue.com
- Documentation: This file
- Admin Panel: /admin.html (Developer access only)
