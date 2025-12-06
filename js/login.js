// ===== GLOBAL VARIABLES =====
let currentUserType = 'student';
let rememberedCredentials = null;

// ===== FORGOT PASSWORD MODAL VARIABLES =====
let currentForgotPasswordStep = 1;
let forgotUserType = 'student';
let currentUserForReset = null;
let originalPasswordForReset = null;

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
    
    updateRememberMeUI();
}

// ===== ENHANCED REMEMBER ME FUNCTIONALITY =====
function saveRememberedUser(username, password, userType) {
    if (!username || !password || !userType) return;
    
    const rememberedUser = {
        username,
        password,
        userType,
        timestamp: Date.now(),
        expires: Date.now() + (30 * 24 * 60 * 60 * 1000)
    };
    
    localStorage.setItem('rememberedUser', JSON.stringify(rememberedUser));
    rememberedCredentials = rememberedUser;
}

function loadRememberedUser() {
    try {
        const remembered = localStorage.getItem('rememberedUser');
        if (remembered) {
            const user = JSON.parse(remembered);
            if (user.expires > Date.now()) {
                rememberedCredentials = user;
                return user;
            } else {
                clearRememberedUser();
            }
        }
    } catch (e) {
        console.error('Error loading remembered user:', e);
    }
    return null;
}

function clearRememberedUser() {
    localStorage.removeItem('rememberedUser');
    rememberedCredentials = null;
}

function isCurrentUsernameRemembered() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();
    
    if (!username || !rememberedCredentials) return false;
    
    return username === rememberedCredentials.username && 
           currentUserType === rememberedCredentials.userType;
}

function updateRememberMeUI() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const username = usernameInput.value.trim();
    
    if (rememberedCredentials && username === rememberedCredentials.username && 
        currentUserType === rememberedCredentials.userType) {
        
        rememberMeCheckbox.checked = true;
        passwordInput.value = rememberedCredentials.password;
    } else if (!username) {
        rememberMeCheckbox.checked = false;
        passwordInput.value = '';
    } else {
        rememberMeCheckbox.checked = false;
    }
}

function handleRememberMeChange() {
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    if (rememberMeCheckbox.checked) {
        // When checked, will save after successful login
    } else {
        if (isCurrentUsernameRemembered()) {
            clearRememberedUser();
            passwordInput.value = '';
        }
    }
}

// ===== FORGOT PASSWORD MODAL FUNCTIONS =====
function openForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'flex';
    resetForgotPasswordModal();
}

function closeForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'none';
    resetForgotPasswordModal();
}

function resetForgotPasswordModal() {
    currentForgotPasswordStep = 1;
    forgotUserType = 'student';
    currentUserForReset = null;
    originalPasswordForReset = null;
    
    document.getElementById('forgotUsername').value = '';
    document.getElementById('securityAnswer').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    hideError('forgotUsernameError');
    hideError('userTypeError');
    hideError('securityAnswerError');
    hideError('newPasswordError');
    hideError('confirmPasswordError');
    
    selectForgotUserType('student');
    
    showStep(1);
}

function showStep(stepNumber) {
    document.querySelectorAll('.forgot-password-step').forEach(step => {
        step.classList.remove('active');
    });
    
    document.getElementById('step' + stepNumber).classList.add('active');
    currentForgotPasswordStep = stepNumber;
}

function selectForgotUserType(type) {
    forgotUserType = type;
    
    document.querySelectorAll('.forgot-user-type').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(type)) {
            btn.classList.add('active');
        }
    });
}

function proceedToStep2() {
    const username = document.getElementById('forgotUsername').value.trim();
    
    if (!username) {
        showError('forgotUsernameError', 'Please enter your username or email');
        return;
    }
    
    let userFound = false;
    
    if (forgotUserType === 'admin') {
        // For admin accounts, we use session-based authentication only
        // Check for special admin accounts
        const specialAdmins = ['admin', 'administrator', 'superadmin'];
        const isSpecialAdmin = specialAdmins.includes(username.toLowerCase());
        
        if (isSpecialAdmin) {
            if (confirm('For security reasons, admin password reset must be done by system administrator.\n\nDo you want to continue?')) {
                userFound = true;
                currentUserForReset = {
                    username: username,
                    isAdmin: true
                };
                originalPasswordForReset = 'admin123'; // Default admin password
                
                document.getElementById('securityQuestionDisplay').innerHTML = `
                    <div style="color: #e53935;">
                        <strong>Admin Account Detected</strong><br>
                        Admin accounts have enhanced security. Please contact system administrator for password reset.
                    </div>
                `;
                showStep(3);
                return;
            } else {
                return;
            }
        }
    } else {
        const registeredUsers = getRegisteredUsers();
        const user = registeredUsers.find(u => 
            u.account?.username === username || u.personal?.email === username
        );
        
        if (user) {
            userFound = true;
            currentUserForReset = user;
            originalPasswordForReset = user.account.password;
            
            if (!user.account?.securityQuestion) {
                showError('forgotUsernameError', 'No security question set for this account. Please contact administrator.');
                return;
            }
            
            document.getElementById('securityQuestionDisplay').textContent = user.account.securityQuestion;
        }
    }
    
    if (!userFound) {
        showError('forgotUsernameError', 'User not found. Please check your username or email.');
        return;
    }
    
    showStep(2);
}

function backToStep1() {
    showStep(1);
}

function verifySecurityAnswer() {
    const answer = document.getElementById('securityAnswer').value.trim();
    
    if (!answer) {
        showError('securityAnswerError', 'Please enter your answer');
        return;
    }
    
    if (!currentUserForReset) {
        showError('securityAnswerError', 'User information not found. Please start over.');
        return;
    }
    
    // Check if it's a special admin account
    if (currentUserForReset.isAdmin) {
        // For admin accounts, the default answer is "admin123"
        const correctAnswer = 'admin123';
        const userAnswer = answer.toLowerCase();
        
        if (userAnswer !== correctAnswer) {
            showError('securityAnswerError', 'Incorrect answer. Please try again.');
            return;
        }
        
        showStep(3);
        return;
    }
    
    // Regular student account verification
    const correctAnswer = currentUserForReset.account.securityAnswer.toLowerCase();
    const userAnswer = answer.toLowerCase();
    
    if (userAnswer !== correctAnswer) {
        showError('securityAnswerError', 'Incorrect answer. Please try again.');
        return;
    }
    
    showStep(3);
    
    document.getElementById('newPassword').addEventListener('input', checkPasswordStrength);
}

function backToStep2() {
    showStep(2);
}

function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthBar = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    let strength = 0;
    let text = 'Weak';
    let color = '#e53935';
    
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    document.getElementById('reqLength').style.color = hasMinLength ? '#2e7d32' : '#999';
    document.getElementById('reqUppercase').style.color = hasUppercase ? '#2e7d32' : '#999';
    document.getElementById('reqLowercase').style.color = hasLowercase ? '#2e7d32' : '#999';
    document.getElementById('reqNumber').style.color = hasNumber ? '#2e7d32' : '#999';
    
    if (hasMinLength) strength += 25;
    if (hasUppercase) strength += 25;
    if (hasLowercase) strength += 25;
    if (hasNumber) strength += 25;
    
    if (strength >= 75) {
        text = 'Strong';
        color = '#2e7d32';
    } else if (strength >= 50) {
        text = 'Good';
        color = '#ff9800';
    } else if (strength >= 25) {
        text = 'Fair';
        color = '#ff9800';
    } else {
        text = 'Weak';
        color = '#e53935';
    }
    
    strengthBar.style.width = strength + '%';
    strengthBar.style.background = color;
    strengthText.textContent = text;
    strengthText.style.color = color;
}

function resetPassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    hideError('newPasswordError');
    hideError('confirmPasswordError');
    
    let isValid = true;
    
    if (!newPassword) {
        showError('newPasswordError', 'Please enter a new password');
        isValid = false;
    } else if (newPassword.length < 8) {
        showError('newPasswordError', 'Password must be at least 8 characters');
        isValid = false;
    } else if (!/[A-Z]/.test(newPassword)) {
        showError('newPasswordError', 'Password must contain at least one uppercase letter');
        isValid = false;
    } else if (!/[a-z]/.test(newPassword)) {
        showError('newPasswordError', 'Password must contain at least one lowercase letter');
        isValid = false;
    } else if (!/[0-9]/.test(newPassword)) {
        showError('newPasswordError', 'Password must contain at least one number');
        isValid = false;
    }
    
    if (!confirmPassword) {
        showError('confirmPasswordError', 'Please confirm your password');
        isValid = false;
    } else if (newPassword !== confirmPassword) {
        showError('confirmPasswordError', 'Passwords do not match');
        isValid = false;
    }
    
    // Check if new password is same as original
    if (newPassword === originalPasswordForReset) {
        showError('newPasswordError', '⚠️ That is your current password. Please use a different password.');
        showError('confirmPasswordError', 'Use a new password to reset.');
        
        document.getElementById('newPassword').style.borderColor = '#e53935';
        document.getElementById('confirmPassword').style.borderColor = '#e53935';
        
        setTimeout(() => {
            if (confirm('That is your current password. Do you want to use it to login now?')) {
                document.getElementById('username').value = 
                    currentUserForReset.username || currentUserForReset.account?.username;
                document.getElementById('password').value = newPassword;
                selectUserType(forgotUserType);
                closeForgotPasswordModal();
                showStatusMessage('✅ Your current password has been filled. Click Login to continue.', 'success');
            }
        }, 100);
        
        return;
    }
    
    if (!isValid) return;
    
    // Update password in localStorage (for student accounts only)
    if (forgotUserType === 'student') {
        const registeredUsers = getRegisteredUsers();
        const userIndex = registeredUsers.findIndex(u => 
            u.account?.username === currentUserForReset.account?.username
        );
        
        if (userIndex !== -1) {
            registeredUsers[userIndex].account.password = newPassword;
            localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
        }
    }
    // For admin accounts, we don't store passwords in localStorage
    
    // Clear remembered user if it's the same user
    if (rememberedCredentials && 
        rememberedCredentials.username === (currentUserForReset.username || currentUserForReset.account?.username)) {
        clearRememberedUser();
    }
    
    // Show success message
    document.getElementById('successMessage').innerHTML = `
        Your password has been successfully reset.<br><br>
        <strong>Username:</strong> ${currentUserForReset.username || currentUserForReset.account?.username || 'N/A'}<br>
        <strong>Account Type:</strong> ${forgotUserType}<br>
        <strong>New Password:</strong> ${'•'.repeat(newPassword.length)}
    `;
    
    showStep(4);
}

function completePasswordReset() {
    document.getElementById('username').value = 
        currentUserForReset.username || currentUserForReset.account?.username || '';
    document.getElementById('password').value = document.getElementById('newPassword').value;
    
    selectUserType(forgotUserType);
    
    closeForgotPasswordModal();
    
    showStatusMessage('✅ Password reset successful! Your login form has been auto-filled.', 'success');
    
    setTimeout(() => {
        document.getElementById('loginButton').focus();
    }, 500);
}

// ===== AUTHENTICATION SYSTEM =====
function authenticateUser(username, password, userType) {
    if (userType === 'admin') {
        // Check for special admin accounts - NO localStorage storage
        const specialAdmins = ['admin', 'administrator', 'superadmin'];
        
        // Check if it's a special admin account
        const isSpecialAdmin = specialAdmins.includes(username.toLowerCase());
        
        if (isSpecialAdmin) {
            if (password === 'admin123') {
                const adminData = {
                    username: username,
                    userType: 'admin',
                    fullName: username === 'admin' ? 'System Administrator' : username,
                    role: username === 'admin' ? 'Super Admin' : 'Administrator'
                };
                
                return { 
                    success: true, 
                    user: adminData,
                    shouldSaveCredentials: document.getElementById('rememberMe').checked
                };
            }
        }
        
        return { success: false, message: 'Invalid admin credentials' };
    }
    
    // Student authentication
    const registeredUsers = getRegisteredUsers();
    
    const user = registeredUsers.find(u => {
        const usernameMatch = u.account?.username === username || u.personal?.email === username;
        const passwordMatch = u.account?.password === password;
        return usernameMatch && passwordMatch;
    });
    
    if (user) {
        return {
            success: true,
            user: {
                username: user.account.username,
                userType: 'student',
                fullName: `${user.personal.firstName} ${user.personal.lastName}`,
                email: user.personal.email,
                program: user.program,
                registrationDate: user.registrationDate
            },
            shouldSaveCredentials: document.getElementById('rememberMe').checked
        };
    }
    
    return { success: false, message: 'Invalid username or password' };
}

function getRegisteredUsers() {
    try {
        return JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    } catch (error) {
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
    const loginText = document.getElementById('loginText');
    const spinner = document.getElementById('loginSpinner');
    
    hideError('usernameError');
    hideError('passwordError');
    hideError('loginError');
    
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
    
    loginButton.disabled = true;
    loginText.textContent = 'Signing in...';
    spinner.style.display = 'block';
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const authResult = authenticateUser(username, password, currentUserType);
    
    if (authResult.success) {
        if (authResult.shouldSaveCredentials) {
            saveRememberedUser(username, password, currentUserType);
        } else {
            if (isCurrentUsernameRemembered()) {
                clearRememberedUser();
            }
        }
        
        setUserSession(authResult.user);
        
        loginText.textContent = '✓ Success!';
        showStatusMessage('✅ Login successful! Redirecting...', 'success');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (currentUserType === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'student-dashboard.html';
        }
    } else {
        loginButton.disabled = false;
        loginText.textContent = 'Sign In';
        spinner.style.display = 'none';
        showError('loginError', authResult.message);
        showStatusMessage('❌ Login failed. Please check credentials.', 'error');
    }
});

// ===== SESSION MANAGEMENT =====
function setUserSession(user) {
    sessionStorage.clear();
    
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('username', user.username);
    sessionStorage.setItem('fullName', user.fullName || user.username);
    
    if (user.userType === 'admin') {
        sessionStorage.setItem('userType', 'admin');
        sessionStorage.setItem('isAdminLoggedIn', 'true');
        sessionStorage.setItem('adminUsername', user.username);
        sessionStorage.setItem('role', user.role || 'Administrator');
        
        if (user.role) sessionStorage.setItem('adminRole', user.role);
    } else {
        sessionStorage.setItem('userType', 'student');
        sessionStorage.setItem('email', user.email || '');
        sessionStorage.setItem('program', user.program || '');
        sessionStorage.setItem('registrationDate', user.registrationDate || '');
    }
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
    loadRememberedUser();
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    
    usernameInput.addEventListener('input', function() {
        updateRememberMeUI();
    });
    
    document.querySelectorAll('.user-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setTimeout(updateRememberMeUI, 10);
        });
    });
    
    rememberMeCheckbox.addEventListener('change', handleRememberMeChange);
    
    setTimeout(updateRememberMeUI, 100);
    
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('registered') === 'true') {
        document.getElementById('loginSuccess').style.display = 'block';
        showStatusMessage('✅ Registration successful! Please login.', 'success');
        
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        setTimeout(() => {
            document.getElementById('loginSuccess').style.display = 'none';
        }, 5000);
    }
    
    if (urlParams.get('reset') === 'success') {
        showStatusMessage('✅ Password reset successful! Please login.', 'success');
        
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
    
    usernameInput.focus();
});

// ===== LOGOUT FUNCTION =====
function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}