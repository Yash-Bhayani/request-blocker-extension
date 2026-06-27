import Alpine from './main.js'

Alpine.data('popupManager', () => ({
    rules: [],
    currentHost: "",

    // This dynamically filters the rules for the UI based on the current tab
    get activeSiteRules() {
        if (!this.currentHost) return this.rules;

        return this.rules.filter(rule => {
            // 1. If no domain is set, it's a global rule, so show it everywhere
            if (!rule.domain || rule.domain.trim() === "") return true;

            // 2. Check if the current website matches any of the rule's target domains
            const targetDomains = rule.domain.split(',').map(d => d.trim().toLowerCase());
            const current = this.currentHost.toLowerCase();

            // Check if exact match OR if current host is a subdomain (e.g. www.linkedin.com ends with linkedin.com)
            return targetDomains.some(d => current === d || current.endsWith('.' + d));
        });
    },

    async init() {
        await this.loadRules();
        await this.getCurrentTabDomain();
    },

    async loadRules() {
        const result = (await chrome.storage.local.get('rules')) || {};
        this.rules = result.rules || [];
    },

    async getCurrentTabDomain() {
        try {
            let tabs = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tabs || tabs.length === 0 || !tabs[0].url) {
                tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            }

            if (tabs && tabs.length > 0 && tabs[0].url) {
                const url = new URL(tabs[0].url);
                if (url.protocol.startsWith('http')) {
                    this.currentHost = url.hostname;
                }
            }
        } catch (e) {
            console.error("[Popup] Error reading tab:", e);
        }
    },

    async toggleRule(id, active) {
        // Find the rule in the main array and update it
        const rule = this.rules.find(r => r.id === id);
        if (!rule) return;

        rule.active = active;

        // Save the FULL array back to storage so hidden rules aren't lost
        const cleanRules = JSON.parse(JSON.stringify(this.rules));
        await chrome.storage.local.set({ rules: cleanRules });

        this.rules = cleanRules;
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