// scripts/ads-manager.js
// Enhanced with development mode detection and safe ad practices

// Development environment detection
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('github.io');

class AdManager {
    constructor() {
        this.adZone = '9803188';
        this.adsShown = 0;
        this.maxAdsPerSession = isDevelopment ? 2 : 5; // Fewer ads in development
        this.adInterval = isDevelopment ? 60000 : 30000; // Longer interval in development (60s vs 30s)
        this.lastAdTime = 0;
        this.isInitialized = false;
        this.userInteractions = 0;
        
        console.log('Ad Manager initialized in', isDevelopment ? 'Development' : 'Production', 'mode');
    }

    init() {
        if (this.isInitialized) return;
        
        console.log('Monetag Ad Manager initialized');
        this.isInitialized = true;
        
        // Setup ad containers
        this.setupAdContainers();
        
        // Setup interstitial ads - but only if not in development
        if (!isDevelopment) {
            this.setupInterstitialAds();
        } else {
            console.log('Development mode: Skipping automatic ad setup');
        }
        
        // Track user interactions
        this.setupInteractionTracking();
    }

    setupAdContainers() {
        // Create main ad container if it doesn't exist
        if (!document.getElementById('monetag-ad-container')) {
            const adContainer = document.createElement('div');
            adContainer.id = 'monetag-ad-container';
            adContainer.style.cssText = 'width: 100%; min-height: 120px; margin: 20px 0; display: flex; align-items: center; justify-content: center; background: #272727ff; border-radius: 0px;';
            document.body.appendChild(adContainer);
        }
    }

    setupInteractionTracking() {
        // Track clicks, scrolls, and other interactions
        document.addEventListener('click', () => this.trackUserInteraction());
        document.addEventListener('scroll', () => this.trackUserInteraction());
        
        // Track tab changes/page navigation in your app
        if (typeof window.showPosts === 'function') {
            const originalShowPosts = window.showPosts;
            window.showPosts = () => {
                this.trackUserInteraction();
                return originalShowPosts();
            };
        }
        
        if (typeof window.showTrending === 'function') {
            const originalShowTrending = window.showTrending;
            window.showTrending = () => {
                this.trackUserInteraction();
                return originalShowTrending();
            };
        }
        
        if (typeof window.showFollowing === 'function') {
            const originalShowFollowing = window.showFollowing;
            window.showFollowing = () => {
                this.trackUserInteraction();
                return originalShowFollowing();
            };
        }
    }

    trackUserInteraction() {
        this.userInteractions++;
        console.log('User interaction tracked:', this.userInteractions);
    }

    setupInterstitialAds() {
        // Show interstitial on app start after delay
        setTimeout(() => {
            this.showInAppInterstitial();
        }, 5000); // Show after 5 seconds

        // Show interstitial when navigating between sections
        this.setupNavigationTriggers();
    }

    setupNavigationTriggers() {
        // Listen for custom navigation events
        window.addEventListener('sectionChange', () => {
            this.showInAppInterstitial();
        });

        // Override your navigation functions to trigger ads
        this.patchNavigationFunctions();
    }

    patchNavigationFunctions() {
        // Store original functions
        const originalShowPosts = window.showPosts;
        const originalShowTrending = window.showTrending;
        const originalShowFollowing = window.showFollowing;

        // Patch with ad triggers
        window.showPosts = () => {
            this.triggerAdBeforeNavigation();
            originalShowPosts();
        };

        window.showTrending = () => {
            this.triggerAdBeforeNavigation();
            originalShowTrending();
        };

        window.showFollowing = () => {
            this.triggerAdBeforeNavigation();
            originalShowFollowing();
        };
    }

    triggerAdBeforeNavigation() {
        if (this.canShowAd()) {
            this.showInAppInterstitial();
        }
    }

    canShowAd() {
        const now = Date.now();
        const timeSinceLastAd = now - this.lastAdTime;
        
        if (isDevelopment) {
            // Very restrictive in development - only show after multiple interactions
            // and with longer intervals between ads
            return this.adsShown < this.maxAdsPerSession && 
                   this.userInteractions > 3 &&
                   timeSinceLastAd > this.adInterval;
        }
        
        // Normal rules for production
        return this.adsShown < this.maxAdsPerSession && 
               timeSinceLastAd > this.adInterval;
    }

    // In-App Interstitial
    showInAppInterstitial() {
        if (!this.canShowAd()) {
            console.log('Ad not shown - conditions not met');
            return;
        }
        
        // In development, show mock ads instead of real ones
        if (isDevelopment) {
            console.log('Development: Would show interstitial ad now');
            this.adsShown++;
            this.lastAdTime = Date.now();
            this.showMockAd('interstitial');
            return;
        }
        
        try {
            show_9803188({
                type: 'inApp',
                inAppSettings: {
                    frequency: this.maxAdsPerSession,
                    capping: 0.1, // 6 minutes
                    interval: 30, // 30 seconds
                    timeout: 5,   // 5 second delay
                    everyPage: false
                }
            }).then(() => {
                console.log('In-app interstitial shown successfully');
                this.adsShown++;
                this.lastAdTime = Date.now();
                this.trackAdImpression('inAppInterstitial');
            }).catch(error => {
                console.warn('In-app interstitial failed:', error);
            });
        } catch (error) {
            console.error('Error showing in-app interstitial:', error);
        }
    }

    // Show a mock ad for development
    showMockAd(type) {
        const adContainer = document.getElementById('monetag-ad-container') || document.getElementById('ad-container');
        if (adContainer) {
            adContainer.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h3>Development Mode: Mock Ad</h3>
                    <p>This would be a ${type} ad in production</p>
                    <p>User Interactions: ${this.userInteractions}</p>
                    <p>Ads Shown: ${this.adsShown}</p>
                    <button onclick="window.monetagAdManager.trackUserInteraction()" style="padding: 10px; background: #4a76d0; color: white; border: none; border-radius: 4px;">
                        Simulate Interaction
                    </button>
                </div>
            `;
        }
        
        // Log ad impression for debugging
        console.log(`Mock ${type} ad shown. Interactions: ${this.userInteractions}, Ads: ${this.adsShown}`);
    }

    // Rewarded Interstitial
    showRewardedInterstitial() {
        return new Promise((resolve, reject) => {
            // In development, show mock ad
            if (isDevelopment) {
                console.log('Development: Would show rewarded interstitial now');
                this.showMockAd('rewardedInterstitial');
                this.rewardUser();
                resolve(true);
                return;
            }
            
            try {
                show_9803188().then(() => {
                    console.log('Rewarded interstitial completed');
                    this.trackAdImpression('rewardedInterstitial');
                    resolve(true);
                    
                    // Add your user reward function here
                    this.rewardUser();
                    
                }).catch(error => {
                    console.warn('Rewarded interstitial failed:', error);
                    reject(error);
                });
            } catch (error) {
                console.error('Error showing rewarded interstitial:', error);
                reject(error);
            }
        });
    }

    // Rewarded Popup
    showRewardedPopup() {
        return new Promise((resolve, reject) => {
            // In development, show mock ad
            if (isDevelopment) {
                console.log('Development: Would show rewarded popup now');
                this.showMockAd('rewardedPopup');
                this.rewardUser();
                resolve(true);
                return;
            }
            
            try {
                show_9803188('pop').then(() => {
                    console.log('Rewarded popup completed');
                    this.trackAdImpression('rewardedPopup');
                    resolve(true);
                    
                    // Add your user reward function here
                    this.rewardUser();
                    
                }).catch(error => {
                    console.warn('Rewarded popup failed:', error);
                    reject(error);
                });
            } catch (error) {
                console.error('Error showing rewarded popup:', error);
                reject(error);
            }
        });
    }

    rewardUser() {
        // Implement your reward logic here
        console.log('User rewarded for watching ad');
        
        // Example: Give user premium content access
        if (window.currentUser) {
            // Update user state or give rewards
            if (window.tg && window.tg.showPopup) {
                window.tg.showPopup({
                    title: 'Reward Unlocked!',
                    message: 'Thank you for watching the ad. You have earned a reward!'
                });
            } else {
                alert('Reward Unlocked! Thank you for watching the ad.');
            }
        }
    }

    trackAdImpression(adType) {
        // Track ad impressions in your database
        if (window.supabase && window.currentUser) {
            window.supabase
                .from('ad_impressions')
                .insert({
                    user_id: window.currentUser.id,
                    ad_network: 'monetag',
                    ad_type: adType,
                    revenue_estimate: this.calculateRevenueEstimate(adType)
                })
                .then(({ error }) => {
                    if (error) {
                        console.error('Error tracking ad impression:', error);
                    }
                });
        }
    }

    calculateRevenueEstimate(adType) {
        // Simple revenue estimation (replace with actual rates)
        const rates = {
            'inAppInterstitial': 0.002,
            'rewardedInterstitial': 0.005,
            'rewardedPopup': 0.003
        };
        return rates[adType] || 0.001;
    }

    // Method to show ads manually (for testing)
    showAdManual(adType = 'inAppInterstitial') {
        switch (adType) {
            case 'rewardedInterstitial':
                return this.showRewardedInterstitial();
            case 'rewardedPopup':
                return this.showRewardedPopup();
            default:
                this.showInAppInterstitial();
                return Promise.resolve();
        }
    }
}

// Initialize ad manager
window.monetagAdManager = new AdManager();

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for Telegram WebApp to initialize
    setTimeout(() => {
        window.monetagAdManager.init();
    }, 2000);
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdManager;
}