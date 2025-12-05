// ===== GLOBAL VARIABLES =====
let currentUser = null;
let userApplication = null;
let currentSection = 'overview';
let pendingProgramSelection = null;
let pendingDocuments = {}; // Store uploaded files temporarily before submission

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    loadUserData();
    updateDashboard();
    setupEventListeners();
    checkFailedAccountStatus();
});

function checkLoginStatus() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const username = sessionStorage.getItem('username');
    const userType = sessionStorage.getItem('userType');

    if (isLoggedIn !== 'true' || userType !== 'student') {
        alert('Please login as a student to access the dashboard.');
        window.location.href = 'login.html';
        return;
    }

    // Load user data from localStorage
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    currentUser = users.find(u => u.account?.username === username);
    
    if (!currentUser) {
        alert('User not found. Please register first.');
        window.location.href = 'register.html';
        return;
    }

    // Check if account is marked for deletion due to failed exam
    if (currentUser.failedExam && currentUser.failedExam.markedForDeletion) {
        const deletionDate = new Date(currentUser.failedExam.deletionDate);
        const daysLeft = Math.ceil((deletionDate - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft <= 0) {
            // Delete the account
            deleteFailedAccount();
            return;
        }
    }

    // Load or create application data
    loadOrCreateApplication();
}

// Function to delete account for failed exam
function deleteFailedAccount() {
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const updatedUsers = users.filter(u => u.account?.username !== currentUser.account.username);
    localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
    
    sessionStorage.clear();
    alert('Your account has been deleted due to failing the exam. Better luck next school year!');
    window.location.href = 'login.html';
}

// Function to check and handle failed account status
function checkFailedAccountStatus() {
    if (currentUser && currentUser.failedExam && currentUser.failedExam.markedForDeletion) {
        const deletionDate = new Date(currentUser.failedExam.deletionDate);
        const daysLeft = Math.ceil((deletionDate - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft > 0) {
            // Show countdown message
            const countdownElement = document.createElement('div');
            countdownElement.id = 'failedExamWarning';
            countdownElement.style.cssText = `
                background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                margin: 20px;
                text-align: center;
                font-weight: bold;
                box-shadow: 0 4px 15px rgba(255, 68, 68, 0.3);
                animation: pulse 2s infinite;
            `;
            
            countdownElement.innerHTML = `
                <div style="font-size: 18px; margin-bottom: 5px;">⚠️ Exam Failed - Account Deletion in ${daysLeft} days</div>
                <div style="font-size: 14px; opacity: 0.9;">
                    Sorry for failing, no another chances for taking. Better luck next school year!
                </div>
            `;
            
            // Insert at the top of the content area
            const contentArea = document.querySelector('.content-area');
            if (contentArea) {
                contentArea.insertBefore(countdownElement, contentArea.firstChild);
            }
        }
    }
}

function loadOrCreateApplication() {
    if (!currentUser.applications) {
        currentUser.applications = [];
    }

    // Get active application (if any)
    userApplication = currentUser.applications.find(app => app.status !== 'cancelled');
    
    // If no active application, create one with default values
    if (!userApplication && currentUser.applications.length === 0) {
        userApplication = {
            applicationId: generateApplicationId(),
            program: null,
            status: 'not-started',
            submittedDate: null,
            documents: {
                picture: { uploaded: false, filename: null, verified: false, type: '2x2 ID Picture', dataUrl: null },
                birthcert: { uploaded: false, filename: null, verified: false, type: 'Birth Certificate', dataUrl: null },
                reportcard: { uploaded: false, filename: null, verified: false, type: 'Report Card', dataUrl: null },
                goodmoral: { uploaded: false, filename: null, verified: false, type: 'Certificate of Good Moral Character', dataUrl: null },
                tor: { uploaded: false, filename: null, verified: false, type: 'Transcript of Records (TOR)', dataUrl: null },
                diploma: { uploaded: false, filename: null, verified: false, type: 'High School Diploma', dataUrl: null }
            },
            exam: {
                taken: false,
                score: null,
                passed: false,
                dateTaken: null,
                maxScore: 100,
                passingScore: 75
            },
            timeline: [],
            adminReview: {
                reviewDate: null,
                reviewer: null,
                notes: '',
                decision: null // 'accepted' or 'rejected'
            }
        };
        
        currentUser.applications.push(userApplication);
        saveUserData();
    }
}

function generateApplicationId() {
    return 'APP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
}

function loadUserData() {
    // Update user info in header
    document.getElementById('userName').textContent = 
        `${currentUser.personal.firstName} ${currentUser.personal.lastName}`;
    document.getElementById('userEmail').textContent = currentUser.personal.email;
    
    // Set avatar with first letter of first name
    const firstLetter = currentUser.personal.firstName.charAt(0).toUpperCase();
    document.getElementById('userAvatar').textContent = firstLetter;
    
    // Update welcome message
    document.getElementById('welcomeMessage').textContent = 
        `Hello, ${currentUser.personal.firstName}!`;
}

function updateDashboard() {
    updateProgressBar();
    updateStatusCards();
    updateNavigation();
    
    // Load appropriate content based on current section
    showSection(currentSection);
}

function updateProgressBar() {
    if (!userApplication) return;

    const steps = ['step1', 'step2', 'step3', 'step4'];
    const progressBar = document.getElementById('progressBar');
    
    // Reset all steps
    steps.forEach(stepId => {
        const step = document.getElementById(stepId);
        step.classList.remove('active', 'completed');
    });

    // Determine current step
    let currentStep = 0;
    let progressWidth = '0%';

    if (userApplication.status === 'not-started') {
        currentStep = 0;
        progressWidth = '0%';
    } else if (userApplication.program) {
        currentStep = 1;
        progressWidth = '25%';
        document.getElementById('step1').classList.add('completed');
        document.getElementById('step2').classList.add('active');
        
        // Check if documents are uploaded
        if (allDocumentsUploaded()) {
            currentStep = 2;
            progressWidth = '50%';
            document.getElementById('step2').classList.add('completed');
            document.getElementById('step3').classList.add('active');
        }
        
        // Check if exam is taken
        if (userApplication.exam.taken) {
            currentStep = 3;
            progressWidth = '75%';
            document.getElementById('step3').classList.add('completed');
            document.getElementById('step4').classList.add('active');
        }
        
        // Check if application is complete and pending
        if (userApplication.status === 'pending' || userApplication.status === 'under-review') {
            currentStep = 4;
            progressWidth = '100%';
            document.getElementById('step4').classList.add('completed');
        }
    }

    progressBar.style.width = progressWidth;
}

function updateStatusCards() {
    if (!userApplication) return;

    // Application Status
    const statusText = document.getElementById('applicationStatusText');
    const statusDesc = document.getElementById('applicationStatusDesc');
    
    switch(userApplication.status) {
        case 'not-started':
            statusText.textContent = 'Not Started';
            statusText.className = 'status-value status-not-started';
            statusDesc.textContent = 'You haven\'t started your application';
            break;
        case 'applied':
            statusText.textContent = 'Applied';
            statusText.className = 'status-value status-in-progress';
            statusDesc.textContent = 'Program selected, complete remaining steps';
            break;
        case 'documents-completed':
            statusText.textContent = 'Documents Done';
            statusText.className = 'status-value status-in-progress';
            statusDesc.textContent = 'Documents uploaded, take exam next';
            break;
        case 'exam-completed':
            statusText.textContent = 'Exam Done';
            statusText.className = 'status-value status-in-progress';
            statusDesc.textContent = 'Exam completed, finalizing application';
            break;
        case 'pending':
            statusText.textContent = 'Complete ✓';
            statusText.className = 'status-value status-approved';
            statusDesc.textContent = 'Wait for admin\'s approval and interview schedule';
            break;
        case 'under-review':
            statusText.textContent = 'Under Review';
            statusText.className = 'status-value status-pending';
            statusDesc.textContent = 'Your application is being reviewed by admin';
            break;
        case 'accepted':
            statusText.textContent = 'Accepted ✓';
            statusText.className = 'status-value status-approved';
            statusDesc.textContent = 'Congratulations! Interview scheduled';
            break;
        case 'rejected':
            statusText.textContent = 'Rejected';
            statusText.className = 'status-value status-rejected';
            statusDesc.textContent = 'Application not accepted';
            break;
    }

    // Documents Status
    if (userApplication.documents) {
        const docs = userApplication.documents;
        const uploadedDocs = Object.values(docs).filter(doc => doc.uploaded).length;
        const totalDocs = Object.keys(docs).length;
        
        document.getElementById('documentsStatusText').textContent = `${uploadedDocs}/${totalDocs}`;
        
        if (uploadedDocs === 0) {
            document.getElementById('documentsStatusText').className = 'status-value status-not-started';
            document.getElementById('documentsStatusDesc').textContent = 'No documents uploaded';
            document.getElementById('documentsIndicator').style.display = 'block';
            document.getElementById('documentsIndicator').textContent = '⚠️ No documents uploaded';
        } else if (uploadedDocs === totalDocs) {
            document.getElementById('documentsStatusText').className = 'status-value status-approved';
            document.getElementById('documentsStatusDesc').textContent = 'All documents submitted';
            document.getElementById('documentsIndicator').style.display = 'none';
        } else {
            document.getElementById('documentsStatusText').className = 'status-value status-in-progress';
            document.getElementById('documentsStatusDesc').textContent = `${totalDocs - uploadedDocs} documents remaining`;
            document.getElementById('documentsIndicator').style.display = 'block';
            document.getElementById('documentsIndicator').textContent = `⚠️ ${totalDocs - uploadedDocs} documents missing`;
        }
    }

    // Exam Status
    const examText = document.getElementById('examStatusText');
    const examDesc = document.getElementById('examStatusDesc');
    
    if (userApplication.exam.taken) {
        examText.textContent = `${userApplication.exam.score}%`;
        examText.className = userApplication.exam.passed ? 
            'status-value status-approved' : 'status-value status-rejected';
        
        if (userApplication.exam.passed) {
            examDesc.textContent = 'Passed ✓';
        } else {
            examDesc.textContent = 'Failed - Account will be deleted in 7 days';
        }
    } else {
        examText.textContent = '--';
        examDesc.textContent = 'Exam not taken yet';
        examText.className = 'status-value status-not-started';
    }

    // Last Updated
    const now = new Date();
    document.getElementById('lastUpdatedText').textContent = 
        now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('lastUpdatedDesc').textContent = 
        'Today at ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function updateNavigation() {
    // Show notifications based on application status
    const applyNotification = document.getElementById('applyNotification');
    const documentsNotification = document.getElementById('documentsNotification');
    const examNotification = document.getElementById('examNotification');
    const statusNotification = document.getElementById('statusNotification');

    // Reset all notifications
    applyNotification.style.display = 'none';
    documentsNotification.style.display = 'none';
    examNotification.style.display = 'none';
    statusNotification.style.display = 'none';

    if (userApplication.status === 'not-started') {
        applyNotification.style.display = 'inline-block';
        applyNotification.textContent = '!';
    } else if (userApplication.program && !allDocumentsUploaded()) {
        documentsNotification.style.display = 'inline-block';
        documentsNotification.textContent = '!';
    } else if (allDocumentsUploaded() && !userApplication.exam.taken) {
        examNotification.style.display = 'inline-block';
        examNotification.textContent = '!';
    } else if (userApplication.exam.taken || userApplication.status === 'pending') {
        statusNotification.style.display = 'inline-block';
        statusNotification.textContent = '!';
    }
}

// ===== SECTION MANAGEMENT =====
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });

    // Remove active class from all nav links
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionId + 'Section').style.display = 'block';
    
    // Add active class to clicked nav link
    document.querySelector(`[onclick="showSection('${sectionId}')"]`).classList.add('active');

    // Update current section
    currentSection = sectionId;

    // Load section-specific content
    switch(sectionId) {
        case 'apply':
            loadProgramsSection();
            break;
        case 'documents':
            loadDocumentsSection();
            break;
        case 'exam':
            loadExamSection();
            break;
        case 'status':
            loadStatusSection();
            break;
        case 'profile':
            loadProfileSection();
            break;
    }
}

// ===== APPLY SECTION =====
function loadProgramsSection() {
    const programsContainer = document.getElementById('programsContainer');
    const applicationForm = document.getElementById('applicationForm');
    
    // Clear existing content
    programsContainer.innerHTML = '';
    
    // Check if user failed exam
    if (userApplication.exam.taken && !userApplication.exam.passed) {
        programsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                <h3 style="color: var(--danger); margin-bottom: 15px;">Application Not Available</h3>
                <p>You cannot apply for another program because you failed the qualification exam.</p>
                <div style="background: #ffebee; padding: 20px; border-radius: 10px; max-width: 600px; margin: 20px auto;">
                    <h4 style="color: var(--danger); margin-bottom: 15px;">Important Notice</h4>
                    <p><strong>No Retakes:</strong> You cannot retake the exam for this application.</p>
                    <p><strong>Account Deletion:</strong> Your account will be deleted in 7 days.</p>
                    <p><strong>Future Applications:</strong> Better luck next school year!</p>
                </div>
            </div>
        `;
        applicationForm.style.display = 'none';
        return;
    }
    
    // Check if user already has an application
    if (userApplication && userApplication.program) {
        // User already applied, show current application
        programsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; background: var(--light-blue); border-radius: 15px;">
                <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
                <h3 style="color: var(--primary-blue); margin-bottom: 15px;">Application Submitted</h3>
                <p>You have already applied for the <strong>${getProgramName(userApplication.program)}</strong> program.</p>
                <p style="margin-top: 10px; color: var(--medium-gray);">You cannot apply for another program.</p>
                <button class="btn btn-primary" style="margin-top: 20px;" onclick="showSection('status')">
                    View Application Status
                </button>
            </div>
        `;
        applicationForm.style.display = 'none';
        return;
    }

    // User hasn't applied yet, show program options
    const programs = [
        {
            id: 'wadt',
            name: 'Web Application Development Training (WADT)',
            description: 'Full-stack web development program',
            icon: '💻',
            duration: '6 months',
            requirements: ['High School Graduate', 'Basic Computer Literacy', 'Passion for Technology']
        },
        {
            id: 'hrt',
            name: 'Hotel & Restaurant Technology (HRT)',
            description: 'Hospitality management program',
            icon: '🏨',
            duration: '6 months',
            requirements: ['High School Graduate', 'Good Communication Skills', 'Interest in Hospitality']
        }
    ];

    programs.forEach(program => {
        const programCard = document.createElement('div');
        programCard.className = 'program-card';
        programCard.innerHTML = `
            <div class="program-header">
                <h3>${program.name}</h3>
                <p>${program.description}</p>
            </div>
            <div class="program-content">
                <ul class="program-features">
                    <li>✅ Duration: ${program.duration}</li>
                    <li>✅ Hands-on training</li>
                    <li>✅ Industry certification</li>
                    <li>✅ Job placement assistance</li>
                </ul>
                <div class="program-requirements">
                    <h4>Requirements:</h4>
                    ${program.requirements.map(req => `<p>• ${req}</p>`).join('')}
                </div>
                <button class="btn btn-primary" onclick="showConfirmationModal('${program.id}')">
                    Apply for ${program.name.split(' ')[0]}
                </button>
            </div>
        `;
        programsContainer.appendChild(programCard);
    });

    applicationForm.style.display = 'none';
}

function showConfirmationModal(programId) {
    const programName = getProgramName(programId);
    pendingProgramSelection = programId;
    
    // Update modal content
    document.getElementById('modalTitle').textContent = `Apply for ${programName} Program`;
    document.getElementById('modalMessage').textContent = 
        `Are you sure you want to apply for the ${programName} program? Once selected, you cannot change your program.`;
    
    // Show modal
    document.getElementById('confirmationModal').style.display = 'flex';
}

function confirmProgramSelection() {
    if (!pendingProgramSelection) return;
    
    const programId = pendingProgramSelection;
    userApplication.program = programId;
    userApplication.status = 'applied';
    userApplication.submittedDate = new Date().toISOString();
    
    // Add to timeline
    addTimelineEvent('Program selected: ' + getProgramName(programId));
    addTimelineEvent('Application submitted for review');
    
    saveUserData();
    updateDashboard();
    
    // Hide modal
    document.getElementById('confirmationModal').style.display = 'none';
    
    // Show application form
    document.getElementById('applicationForm').style.display = 'block';
    document.getElementById('selectedProgramInfo').innerHTML = `
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="color: var(--primary-blue); margin-bottom: 10px;">Selected Program: ${getProgramName(programId)}</h4>
            <p>Please review your selection and submit your application.</p>
        </div>
    `;
    
    // Scroll to form
    document.getElementById('applicationForm').scrollIntoView({ behavior: 'smooth' });
    
    // Reset pending selection
    pendingProgramSelection = null;
}

function cancelProgramSelection() {
    // Hide modal
    document.getElementById('confirmationModal').style.display = 'none';
    
    // Reset pending selection
    pendingProgramSelection = null;
}

function submitApplication() {
    if (!userApplication.program) {
        alert('Please select a program first.');
        return;
    }

    // Update application status
    userApplication.status = 'applied';
    userApplication.submittedDate = new Date().toISOString();
    
    // Add to timeline
    addTimelineEvent('Application submitted successfully');
    
    saveUserData();
    updateDashboard();
    
    // Show success message
    alert('Application submitted successfully! Please proceed to upload your documents.');
    
    // Switch to documents section
    showSection('documents');
}

// ===== DOCUMENTS SECTION =====
function loadDocumentsSection() {
    if (!userApplication || !userApplication.program) {
        document.getElementById('documentsSection').innerHTML = `
            <div class="content-header">
                <h1>Upload Required Documents</h1>
                <p>Please apply for a program first</p>
            </div>
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
                <h3 style="color: var(--primary-blue); margin-bottom: 15px;">No Application Found</h3>
                <p>You need to apply for a scholarship program first before uploading documents.</p>
                <button class="btn btn-primary" style="margin-top: 20px;" onclick="showSection('apply')">
                    Apply for Program
                </button>
            </div>
        `;
        return;
    }
    
    // Check if user failed exam and disable document uploads
    if (userApplication.exam.taken && !userApplication.exam.passed) {
        document.getElementById('documentsSection').innerHTML = `
            <div class="content-header">
                <h1>Upload Required Documents</h1>
                <p>Documents upload disabled</p>
            </div>
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                <h3 style="color: var(--danger); margin-bottom: 15px;">Exam Failed - Uploads Disabled</h3>
                <p style="margin-bottom: 20px; max-width: 600px; margin-left: auto; margin-right: auto;">
                    Sorry, you failed the qualification exam. Document uploads are no longer available.
                </p>
                <div style="background: #ffebee; padding: 20px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                    <h4 style="color: var(--danger); margin-bottom: 15px;">Important Notice</h4>
                    <p><strong>No Retakes:</strong> You cannot retake the exam for this application.</p>
                    <p><strong>Account Deletion:</strong> Your account will be deleted in 7 days.</p>
                    <p><strong>Future Applications:</strong> Better luck next school year!</p>
                </div>
            </div>
        `;
        return;
    }

    updateDocumentsSummary();
    renderDocumentsList();
}

function updateDocumentsSummary() {
    if (!userApplication || !userApplication.documents) return;
    
    const docs = userApplication.documents;
    const uploadedDocs = Object.values(docs).filter(doc => doc.uploaded).length;
    const totalDocs = Object.keys(docs).length;
    const progress = Math.round((uploadedDocs / totalDocs) * 100);
    
    // Update counts
    document.getElementById('uploadedCount').textContent = uploadedDocs;
    document.getElementById('totalCount').textContent = totalDocs;
    
    // Update progress circle
    const circlePath = document.getElementById('circlePath');
    const circleText = document.getElementById('circleText');
    
    circlePath.style.strokeDasharray = `${progress}, 100`;
    circleText.textContent = `${progress}%`;
    
    // Initially hide the missing documents section
    const missingDocsElement = document.getElementById('missingDocuments');
    missingDocsElement.style.display = 'none';
    missingDocsElement.textContent = '';
}

function renderDocumentsList() {
    const documentsList = document.getElementById('documentsList');
    documentsList.innerHTML = '';

    // Define documents in the specified order
    const documents = [
        {
            id: 'picture',
            name: '2x2 ID Picture',
            description: 'Recent passport-sized photo with white background',
            required: true,
            accept: 'image/*'
        },
        {
            id: 'birthcert',
            name: 'Birth Certificate',
            description: 'PSA/NSO issued birth certificate',
            required: true,
            accept: '.pdf,.jpg,.jpeg,.png'
        },
        {
            id: 'reportcard',
            name: 'Report Card',
            description: 'Latest report card (Form 138)',
            required: true,
            accept: '.pdf,.jpg,.jpeg,.png'
        },
        {
            id: 'goodmoral',
            name: 'Certificate of Good Moral Character',
            description: 'Issued by your previous school',
            required: true,
            accept: '.pdf,.jpg,.jpeg,.png'
        },
        {
            id: 'tor',
            name: 'Transcript of Records (TOR)',
            description: 'Official transcript from your previous school',
            required: true,
            accept: '.pdf,.jpg,.jpeg,.png'
        },
        {
            id: 'diploma',
            name: 'High School Diploma',
            description: 'Copy of your high school diploma',
            required: true,
            accept: '.pdf,.jpg,.jpeg,.png'
        }
    ];

    documents.forEach(doc => {
        const docData = userApplication.documents[doc.id];
        const isUploaded = docData && docData.uploaded;
        const hasPendingFile = pendingDocuments[doc.id];
        
        let cardClass = 'document-card';
        if (isUploaded || hasPendingFile) {
            cardClass += ' uploaded';
        } else {
            cardClass += ' required missing';
        }
        
        const documentCard = document.createElement('div');
        documentCard.className = cardClass;
        
        if (doc.id === 'picture') {
            // Special layout for 2x2 ID Picture
            documentCard.innerHTML = `
                <div class="document-header">
                    <div class="document-title">
                        <span>${isUploaded || hasPendingFile ? '📷' : '📄'}</span>
                        ${doc.name}
                    </div>
                    <div class="document-status ${isUploaded || hasPendingFile ? 'status-uploaded' : 'status-required'}">
                        ${isUploaded ? 'Saved' : hasPendingFile ? 'Ready to Submit' : 'Required'}
                    </div>
                </div>
                
                <p style="color: var(--medium-gray); font-size: 14px; margin-bottom: 15px;">${doc.description}</p>
                
                ${isUploaded || hasPendingFile ? `
                <div style="text-align: center; margin: 20px 0;">
                    ${getPicturePreview(isUploaded ? docData.dataUrl : pendingDocuments[doc.id]?.dataUrl, doc.name)}
                </div>
                
                <div class="upload-area" onclick="document.getElementById('fileInput_${doc.id}').click()">
                    <div class="upload-icon">📤</div>
                    <div class="upload-text">
                        <h4>Change File</h4>
                        <p>Click to upload or drag and drop</p>
                        <p style="font-size: 12px;">Max file size: 5MB • ${doc.accept}</p>
                    </div>
                </div>
                
                <div class="file-preview" style="margin-top: 15px;">
                    <div class="file-info">
                        <span>📎</span>
                        <div>
                            <div class="file-name">${isUploaded ? docData.filename : pendingDocuments[doc.id].name}</div>
                            <div class="file-size">${isUploaded ? 'Saved' : 'Pending Submission'}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        ${isUploaded && docData.dataUrl ? `
                        <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; flex: 1;" 
                                onclick="downloadDocument('${doc.id}')">
                            ⬇️ Download
                        </button>
                        ` : ''}
                        <button class="btn-remove" onclick="removeDocument('${doc.id}')">Remove</button>
                    </div>
                </div>
                ` : `
                <div class="upload-area" onclick="document.getElementById('fileInput_${doc.id}').click()">
                    <div class="upload-icon">📤</div>
                    <div class="upload-text">
                        <h4>Upload File</h4>
                        <p>Click to upload or drag and drop</p>
                        <p style="font-size: 12px;">Max file size: 5MB • ${doc.accept}</p>
                    </div>
                </div>
                `}
                
                <input type="file" id="fileInput_${doc.id}" style="display: none;" 
                       accept="${doc.accept}" onchange="handleFileUpload('${doc.id}', this)">
            `;
        } else {
            // Regular layout for other documents
            documentCard.innerHTML = `
                <div class="document-header">
                    <div class="document-title">
                        <span>${isUploaded || hasPendingFile ? '📎' : '📄'}</span>
                        ${doc.name}
                    </div>
                    <div class="document-status ${isUploaded || hasPendingFile ? 'status-uploaded' : 'status-required'}">
                        ${isUploaded ? 'Saved' : hasPendingFile ? 'Ready to Submit' : 'Required'}
                    </div>
                </div>
                
                <p style="color: var(--medium-gray); font-size: 14px; margin-bottom: 15px;">${doc.description}</p>
                
                <div class="upload-area" onclick="document.getElementById('fileInput_${doc.id}').click()">
                    <div class="upload-icon">📤</div>
                    <div class="upload-text">
                        <h4>${isUploaded || hasPendingFile ? 'Change File' : 'Upload File'}</h4>
                        <p>Click to upload or drag and drop</p>
                        <p style="font-size: 12px;">Max file size: 5MB • ${doc.accept}</p>
                    </div>
                </div>
                
                <input type="file" id="fileInput_${doc.id}" style="display: none;" 
                       accept="${doc.accept}" onchange="handleFileUpload('${doc.id}', this)">
                
                ${isUploaded || hasPendingFile ? `
                <div class="file-preview">
                    <div class="file-info">
                        <span>📎</span>
                        <div>
                            <div class="file-name">${isUploaded ? docData.filename : pendingDocuments[doc.id].name}</div>
                            <div class="file-size">${isUploaded ? 'Saved' : 'Pending Submission'}</div>
                        </div>
                    </div>
                    ${isUploaded && docData.dataUrl ? `
                    <div style="margin-top: 10px; text-align: center;">
                        ${getDocumentPreview(docData.dataUrl, docData.filename)}
                    </div>
                    ` : ''}
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        ${isUploaded && docData.dataUrl ? `
                        <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; flex: 1;" 
                                onclick="downloadDocument('${doc.id}')">
                            ⬇️ Download
                        </button>
                        ` : ''}
                        <button class="btn-remove" onclick="removeDocument('${doc.id}')">Remove</button>
                    </div>
                </div>
                ` : ''}
            `;
        }
        
        documentsList.appendChild(documentCard);
    });

    // Update submit button state
    const submitBtn = document.getElementById('submitDocumentsBtn');
    const pendingCount = Object.keys(pendingDocuments).length;
    const savedCount = Object.values(userApplication.documents).filter(d => d.uploaded).length;
    const totalCount = Object.keys(userApplication.documents).length;
    
    if (savedCount === totalCount) {
        submitBtn.innerHTML = '✅ All Documents Submitted';
        submitBtn.disabled = true;
        submitBtn.style.background = '#cccccc';
    } else if (pendingCount > 0) {
        submitBtn.innerHTML = `Submit ${pendingCount} Pending Document(s)`;
        submitBtn.disabled = false;
        submitBtn.style.background = 'linear-gradient(135deg, var(--success) 0%, #4caf50 100%)';
    } else {
        submitBtn.innerHTML = `Submit All 6 Required Documents (${savedCount}/6)`;
        submitBtn.disabled = true;
        submitBtn.style.background = 'linear-gradient(135deg, var(--primary-blue) 0%, #1976d2 100%)';
    }
}

function getPicturePreview(dataUrl, filename) {
    if (!dataUrl) return '';
    
    // Larger display for 2x2 ID Picture
    if (dataUrl.startsWith('data:image/')) {
        return `
            <div style="display: inline-block; border: 3px solid var(--primary-blue); border-radius: 10px; padding: 10px; background: white;">
                <img src="${dataUrl}" alt="${filename}" 
                     style="width: 200px; height: 200px; object-fit: cover; border-radius: 5px; display: block;">
                <div style="margin-top: 10px; font-size: 12px; color: var(--medium-gray); text-align: center;">
                    2x2 ID Picture
                </div>
            </div>
        `;
    }
    
    return '';
}

function getDocumentPreview(dataUrl, filename) {
    if (!dataUrl) return '';
    
    // Check if it's an image
    if (dataUrl.startsWith('data:image/')) {
        return `<img src="${dataUrl}" alt="${filename}" style="max-width: 150px; max-height: 150px; border-radius: 5px; border: 1px solid #ddd; margin: 10px auto; display: block;">`;
    }
    // Check if it's a PDF
    else if (dataUrl.includes('pdf') || filename.toLowerCase().endsWith('.pdf')) {
        return `
            <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center; max-width: 150px; margin: 10px auto;">
                <div style="font-size: 24px; margin-bottom: 5px;">📄</div>
                <div style="font-weight: 600; color: var(--primary-blue); margin-bottom: 2px; font-size: 11px;">PDF Document</div>
                <div style="font-size: 10px; color: var(--medium-gray);">Click "Download" to view</div>
            </div>
        `;
    }
    // For other file types
    else {
        return `
            <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center; max-width: 150px; margin: 10px auto;">
                <div style="font-size: 24px; margin-bottom: 5px;">📎</div>
                <div style="font-weight: 600; color: var(--primary-blue); margin-bottom: 2px; font-size: 11px;">Document File</div>
                <div style="font-size: 10px; color: var(--medium-gray);">Click "Download" to view</div>
            </div>
        `;
    }
}

function handleFileUpload(docId, input) {
    const file = input.files[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
    }

    // Use FileReader to read file as data URL
    const reader = new FileReader();
    reader.onload = function(e) {
        // Store file in pendingDocuments with data URL
        pendingDocuments[docId] = {
            name: file.name,
            file: file,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            dataUrl: e.target.result // Store the data URL for display
        };

        // Update UI but DON'T save to userApplication yet
        renderDocumentsList();
        
        // Show temporary notification
        const notification = document.createElement('div');
        notification.className = 'upload-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid var(--primary-blue);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 1000;
            max-width: 300px;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">📎</span>
                <div>
                    <div style="font-weight: bold;">File Ready</div>
                    <div style="font-size: 12px; color: var(--medium-gray);">${file.name}</div>
                    <div style="font-size: 11px; color: var(--medium-gray); margin-top: 5px;">
                        Click "Submit" to save this document
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    };
    
    reader.readAsDataURL(file); // Read file as data URL
}

function downloadDocument(docId) {
    const docData = userApplication.documents[docId];
    if (!docData || !docData.dataUrl) {
        alert('Document data not available.');
        return;
    }

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = docData.dataUrl;
    link.download = docData.filename || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function removeDocument(docId) {
    // Remove from pending documents if not saved yet
    if (pendingDocuments[docId]) {
        delete pendingDocuments[docId];
    } else if (userApplication.documents[docId].uploaded) {
        // Remove from saved documents
        userApplication.documents[docId] = {
            uploaded: false,
            filename: null,
            verified: false,
            type: userApplication.documents[docId].type || docId,
            dataUrl: null
        };
        
        // Update status if all documents were uploaded before
        if (userApplication.status === 'documents-completed') {
            userApplication.status = 'applied';
        }
        
        addTimelineEvent(`Document removed: ${userApplication.documents[docId].type}`);
        saveUserData();
        updateDashboard();
    }
    
    renderDocumentsList();
    updateDocumentsSummary();
}

// This function saves pending documents when "Submit All Documents" is clicked
function checkDocumentsCompletion() {
    const missingDocsElement = document.getElementById('missingDocuments');
    const pendingCount = Object.keys(pendingDocuments).length;
    const savedCount = Object.values(userApplication.documents).filter(d => d.uploaded).length;
    
    // Check if there are pending documents to save
    if (pendingCount === 0 && savedCount < 6) {
        // Show missing documents warning
        const missingDocs = [];
        const documentNames = {
            picture: '2x2 ID Picture',
            birthcert: 'Birth Certificate',
            reportcard: 'Report Card',
            goodmoral: 'Certificate of Good Moral Character',
            tor: 'Transcript of Records (TOR)',
            diploma: 'High School Diploma'
        };
        
        Object.entries(userApplication.documents).forEach(([key, doc]) => {
            if (!doc.uploaded) {
                missingDocs.push(documentNames[key] || key);
            }
        });
        
        missingDocsElement.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 8px; background: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff9800;">
                <span style="color: #ff9800; font-size: 20px;">⚠️</span>
                <div>
                    <strong style="color: #e65100;">No New Documents to Submit</strong>
                    <p style="margin: 8px 0; color: #333;">
                        You need to upload documents first. Currently saved: ${savedCount}/6
                    </p>
                    ${missingDocs.length > 0 ? `
                    <div style="color: #d32f2f; font-weight: bold;">
                        Missing Documents: ${missingDocs.join(', ')}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        missingDocsElement.style.display = 'block';
        missingDocsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    
    // Save pending documents
    Object.keys(pendingDocuments).forEach(docId => {
        const pendingDoc = pendingDocuments[docId];
        
        userApplication.documents[docId] = {
            uploaded: true,
            filename: pendingDoc.name,
            filetype: pendingDoc.type,
            size: pendingDoc.size,
            lastModified: pendingDoc.lastModified,
            dataUrl: pendingDoc.dataUrl, // Store the data URL
            verified: false,
            type: userApplication.documents[docId].type || docId
        };
    });
    
    // Clear pending documents
    pendingDocuments = {};
    
    // Count uploaded documents
    const uploadedDocs = Object.values(userApplication.documents).filter(d => d.uploaded).length;
    const totalDocs = Object.keys(userApplication.documents).length;
    
    if (uploadedDocs === totalDocs) {
        // All documents are uploaded
        userApplication.status = 'documents-completed';
        
        // Check if exam is also passed
        if (userApplication.exam.taken && userApplication.exam.passed) {
            userApplication.status = 'pending';
            addTimelineEvent('All requirements met - Application submitted for review');
            
            // Show success message with admin note
            missingDocsElement.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 8px; background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
                    <span style="color: #4caf50; font-size: 20px;">✅</span>
                    <div>
                        <strong style="color: #2e7d32;">Congratulations! Application Complete</strong>
                        <p style="margin: 8px 0; color: #333;">
                            All ${totalDocs} documents have been saved.
                        </p>
                        <div style="background: #e3f2fd; padding: 10px; border-radius: 5px; margin-top: 10px;">
                            <strong style="color: var(--primary-blue);">📋 Important Note:</strong>
                            <p style="margin: 5px 0; color: #333;">
                                Your application is now <strong>complete</strong> and pending admin review.
                                Please wait for admin's approval and interview schedule notification.
                            </p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            addTimelineEvent('All documents submitted successfully');
            
            // Show success message
            missingDocsElement.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 8px; background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
                    <span style="color: #4caf50; font-size: 20px;">✅</span>
                    <div>
                        <strong style="color: #2e7d32;">Documents Submitted Successfully!</strong>
                        <p style="margin: 8px 0; color: #333;">
                            All ${totalDocs} documents have been saved.
                        </p>
                        ${userApplication.exam.taken ? 
                            '<p style="color: #f44336;">⚠️ Exam not passed. Please check exam section.</p>' :
                            '<p style="color: var(--primary-blue);">Next step: Take the qualification exam.</p>'
                        }
                    </div>
                </div>
            `;
        }
        
        saveUserData();
        updateDashboard(); // CRITICAL: This updates the status cards immediately
        
        // Auto-switch section based on exam status
        setTimeout(() => {
            if (userApplication.exam.taken) {
                if (userApplication.exam.passed) {
                    showSection('status');
                    alert('Congratulations! All requirements are complete. Your application is now pending review.\n\nPlease wait for admin\'s approval and interview schedule notification.');
                } else {
                    showSection('exam');
                }
            } else {
                showSection('exam');
                alert('Documents submitted successfully! You can now take the online exam.');
            }
        }, 1000);
    } else {
        // Not all documents uploaded yet
        const remainingDocs = totalDocs - uploadedDocs;
        addTimelineEvent(`Submitted ${Object.keys(pendingDocuments).length} document(s) - ${remainingDocs} remaining`);
        
        saveUserData();
        updateDashboard(); // CRITICAL: This updates the status cards immediately
        
        // Show partial success message
        missingDocsElement.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 8px; background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid var(--primary-blue);">
                <span style="color: var(--primary-blue); font-size: 20px;">📄</span>
                <div>
                    <strong style="color: var(--primary-blue);">Documents Saved</strong>
                    <p style="margin: 8px 0; color: #333;">
                        ${Object.keys(pendingDocuments).length} document(s) saved. Progress: ${uploadedDocs}/${totalDocs}
                    </p>
                    <div style="color: #ff9800; font-weight: bold;">
                        Still missing ${remainingDocs} document(s)
                    </div>
                </div>
            </div>
        `;
        missingDocsElement.style.display = 'block';
    }
    
    missingDocsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Refresh the documents list to show previews
    renderDocumentsList();
    updateDocumentsSummary();
}

function allDocumentsUploaded() {
    if (!userApplication || !userApplication.documents) return false;
    const docs = userApplication.documents;
    return Object.values(docs).every(doc => doc.uploaded);
}

// ===== STATUS SECTION =====
function loadStatusSection() {
    if (!userApplication) {
        // No application yet
        document.getElementById('statusSection').innerHTML = `
            <div class="content-header">
                <h1>Application Status</h1>
                <p>Track your scholarship application progress</p>
            </div>
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px;">📝</div>
                <h3 style="color: var(--primary-blue); margin-bottom: 15px;">No Application Found</h3>
                <p style="color: var(--medium-gray); margin-bottom: 30px; max-width: 500px; margin-left: auto; margin-right: auto;">
                    You haven't applied for any scholarship program yet. Start your application to track your progress.
                </p>
                <button class="btn btn-primary" onclick="showSection('apply')">
                    Apply for Scholarship
                </button>
            </div>
        `;
        return;
    }

    // Load real-time application information
    updateApplicationInfo();
    updateDocumentsStatus();
    updateExamResults();
    updateApplicationTimeline();
    
    // Show admin note if application is complete
    showAdminNoteIfComplete();
}

function showAdminNoteIfComplete() {
    const adminNoteContainer = document.getElementById('adminNoteContainer');
    if (!adminNoteContainer) return;
    
    if (userApplication.status === 'pending') {
        adminNoteContainer.innerHTML = `
            <div class="admin-note">
                <div class="admin-note-header">
                    <span style="font-size: 20px;">📋</span>
                    <h3>Application Complete - Awaiting Admin Review</h3>
                </div>
                <div class="admin-note-content">
                    <p><strong>Status:</strong> Your application is now complete and submitted for review.</p>
                    <p><strong>Next Steps:</strong></p>
                    <ul>
                        <li>✅ All documents submitted</li>
                        <li>✅ Qualification exam passed</li>
                        <li>⏳ Waiting for admin document verification</li>
                        <li>📅 Interview schedule will be sent via SMS</li>
                    </ul>
                    <div class="note-important">
                        <strong>Important:</strong> Please wait for admin's approval. You will receive an SMS notification for your interview schedule once your documents are verified.
                    </div>
                </div>
            </div>
        `;
        adminNoteContainer.style.display = 'block';
    } else if (userApplication.status === 'under-review') {
        adminNoteContainer.innerHTML = `
            <div class="admin-note" style="background: #fff3e0; border-left: 4px solid #ff9800;">
                <div class="admin-note-header">
                    <span style="font-size: 20px;">🔍</span>
                    <h3>Application Under Review</h3>
                </div>
                <div class="admin-note-content">
                    <p><strong>Status:</strong> Admin is currently reviewing your documents.</p>
                    <p><strong>Process:</strong></p>
                    <ul>
                        <li>✅ Application received</li>
                        <li>✅ Documents submitted</li>
                        <li>✅ Exam completed</li>
                        <li>🔍 Documents being verified</li>
                        <li>📅 Interview scheduling pending</li>
                    </ul>
                    <div class="note-important">
                        <strong>Note:</strong> Your application is being reviewed. You will be notified via SMS once a decision is made.
                    </div>
                </div>
            </div>
        `;
        adminNoteContainer.style.display = 'block';
    } else {
        adminNoteContainer.style.display = 'none';
    }
}

function updateApplicationInfo() {
    const appId = document.getElementById('statusApplicationId');
    const program = document.getElementById('statusProgram');
    const statusBadge = document.getElementById('statusBadge');
    const dateApplied = document.getElementById('statusDateApplied');
    const lastUpdated = document.getElementById('statusLastUpdated');

    // Application ID
    appId.textContent = userApplication.applicationId || '--';

    // Program
    program.textContent = userApplication.program ? getProgramName(userApplication.program) : '--';

    // Status with appropriate badge
    let badgeClass = 'badge-pending';
    let statusText = 'Not Started';
    
    switch(userApplication.status) {
        case 'not-started':
            badgeClass = 'badge-not-started';
            statusText = 'Not Started';
            break;
        case 'applied':
            badgeClass = 'badge-in-progress';
            statusText = 'Applied - In Progress';
            break;
        case 'documents-completed':
            badgeClass = 'badge-documents-completed';
            statusText = 'Documents Completed';
            break;
        case 'exam-completed':
            badgeClass = 'badge-exam-completed';
            statusText = 'Exam Completed';
            break;
        case 'pending':
            badgeClass = 'badge-approved';
            statusText = 'Complete - Pending Review';
            break;
        case 'under-review':
            badgeClass = 'badge-under-review';
            statusText = 'Under Review';
            break;
        case 'accepted':
            badgeClass = 'badge-approved';
            statusText = 'Accepted - Interview Scheduled';
            break;
        case 'rejected':
            badgeClass = 'badge-rejected';
            statusText = 'Rejected';
            break;
    }

    statusBadge.className = `status-badge ${badgeClass}`;
    statusBadge.textContent = statusText;

    // Dates
    if (userApplication.submittedDate) {
        const date = new Date(userApplication.submittedDate);
        dateApplied.textContent = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else {
        dateApplied.textContent = '--';
    }

    // Last updated (use timeline if available)
    if (userApplication.timeline && userApplication.timeline.length > 0) {
        const lastEvent = userApplication.timeline[userApplication.timeline.length - 1];
        const lastEventDate = new Date(lastEvent.date);
        lastUpdated.textContent = lastEventDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        lastUpdated.textContent = '--';
    }
}

function updateDocumentsStatus() {
    const documentsList = document.getElementById('statusDocumentsList');
    
    if (!userApplication.documents) {
        documentsList.innerHTML = '<p>No documents information available.</p>';
        return;
    }

    let html = '';
    const documents = [
        { id: 'picture', name: '2x2 ID Picture' },
        { id: 'birthcert', name: 'Birth Certificate' },
        { id: 'reportcard', name: 'Report Card' },
        { id: 'goodmoral', name: 'Certificate of Good Moral Character' },
        { id: 'tor', name: 'Transcript of Records (TOR)' },
        { id: 'diploma', name: 'High School Diploma' }
    ];

    documents.forEach(doc => {
        const docData = userApplication.documents[doc.id];
        const isUploaded = docData && docData.uploaded;
        const isVerified = docData && docData.verified;
        
        let statusText = 'Not Uploaded';
        let statusClass = 'status-required';
        
        if (isUploaded) {
            if (isVerified) {
                statusText = 'Verified ✓';
                statusClass = 'status-verified';
            } else {
                statusText = 'Uploaded';
                statusClass = 'status-uploaded';
            }
        }

        html += `
            <div class="detail-row">
                <div class="detail-label">${doc.name}:</div>
                <div class="detail-value">
                    <span class="document-status ${statusClass}">${statusText}</span>
                    ${docData && docData.filename ? `<br><small style="color: var(--medium-gray);">${docData.filename}</small>` : ''}
                    ${isUploaded && docData.dataUrl ? `
                    <br>
                    <button class="btn btn-primary" style="padding: 4px 8px; font-size: 11px; margin-top: 5px;" 
                            onclick="downloadDocument('${doc.id}')">
                        ⬇️ Download Document
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    // Add summary
    const uploadedDocs = Object.values(userApplication.documents).filter(d => d.uploaded).length;
    const totalDocs = Object.keys(userApplication.documents).length;
    const progress = Math.round((uploadedDocs / totalDocs) * 100);
    
    html += `
        <div class="detail-row" style="margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--light-blue);">
            <div class="detail-label">Progress:</div>
            <div class="detail-value">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="flex: 1; background: var(--light-blue); height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${progress}%; background: var(--primary-blue); height: 100%; border-radius: 5px;"></div>
                    </div>
                    <div style="font-weight: 600; color: var(--primary-blue);">${uploadedDocs}/${totalDocs} (${progress}%)</div>
                </div>
                ${uploadedDocs < totalDocs ? 
                    `<div style="font-size: 12px; color: #e53935; margin-top: 5px;">
                        ⚠️ Missing ${totalDocs - uploadedDocs} document(s)
                    </div>` : ''
                }
            </div>
        </div>
    `;

    documentsList.innerHTML = html;
}

function updateExamResults() {
    const examResultStatus = document.getElementById('examResultStatus');
    const examScore = document.getElementById('examScore');
    const examResult = document.getElementById('examResult');
    const examDate = document.getElementById('examDate');

    if (userApplication.exam.taken) {
        examResultStatus.textContent = 'Completed';
        examScore.textContent = `${userApplication.exam.score}%`;
        examResult.textContent = userApplication.exam.passed ? 'Passed ✓' : 'Failed';
        examResult.style.color = userApplication.exam.passed ? 'var(--success)' : 'var(--danger)';
        examResult.style.fontWeight = '600';
        
        if (userApplication.exam.dateTaken) {
            const date = new Date(userApplication.exam.dateTaken);
            examDate.textContent = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            examDate.textContent = '--';
        }
    } else {
        examResultStatus.textContent = 'Not Taken';
        examScore.textContent = '--';
        examResult.textContent = '--';
        examDate.textContent = '--';
    }
}

function updateApplicationTimeline() {
    const timeline = document.getElementById('applicationTimeline');
    
    if (!userApplication.timeline || userApplication.timeline.length === 0) {
        timeline.innerHTML = `
            <div class="timeline-item">
                <div class="timeline-date">--</div>
                <div class="timeline-content">
                    <h4>No Timeline Events</h4>
                    <p>Start your application to see timeline events.</p>
                </div>
            </div>
        `;
        return;
    }

    let html = '';
    // Sort timeline by date (newest first)
    const sortedTimeline = [...userApplication.timeline].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );

    sortedTimeline.forEach((event, index) => {
        const date = new Date(event.date);
        const isLatest = index === 0;
        
        html += `
            <div class="timeline-item ${isLatest ? 'current' : 'completed'}">
                <div class="timeline-date">
                    ${date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })}
                    <br>
                    <small style="color: var(--medium-gray);">
                        ${date.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </small>
                </div>
                <div class="timeline-content">
                    <h4>${event.event}</h4>
                    <p>Application status updated</p>
                </div>
            </div>
        `;
    });

    timeline.innerHTML = html;
}

// ===== EXAM SECTION =====
function loadExamSection() {
    if (!userApplication || !userApplication.program) {
        document.getElementById('examSection').innerHTML = `
            <div class="content-header">
                <h1>Online Qualification Exam</h1>
                <p>Please apply for a program and upload documents first</p>
            </div>
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
                <h3 style="color: var(--primary-blue); margin-bottom: 15px;">Not Eligible for Exam</h3>
                <p>You need to complete your application and upload all documents first.</p>
                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
                    <button class="btn btn-primary" onclick="showSection('apply')">
                        Apply for Program
                    </button>
                    <button class="btn btn-primary" onclick="showSection('documents')">
                        Upload Documents
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    if (!allDocumentsUploaded()) {
        document.getElementById('examSection').innerHTML = `
            <div class="content-header">
                <h1>Online Qualification Exam</h1>
                <p>Please upload all documents first</p>
            </div>
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
                <h3 style="color: var(--primary-blue); margin-bottom: 15px;">Documents Required</h3>
                <p>You need to upload all 6 required documents before taking the exam.</p>
                <button class="btn btn-primary" style="margin-top: 20px;" onclick="showSection('documents')">
                    Upload Documents Now
                </button>
            </div>
        `;
        return;
    }
    
    // User is eligible for exam
    const examTitle = document.getElementById('examProgramTitle');
    const examDescription = document.getElementById('examDescription');
    const examStatusInfo = document.getElementById('examStatusInfo');
    const startExamBtn = document.getElementById('startExamBtn');
    
    examTitle.textContent = `${getProgramName(userApplication.program)} Qualification Exam`;
    examDescription.textContent = `Take the qualification exam for the ${getProgramName(userApplication.program)} program. This exam will test your basic knowledge and aptitude for the program.`;
    
    if (userApplication.exam.taken) {
        if (!userApplication.exam.passed) {
            // Show failure message with consequences
            examStatusInfo.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
                    <h4 style="color: var(--danger); margin-bottom: 15px;">Exam Failed</h4>
                    <p>Score: <strong style="color: var(--danger);">${userApplication.exam.score}%</strong> (Passing: 75%)</p>
                    <p>Date Taken: ${userApplication.exam.dateTaken ? new Date(userApplication.exam.dateTaken).toLocaleDateString() : '--'}</p>
                    <div style="background: #ffebee; padding: 20px; border-radius: 10px; margin-top: 20px; text-align: left;">
                        <h5 style="color: var(--danger); margin-bottom: 10px;">⚠️ Important Consequences:</h5>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>No retakes allowed for this application</li>
                            <li>Document uploads are now disabled</li>
                            <li>Your account will be deleted in 7 days</li>
                            <li>Better luck next school year!</li>
                        </ul>
                    </div>
                </div>
            `;
        } else {
            // Show passed message
            examStatusInfo.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 10px;">✅</div>
                    <h4 style="color: var(--success); margin-bottom: 10px;">Exam Passed</h4>
                    <p>Score: <strong>${userApplication.exam.score}%</strong> (Passing: 75%)</p>
                    <p>Date Taken: ${userApplication.exam.dateTaken ? new Date(userApplication.exam.dateTaken).toLocaleDateString() : '--'}</p>
                    ${allDocumentsUploaded() ? 
                        `<div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 15px;">
                            <h5 style="color: #2e7d32; margin-bottom: 10px;">🎉 Application Complete!</h5>
                            <p>All requirements are now complete. Your application will be reviewed by admin.</p>
                            <p style="font-size: 14px; color: #666; margin-top: 10px;">
                                <strong>Note:</strong> Wait for admin's approval and interview schedule notification.
                            </p>
                        </div>` :
                        `<p style="color: var(--medium-gray); font-size: 14px; margin-top: 10px;">
                            Exam passed! Now complete your document submission.
                        </p>`
                    }
                </div>
            `;
        }
        startExamBtn.textContent = 'Exam Already Taken';
        startExamBtn.disabled = true;
        startExamBtn.style.background = '#cccccc';
    } else {
        examStatusInfo.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 32px; margin-bottom: 10px;">📝</div>
                <h4 style="color: var(--primary-blue); margin-bottom: 10px;">Ready to Take Exam</h4>
                <p>You have 5 minutes to complete 16 questions.</p>
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 15px;">
                    <h5 style="color: var(--primary-blue); margin-bottom: 10px;">⚠️ Important Notice:</h5>
                    <ul style="margin: 0; padding-left: 20px; text-align: left;">
                        <li>You can only take this exam <strong>once</strong></li>
                        <li>If you fail, you cannot retake it</li>
                        <li>Make sure you're ready before starting!</li>
                    </ul>
                </div>
            </div>
        `;
        startExamBtn.textContent = 'Start Exam Now';
        startExamBtn.disabled = false;
        startExamBtn.style.background = 'linear-gradient(135deg, var(--success) 0%, #4caf50 100%)';
    }
}

function startExam() {
    if (userApplication.exam.taken) {
        alert('You have already taken the exam.');
        return;
    }
    
    if (!allDocumentsUploaded()) {
        alert('Please upload all required documents first.');
        showSection('documents');
        return;
    }
    
    // Get the logged-in username
    const username = sessionStorage.getItem('username');
    if (!username) {
        alert('Please login again.');
        logout();
        return;
    }
    
    // Save current state before redirecting
    saveUserData();
    
    // Redirect to exam page with user info
    window.location.href = `exam.html?program=${userApplication.program}&applicationId=${userApplication.applicationId}&username=${encodeURIComponent(username)}`;
}

// ===== PROFILE SECTION =====
function loadProfileSection() {
    // Debug: Check if data is loaded correctly
    console.log('Loading profile for user:', currentUser);
    console.log('Personal data:', currentUser?.personal);
    console.log('Account data:', currentUser?.account);
    
    if (!currentUser || !currentUser.personal || !currentUser.account) {
        console.error('User data not properly loaded!');
        alert('Error loading profile data. Please try logging out and back in.');
        return;
    }
    
    // Load user information
    document.getElementById('profileFullName').textContent = 
        `${currentUser.personal.firstName || ''} ${currentUser.personal.lastName || ''}`.trim();
    document.getElementById('profileEmail').textContent = currentUser.personal.email || 'No email set';
    document.getElementById('profileUsername').textContent = currentUser.account.username || 'No username';
    
    // Format the registration date
    if (currentUser.registrationDate) {
        const regDate = new Date(currentUser.registrationDate);
        document.getElementById('profileCreatedDate').textContent = 
            regDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
    } else {
        // If no registration date, use current date or show fallback
        document.getElementById('profileCreatedDate').textContent = 
            new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
    }
    
    // Clear password fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    // Clear error messages
    document.getElementById('currentPasswordError').style.display = 'none';
    document.getElementById('newPasswordError').style.display = 'none';
    document.getElementById('confirmPasswordError').style.display = 'none';
    document.getElementById('passwordSuccess').style.display = 'none';
    
    // Reset password strength indicator
    document.getElementById('passwordStrength').className = 'strength-bar';
    
    // Setup password validation
    setupPasswordValidation();
}

function setupPasswordValidation() {
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            validatePasswordMatch();
        });
    }
}

function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('passwordStrength');
    if (!strengthBar) return;
    
    let strength = 0;
    strengthBar.className = 'strength-bar';
    
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    
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
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorEl = document.getElementById('confirmPasswordError');
    const successEl = document.getElementById('passwordSuccess');
    
    if (!errorEl || !successEl) return;
    
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    if (confirmPassword && newPassword !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.style.display = 'block';
    } else if (confirmPassword && newPassword === confirmPassword && newPassword.length >= 8) {
        successEl.style.display = 'block';
    }
}

function updatePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Clear previous errors
    const currentPasswordError = document.getElementById('currentPasswordError');
    const newPasswordError = document.getElementById('newPasswordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    
    if (currentPasswordError) currentPasswordError.style.display = 'none';
    if (newPasswordError) newPasswordError.style.display = 'none';
    if (confirmPasswordError) confirmPasswordError.style.display = 'none';
    
    let isValid = true;
    
    // Validate current password
    if (!currentPassword) {
        if (currentPasswordError) {
            currentPasswordError.textContent = 'Current password is required';
            currentPasswordError.style.display = 'block';
        }
        isValid = false;
    } else if (currentPassword !== currentUser.account.password) {
        if (currentPasswordError) {
            currentPasswordError.textContent = 'Current password is incorrect';
            currentPasswordError.style.display = 'block';
        }
        isValid = false;
    }
    
    // Validate new password
    if (!newPassword) {
        if (newPasswordError) {
            newPasswordError.textContent = 'New password is required';
            newPasswordError.style.display = 'block';
        }
        isValid = false;
    } else if (newPassword.length < 8) {
        if (newPasswordError) {
            newPasswordError.textContent = 'Password must be at least 8 characters';
            newPasswordError.style.display = 'block';
        }
        isValid = false;
    } else if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        if (newPasswordError) {
            newPasswordError.textContent = 'Password must contain uppercase, lowercase, and number';
            newPasswordError.style.display = 'block';
        }
        isValid = false;
    }
    
    // Validate password match
    if (newPassword !== confirmPassword) {
        if (confirmPasswordError) {
            confirmPasswordError.textContent = 'Passwords do not match';
            confirmPasswordError.style.display = 'block';
        }
        isValid = false;
    }
    
    // Check if new password is same as current
    if (newPassword === currentPassword) {
        if (newPasswordError) {
            newPasswordError.textContent = 'New password must be different from current password';
            newPasswordError.style.display = 'block';
        }
        isValid = false;
    }
    
    if (!isValid) return;
    
    // IMPORTANT: Remove user from rememberedUser if they're remembered
    const rememberedUser = JSON.parse(localStorage.getItem('rememberedUser') || '{}');
    if (rememberedUser.username === currentUser.account.username) {
        localStorage.removeItem('rememberedUser');
        console.log('User removed from rememberedUser due to password change');
    }
    
    // Update password
    currentUser.account.password = newPassword;
    
    // Add to timeline if it exists
    if (userApplication && userApplication.timeline) {
        addTimelineEvent('Password updated');
    }
    
    // Save updated user data
    if (saveUserData()) {
        alert('Password updated successfully! You will be logged out to apply the changes.');
        
        // Logout after successful password change
        setTimeout(() => {
            logout();
        }, 1000);
    } else {
        alert('Error updating password. Please try again.');
    }
}

// ===== UTILITY FUNCTIONS =====
function getProgramName(programCode) {
    const programs = {
        'wadt': 'Web Application Development Training (WADT)',
        'hrt': 'Hotel & Restaurant Technology (HRT)'
    };
    return programs[programCode] || programCode;
}

function addTimelineEvent(event) {
    if (!userApplication.timeline) {
        userApplication.timeline = [];
    }
    
    userApplication.timeline.push({
        date: new Date().toISOString(),
        event: event
    });
    
    // Auto-update status section if it's currently visible
    if (currentSection === 'status') {
        updateApplicationTimeline();
    }
}

function saveUserData() {
    try {
        const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const userIndex = users.findIndex(u => u.account?.username === currentUser.account.username);
        
        if (userIndex !== -1) {
            // Preserve any existing exam data if it exists
            const existingUser = users[userIndex];
            if (existingUser.applications && existingUser.applications.length > 0) {
                // Find existing exam data
                const existingApp = existingUser.applications.find(app => 
                    app.applicationId === userApplication.applicationId
                );
                if (existingApp && existingApp.exam) {
                    // Keep existing exam data unless it's being updated
                    if (!userApplication.exam.taken && existingApp.exam.taken) {
                        userApplication.exam = existingApp.exam;
                    }
                }
            }
            
            users[userIndex] = currentUser;
            localStorage.setItem('registeredUsers', JSON.stringify(users));
        }
        
        // Also update session storage for quick access
        sessionStorage.setItem('currentApplication', JSON.stringify(userApplication));
        
        return true;
    } catch (error) {
        console.error('Error saving user data:', error);
        return false;
    }
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

function setupEventListeners() {
    // Check for exam results if redirected from exam page
    const examResult = sessionStorage.getItem('examResult');
    if (examResult) {
        try {
            const result = JSON.parse(examResult);
            
            // Verify this is for the current user's application
            if (result.applicationId === userApplication.applicationId) {
                // Update application with exam results
                userApplication.exam = {
                    taken: true,
                    score: result.score,
                    passed: result.passed,
                    dateTaken: result.dateTaken,
                    maxScore: 100,
                    passingScore: 75
                };
                
                // Check if all documents are uploaded and update status accordingly
                if (result.passed && allDocumentsUploaded()) {
                    userApplication.status = 'pending';
                    addTimelineEvent(`Exam passed - Score: ${result.score}%`);
                    addTimelineEvent('All requirements met - Application submitted for review');
                    addTimelineEvent('Wait for admin\'s approval and interview schedule');
                    
                    // Show success message
                    setTimeout(() => {
                        alert('Congratulations! You passed the exam and all documents are submitted.\n\nYour application is now complete and pending review.\n\nPlease wait for admin\'s approval and interview schedule notification.');
                    }, 500);
                } else if (result.passed) {
                    userApplication.status = 'exam-completed';
                    addTimelineEvent(`Exam passed - Score: ${result.score}%`);
                    addTimelineEvent('Exam complete - Please submit remaining documents');
                    
                    setTimeout(() => {
                        alert('Congratulations! You passed the exam.\n\nPlease submit all required documents to complete your application.');
                    }, 500);
                } else {
                    // If failed, mark account for deletion
                    const deletionDate = new Date();
                    deletionDate.setDate(deletionDate.getDate() + 7); // 7 days from now
                    
                    currentUser.failedExam = {
                        markedForDeletion: true,
                        deletionDate: deletionDate.toISOString(),
                        failedDate: new Date().toISOString(),
                        score: result.score
                    };
                    
                    userApplication.status = 'exam-completed';
                    
                    addTimelineEvent(`Exam failed - Score: ${result.score}%`);
                    addTimelineEvent('Account marked for deletion in 7 days');
                    
                    // Show failure alert
                    setTimeout(() => {
                        alert(`Sorry for failing, no another chances for taking. Better luck next school year!\n\nYour account will be deleted in 7 days.`);
                    }, 500);
                }
                
                saveUserData();
                updateDashboard();
                
                // Clear the exam result from session storage
                sessionStorage.removeItem('examResult');
                
                // Auto-update status section
                if (currentSection !== 'status') {
                    showSection('status');
                } else {
                    loadStatusSection();
                }
            }
        } catch (error) {
            console.error('Error processing exam result:', error);
        }
    }
    
    // Check for admin updates
    checkForAdminUpdates();
}

function checkForAdminUpdates() {
    // Check if admin has updated the application status
    if (userApplication && userApplication.adminReview && userApplication.adminReview.decision) {
        if (userApplication.adminReview.decision === 'accepted' || userApplication.adminReview.decision === 'rejected') {
            userApplication.status = userApplication.adminReview.decision;
            addTimelineEvent(`Application ${userApplication.adminReview.decision} by admin`);
            
            if (userApplication.adminReview.decision === 'accepted') {
                addTimelineEvent('Interview scheduled - Check SMS for details');
            }
            
            saveUserData();
            updateDashboard();
            
            // Auto-update status section if it's currently visible
            if (currentSection === 'status') {
                loadStatusSection();
            }
        }
    }
}