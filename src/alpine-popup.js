import Alpine from './main'

Alpine.data('popupManager', () => ({
    rules: [],
    currentHost: "",

    async init() {
        await this.loadRules();
        await this.getCurrentTabDomain();
    },

    async loadRules() {
        // Safe fallback for empty storage
        const result = (await chrome.storage.local.get('rules')) || {};
        this.rules = result.rules || [];
    },

    async getCurrentTabDomain() {
        try {
            // Try standard Chrome/Firefox method
            let tabs = await chrome.tabs.query({ active: true, currentWindow: true });

            // Firefox fallback
            if (!tabs || tabs.length === 0 || !tabs[0].url) {
                tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            }

            if (tabs && tabs.length > 0 && tabs[0].url) {
                const url = new URL(tabs[0].url);
                if (url.protocol.startsWith('http')) {
                    // Combine hostname and pathname (e.g., linkedin.com + /feed)
                    let fullPath = url.hostname + url.pathname;
                    if (fullPath.endsWith('/')) {
                        fullPath = fullPath.slice(0, -1);
                    }
                    this.currentHost = fullPath;
                }
            }
        } catch (e) {
            console.error("[Popup] Error reading tab:", e);
        }
    },

    async toggleRule(id, active) {
        const rule = this.rules.find(r => r.id === id);
        if (!rule) return;

        rule.active = active;
        await chrome.storage.local.set({ rules: this.rules });
    },

    async openOptions() {
        try {
            let domainParam = '';
            if (this.currentHost) {
                domainParam = `?domain=${encodeURIComponent(this.currentHost)}`;
            }

            const optionsUrl = chrome.runtime.getURL(`options.html${domainParam}`);
            await chrome.tabs.create({ url: optionsUrl });

        } catch (error) {
            console.warn("Falling back to default options page.", error);
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL('options.html'));
            }
        }
    }
}));

Alpine.start();