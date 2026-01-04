/**
 * subscription-manager.js
 * Manages subscription tiers, feature access, and usage limits
 */

import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Tier constants
export const TIERS = {
  FREE: 'free',
  PRO: 'pro',
  CREATOR: 'creator',
  LIFETIME: 'lifetime',
  DEVELOPER: 'developer'
};

// Tool IDs for à la carte purchases
export const TOOLS = {
  MIDI_CONTROLLER: 'midi_controller',
  ANIMATION_STUDIO: 'animation_studio',
  ADVANCED_GRAPHICS: 'advanced_graphics',
  PYTHON_RUNTIME: 'python_runtime',
  DATA_ANALYZER: 'data_analyzer',
  VOICE_SYNTHESIS: 'voice_synthesis',
  WEB_SCRAPER: 'web_scraper'
};

// Developer email (hardcoded check)
const DEVELOPER_EMAIL = 'djdistraction@unique-ue.com';

/**
 * SubscriptionManager class
 * Handles all subscription and access control logic
 */
export class SubscriptionManager {
  constructor(user = null) {
    this.user = user;
    this.tier = TIERS.FREE;
    this.isDeveloper = false;
    this.unlockedTools = [];
    this.usage = {
      images: 0,
      animations: 0,
      apiCalls: 0
    };
    this.limitExtensions = {
      images: 0,
      animations: 0,
      apiCalls: 0
    };
    this.subscriptionStatus = 'active';
  }

  /**
   * Load user subscription data from Firestore
   */
  async loadUserData() {
    if (!this.user) {
      this.tier = TIERS.FREE;
      return;
    }

    try {
      // Check if user is developer by email
      if (this.user.email === DEVELOPER_EMAIL) {
        this.isDeveloper = true;
        this.tier = TIERS.DEVELOPER;
      }

      const userDoc = await getDoc(doc(db, 'users', this.user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        this.tier = data.subscriptionTier || TIERS.FREE;
        this.isDeveloper = data.isDeveloper || this.isDeveloper;
        this.unlockedTools = data.unlockedTools || [];
        this.usage = data.usage || this.usage;
        this.limitExtensions = data.limitExtensions || this.limitExtensions;
        this.subscriptionStatus = data.subscriptionStatus || 'active';

        // Override tier if developer flag is set
        if (this.isDeveloper) {
          this.tier = TIERS.DEVELOPER;
        }
      } else {
        // Create initial user document
        await this.createUserDocument();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.tier = TIERS.FREE;
    }
  }

  /**
   * Create initial user document in Firestore
   */
  async createUserDocument() {
    if (!this.user) return;

    const userData = {
      email: this.user.email,
      subscriptionTier: this.tier,
      isDeveloper: this.isDeveloper,
      stripeCustomerId: null,
      subscriptionStatus: 'active',
      unlockedTools: [],
      usage: {
        images: 0,
        animations: 0,
        apiCalls: 0
      },
      limitExtensions: {
        images: 0,
        animations: 0,
        apiCalls: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await setDoc(doc(db, 'users', this.user.uid), userData);
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  }

  /**
   * Update user subscription tier
   */
  async updateTier(newTier) {
    if (!this.user) return false;

    try {
      await updateDoc(doc(db, 'users', this.user.uid), {
        subscriptionTier: newTier,
        updatedAt: new Date()
      });
      this.tier = newTier;
      return true;
    } catch (error) {
      console.error('Error updating tier:', error);
      return false;
    }
  }

  /**
   * Check if user can access The Qore
   */
  canAccessQore() {
    return [TIERS.PRO, TIERS.CREATOR, TIERS.LIFETIME, TIERS.DEVELOPER].includes(this.tier);
  }

  /**
   * Check if user can save projects
   */
  canSaveProjects() {
    return [TIERS.PRO, TIERS.CREATOR, TIERS.LIFETIME, TIERS.DEVELOPER].includes(this.tier);
  }

  /**
   * Check if user can access a specific tool
   */
  canAccessTool(toolId) {
    // Developer, Lifetime, and Creator have access to all tools
    if ([TIERS.DEVELOPER, TIERS.LIFETIME, TIERS.CREATOR].includes(this.tier)) {
      return true;
    }
    
    // Pro users can access tools they've purchased
    if (this.tier === TIERS.PRO) {
      return this.unlockedTools.includes(toolId);
    }
    
    // Free tier has no tool access
    return false;
  }

  /**
   * Get monthly usage limits based on tier
   */
  getMonthlyLimits() {
    if (this.tier === TIERS.DEVELOPER || this.tier === TIERS.LIFETIME) {
      return {
        images: Infinity,
        animations: Infinity,
        apiCalls: Infinity
      };
    }
    
    if (this.tier === TIERS.CREATOR) {
      return {
        images: 500 + (this.limitExtensions.images * 500),
        animations: 100 + (this.limitExtensions.animations * 100),
        apiCalls: 10000 + (this.limitExtensions.apiCalls * 10000)
      };
    }
    
    // Free and Pro have no generation limits (they just can't save)
    return {
      images: 0,
      animations: 0,
      apiCalls: 0
    };
  }

  /**
   * Check if user has reached usage limit
   */
  hasReachedLimit(type) {
    const limits = this.getMonthlyLimits();
    const limit = limits[type];
    
    if (limit === Infinity) return false;
    if (limit === 0) return true;
    
    return this.usage[type] >= limit;
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(type, amount = 1) {
    if (!this.user) return false;
    
    // Don't track for unlimited tiers
    if (this.tier === TIERS.DEVELOPER || this.tier === TIERS.LIFETIME) {
      return true;
    }

    this.usage[type] += amount;

    try {
      await updateDoc(doc(db, 'users', this.user.uid), {
        usage: this.usage,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  }

  /**
   * Reset monthly usage (should be called by a scheduled function)
   */
  async resetMonthlyUsage() {
    if (!this.user) return false;

    this.usage = {
      images: 0,
      animations: 0,
      apiCalls: 0
    };

    try {
      await updateDoc(doc(db, 'users', this.user.uid), {
        usage: this.usage,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error resetting usage:', error);
      return false;
    }
  }

  /**
   * Add a tool to unlocked tools
   */
  async unlockTool(toolId) {
    if (!this.user) return false;
    
    if (!this.unlockedTools.includes(toolId)) {
      this.unlockedTools.push(toolId);
      
      try {
        await updateDoc(doc(db, 'users', this.user.uid), {
          unlockedTools: this.unlockedTools,
          updatedAt: new Date()
        });
        return true;
      } catch (error) {
        console.error('Error unlocking tool:', error);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Update limit extensions (Creator tier only)
   */
  async updateLimitExtensions(type, count) {
    if (!this.user || this.tier !== TIERS.CREATOR) return false;

    this.limitExtensions[type] = count;

    try {
      await updateDoc(doc(db, 'users', this.user.uid), {
        limitExtensions: this.limitExtensions,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error updating limit extensions:', error);
      return false;
    }
  }

  /**
   * Get tier display name
   */
  getTierDisplayName() {
    const names = {
      [TIERS.FREE]: 'Free',
      [TIERS.PRO]: 'Pro',
      [TIERS.CREATOR]: 'Creator',
      [TIERS.LIFETIME]: 'Lifetime',
      [TIERS.DEVELOPER]: 'Developer'
    };
    return names[this.tier] || 'Free';
  }

  /**
   * Get tier badge HTML
   */
  getTierBadgeHTML() {
    const colors = {
      [TIERS.FREE]: 'bg-gray-500',
      [TIERS.PRO]: 'bg-blue-500',
      [TIERS.CREATOR]: 'bg-purple-500',
      [TIERS.LIFETIME]: 'bg-yellow-500',
      [TIERS.DEVELOPER]: 'bg-red-500'
    };
    
    const color = colors[this.tier] || 'bg-gray-500';
    const name = this.getTierDisplayName();
    
    return `<span class="${color} text-white px-3 py-1 rounded-full text-xs font-bold uppercase">${name}</span>`;
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.isDeveloper;
  }
}

/**
 * Get current user's subscription manager
 */
export async function getCurrentSubscriptionManager() {
  const user = auth.currentUser;
  const manager = new SubscriptionManager(user);
  
  if (user) {
    await manager.loadUserData();
  }
  
  return manager;
}

/**
 * Initialize subscription manager for current page
 */
export async function initSubscriptionManager() {
  const manager = await getCurrentSubscriptionManager();
  
  // Store globally for easy access
  window.subscriptionManager = manager;
  
  return manager;
}
