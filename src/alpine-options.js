import Alpine from './main'

Alpine.data('ruleManager', () => ({
    rules: [],
    domains: [""], // Changed from string to an array with one empty field
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
        console.log("[Options] Script initialized.");

        const params = new URLSearchParams(window.location.search);
        if (params.has('domain')) {
            // Pre-fill the first input box with the domain from the active tab
            this.domains = [params.get('domain').split('/')[0]];
        }

        this.loadRules();

        this.$watch('successMessage', (val) => {
            if (val) setTimeout(() => this.successMessage = "", 3000);
        });
    },

    // Dynamic field controls
    addDomainField() {
        this.domains.push("");
    },

    removeDomainField(index) {
        if (this.domains.length > 1) {
            this.domains.splice(index, 1);
        } else {
            this.domains = [""]; // Keep at least one empty box
        }
    },

    async loadRules() {
        const result = (await chrome.storage.local.get("rules")) || {};
        this.rules = result.rules || [];
    },

    async saveRule() {
        // Clean and filter out empty fields, strip protocol and paths
        let cleanList = this.domains
            .map(d => d.trim().replace(/^https?:\/\//, '').split('/')[0])
            .filter(d => d.length > 0);

        if (cleanList.length === 0) {
            alert("Please provide at least one Target Domain.");
            return;
        }

        if (!this.regex.trim() && this.types.length === 0) {
            alert("Please provide either a Regex Filter OR select at least one Resource Type to block.");
            return;
        }

        // Combine into a clean string for storage & background compatibility
        let combinedDomains = cleanList.join(', ');

        if (this.editingId) {
            const index = this.rules.findIndex(r => r.id === this.editingId);
            if (index !== -1 && !this.rules[index].isSystem) {
                this.rules[index] = {
                    id: this.editingId,
                    name: this.rules[index].name || "Custom Rule",
                    domain: combinedDomains,
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
                name: `Rule for ${combinedDomains}`,
                domain: combinedDomains,
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
            // Split the stored string back into an array for the dynamic fields
            this.domains = rule.domain ? rule.domain.split(', ') : [""];
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
            const cleanRules = JSON.parse(JSON.stringify(this.rules));
            await chrome.storage.local.set({ rules: cleanRules });
        }
    },

    clearForm() {
        this.editingId = null;
        this.domains = [""];
        this.regex = "";
        this.types = [];
        this.conditionLogic = "OR";
        this.active = true;
    }
}));

Alpine.start();