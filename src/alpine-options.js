import Alpine from './main'

Alpine.data('ruleManager', () => ({
    rules: [],
    domain: "",
    regex: "",
    types: [],
    conditionLogic: "OR",
    active: true,
    editingId: null,
    successMessage: "",

    get titleText() { return this.editingId ? 'Edit Rule' : 'Create Rule'; },
    get buttonText() { return this.editingId ? 'Update Rule' : 'Save Rule'; },

    formatTypes(types) {
        return types && types.length > 0 ? types.join(', ') : '(none)';
    },

    init() {
        console.log("[Options] Script initialized. Full URL:", window.location.href);

        // Auto-fill domain from popup
        const params = new URLSearchParams(window.location.search);
        if (params.has('domain')) {
            // FIX: Split by '/' and take only the first part to guarantee a clean domain
            this.domain = params.get('domain').split('/')[0];
            console.log("[Options] Clean Domain extracted ->", this.domain);
        }

        this.loadRules();

        this.$watch('successMessage', (val) => {
            if (val) setTimeout(() => this.successMessage = "", 3000);
        });
    },

    async loadRules() {
        // Background.js guarantees system rules exist, but we do a safe fetch here
        const result = (await chrome.storage.local.get("rules")) || {};
        this.rules = result.rules || [];
    },

    async saveRule() {
        // 1. First, check if they provided a domain
        if (!this.domain.trim()) {
            alert("Please provide a Target Domain (e.g., example.com).");
            return;
        }

        // 2. Next, ensure they provided WHAT to block (either Regex OR Types)
        if (!this.regex.trim() && this.types.length === 0) {
            alert("Please provide either a Regex Filter OR select at least one Resource Type to block.");
            return;
        }

        // AUTO-CLEAN DOMAIN: Strip http://, https://, and any paths
        let cleanedDomain = this.domain.trim().replace(/^https?:\/\//, '').split('/')[0];

        if (this.editingId) {
            const index = this.rules.findIndex(r => r.id === this.editingId);
            if (index !== -1 && !this.rules[index].isSystem) {
                this.rules[index] = {
                    id: this.editingId,
                    name: this.rules[index].name || "Custom Rule",
                    domain: cleanedDomain,
                    regex: this.regex.trim(),
                    types: this.types,
                    conditionLogic: this.conditionLogic,
                    active: this.active
                };
            }
            this.editingId = null;
        } else {
            this.rules.push({
                id: Date.now(),
                name: `Rule for ${cleanedDomain || 'All Domains'}`,
                domain: cleanedDomain,
                regex: this.regex.trim(),
                types: this.types,
                conditionLogic: this.conditionLogic,
                active: this.active
            });
        }

        const cleanRules = JSON.parse(JSON.stringify(this.rules));
        await chrome.storage.local.set({ rules: cleanRules });

        this.successMessage = "Rule saved successfully!";
        this.clearForm();
    },



    editRule(id) {
        const rule = this.rules.find(r => r.id === id);
        if (rule && !rule.isSystem) {
            this.editingId = rule.id;
            this.domain = rule.domain || "";
            this.regex = rule.regex || "";
            this.types = rule.types || [];
            this.conditionLogic = rule.conditionLogic || "OR";
            this.active = rule.active;
        }
    },

    async deleteRule(id) {
        const rule = this.rules.find(r => r.id === id);
        if (rule && rule.isSystem) {
            alert("System rules cannot be deleted.");
            return;
        }

        if (confirm("Are you sure you want to delete this rule?")) {
            this.rules = this.rules.filter(r => r.id !== id);

            // FIX: Strip Alpine Proxies before saving
            const cleanRules = JSON.parse(JSON.stringify(this.rules));
            await chrome.storage.local.set({ rules: cleanRules });
        }
    },

    async toggleRule(id, isActive) {
        const index = this.rules.findIndex(r => r.id === id);
        if (index !== -1) {
            this.rules[index].active = isActive;

            // Strip Alpine Proxies before saving
            const cleanRules = JSON.parse(JSON.stringify(this.rules));
            await chrome.storage.local.set({ rules: cleanRules });
        }
    },

    clearForm() {
        this.editingId = null;
        this.domain = "";
        this.regex = "";
        this.types = [];
        this.conditionLogic = "OR";
        this.active = true;
    }
}));

Alpine.start();