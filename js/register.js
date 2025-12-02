// ===== DATA MANAGEMENT =====
        let registrationData = {
            personal: {},
            program: null,
            account: {},
            registrationDate: null,
            status: 'pending'
        };

        let xmlDataString = ''; // Store XML data for optional download

        // ===== FORM FUNCTIONALITY =====
        let currentStep = 1;
        let selectedProgram = null;

        // Initialize form
        updateProgress();
        setupEventListeners();

        function setupEventListeners() {
            // Program selection
            document.querySelectorAll('.program-card').forEach(card => {
                card.addEventListener('click', function() {
                    document.querySelectorAll('.program-card').forEach(c => c.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedProgram = this.dataset.program;
                    registrationData.program = selectedProgram;
                });
            });

            // Real-time username validation
            document.getElementById('username').addEventListener('input', validateUsername);

            // Password strength checker
            document.getElementById('password').addEventListener('input', checkPasswordStrength);

            // Confirm password validation
            document.getElementById('confirmPassword').addEventListener('input', validatePasswordMatch);

            // Save data on input change
            document.querySelectorAll('input, select').forEach(input => {
                input.addEventListener('change', function() {
                    saveStepData();
                });
            });
        }

        function saveStepData() {
            switch(currentStep) {
                case 1:
                    registrationData.personal = {
                        firstName: document.getElementById('firstName').value.trim(),
                        lastName: document.getElementById('lastName').value.trim(),
                        email: document.getElementById('email').value.trim(),
                        phone: document.getElementById('phone').value.trim(),
                        birthdate: document.getElementById('birthdate').value,
                        address: document.getElementById('address').value.trim(),
                        gender: document.getElementById('gender').value
                    };
                    break;
                case 3:
                    registrationData.account = {
                        username: document.getElementById('username').value.trim(),
                        password: document.getElementById('password').value.trim(),
                        securityQuestion: document.getElementById('securityQuestion').value,
                        securityAnswer: document.getElementById('securityAnswer').value.trim()
                    };
                    break;
            }
            
            showSaveStatus('💾 Data saved', 'saving');
        }

        function nextStep() {
            if (!validateCurrentStep()) {
                return;
            }

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
            progressFill.style.width = `${(currentStep - 1) * 33}%`;
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
                    isValid = false;
                }
                
                if (!phone || !isValidPhone(phone)) {
                    document.getElementById('phoneError').style.display = 'block';
                    isValid = false;
                }
                
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
                if (!selectedProgram) {
                    alert('Please select a scholarship program');
                    isValid = false;
                }
            }
            
            if (currentStep === 3) {
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value.trim();
                const confirmPassword = document.getElementById('confirmPassword').value.trim();
                const securityQuestion = document.getElementById('securityQuestion').value;
                const securityAnswer = document.getElementById('securityAnswer').value.trim();
                
                if (!username || username.length < 3 || username.length > 20) {
                    document.getElementById('usernameError').style.display = 'block';
                    isValid = false;
                } else if (checkUsernameExists(username)) {
                    document.getElementById('usernameError').textContent = 'Username already taken';
                    document.getElementById('usernameError').style.display = 'block';
                    isValid = false;
                } else {
                    document.getElementById('usernameSuccess').style.display = 'block';
                }
                
                if (!password || password.length < 8) {
                    document.getElementById('passwordError').style.display = 'block';
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

        function checkPasswordStrength() {
            const password = this.value;
            const strengthBar = document.getElementById('passwordStrength');
            let strength = 0;
            
            strengthBar.className = 'strength-bar';
            
            if (password.length >= 8) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            switch(strength) {
                case 0:
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

        // ===== XML FUNCTIONS (OPTIONAL) =====
        function generateXML() {
            // Complete registration data
            registrationData.registrationDate = new Date().toISOString();
            registrationData.status = 'pending';
            
            // Generate XML string
            xmlDataString = createXMLString();
            
            // Show preview
            const previewEl = document.getElementById('xmlPreview');
            const preEl = previewEl.querySelector('pre');
            preEl.textContent = formatXML(xmlDataString);
            previewEl.style.display = 'block';
            
            // Enable download button
            document.getElementById('downloadXmlBtn').disabled = false;
            
            showSaveStatus('✅ XML data generated', 'success');
        }

        function downloadXML() {
            if (!xmlDataString) {
                generateXML();
            }
            
            // Create and trigger download
            const blob = new Blob([xmlDataString], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scholarship_${registrationData.account.username}_${Date.now()}.xml`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showSaveStatus('📥 XML file downloaded', 'success');
        }

        function createXMLString() {
            const escapeXML = (str) => {
                if (!str) return '';
                return str.toString()
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&apos;');
            };

            const getProgramName = (code) => {
                const programs = {
                    'wadt': 'Web Application Development Training (WADT)',
                    'hrt': 'Hotel & Restaurant Technology (HRT)'
                };
                return programs[code] || code;
            };

            return `<?xml version="1.0" encoding="UTF-8"?>
<scholarshipRegistration>
    <registrationInfo>
        <registrationDate>${escapeXML(registrationData.registrationDate)}</registrationDate>
        <status>${escapeXML(registrationData.status)}</status>
        <systemVersion>1.0</systemVersion>
    </registrationInfo>
    <personalInformation>
        <firstName>${escapeXML(registrationData.personal.firstName || '')}</firstName>
        <lastName>${escapeXML(registrationData.personal.lastName || '')}</lastName>
        <email>${escapeXML(registrationData.personal.email || '')}</email>
        <phone>${escapeXML(registrationData.personal.phone || '')}</phone>
        <birthdate>${escapeXML(registrationData.personal.birthdate || '')}</birthdate>
        <address>${escapeXML(registrationData.personal.address || '')}</address>
        <gender>${escapeXML(registrationData.personal.gender || '')}</gender>
    </personalInformation>
    <programSelection>
        <programCode>${escapeXML(registrationData.program || '')}</programCode>
        <programName>${escapeXML(getProgramName(registrationData.program))}</programName>
    </programSelection>
    <accountInformation>
        <username>${escapeXML(registrationData.account.username || '')}</username>
        <password encrypted="false">${escapeXML(registrationData.account.password || '')}</password>
        <securityQuestion>${escapeXML(registrationData.account.securityQuestion || '')}</securityQuestion>
        <securityAnswer encrypted="false">${escapeXML(registrationData.account.securityAnswer || '')}</securityAnswer>
        <accountCreated>${escapeXML(registrationData.registrationDate)}</accountCreated>
    </accountInformation>
</scholarshipRegistration>`;
        }

        function formatXML(xml) {
            const PADDING = '  ';
            const reg = /(>)(<)(\/*)/g;
            let formatted = '';
            let pad = 0;
            
            xml = xml.replace(reg, '$1\r\n$2$3');
            
            xml.split('\r\n').forEach((node, index) => {
                let indent = 0;
                if (node.match(/.+<\/\w[^>]*>$/)) {
                    indent = 0;
                } else if (node.match(/^<\/\w/)) {
                    if (pad !== 0) pad -= 1;
                } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
                    indent = 1;
                } else {
                    indent = 0;
                }
                
                formatted += PADDING.repeat(pad) + node + '\r\n';
                pad += indent;
            });
            
            return formatted;
        }

        // ===== MAIN SUBMIT FUNCTION =====
        function submitForm() {
            // Validate step 4
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
            
            // Complete registration data
            registrationData.registrationDate = new Date().toISOString();
            registrationData.status = 'pending';
            
            // Save to localStorage (for login functionality)
            saveToLocalStorage();
            
            // Generate XML data (store but don't auto-download)
            xmlDataString = createXMLString();
            
            // Show success message
            showSaveStatus('✅ Account created successfully!', 'success');
            
            // Auto-enable download button
            document.getElementById('downloadXmlBtn').disabled = false;
            
            // Show XML preview automatically
            generateXML();
            
            // Success message and redirect
            setTimeout(() => {
                alert('Registration successful! You can now login with your credentials.');
                window.location.href = 'login.html';
            }, 1500);
        }

        function saveToLocalStorage() {
            try {
                const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                
                // Check if user already exists
                const userIndex = existingUsers.findIndex(u => 
                    u.account?.username === registrationData.account.username
                );
                
                if (userIndex !== -1) {
                    // Update existing user
                    existingUsers[userIndex] = registrationData;
                } else {
                    // Add new user
                    existingUsers.push(registrationData);
                }
                
                // Save to localStorage
                localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
                
                // Also store XML string for later use
                localStorage.setItem('lastRegistrationXML', xmlDataString);
                
                console.log('User saved to localStorage for login system');
                return true;
            } catch (error) {
                console.error('Error saving to localStorage:', error);
                return false;
            }
        }

        // ===== UTILITY FUNCTIONS =====
        function showSaveStatus(message, type = 'success') {
            const statusElement = document.getElementById('saveStatus');
            statusElement.textContent = message;
            statusElement.className = 'save-status ' + type;
            statusElement.style.display = 'block';
            
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 3000);
        }

        function isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        function isValidPhone(phone) {
            return /^[0-9\s\-\(\)]{10,}$/.test(phone.replace(/\D/g, ''));
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
            console.log('Registration form ready. No auto-downloads will occur.');
        });