// scripts/ads-manager.js
class AdManager {
    constructor() {
        this.adZone = '9803188';
        this.adsShown = 0;
        this.maxAdsPerSession = 2;
        this.adInterval = 30000; // 30 seconds
        this.lastAdTime = 0;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        
        console.log('Monetag Ad Manager initialized');
        this.isInitialized = true;
        
        // Setup ad containers
        this.setupAdContainers();
        
        // Setup interstitial ads
        this.setupInterstitialAds();
    }

    setupAdContainers() {
        // Create main ad container if it doesn't exist
        if (!document.getElementById('monetag-ad-container')) {
            const adContainer = document.createElement('div');
            adContainer.id = 'monetag-ad-container';
            adContainer.style.cssText = 'width: 100%; min-height: 100px; margin: 20px 0; display: flex; align-items: center; justify-content: center; background: #1e1e1e; border-radius: 8px;';
            document.body.appendChild(adContainer);
        }
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
        
        return this.adsShown < this.maxAdsPerSession && 
               timeSinceLastAd > this.adInterval;
    }

    // In-App Interstitial
    showInAppInterstitial() {
        if (!this.canShowAd()) return;
        
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

    // Rewarded Interstitial
    showRewardedInterstitial() {
        return new Promise((resolve, reject) => {
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
            window.tg.showPopup({
                title: 'Reward Unlocked!',
                message: 'Thank you for watching the ad. You have earned a reward!'
            });
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