import Alpine from './main.js'

Alpine.data('ruleManager', () => ({
    rules: [],
    domains: [""],

    enableBlock: true,
    enableScript: false,
    regex: "",
    types: [],
    methods: [],
    conditionLogic: "OR",
    scriptCodes: {
        document_start: "",
        document_end: "",
        document_idle: "",
        on_intercept: ""
    },
    scriptTrigger: "document_idle",
    active: true,
    editingId: null,
    successMessage: "",

    get titleText() { return this.editingId ? 'Edit Rule' : 'Create Rule'; },
    formatTypes(types) { return types && types.length > 0 ? types.join(', ') : '(none)'; },

    // Proxy scriptCode to scriptCodes[scriptTrigger]
    get scriptCode() { return this.scriptCodes[this.scriptTrigger] || ""; },
    set scriptCode(val) { this.scriptCodes[this.scriptTrigger] = val; },

    get enabledTriggers() {
        return Object.entries(this.scriptCodes)
            .filter(([_, code]) => code.trim() !== "")
            .map(([trigger]) => trigger);
    },

    init() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('domain')) this.domains = [params.get('domain').split('/')[0]];
        this.loadRules();

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === "local" && changes.rules) {
                this.rules = changes.rules.newValue || [];
            }
        });

        this.$watch('successMessage', (val) => { if (val) setTimeout(() => this.successMessage = "", 3000); });
    },

    addDomainField() { this.domains.push(""); },
    removeDomainField(index) { if (this.domains.length > 1) this.domains.splice(index, 1); else this.domains = [""]; },

    async loadRules() {
        const result = await chrome.storage.local.get("rules");
        this.rules = result.rules || [];
    },

    async saveRule() {
        let cleanList = this.domains.map(d => d.trim().replace(/^https?:\/\//, '').split('/')[0]).filter(d => d.length > 0);
        if (cleanList.length === 0) return alert("Please provide at least one Target Domain.");
        if (!this.enableBlock && !this.enableScript) return alert("You must enable at least one action: Block Requests or Execute Script.");
        if (this.enableBlock && !this.regex.trim() && this.types.length === 0) return alert("Blocking enabled: Provide a Regex or Resource Type.");
        if (this.enableScript && this.enabledTriggers.length === 0) return alert("Script enabled: Please provide JavaScript code for at least one trigger.");

        let combinedDomains = cleanList.join(', ');

        const ruleData = {
            domain: combinedDomains,
            enableBlock: this.enableBlock,
            enableScript: this.enableScript,
            regex: this.regex.trim(),
            types: this.types,
            methods: this.methods,
            conditionLogic: this.conditionLogic,
            scriptCodes: { ...this.scriptCodes },
            active: this.active
        };

        if (this.editingId) {
            const index = this.rules.findIndex(r => r.id === this.editingId);
            if (index !== -1 && !this.rules[index].isSystem) {
                this.rules[index] = { ...this.rules[index], ...ruleData };
            }
            this.editingId = null;
        } else {
            this.rules.push({ id: Date.now(), name: `Rule for ${combinedDomains}`, ...ruleData, isSystem: false });
        }

        await chrome.storage.local.set({ rules: JSON.parse(JSON.stringify(this.rules)) });
        this.successMessage = "Rule saved successfully!";
        this.clearForm();
    },

    editRule(id) {
        const rule = this.rules.find(r => r.id === id);
        if (rule && !rule.isSystem) {
            this.editingId = rule.id;
            this.domains = rule.domain ? rule.domain.split(', ') : [""];
            this.enableBlock = rule.enableBlock !== false;
            this.enableScript = rule.enableScript || false;
            this.regex = rule.regex || "";
            this.types = rule.types || [];
            this.methods = rule.methods || [];
            this.conditionLogic = rule.conditionLogic || "OR";
            // Support legacy single scriptCode format
            this.scriptCodes = rule.scriptCodes
                ? { ...{ document_start: "", document_end: "", document_idle: "", on_intercept: "" }, ...rule.scriptCodes }
                : { document_start: "", document_end: "", document_idle: rule.scriptCode || "", on_intercept: "" };
            this.scriptTrigger = rule.scriptTrigger || "document_idle";
            this.active = rule.active;
        }
    },

    async deleteRule(id) {
        const rule = this.rules.find(r => r.id === id);
        if (rule && rule.isSystem) return alert("System rules cannot be deleted.");
        if (confirm("Are you sure you want to delete this rule?")) {
            this.rules = this.rules.filter(r => r.id !== id);
            await chrome.storage.local.set({ rules: JSON.parse(JSON.stringify(this.rules)) });
        }
    },

    async toggleRuleStatus(id, newStatus) {
        const rule = this.rules.find(r => r.id === id);
        if (rule) {
            rule.active = newStatus;
            await chrome.storage.local.set({ rules: JSON.parse(JSON.stringify(this.rules)) });
        }
    },

    clearForm() {
        this.editingId = null;
        this.domains = [""];
        this.enableBlock = true;
        this.enableScript = false;
        this.regex = "";
        this.types = [];
        this.methods = [];
        this.conditionLogic = "OR";
        this.scriptCodes = { document_start: "", document_end: "", document_idle: "", on_intercept: "" };
        this.scriptTrigger = "document_idle";
        this.active = true;
    }
}));

Alpine.start();