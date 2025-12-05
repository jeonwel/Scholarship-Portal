// ===== DATA MANAGEMENT =====
let registrationData = {
    personal: {},
    account: {},
    registrationDate: null,
    status: 'pending'
    // NOTE: No program field here - that will be added after login
};

// ===== FORM FUNCTIONALITY =====
let currentStep = 1;

// Initialize form
updateProgress();
setupEventListeners();

function setupEventListeners() {
    // Real-time username validation
    document.getElementById('username').addEventListener('input', validateUsername);

    // Password validation
    document.getElementById('password').addEventListener('input', checkPasswordStrength);

    // Confirm password validation
    document.getElementById('confirmPassword').addEventListener('input', validatePasswordMatch);
    
    // Email validation for duplicates
    document.getElementById('email').addEventListener('blur', function() {
        checkEmailExists(this.value);
    });
    
    // Phone validation - 11 digits only, numbers only
    document.getElementById('phone').addEventListener('input', validatePhoneFormat);
}

function nextStep() {
    if (!validateCurrentStep()) {
        return;
    }

    // Save data before moving to next step
    saveStepData();

    // Hide current step
    document.getElementById(`step${currentStep}`).classList.remove('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
    
    // Move to next step
    currentStep++;
    
    // Show next step
    document.getElementById(`step${currentStep}`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
    
    updateProgress();
}

function prevStep() {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
    
    currentStep--;
    
    document.getElementById(`step${currentStep}`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
    
    updateProgress();
}

function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    // For 3 steps: 0%, 50%, 100%
    const progressPercent = (currentStep - 1) * 50;
    progressFill.style.width = `${progressPercent}%`;
}

function saveStepData() {
    if (currentStep === 1) {
        registrationData.personal = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            birthdate: document.getElementById('birthdate').value,
            address: document.getElementById('address').value.trim(),
            gender: document.getElementById('gender').value
        };
    } else if (currentStep === 2) {
        registrationData.account = {
            username: document.getElementById('username').value.trim(),
            password: document.getElementById('password').value.trim(),
            securityQuestion: document.getElementById('securityQuestion').value,
            securityAnswer: document.getElementById('securityAnswer').value.trim()
        };
    }
}

function validateCurrentStep() {
    let isValid = true;
    
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.success-message').forEach(el => el.style.display = 'none');
    
    if (currentStep === 1) {
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const birthdate = document.getElementById('birthdate').value;
        const address = document.getElementById('address').value.trim();
        const gender = document.getElementById('gender').value;
        
        if (!firstName) {
            document.getElementById('firstNameError').style.display = 'block';
            isValid = false;
        }
        
        if (!lastName) {
            document.getElementById('lastNameError').style.display = 'block';
            isValid = false;
        }
        
        if (!email || !isValidEmail(email)) {
            document.getElementById('emailError').style.display = 'block';
            document.getElementById('emailError').textContent = 'Please enter a valid email address';
            isValid = false;
        } else if (checkEmailExists(email)) {
            document.getElementById('emailError').style.display = 'block';
            document.getElementById('emailError').textContent = 'Email already registered';
            isValid = false;
        }
        
        // Phone validation: exactly 11 digits, numbers only
        const phoneDigits = phone.replace(/\D/g, '');
        if (!phone) {
            document.getElementById('phoneError').style.display = 'block';
            document.getElementById('phoneError').textContent = 'Phone number is required';
            isValid = false;
        } else if (!/^\d+$/.test(phoneDigits)) {
            document.getElementById('phoneError').style.display = 'block';
            document.getElementById('phoneError').textContent = 'Phone number must contain only numbers';
            isValid = false;
        } else if (phoneDigits.length !== 11) {
            document.getElementById('phoneError').style.display = 'block';
            document.getElementById('phoneError').textContent = 'Phone number must be exactly 11 digits';
            isValid = false;
        }
        // REMOVED: Phone duplicate check since siblings can share phone
        
        if (!birthdate) {
            document.getElementById('birthdateError').style.display = 'block';
            isValid = false;
        } else {
            const age = calculateAge(new Date(birthdate));
            if (age < 16) {
                document.getElementById('birthdateError').textContent = 'You must be at least 16 years old';
                document.getElementById('birthdateError').style.display = 'block';
                isValid = false;
            }
        }
        
        if (!address) {
            document.getElementById('addressError').style.display = 'block';
            isValid = false;
        }
        
        if (!gender) {
            document.getElementById('genderError').style.display = 'block';
            isValid = false;
        }
    }
    
    if (currentStep === 2) {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const securityQuestion = document.getElementById('securityQuestion').value;
        const securityAnswer = document.getElementById('securityAnswer').value.trim();
        
        if (!username || username.length < 3 || username.length > 20) {
            document.getElementById('usernameError').style.display = 'block';
            isValid = false;
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            document.getElementById('usernameError').textContent = 'Username can only contain letters, numbers, and underscores';
            document.getElementById('usernameError').style.display = 'block';
            isValid = false;
        } else if (checkUsernameExists(username)) {
            document.getElementById('usernameError').textContent = 'Username already taken';
            document.getElementById('usernameError').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('usernameSuccess').style.display = 'block';
        }
        
        if (!validatePassword(password)) {
            document.getElementById('passwordError').style.display = 'block';
            document.getElementById('passwordError').textContent = 'Password must contain at least 8 characters, 1 uppercase, 1 lowercase, and 1 number';
            isValid = false;
        }
        
        if (password !== confirmPassword) {
            document.getElementById('confirmPasswordError').style.display = 'block';
            isValid = false;
        }
        
        if (!securityQuestion) {
            document.getElementById('securityQuestionError').style.display = 'block';
            isValid = false;
        }
        
        if (!securityAnswer) {
            document.getElementById('securityAnswerError').style.display = 'block';
            isValid = false;
        }
    }
    
    return isValid;
}

function validateUsername() {
    const username = this.value.trim();
    const errorEl = document.getElementById('usernameError');
    const successEl = document.getElementById('usernameSuccess');
    
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    if (username.length < 3) {
        errorEl.textContent = 'Username must be at least 3 characters';
        errorEl.style.display = 'block';
    } else if (username.length > 20) {
        errorEl.textContent = 'Username must be less than 20 characters';
        errorEl.style.display = 'block';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errorEl.textContent = 'Username can only contain letters, numbers, and underscores';
        errorEl.style.display = 'block';
    } else if (checkUsernameExists(username)) {
        errorEl.textContent = 'Username already taken';
        errorEl.style.display = 'block';
    } else {
        successEl.style.display = 'block';
    }
}

function checkUsernameExists(username) {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    return registeredUsers.some(user => user.account?.username === username);
}

function checkEmailExists(email) {
    if (!email) return false;
    
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const emailExists = registeredUsers.some(user => {
        // Check if user has personal data and email
        if (user.personal && user.personal.email) {
            // Convert both to lowercase for case-insensitive comparison
            const storedEmail = user.personal.email;
            if (typeof storedEmail === 'string') {
                return storedEmail.toLowerCase() === email.toLowerCase();
            }
        }
        return false;
    });
    
    return emailExists;
}

function validatePhoneFormat() {
    const phone = this.value;
    const errorEl = document.getElementById('phoneError');
    
    errorEl.style.display = 'none';
    
    // Only allow numbers
    this.value = phone.replace(/\D/g, '');
    
    // Validate length
    const phoneDigits = this.value;
    if (phoneDigits.length > 11) {
        this.value = phoneDigits.substring(0, 11);
    }
    
    // Show error if not exactly 11 digits
    if (phoneDigits.length > 0 && phoneDigits.length !== 11) {
        errorEl.textContent = 'Phone number must be exactly 11 digits';
        errorEl.style.display = 'block';
    }
}

function validatePassword(password) {
    // Password must contain at least 8 characters, 1 uppercase, 1 lowercase, and 1 number
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    return minLength && hasUpperCase && hasLowerCase && hasNumber;
}

function checkPasswordStrength() {
    const password = this.value;
    const strengthBar = document.getElementById('passwordStrength');
    let strength = 0;
    
    strengthBar.className = 'strength-bar';
    
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    
    switch(strength) {
        case 0:
            strengthBar.className = 'strength-bar';
            break;
        case 1:
            strengthBar.className = 'strength-bar strength-weak';
            break;
        case 2:
            strengthBar.className = 'strength-bar strength-fair';
            break;
        case 3:
            strengthBar.className = 'strength-bar strength-good';
            break;
        case 4:
            strengthBar.className = 'strength-bar strength-strong';
            break;
    }
}

function validatePasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = this.value;
    const errorEl = document.getElementById('confirmPasswordError');
    
    if (confirmPassword && password !== confirmPassword) {
        errorEl.style.display = 'block';
    } else {
        errorEl.style.display = 'none';
    }
}

// ===== MAIN SUBMIT FUNCTION =====
function submitForm() {
    // Validate step 3 (Terms & Conditions)
    const termsAgreed = document.getElementById('termsAgreement').checked;
    const privacyAgreed = document.getElementById('privacyAgreement').checked;
    
    if (!termsAgreed) {
        document.getElementById('termsError').style.display = 'block';
        return;
    } else {
        document.getElementById('termsError').style.display = 'none';
    }
    
    if (!privacyAgreed) {
        document.getElementById('privacyError').style.display = 'block';
        return;
    } else {
        document.getElementById('privacyError').style.display = 'none';
    }
    
    // Final validation before submission
    if (!validateCurrentStep()) {
        return;
    }
    
    // Complete registration data
    registrationData.registrationDate = new Date().toISOString();
    registrationData.status = 'pending';
    // NOTE: No program selected at registration
    
    // Save to localStorage
    if (saveToLocalStorage()) {
        // Show success message and redirect
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 500);
    } else {
        alert('Error saving registration. Please try again.');
    }
}

function saveToLocalStorage() {
    try {
        const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        
        // Final check for duplicates (email and username only)
        const emailExists = existingUsers.some(user => {
            if (user.personal && user.personal.email) {
                const storedEmail = user.personal.email;
                if (typeof storedEmail === 'string') {
                    return storedEmail.toLowerCase() === registrationData.personal.email.toLowerCase();
                }
            }
            return false;
        });
        
        const usernameExists = existingUsers.some(user => 
            user.account?.username === registrationData.account.username
        );
        
        if (emailExists) {
            alert('Email already exists. Please use a different email address.');
            return false;
        }
        
        if (usernameExists) {
            alert('Username already exists. Please choose a different username.');
            return false;
        }
        
        // Phone number can be duplicated (for siblings)
        // No check for phone duplicates
        
        // Add new user
        existingUsers.push(registrationData);
        
        // Save to localStorage
        localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
        
        console.log('User registration saved to localStorage');
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

// ===== UTILITY FUNCTIONS =====
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function calculateAge(birthdate) {
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
        age--;
    }
    
    return age;
}

// Initialize
window.addEventListener('DOMContentLoaded', function() {
    console.log('Registration form ready - No program selection');
});