// StudentBridge Authentication System
// CORRECT EMAIL FORMAT: rollnumber.tcs@csn.edu.pk

const StudentBridgeAuth = {
    // Database in localStorage
    users: [],
    pendingVerifications: {},
    currentUser: null,
    
    // Initialize
    init: function() {
        // Load users from localStorage
        const savedUsers = localStorage.getItem('studentbridge_users');
        if (savedUsers) {
            this.users = JSON.parse(savedUsers);
        }
        
        // Load current session
        const session = localStorage.getItem('studentbridge_session');
        if (session) {
            this.currentUser = JSON.parse(session);
        }
        
        console.log('StudentBridge Auth initialized');
    },
    
    // Validate email format: rollnumber.tcs@csn.edu.pk
    isValidEmailFormat: function(email) {
        // Pattern: digits.tcs@csn.edu.pk
        const pattern = /^\d+\.tcs@csn\.edu\.pk$/;
        return pattern.test(email);
    },
    
    // Extract roll number from email
    extractRollNumber: function(email) {
        if (this.isValidEmailFormat(email)) {
            return email.split('.tcs@csn.edu.pk')[0];
        }
        return null;
    },
    
    // Check if email exists
    emailExists: function(email) {
        return this.users.some(user => user.email === email);
    },
    
    // Check if username exists
    usernameExists: function(username) {
        return this.users.some(user => user.username === username);
    },
    
    // Generate verification code
    generateVerificationCode: function(email) {
        const code = Math.floor(100000 + Math.random() * 900000);
        this.pendingVerifications[email] = {
            code: code,
            expires: Date.now() + 10 * 60 * 1000, // 10 minutes
            attempts: 0,
            timestamp: new Date().toISOString()
        };
        
        // Save to localStorage
        localStorage.setItem('studentbridge_pending', JSON.stringify(this.pendingVerifications));
        
        return code;
    },
    
    // Verify code
    verifyCode: function(email, code) {
        const pending = this.pendingVerifications[email];
        
        if (!pending) {
            return { success: false, message: 'No verification requested for this email' };
        }
        
        // Check if expired
        if (Date.now() > pending.expires) {
            delete this.pendingVerifications[email];
            localStorage.setItem('studentbridge_pending', JSON.stringify(this.pendingVerifications));
            return { success: false, message: 'Verification code expired' };
        }
        
        // Check attempts
        pending.attempts++;
        if (pending.attempts > 5) {
            delete this.pendingVerifications[email];
            localStorage.setItem('studentbridge_pending', JSON.stringify(this.pendingVerifications));
            return { success: false, message: 'Too many attempts' };
        }
        
        // Check code
        if (pending.code == code) {
            delete this.pendingVerifications[email];
            localStorage.setItem('studentbridge_pending', JSON.stringify(this.pendingVerifications));
            return { success: true, message: 'Email verified successfully' };
        }
        
        return { success: false, message: 'Invalid verification code' };
    },
    
    // Register new user
    registerUser: function(email, username, password) {
        // Validate email format
        if (!this.isValidEmailFormat(email)) {
            return { success: false, message: 'Invalid email format. Must be: rollnumber.tcs@csn.edu.pk' };
        }
        
        // Check if email exists
        if (this.emailExists(email)) {
            return { success: false, message: 'Email already registered' };
        }
        
        // Check if username exists
        if (this.usernameExists(username)) {
            return { success: false, message: 'Username already taken' };
        }
        
        // Create user object
        const rollNumber = this.extractRollNumber(email);
        const newUser = {
            id: Date.now().toString(),
            email: email,
            rollNumber: rollNumber,
            username: username,
            password: password, // In real app, hash this!
            verified: false,
            role: 'Student',
            joinDate: new Date().toISOString().split('T')[0],
            profile: {
                displayName: username,
                bio: '',
                societies: [],
                year: rollNumber ? rollNumber.substring(0, 4) : '2024'
            }
        };
        
        // Add to users
        this.users.push(newUser);
        this.saveUsers();
        
        return { success: true, user: newUser };
    },
    
    // Verify and activate user
    activateUser: function(email) {
        const userIndex = this.users.findIndex(user => user.email === email);
        if (userIndex !== -1) {
            this.users[userIndex].verified = true;
            this.saveUsers();
            return true;
        }
        return false;
    },
    
    // Login user
    login: function(email, password) {
        // Validate email format
        if (!this.isValidEmailFormat(email)) {
            return { success: false, message: 'Invalid email format' };
        }
        
        // Find user
        const user = this.users.find(u => u.email === email);
        
        if (!user) {
            return { success: false, message: 'No account found with this email' };
        }
        
        if (user.password !== password) {
            return { success: false, message: 'Incorrect password' };
        }
        
        if (!user.verified) {
            return { success: false, message: 'Email not verified. Please check your inbox.' };
        }
        
        // Set current user
        this.currentUser = user;
        localStorage.setItem('studentbridge_session', JSON.stringify(user));
        
        return { success: true, user: user };
    },
    
    // Logout
    logout: function() {
        this.currentUser = null;
        localStorage.removeItem('studentbridge_session');
    },
    
    // Save users to localStorage
    saveUsers: function() {
        localStorage.setItem('studentbridge_users', JSON.stringify(this.users));
    },
    
    // Get all users (for search)
    getAllUsers: function() {
        return this.users.filter(user => user.verified);
    },
    
    // Search users
    searchUsers: function(query) {
        const searchTerm = query.toLowerCase();
        return this.users.filter(user => 
            user.verified && (
                user.username.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm) ||
                (user.profile && user.profile.displayName.toLowerCase().includes(searchTerm)) ||
                user.role.toLowerCase().includes(searchTerm)
            )
        );
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    StudentBridgeAuth.init();
});

// Make it available globally
window.StudentBridge = StudentBridgeAuth;
