// ===== GLOBAL VARIABLES =====
        let currentUserType = 'student';

        // ===== USER TYPE SELECTION =====
        function selectUserType(type) {
            const buttons = document.querySelectorAll('.user-type-btn');
            buttons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.textContent.toLowerCase().includes(type)) {
                    btn.classList.add('active');
                }
            });
            
            currentUserType = type;
            const usernameInput = document.getElementById('username');
            if (type === 'admin') {
                usernameInput.placeholder = "Enter admin username";
            } else {
                usernameInput.placeholder = "Enter your username or email";
            }
        }

        // ===== AUTHENTICATION SYSTEM =====
        
        // Main authentication function
        function authenticateUser(username, password, userType) {
            console.log('Attempting login:', { username, userType });
            
            // Check admin users
            if (userType === 'admin') {
                const adminUsers = [
                    { username: 'admin', password: 'admin123', userType: 'admin' }
                ];
                
                const admin = adminUsers.find(user => 
                    user.username === username && user.password === password
                );
                
                if (admin) {
                    return {
                        success: true,
                        user: { 
                            username, 
                            userType: 'admin', 
                            fullName: 'Administrator',
                            role: 'admin'
                        }
                    };
                }
                
                return { success: false, message: 'Invalid admin credentials' };
            }
            
            // Check student users in localStorage
            const registeredUsers = getRegisteredUsers();
            console.log('Registered users in system:', registeredUsers);
            
            const user = registeredUsers.find(u => {
                const usernameMatch = u.account?.username === username || u.personal?.email === username;
                const passwordMatch = u.account?.password === password;
                return usernameMatch && passwordMatch;
            });
            
            if (user) {
                console.log('User found:', user);
                return {
                    success: true,
                    user: {
                        username: user.account.username,
                        userType: 'student',
                        fullName: `${user.personal.firstName} ${user.personal.lastName}`,
                        email: user.personal.email,
                        program: user.program,
                        registrationDate: user.registrationDate
                    }
                };
            }
            
            console.log('User not found in localStorage');
            return { success: false, message: 'Invalid username or password' };
        }

        // Get registered users from localStorage
        function getRegisteredUsers() {
            try {
                const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                console.log('Users in localStorage:', users);
                return users;
            } catch (error) {
                console.error('Error reading users from localStorage:', error);
                return [];
            }
        }

        // ===== LOGIN FORM HANDLER =====
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            const rememberMe = document.getElementById('rememberMe').checked;
            const loginButton = document.getElementById('loginButton');
            const spinner = document.getElementById('loginSpinner');
            
            // Reset errors
            hideError('usernameError');
            hideError('passwordError');
            hideError('loginError');
            
            // Validate inputs
            let isValid = true;
            
            if (!username) {
                showError('usernameError', 'Username or email is required');
                isValid = false;
            }
            
            if (!password) {
                showError('passwordError', 'Password is required');
                isValid = false;
            } else if (password.length < 6) {
                showError('passwordError', 'Password must be at least 6 characters');
                isValid = false;
            }
            
            if (!isValid) return;
            
            // Show loading state
            loginButton.disabled = true;
            spinner.style.display = 'block';
            loginButton.querySelector('span').textContent = 'Signing in...';
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Authenticate user
            const authResult = authenticateUser(username, password, currentUserType);
            
            if (authResult.success) {
                // Handle "Remember Me"
                if (rememberMe) {
                    saveRememberedUser(username, currentUserType);
                } else {
                    clearRememberedUser();
                }
                
                // Set user session
                setUserSession(authResult.user);
                
                // Show success and redirect
                loginButton.querySelector('span').textContent = '✓ Success!';
                showStatusMessage('✅ Login successful! Redirecting...', 'success');
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                window.location.href = 'index.html';
            } else {
                // Show error
                loginButton.disabled = false;
                spinner.style.display = 'none';
                loginButton.querySelector('span').textContent = 'Sign In';
                showError('loginError', authResult.message);
                showStatusMessage('❌ Login failed. Please check credentials.', 'error');
            }
        });

        // ===== REMEMBER ME FUNCTIONALITY =====
        function saveRememberedUser(username, userType) {
            const rememberedUser = {
                username,
                userType,
                timestamp: Date.now(),
                expires: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
            };
            localStorage.setItem('rememberedUser', JSON.stringify(rememberedUser));
        }

        function loadRememberedUser() {
            try {
                const remembered = localStorage.getItem('rememberedUser');
                if (remembered) {
                    const user = JSON.parse(remembered);
                    if (user.expires > Date.now()) {
                        document.getElementById('username').value = user.username;
                        document.getElementById('rememberMe').checked = true;
                        selectUserType(user.userType);
                        return true;
                    } else {
                        clearRememberedUser();
                    }
                }
            } catch (e) {
                console.error('Error loading remembered user:', e);
            }
            return false;
        }

        function clearRememberedUser() {
            localStorage.removeItem('rememberedUser');
        }

        // ===== FORGOT PASSWORD =====
        function handleForgotPassword() {
            const username = prompt('Enter your username or email to reset password:');
            
            if (!username) return;
            
            // Find user in registered users
            const registeredUsers = getRegisteredUsers();
            const user = registeredUsers.find(u => 
                u.account?.username === username || u.personal?.email === username
            );
            
            if (!user) {
                alert('User not found. Please check your username or email.');
                return;
            }
            
            if (!user.account?.securityQuestion) {
                alert('No security question set for this account. Please contact administrator.');
                return;
            }
            
            const answer = prompt(`Security Question: ${user.account.securityQuestion}\n\nYour Answer:`);
            
            if (!answer) return;
            
            if (answer.toLowerCase() !== user.account.securityAnswer.toLowerCase()) {
                alert('Incorrect answer. Password reset failed.');
                return;
            }
            
            const newPassword = prompt('Enter new password (minimum 8 characters):');
            
            if (!newPassword || newPassword.length < 8) {
                alert('Password must be at least 8 characters.');
                return;
            }
            
            // Update password in localStorage
            const userIndex = registeredUsers.findIndex(u => 
                u.account?.username === username || u.personal?.email === username
            );
            
            if (userIndex !== -1) {
                registeredUsers[userIndex].account.password = newPassword;
                localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
                
                // Clear remembered user data for security
                clearRememberedUser();
                
                alert('✅ Password reset successful! You can now login with your new password.');
                showStatusMessage('✅ Password updated successfully!', 'success');
            }
        }

        // ===== SESSION MANAGEMENT =====
        function setUserSession(user) {
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userType', user.userType);
            sessionStorage.setItem('username', user.username);
            sessionStorage.setItem('fullName', user.fullName || user.username);
            
            if (user.email) sessionStorage.setItem('email', user.email);
            if (user.program) sessionStorage.setItem('program', user.program);
            if (user.registrationDate) sessionStorage.setItem('registrationDate', user.registrationDate);
            if (user.role) sessionStorage.setItem('role', user.role);
            
            console.log('Session set for user:', user);
        }

        // ===== UTILITY FUNCTIONS =====
        function showError(elementId, message) {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = message;
                element.style.display = 'block';
            }
        }

        function hideError(elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.style.display = 'none';
            }
        }

        function showStatusMessage(message, type = 'success') {
            const statusElement = document.getElementById('statusMessage');
            statusElement.textContent = message;
            statusElement.className = 'status-message ' + type;
            statusElement.style.display = 'block';
            
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 3000);
        }

        // ===== INITIALIZATION =====
        window.addEventListener('DOMContentLoaded', function() {
            // Load remembered user
            loadRememberedUser();
            
            // Check URL parameters for messages
            const urlParams = new URLSearchParams(window.location.search);
            
            // Show registration success message
            if (urlParams.get('registered') === 'true') {
                document.getElementById('loginSuccess').style.display = 'block';
                showStatusMessage('✅ Registration successful! Please login.', 'success');
                
                // Remove parameter from URL
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
                
                setTimeout(() => {
                    document.getElementById('loginSuccess').style.display = 'none';
                }, 5000);
            }
            
            // Show password reset success message
            if (urlParams.get('reset') === 'success') {
                showStatusMessage('✅ Password reset successful! Please login.', 'success');
                
                // Remove parameter from URL
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            }
            
            // Auto-focus on username field
            document.getElementById('username').focus();
            
            console.log('Login system initialized');
            console.log('Registered users:', getRegisteredUsers());
        });

        // ===== DEBUG FUNCTIONS =====
        window.debugLogin = function() {
            console.log('=== DEBUG LOGIN INFO ===');
            console.log('Current user type:', currentUserType);
            console.log('Registered users:', getRegisteredUsers());
            console.log('Remembered user:', localStorage.getItem('rememberedUser'));
            console.log('Session storage:', {
                isLoggedIn: sessionStorage.getItem('isLoggedIn'),
                username: sessionStorage.getItem('username'),
                userType: sessionStorage.getItem('userType')
            });
            
            // Test accounts
            const testAccounts = [
                { username: 'admin', password: 'admin123', type: 'admin' },
                { username: 'testuser', password: 'testpass123', type: 'student' }
            ];
            
            console.log('Test accounts available:', testAccounts);
        };

        // Create test student account for debugging
        window.createTestAccount = function() {
            const testAccount = {
                personal: {
                    firstName: "Test",
                    lastName: "Student",
                    email: "test@student.com",
                    phone: "09123456789",
                    birthdate: "2000-01-01",
                    address: "Test Address",
                    gender: "male"
                },
                account: {
                    username: "teststudent",
                    password: "test1234",
                    securityQuestion: "What is your favorite color?",
                    securityAnswer: "blue"
                },
                program: "wadt",
                registrationDate: new Date().toISOString(),
                status: 'pending'
            };
            
            const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            existingUsers.push(testAccount);
            localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
            
            showStatusMessage('✅ Test account created: teststudent / test1234', 'success');
            console.log('Test account created:', testAccount);
        };

        // Clear all accounts (for testing)
        window.clearAllAccounts = function() {
            if (confirm('Clear ALL registered accounts? This cannot be undone.')) {
                localStorage.removeItem('registeredUsers');
                localStorage.removeItem('rememberedUser');
                showStatusMessage('✅ All accounts cleared', 'success');
                console.log('All accounts cleared');
            }
        };

        // Logout function
        window.logout = function() {
            sessionStorage.clear();
            window.location.href = 'login.html';
        };