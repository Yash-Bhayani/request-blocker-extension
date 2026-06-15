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
            let tabs = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tabs || tabs.length === 0 || !tabs[0].url) {
                tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            }

            if (tabs && tabs.length > 0 && tabs[0].url) {
                const url = new URL(tabs[0].url);
                if (url.protocol.startsWith('http')) {
                    // FIX: Only take the root hostname, ignore any paths
                    this.currentHost = url.hostname;
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

        // Explicitly update the rule object and save
        const cleanRules = JSON.parse(JSON.stringify(this.rules));
        await chrome.storage.local.set({ rules: cleanRules });

        // Refresh local state to ensure reactivity
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