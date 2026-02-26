class FreeboxConfigService {
    constructor() {
        // Initialize the Freebox configuration
        this.config = {};
    }

    // Method to authenticate admin user
    authenticateAdmin(email, password) {
        const adminEmail = 'douvdouv21@gmail.com';
        // Simulated password check (in a real application, use secure hashing)
        if (email === adminEmail && password === 'your_admin_password') {
            return true;
        }
        return false;
    }

    // Method to set configuration
    setConfig(newConfig) {
        if (this.isAuthenticated) {
            this.config = { ...this.config, ...newConfig };
            return this.config;
        }
        throw new Error('Admin authentication required.');
    }

    // Method to get configuration
    getConfig() {
        if (this.isAuthenticated) {
            return this.config;
        }
        throw new Error('Admin authentication required.');
    }
}

module.exports = FreeboxConfigService;