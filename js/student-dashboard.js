// ===== GLOBAL VARIABLES =====
let currentUser = null;
let userApplication = null;
let currentSection = 'overview';
let pendingProgramSelection = null;
let pendingDocuments = {};
let deletionCountdown = null;

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    loadUserData();
    updateDashboard();
    setupEventListeners();
    checkFailedAccountStatus();
    setupCountdownTimer();
    checkForApproval();
});

function setupCountdownTimer() {
    deletionCountdown = setInterval(updateCountdownDisplay, 60000);
    updateCountdownDisplay();
}

function updateCountdownDisplay() {
    const failedExamCountdown = document.getElementById('countdownDays');
    const rejectedAppCountdown = document.getElementById('rejectedCountdownDays');
    
    if (currentUser && currentUser.failedExam && currentUser.failedExam.markedForDeletion) {
        const deletionDate = new Date(currentUser.failedExam.deletionDate);
        const now = new Date();
        const diffTime = deletionDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (failedExamCountdown) {
            failedExamCountdown.textContent = diffDays;
            
            if (diffDays <= 3) {
                failedExamCountdown.className = 'countdown-timer countdown-low';
            } else {
                failedExamCountdown.className = 'countdown-timer';
            }
        }
        
        if (diffDays <= 0) {
            deleteFailedAccount();
        }
    }
    
    if (userApplication && userApplication.status === 'rejected' && 
        userApplication.adminReview && userApplication.adminReview.decision === 'rejected' &&
        !userApplication.exam.taken) {
        
        const rejectionDate = new Date(userApplication.adminReview.reviewDate || new Date());
        const deletionDate = new Date(rejectionDate);
        deletionDate.setDate(deletionDate.getDate() + 7);
        
        const now = new Date();
        const diffTime = deletionDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (rejectedAppCountdown) {
            rejectedAppCountdown.textContent = diffDays;
            
            if (diffDays <= 3) {
                rejectedAppCountdown.className = 'countdown-timer countdown-low';
            } else {
                rejectedAppCountdown.className = 'countdown-timer';
            }
        }
        
        if (diffDays <= 0) {
            deleteRejectedAccount();
        }
    }
}

function deleteRejectedAccount() {
    // First, move any remaining documents to rejection storage
    if (userApplication && userApplication.documents) {
        const documentRejectionReasons = JSON.parse(localStorage.getItem('documentRejectionReasons') || '{}');
        const timestamp = new Date().toISOString();
        
        Object.keys(userApplication.documents).forEach(docKey => {
            const doc = userApplication.documents[docKey];
            if (doc.uploaded === true) {
                const rejectionKey = `${userApplication.applicationId}_${docKey}`;
                
                documentRejectionReasons[rejectionKey] = {
                    applicationId: userApplication.applicationId,
                    documentId: docKey,
                    reason: 'Account deleted - Application rejected by admin',
                    rejectedBy: 'System',
                    rejectionDate: timestamp,
                    documentType: doc.type || docKey,
                    studentName: `${currentUser.personal.firstName} ${currentUser.personal.lastName}`,
                    studentEmail: currentUser.personal.email,
                    originalData: {
                        filename: doc.filename,
                        filetype: doc.filetype,
                        size: doc.size,
                        dataUrl: doc.dataUrl,
                        uploadDate: doc.lastModified ? new Date(doc.lastModified).toISOString() : timestamp
                    }
                };
            }
        });
        
        localStorage.setItem('documentRejectionReasons', JSON.stringify(documentRejectionReasons));
    }
    
    // Then delete the user
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const updatedUsers = users.filter(u => u.account?.username !== currentUser.account.username);
    localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
    
    sessionStorage.clear();
    showAlertModal('error', 'Account Deleted', 'Your account has been deleted because your application was rejected.\n\nBetter luck next time!');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}

function checkLoginStatus() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const username = sessionStorage.getItem('username');
    const userType = sessionStorage.getItem('userType');

    if (isLoggedIn !== 'true' || userType !== 'student') {
        showAlertModal('error', 'Access Denied', 'Please login as a student to access the dashboard.');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    currentUser = users.find(u => u.account?.username === username);
    
    if (!currentUser) {
        showAlertModal('error', 'User Not Found', 'User not found. Please register first.');
        setTimeout(() => {
            window.location.href = 'register.html';
        }, 2000);
        return;
    }

    if (currentUser.failedExam && currentUser.failedExam.markedForDeletion) {
        const deletionDate = new Date(currentUser.failedExam.deletionDate);
        const daysLeft = Math.ceil((deletionDate - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft <= 0) {
            deleteFailedAccount();
            return;
        }
    }

    loadOrCreateApplication();
}

function deleteFailedAccount() {
    // First, move any remaining documents to rejection storage
    if (userApplication && userApplication.documents) {
        const documentRejectionReasons = JSON.parse(localStorage.getItem('documentRejectionReasons') || '{}');
        const timestamp = new Date().toISOString();
        
        Object.keys(userApplication.documents).forEach(docKey => {
            const doc = userApplication.documents[docKey];
            if (doc.uploaded === true) {
                const rejectionKey = `${userApplication.applicationId}_${docKey}`;
                
                documentRejectionReasons[rejectionKey] = {
                    applicationId: userApplication.applicationId,
                    documentId: docKey,
                    reason: 'Failed qualification exam',
                    rejectedBy: 'System',
                    rejectionDate: timestamp,
                    documentType: doc.type || docKey,
                    studentName: `${currentUser.personal.firstName} ${currentUser.personal.lastName}`,
                    studentEmail: currentUser.personal.email,
                    originalData: {
                        filename: doc.filename,
                        filetype: doc.filetype,
                        size: doc.size,
                        dataUrl: doc.dataUrl,
                        uploadDate: doc.lastModified ? new Date(doc.lastModified).toISOString() : timestamp,
                        examScore: userApplication.exam.score,
                        examDate: userApplication.exam.dateTaken,
                        program: userApplication.program
                    }
                };
            }
        });
        
        localStorage.setItem('documentRejectionReasons', JSON.stringify(documentRejectionReasons));
    }
    
    // Then delete the user
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const updatedUsers = users.filter(u => u.account?.username !== currentUser.account.username);
    localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
    
    sessionStorage.clear();
    showAlertModal('error', 'Account Deleted', 'Your account has been deleted due to failing the exam. Better luck next school year!');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}

function loadOrCreateApplication() {
    if (!currentUser.applications) {
        currentUser.applications = [];
    }

    userApplication = currentUser.applications.find(app => app.status !== 'cancelled');
    
    if (!userApplication && currentUser.applications.length === 0) {
        userApplication = {
            applicationId: generateApplicationId(),
            program: null,
            status: 'not-started',
            submittedDate: null,
            documents: {
                picture: { uploaded: false, filename: null, verified: false, type: '2x2 ID Picture', dataUrl: null, rejected: false, adminNote: '' },
                birthcert: { uploaded: false, filename: null, verified: false, type: 'Birth Certificate', dataUrl: null, rejected: false, adminNote: '' },
                reportcard: { uploaded: false, filename: null, verified: false, type: 'Report Card', dataUrl: null, rejected: false, adminNote: '' },
                goodmoral: { uploaded: false, filename: null, verified: false, type: 'Certificate of Good Moral Character', dataUrl: null, rejected: false, adminNote: '' },
                tor: { uploaded: false, filename: null, verified: false, type: 'Transcript of Records (TOR)', dataUrl: null, rejected: false, adminNote: '' },
                diploma: { uploaded: false, filename: null, verified: false, type: 'High School Diploma', dataUrl: null, rejected: false, adminNote: '' }
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
                decision: null,
                deletionDate: null
            }
        };
        
        currentUser.applications.push(userApplication);
        saveUserData();
    }
    
    if (userApplication && userApplication.exam.taken && !userApplication.exam.passed) {
        userApplication.status = 'rejected';
        userApplication.adminReview = {
            reviewDate: new Date().toISOString(),
            reviewer: 'System',
            notes: 'Application automatically rejected due to failed qualification exam.',
            decision: 'rejected',
            deletionDate: null
        };
        
        // Move documents to rejection storage when exam fails
        const documentRejectionReasons = JSON.parse(localStorage.getItem('documentRejectionReasons') || '{}');
        const timestamp = new Date().toISOString();
        
        Object.keys(userApplication.documents).forEach(docKey => {
            const doc = userApplication.documents[docKey];
            if (doc.uploaded === true) {
                const rejectionKey = `${userApplication.applicationId}_${docKey}`;
                
                // Add to rejection storage using the same format as admin
                documentRejectionReasons[rejectionKey] = {
                    applicationId: userApplication.applicationId,
                    documentId: docKey,
                    reason: 'Failed qualification exam',
                    rejectedBy: 'System',
                    rejectionDate: timestamp,
                    documentType: doc.type || docKey,
                    studentName: `${currentUser.personal.firstName} ${currentUser.personal.lastName}`,
                    studentEmail: currentUser.personal.email,
                    originalData: {
                        filename: doc.filename,
                        filetype: doc.filetype,
                        size: doc.size,
                        dataUrl: doc.dataUrl,
                        uploadDate: doc.lastModified ? new Date(doc.lastModified).toISOString() : timestamp,
                        examScore: userApplication.exam.score,
                        examDate: userApplication.exam.dateTaken,
                        program: userApplication.program
                    }
                };
                
                // Clear from user storage
                doc.uploaded = false;
                doc.filename = null;
                doc.filetype = null;
                doc.size = null;
                doc.dataUrl = null;
                doc.verified = false;
                doc.rejected = false;
                doc.adminNote = '';
            }
        });
        
        localStorage.setItem('documentRejectionReasons', JSON.stringify(documentRejectionReasons));
        
        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + 7);
        
        currentUser.failedExam = {
            markedForDeletion: true,
            deletionDate: deletionDate.toISOString(),
            failedDate: userApplication.exam.dateTaken || new Date().toISOString(),
            score: userApplication.exam.score
        };
        
        addTimelineEvent('Exam failed - Application automatically rejected');
        addTimelineEvent('Documents moved to rejection storage');
        addTimelineEvent('Account marked for deletion in 7 days');
        
        saveUserData();
    }
    
    if (userApplication && userApplication.status === 'rejected' && 
        userApplication.adminReview && userApplication.adminReview.decision === 'rejected' &&
        !userApplication.exam.taken) {
        
        if (!userApplication.adminReview.deletionDate) {
            const rejectionDate = new Date(userApplication.adminReview.reviewDate || new Date());
            const deletionDate = new Date(rejectionDate);
            deletionDate.setDate(deletionDate.getDate() + 7);
            userApplication.adminReview.deletionDate = deletionDate.toISOString();
            
            currentUser.failedExam = {
                markedForDeletion: true,
                deletionDate: deletionDate.toISOString(),
                failedDate: null,
                score: null,
                reason: 'Application rejected by administrator'
            };
            
            addTimelineEvent('Account marked for deletion in 7 days');
            saveUserData();
        }
    }
}

function generateApplicationId() {
    return 'APP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
}

function loadUserData() {
    document.getElementById('userName').textContent = 
        `${currentUser.personal.firstName} ${currentUser.personal.lastName}`;
    document.getElementById('userEmail').textContent = currentUser.personal.email;
    
    const firstLetter = currentUser.personal.firstName.charAt(0).toUpperCase();
    document.getElementById('userAvatar').textContent = firstLetter;
    
    document.getElementById('welcomeMessage').textContent = 
        `Hello, ${currentUser.personal.firstName}!`;
}

// ===== FIXED: UPDATED PROGRESS BAR FUNCTION =====
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
        // Step 1: Not started
        currentStep = 0;
        progressWidth = '0%';
    } else if (userApplication.program) {
        // Step 1 completed (applied)
        currentStep = 1;
        progressWidth = '25%';
        document.getElementById('step1').classList.add('completed');
        document.getElementById('step2').classList.add('active');
        
        // Check if ALL 6 documents are uploaded
        const allDocsUploaded = allDocumentsUploaded();
        if (allDocsUploaded) {
            // Step 2 completed (all documents uploaded)
            currentStep = 2;
            progressWidth = '50%';
            document.getElementById('step2').classList.add('completed');
            document.getElementById('step3').classList.add('active');
            
            // Check if exam is taken
            if (userApplication.exam.taken) {
                // Step 3 completed (exam taken)
                currentStep = 3;
                progressWidth = '75%';
                document.getElementById('step3').classList.add('completed');
                document.getElementById('step4').classList.add('active');
                
                // Check if application is complete (passed exam and ready for review)
                if (userApplication.exam.passed && 
                    (userApplication.status === 'pending' || 
                     userApplication.status === 'under-review' || 
                     userApplication.status === 'accepted' || 
                     userApplication.status === 'approved' ||
                     userApplication.status === 'documents-completed')) {
                    // Step 4 completed (application complete)
                    currentStep = 4;
                    progressWidth = '100%';
                    document.getElementById('step4').classList.add('completed');
                }
            }
        }
    }

    // Update progress bar width
    progressBar.style.width = progressWidth;
    
    // Debug log to help identify issues
    console.log('Progress Bar Debug:', {
        status: userApplication.status,
        program: userApplication.program,
        allDocsUploaded: allDocumentsUploaded(),
        examTaken: userApplication.exam.taken,
        examPassed: userApplication.exam.passed,
        currentStep: currentStep,
        progressWidth: progressWidth,
        uploadedDocs: countUploadedDocuments()
    });
}

// ===== FIXED: UPDATED ALL DOCUMENTS UPLOADED FUNCTION =====
function allDocumentsUploaded() {
    if (!userApplication || !userApplication.documents) return false;
    
    const docs = userApplication.documents;
    const requiredDocs = ['picture', 'birthcert', 'reportcard', 'goodmoral', 'tor', 'diploma'];
    
    // Check if ALL 6 required documents are uploaded
    const allUploaded = requiredDocs.every(docId => {
        const doc = docs[docId];
        return doc && doc.uploaded === true;
    });
    
    console.log('Documents uploaded check:', {
        requiredDocs: requiredDocs,
        docStatus: requiredDocs.map(docId => ({
            docId,
            uploaded: docs[docId]?.uploaded,
            filename: docs[docId]?.filename
        })),
        allUploaded: allUploaded
    });
    
    return allUploaded;
}

// ===== NEW: HELPER FUNCTION TO COUNT UPLOADED DOCUMENTS =====
function countUploadedDocuments() {
    if (!userApplication || !userApplication.documents) return 0;
    
    let count = 0;
    Object.values(userApplication.documents).forEach(doc => {
        if (doc.uploaded === true) {
            count++;
        }
    });
    return count;
}

function updateStatusCards() {
    if (!userApplication) return;

    const statusCards = document.querySelectorAll('.status-card');
    statusCards.forEach(card => {
        const h3 = card.querySelector('h3');
        if (h3 && h3.textContent.includes('Application Status')) {
            card.style.display = 'none';
        }
    });
    
    if (userApplication.documents) {
        const docs = userApplication.documents;
        
        let uploadedDocs = 0;
        Object.values(docs).forEach(doc => {
            if (doc.uploaded === true) {
                uploadedDocs++;
            }
        });
        
        const rejectedDocs = Object.values(docs).filter(doc => doc.rejected === true).length;
        const verifiedDocs = Object.values(docs).filter(doc => doc.verified === true).length;
        const totalDocs = Object.keys(docs).length;
        
        const documentsStatusText = document.getElementById('documentsStatusText');
        const documentsStatusDesc = document.getElementById('documentsStatusDesc');
        const documentsIndicator = document.getElementById('documentsIndicator');
        
        if (documentsStatusText) {
            documentsStatusText.textContent = `${uploadedDocs}/${totalDocs}`;
            
            if (uploadedDocs === 0) {
                documentsStatusText.className = 'status-value status-not-started';
                if (documentsStatusDesc) documentsStatusDesc.textContent = 'No documents uploaded';
                if (documentsIndicator) {
                    documentsIndicator.style.display = 'block';
                    documentsIndicator.textContent = '⚠️ No documents uploaded';
                }
            } else if (verifiedDocs === totalDocs) {
                documentsStatusText.className = 'status-value status-approved';
                if (documentsStatusDesc) documentsStatusDesc.textContent = 'All documents verified';
                if (documentsIndicator) {
                    documentsIndicator.style.display = 'none';
                }
            } else if (rejectedDocs > 0) {
                documentsStatusText.className = 'status-value status-in-progress';
                if (documentsStatusDesc) documentsStatusDesc.textContent = `${rejectedDocs} document(s) rejected`;
                if (documentsIndicator) {
                    documentsIndicator.style.display = 'block';
                    documentsIndicator.textContent = `⚠️ ${rejectedDocs} document(s) rejected`;
                }
            } else if (uploadedDocs === totalDocs) {
                documentsStatusText.className = 'status-value status-in-progress';
                if (documentsStatusDesc) documentsStatusDesc.textContent = 'Documents submitted, waiting verification';
                if (documentsIndicator) {
                    documentsIndicator.style.display = 'none';
                }
            } else {
                documentsStatusText.className = 'status-value status-in-progress';
                if (documentsStatusDesc) documentsStatusDesc.textContent = `${totalDocs - uploadedDocs} documents remaining`;
                if (documentsIndicator) {
                    documentsIndicator.style.display = 'block';
                    documentsIndicator.textContent = `⚠️ ${totalDocs - uploadedDocs} documents missing`;
                }
            }
        }
    } else {
        const documentsStatusText = document.getElementById('documentsStatusText');
        const documentsStatusDesc = document.getElementById('documentsStatusDesc');
        
        if (documentsStatusText) {
            documentsStatusText.textContent = '0/6';
            documentsStatusText.className = 'status-value status-not-started';
        }
        if (documentsStatusDesc) {
            documentsStatusDesc.textContent = 'No documents uploaded';
        }
    }

    const examText = document.getElementById('examStatusText');
    const examDesc = document.getElementById('examStatusDesc');
    
    if (examText && examDesc) {
        if (userApplication.exam && userApplication.exam.taken) {
            examText.textContent = `${userApplication.exam.score}%`;
            examText.className = userApplication.exam.passed ? 
                'status-value status-approved' : 'status-value status-rejected';
            
            if (userApplication.exam.passed) {
                examDesc.textContent = 'Passed ✓';
            } else {
                examDesc.textContent = 'Failed - Account will be deleted';
            }
        } else {
            examText.textContent = '--';
            examDesc.textContent = 'Exam not taken yet';
            examText.className = 'status-value status-not-started';
        }
    }

    const lastUpdatedText = document.getElementById('lastUpdatedText');
    const lastUpdatedDesc = document.getElementById('lastUpdatedDesc');
    
    if (lastUpdatedText && lastUpdatedDesc) {
        const now = new Date();
        lastUpdatedText.textContent = 
            now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        lastUpdatedDesc.textContent = 
            'Today at ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
}

function updateNavigation() {
    const applyNotification = document.getElementById('applyNotification');
    const documentsNotification = document.getElementById('documentsNotification');
    const examNotification = document.getElementById('examNotification');
    const statusNotification = document.getElementById('statusNotification');

    if (applyNotification) applyNotification.style.display = 'none';
    if (documentsNotification) documentsNotification.style.display = 'none';
    if (examNotification) examNotification.style.display = 'none';
    if (statusNotification) statusNotification.style.display = 'none';

    if (userApplication.status === 'not-started') {
        if (applyNotification) {
            applyNotification.style.display = 'inline-block';
            applyNotification.textContent = '!';
        }
    } else if (userApplication.program && !allDocumentsUploaded()) {
        if (documentsNotification) {
            documentsNotification.style.display = 'inline-block';
            documentsNotification.textContent = '!';
        }
    } else if (allDocumentsUploaded() && !userApplication.exam.taken) {
        if (examNotification) {
            examNotification.style.display = 'inline-block';
            examNotification.textContent = '!';
        }
    } else if (userApplication.exam.taken || userApplication.status === 'pending') {
        if (statusNotification) {
            statusNotification.style.display = 'inline-block';
            statusNotification.textContent = '!';
        }
    }
}

function updateDashboard() {
    updateProgressBar();
    updateStatusCards();
    updateNavigation();
    
    showSection(currentSection);
    checkForApproval();
}

// ===== SECTION MANAGEMENT =====
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });

    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
    });

    const sectionElement = document.getElementById(sectionId + 'Section');
    if (sectionElement) {
        sectionElement.style.display = 'block';
    }
    
    const navLink = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (navLink) {
        navLink.classList.add('active');
    }

    currentSection = sectionId;

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
    
    checkForApproval();
}

// ===== APPLY SECTION =====
function loadProgramsSection() {
    const programsContainer = document.getElementById('programsContainer');
    const applicationForm = document.getElementById('applicationForm');
    
    if (!programsContainer) return;
    
    if (applicationForm) {
        applicationForm.style.display = 'none';
    }
    
    programsContainer.innerHTML = '';
    
    if ((userApplication.exam.taken && !userApplication.exam.passed) || userApplication.status === 'rejected') {
        programsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                <h3 style="color: var(--danger); margin-bottom: 15px;">Application Not Available</h3>
                <p>You cannot apply for another program because your current application was ${userApplication.exam.taken && !userApplication.exam.passed ? 'rejected due to failed exam' : 'rejected by administrator'}.</p>
                <div style="background: #ffebee; padding: 20px; border-radius: 10px; max-width: 600px; margin: 20px auto;">
                    <h4 style="color: var(--danger); margin-bottom: 15px;">Important Notice</h4>
                    <p><strong>Account Deletion:</strong> Your account will be deleted in 7 days.</p>
                    <p><strong>Future Applications:</strong> Better luck next school year!</p>
                </div>
            </div>
        `;
        return;
    }
    
    if (userApplication && userApplication.program) {
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
        return;
    }

    const programs = [
        {
            id: 'wadt',
            name: 'Web Application Development Training (WADT)',
            description: 'Full-stack web development program',
            icon: '💻',
            duration: '3 Years',
            requirements: ['High School Graduate', 'Basic Computer Literacy', 'Passion for Technology']
        },
        {
            id: 'hrt',
            name: 'Hotel & Restaurant Technology (HRT)',
            description: 'Hospitality management program',
            icon: '🏨',
            duration: '3 Years',
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
}

function showConfirmationModal(programId) {
    const programName = getProgramName(programId);
    pendingProgramSelection = programId;
    
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modal = document.getElementById('confirmationModal');
    
    if (modalTitle) modalTitle.textContent = `Apply for ${programName} Program`;
    if (modalMessage) modalMessage.textContent = 
        `Are you sure you want to apply for the ${programName} program? Once selected, you cannot change your program.`;
    
    if (modal) modal.style.display = 'flex';
}

function confirmProgramSelection() {
    if (!pendingProgramSelection) return;
    
    const programId = pendingProgramSelection;
    userApplication.program = programId;
    userApplication.status = 'applied';
    userApplication.submittedDate = new Date().toISOString();
    
    addTimelineEvent('Program selected: ' + getProgramName(programId));
    addTimelineEvent('Application submitted successfully');
    
    saveUserData();
    updateDashboard();
    
    const modal = document.getElementById('confirmationModal');
    if (modal) modal.style.display = 'none';
    
    showAlertModal('success', 'Application Submitted!', 
        'Application submitted successfully! Please proceed to upload your documents.',
        'You have 7 days to complete all requirements.');
    
    showSection('documents');
    
    pendingProgramSelection = null;
}

function cancelProgramSelection() {
    const modal = document.getElementById('confirmationModal');
    if (modal) modal.style.display = 'none';
    
    pendingProgramSelection = null;
}

// ===== MODAL SYSTEM =====
function showAlertModal(type, title, message, details = '', onConfirm = null) {
    const modal = document.getElementById('alertModal');
    const modalIcon = document.getElementById('alertModalIcon');
    const modalTitle = document.getElementById('alertModalTitle');
    const modalMessage = document.getElementById('alertModalMessage');
    const modalDetails = document.getElementById('alertModalDetails');
    const okBtn = document.getElementById('alertModalOkBtn');
    const cancelBtn = document.getElementById('alertModalCancelBtn');
    
    const icons = {
        'warning': '⚠️',
        'success': '✅',
        'error': '❌',
        'info': 'ℹ️',
        'congratulations': '🎉'
    };
    
    modalIcon.textContent = icons[type] || '⚠️';
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    if (details) {
        modalDetails.innerHTML = details;
        modalDetails.style.display = 'block';
        modalDetails.style.marginTop = '15px';
        modalDetails.style.padding = '15px';
        modalDetails.style.background = 'var(--light-blue)';
        modalDetails.style.borderRadius = '8px';
        modalDetails.style.fontSize = '14px';
    } else {
        modalDetails.innerHTML = '';
        modalDetails.style.display = 'none';
    }
    
    if (onConfirm) {
        okBtn.textContent = 'Yes';
        cancelBtn.style.display = 'inline-block';
        
        okBtn.replaceWith(okBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        
        const newOkBtn = document.getElementById('alertModalOkBtn');
        const newCancelBtn = document.getElementById('alertModalCancelBtn');
        
        newOkBtn.onclick = function() {
            onConfirm();
            closeAlertModal();
        };
        newCancelBtn.onclick = closeAlertModal;
    } else {
        okBtn.textContent = 'OK';
        cancelBtn.style.display = 'none';
        okBtn.onclick = closeAlertModal;
    }
    
    modal.style.display = 'flex';
}

function closeAlertModal() {
    const modal = document.getElementById('alertModal');
    modal.style.display = 'none';
    
    const modalDetails = document.getElementById('alertModalDetails');
    modalDetails.innerHTML = '';
    modalDetails.style.display = 'none';
}

// ===== DOCUMENTS SECTION =====
function loadDocumentsSection() {
    const documentsSection = document.getElementById('documentsSection');
    if (!documentsSection) return;
    
    if (!userApplication || !userApplication.program) {
        documentsSection.innerHTML = `
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
    
    if ((userApplication.exam.taken && !userApplication.exam.passed) || userApplication.status === 'rejected') {
        documentsSection.innerHTML = `
            <div class="content-header">
                <h1>Upload Required Documents</h1>
                <p>Documents upload disabled</p>
            </div>
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                <h3 style="color: var(--danger); margin-bottom: 15px;">${userApplication.exam.taken && !userApplication.exam.passed ? 'Exam Failed' : 'Application Rejected'} - Uploads Disabled</h3>
                <p style="margin-bottom: 20px; max-width: 600px; margin-left: auto; margin-right: auto;">
                    ${userApplication.exam.taken && !userApplication.exam.passed ? 
                        'Sorry, you failed the qualification exam. Document uploads are no longer available.' :
                        'Your application has been rejected. Document uploads are no longer available.'}
                </p>
                <div style="background: #ffebee; padding: 20px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                    <h4 style="color: var(--danger); margin-bottom: 15px;">Important Notice</h4>
                    <p><strong>Account Deletion:</strong> Your account will be deleted in 7 days.</p>
                    <p><strong>Future Applications:</strong> Better luck next school year!</p>
                </div>
            </div>
        `;
        return;
    }

    updateDocumentsSummary();
    renderDocumentsList();
    checkForApproval();
}

function updateDocumentsSummary() {
    if (!userApplication || !userApplication.documents) return;
    
    const docs = userApplication.documents;
    let uploadedDocs = 0;
    Object.values(docs).forEach(doc => {
        if (doc.uploaded === true) {
            uploadedDocs++;
        }
    });
    const rejectedDocs = Object.values(docs).filter(doc => doc.rejected === true).length;
    const totalDocs = Object.keys(docs).length;
    const progress = Math.round((uploadedDocs / totalDocs) * 100);
    
    const uploadedCount = document.getElementById('uploadedCount');
    const totalCount = document.getElementById('totalCount');
    if (uploadedCount) uploadedCount.textContent = uploadedDocs;
    if (totalCount) totalCount.textContent = totalDocs;
    
    const rejectedInfo = document.getElementById('rejectedDocumentsInfo');
    if (rejectedInfo) {
        if (rejectedDocs > 0) {
            rejectedInfo.textContent = `⚠️ ${rejectedDocs} document(s) rejected - please re-upload`;
            rejectedInfo.style.display = 'inline';
        } else {
            rejectedInfo.style.display = 'none';
        }
    }
    
    const circlePath = document.getElementById('circlePath');
    const circleText = document.getElementById('circleText');
    
    if (circlePath && circleText) {
        circlePath.style.strokeDasharray = `${progress}, 100`;
        circleText.textContent = `${progress}%`;
    }
    
    const missingDocsElement = document.getElementById('missingDocuments');
    if (missingDocsElement) {
        missingDocsElement.style.display = 'none';
        missingDocsElement.textContent = '';
    }
}

function renderDocumentsList() {
    const documentsList = document.getElementById('documentsList');
    if (!documentsList) return;
    
    documentsList.innerHTML = '';

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
        const isUploaded = docData && docData.uploaded === true;
        const isVerified = docData && docData.verified === true;
        const isRejected = docData && docData.rejected === true;
        const hasPendingFile = pendingDocuments[doc.id];
        const isApproved = userApplication.status === 'approved';
        
        let cardClass = 'document-card';
        if (isUploaded || hasPendingFile) {
            cardClass += ' uploaded';
        } else {
            cardClass += ' required missing';
        }
        
        if (isVerified) {
            cardClass += ' verified';
        }
        
        if (isRejected) {
            cardClass += ' rejected';
        }
        
        if (isVerified || userApplication.status === 'rejected' || 
            (userApplication.exam.taken && !userApplication.exam.passed) ||
            isApproved) {
            cardClass += ' document-disabled approved-disabled';
        }
        
        const documentCard = document.createElement('div');
        documentCard.className = cardClass;
        documentCard.id = `docCard_${doc.id}`;
        
        const previewId = `preview_${doc.id}`;
        
        let statusMessage = '';
        let adminNote = '';
        if (isRejected) {
            statusMessage = '❌ Rejected - Please upload again';
            adminNote = docData.adminNote ? `<div class="rejection-message">
                <strong>Admin Note:</strong> ${docData.adminNote}
            </div>` : '';
        } else if (isVerified) {
            statusMessage = '✅ Verified ✓';
        } else if (isUploaded) {
            statusMessage = '✅ Uploaded';
        } else if (hasPendingFile) {
            statusMessage = '📝 Ready to Submit';
        }
        
        documentCard.innerHTML = `
            <div class="document-header">
                <div class="document-title">
                    <span>${doc.id === 'picture' ? (isUploaded || hasPendingFile ? '📷' : '📄') : (isUploaded || hasPendingFile ? '📎' : '📄')}</span>
                    ${doc.name}
                    ${isVerified ? '<span class="verified-badge">VERIFIED</span>' : ''}
                    ${isRejected ? '<span style="color: #f44336; font-size: 12px; margin-left: 8px;">(REJECTED)</span>' : ''}
                    ${isApproved ? '<span style="color: #4caf50; font-size: 12px; margin-left: 8px;">(APPROVED)</span>' : ''}
                </div>
                <div class="document-status ${isRejected ? 'status-required' : (isVerified ? 'status-verified' : (isUploaded || hasPendingFile ? 'status-uploaded' : 'status-required'))}">
                    ${isRejected ? 'Rejected' : (isVerified ? 'Verified' : (isUploaded ? 'Saved' : hasPendingFile ? 'Ready to Submit' : 'Required'))}
                </div>
            </div>
            
            <p style="color: var(--medium-gray); font-size: 14px; margin-bottom: 15px;">${doc.description}</p>
            
            ${statusMessage ? `<div style="color: ${isRejected ? '#f44336' : (isVerified ? '#4caf50' : (isUploaded ? '#4caf50' : '#ff9800'))}; font-weight: 500; margin-bottom: 10px;">${statusMessage}</div>` : ''}
            
            ${adminNote}
            
            ${(isUploaded || hasPendingFile) && !isVerified && !isApproved ? `
            <div id="${previewId}" style="text-align: center; margin: 15px 0;">
                ${getDocumentPreview(isUploaded ? docData.dataUrl : pendingDocuments[doc.id]?.dataUrl, 
                                  isUploaded ? docData.filename : pendingDocuments[doc.id]?.name, doc.id)}
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 10px; align-items: center;">
                ${!isVerified ? `
                <button class="btn-change-picture" onclick="document.getElementById('fileInput_${doc.id}').click()">
                    ${isRejected ? 'Upload Again' : (doc.id === 'picture' ? 'Change Picture' : 'Change File')}
                </button>
                ` : ''}
                
                <div style="font-size: 12px; color: var(--medium-gray); text-align: center;">
                    ${hasPendingFile ? 'Ready to submit' : isUploaded ? (doc.id === 'picture' ? 'Picture' : 'Document') + ' uploaded ✓' : ''}
                </div>
            </div>
            ` : `
            <div class="upload-area" onclick="${!isVerified && !isApproved ? `document.getElementById('fileInput_${doc.id}').click()` : ''}">
                <div class="upload-icon">${isVerified ? '🔒' : (isApproved ? '✅' : '📤')}</div>
                <div class="upload-text">
                    <h4>${isApproved ? 'Application Approved' : (isVerified ? 'Document Verified' : `Upload ${doc.id === 'picture' ? 'Picture' : 'File'}`)}</h4>
                    <p>${isApproved ? 'Your application has been approved. No changes allowed.' : (isVerified ? 'This document has been verified and cannot be changed' : 'Click to upload or drag and drop')}</p>
                    <p style="font-size: 12px;">${isVerified ? 'Verified by administrator' : `Max file size: 5MB • ${doc.accept}`}</p>
                </div>
            </div>
            `}
            
            ${!isVerified && !isApproved ? `<input type="file" id="fileInput_${doc.id}" style="display: none;" 
                   accept="${doc.accept}" onchange="handleFileUpload('${doc.id}', this)">` : ''}
        `;
        
        documentsList.appendChild(documentCard);
    });

    updateSubmitButtonState();
}

function updateSubmitButtonState() {
    const submitBtn = document.getElementById('submitDocumentsBtn');
    if (!submitBtn) return;
    
    const pendingCount = Object.keys(pendingDocuments).length;
    let savedCount = 0;
    Object.values(userApplication.documents).forEach(d => {
        if (d.uploaded === true) {
            savedCount++;
        }
    });
    const totalCount = Object.keys(userApplication.documents).length;
    
    if (userApplication.status === 'approved') {
        submitBtn.innerHTML = '✅ Application Approved - Documents Locked';
        submitBtn.disabled = true;
        submitBtn.className = 'btn btn-primary btn-disabled';
        return;
    }
    
    if (userApplication.exam.taken && !userApplication.exam.passed || userApplication.status === 'rejected') {
        submitBtn.innerHTML = 'Uploads Disabled';
        submitBtn.disabled = true;
        submitBtn.className = 'btn btn-primary btn-disabled';
        return;
    }
    
    if (savedCount === totalCount && pendingCount === 0) {
        submitBtn.innerHTML = '✅ All Documents Submitted';
        submitBtn.disabled = false;
        submitBtn.className = 'btn btn-primary';
    } else if (pendingCount > 0) {
        submitBtn.innerHTML = `Submit ${pendingCount} Pending Document(s)`;
        submitBtn.disabled = false;
        submitBtn.className = 'btn btn-primary';
    } else {
        submitBtn.innerHTML = `Submit All 6 Required Documents (${savedCount}/6)`;
        submitBtn.disabled = true;
        submitBtn.className = 'btn btn-primary';
    }
}

function getDocumentPreview(dataUrl, filename, docId) {
    if (!dataUrl) return '';
    
    if (docId === 'picture' && dataUrl.startsWith('data:image/')) {
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
    
    if (dataUrl.startsWith('data:image/')) {
        return `<img src="${dataUrl}" alt="${filename}" style="max-width: 200px; max-height: 200px; border-radius: 5px; border: 2px solid #ddd; margin: 10px auto; display: block;">`;
    }
    else if (dataUrl.includes('pdf') || (filename && filename.toLowerCase().endsWith('.pdf'))) {
        return `
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; max-width: 200px; margin: 10px auto;">
                <div style="font-size: 32px; margin-bottom: 5px;">📄</div>
                <div style="font-weight: 600; color: var(--primary-blue); margin-bottom: 2px; font-size: 14px;">PDF Document</div>
                <div style="font-size: 11px; color: var(--medium-gray);">${filename || 'Document'}</div>
            </div>
        `;
    }
    else {
        return `
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; max-width: 200px; margin: 10px auto;">
                <div style="font-size: 32px; margin-bottom: 5px;">📎</div>
                <div style="font-weight: 600; color: var(--primary-blue); margin-bottom: 2px; font-size: 14px;">Document File</div>
                <div style="font-size: 11px; color: var(--medium-gray);">${filename || 'Document'}</div>
            </div>
        `;
    }
}

function handleFileUpload(docId, input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showAlertModal('error', 'File Too Large', 'File size must be less than 5MB');
        input.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const wasPreviouslyUploaded = userApplication.documents[docId] && 
            userApplication.documents[docId].uploaded === true;
        const wasRejected = userApplication.documents[docId] && userApplication.documents[docId].rejected === true;
        const previousFilename = userApplication.documents[docId] ? userApplication.documents[docId].filename : null;
        
        pendingDocuments[docId] = {
            name: file.name,
            file: file,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            dataUrl: e.target.result,
            isReplacement: wasPreviouslyUploaded,
            wasRejected: wasRejected,
            previousFilename: previousFilename
        };

        renderDocumentsList();
        updateSubmitButtonState();
        
        const notification = document.createElement('div');
        notification.className = 'upload-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${wasRejected ? '#fff3e0' : (wasPreviouslyUploaded ? '#e3f2fd' : '#e8f5e9')};
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid ${wasRejected ? '#ff9800' : (wasPreviouslyUploaded ? '#1976d2' : '#4caf50')};
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 1000;
            max-width: 300px;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">${wasRejected ? '🔄' : (wasPreviouslyUploaded ? '🔄' : '📎')}</span>
                <div>
                    <div style="font-weight: bold;">${wasRejected ? 'Replaced Rejected Document' : (wasPreviouslyUploaded ? 'Document Changed' : 'File Ready')}</div>
                    <div style="font-size: 12px; color: var(--medium-gray);">${file.name}</div>
                    <div style="font-size: 11px; color: var(--medium-gray); margin-top: 5px;">
                        Click "Submit" to save changes
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    };
    
    reader.readAsDataURL(file);
}

function checkDocumentsCompletion() {
    const missingDocsElement = document.getElementById('missingDocuments');
    const pendingCount = Object.keys(pendingDocuments).length;
    let savedCount = 0;
    Object.values(userApplication.documents).forEach(d => {
        if (d.uploaded === true) {
            savedCount++;
        }
    });
    const totalCount = Object.keys(userApplication.documents).length;
    const rejectedCount = Object.values(userApplication.documents).filter(d => d.rejected === true).length;
    
    if (pendingCount === 0 && savedCount < 6) {
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
        
        if (missingDocsElement) {
            missingDocsElement.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 8px; background: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff9800;">
                    <span style="color: #ff9800; font-size: 20px;">⚠️</span>
                    <div>
                        <strong style="color: #e65100;">No New Documents to Submit</strong>
                        <p style="margin: 8px 0; color: #333;">
                            You need to upload documents first. Currently saved: ${savedCount}/6
                        </p>
                        ${rejectedCount > 0 ? `
                        <div style="color: #d32f2f; font-weight: bold; margin-top: 10px;">
                            ⚠️ ${rejectedCount} document(s) were rejected and need to be re-uploaded
                        </div>
                        ` : ''}
                        ${missingDocs.length > 0 ? `
                        <div style="color: #d32f2f; font-weight: bold; margin-top: 10px;">
                            Missing Documents: ${missingDocs.join(', ')}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            missingDocsElement.style.display = 'block';
            missingDocsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }
    
    const uploadedDocs = [];
    const changedDocs = [];
    const replacedRejectedDocs = [];
    
    Object.keys(pendingDocuments).forEach(docId => {
        const pendingDoc = pendingDocuments[docId];
        const docName = getDocumentDisplayName(docId);
        const wasReplacement = pendingDoc.isReplacement;
        const wasRejected = pendingDoc.wasRejected;
        
        if (wasRejected) {
            replacedRejectedDocs.push({
                id: docId,
                name: docName,
                oldFile: pendingDoc.previousFilename,
                newFile: pendingDoc.name
            });
        } else if (wasReplacement) {
            changedDocs.push({
                id: docId,
                name: docName,
                oldFile: pendingDoc.previousFilename,
                newFile: pendingDoc.name
            });
        } else {
            uploadedDocs.push({
                id: docId,
                name: docName,
                file: pendingDoc.name
            });
        }
        
        userApplication.documents[docId] = {
            uploaded: true,
            filename: pendingDoc.name,
            filetype: pendingDoc.type,
            size: pendingDoc.size,
            lastModified: pendingDoc.lastModified,
            dataUrl: pendingDoc.dataUrl,
            verified: false,
            rejected: false,
            adminNote: '',
            type: userApplication.documents[docId] ? userApplication.documents[docId].type || docId : docId
        };
    });
    
    pendingDocuments = {};
    
    let newSavedCount = 0;
    Object.values(userApplication.documents).forEach(d => {
        if (d.uploaded === true) {
            newSavedCount++;
        }
    });
    const totalDocs = Object.keys(userApplication.documents).length;
    const newRejectedCount = Object.values(userApplication.documents).filter(d => d.rejected === true).length;
    const remainingCount = totalDocs - newSavedCount;
    
    if (replacedRejectedDocs.length > 0) {
        replacedRejectedDocs.forEach(doc => {
            addTimelineEvent(`Re-uploaded rejected document: ${doc.name} (${remainingCount} remaining)`);
        });
    }
    
    if (uploadedDocs.length > 0) {
        const docNames = uploadedDocs.map(doc => doc.name);
        if (uploadedDocs.length === 1) {
            addTimelineEvent(`Submitted document: ${docNames[0]} (${remainingCount} remaining)`);
        } else {
            addTimelineEvent(`Submitted ${uploadedDocs.length} documents: ${docNames.join(', ')} (${remainingCount} remaining)`);
        }
    }
    
    // Check if ALL 6 documents are now uploaded
    const allSixUploaded = allDocumentsUploaded();
    
    if (allSixUploaded) {
        if (newRejectedCount === 0) {
            userApplication.status = 'documents-completed';
            
            // Check if exam is also passed
            if (userApplication.exam.taken && userApplication.exam.passed) {
                userApplication.status = 'pending';
                addTimelineEvent('All 6 documents submitted - Application complete');
                addTimelineEvent('All requirements met - Application submitted for review');
                
                // Update dashboard immediately before any redirect
                updateDashboard();
                
                if (missingDocsElement) {
                    missingDocsElement.innerHTML = `
                        <div style="display: flex; align-items: flex-start; gap: 8px; background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
                            <span style="color: #4caf50; font-size: 20px;">✅</span>
                            <div>
                                <strong style="color: #2e7d32;">Congratulations! Application Complete</strong>
                                <p style="margin: 8px 0; color: #333;">
                                    All ${totalDocs} documents have been saved and exam passed!
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
                }
            } else {
                addTimelineEvent('All 6 documents submitted successfully');
                
                const examSection = document.getElementById('examSection');
                if (examSection) {
                    examSection.classList.add('exam-auto-enabled');
                }
                
                if (missingDocsElement) {
                    missingDocsElement.innerHTML = `
                        <div style="display: flex; align-items: flex-start; gap: 8px; background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
                            <span style="color: #4caf50; font-size: 20px;">✅</span>
                            <div>
                                <strong style="color: #2e7d32;">Documents Submitted Successfully!</strong>
                                <p style="margin: 8px 0; color: #333;">
                                    All ${totalDocs} documents have been saved.
                                </p>
                                <p style="color: var(--primary-blue); font-weight: bold; margin-top: 10px;">
                                    ✅ Exam section is now enabled! You can take the qualification exam.
                                </p>
                            </div>
                        </div>
                    `;
                }
            }
        } else {
            if (missingDocsElement) {
                missingDocsElement.innerHTML = `
                    <div style="display: flex; align-items: flex-start; gap: 8px; background: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff9800;">
                        <span style="color: #ff9800; font-size: 20px;">⚠️</span>
                        <div>
                            <strong style="color: #e65100;">Documents Submitted with Rejections</strong>
                            <p style="margin: 8px 0; color: #333;">
                                ${newSavedCount}/${totalDocs} documents saved, but ${newRejectedCount} document(s) were rejected by admin and need re-upload.
                            </p>
                            <div style="color: #d32f2f; font-weight: bold; margin-top: 10px;">
                                ⚠️ Please re-upload the rejected documents
                            </div>
                        </div>
                    </div>
                `;
            }
            userApplication.status = 'documents-completed';
        }
        
        const success = saveUserData();
        if (success) {
            console.log('Documents saved successfully to localStorage');
        } else {
            console.error('Failed to save documents to localStorage');
        }
        
        // FIXED: Update ALL UI elements before any redirect
        updateDashboard();
        updateDocumentsSummary();
        renderDocumentsList();
        updateSubmitButtonState();
        
        // Force a brief pause to ensure UI updates are rendered
        setTimeout(() => {
            if (userApplication.exam.taken) {
                if (userApplication.exam.passed && newRejectedCount === 0) {
                    showSection('status');
                    showAlertModal('success', 'Application Complete!', 
                        'Congratulations! All requirements are complete. Your application is now pending review.',
                        'Please wait for admin\'s approval and interview schedule notification.');
                }
            } else if (!userApplication.exam.taken && newRejectedCount === 0) {
                // Show 6/6 in the UI before redirecting to exam
                showSection('documents'); // Stay in documents section briefly
                
                // Update the document count note to show 6/6 immediately
                const documentsStatusText = document.getElementById('documentsStatusText');
                if (documentsStatusText) {
                    documentsStatusText.textContent = '6/6';
                    documentsStatusText.className = 'status-value status-in-progress';
                }
                
                const documentsStatusDesc = document.getElementById('documentsStatusDesc');
                if (documentsStatusDesc) {
                    documentsStatusDesc.textContent = 'Documents submitted, waiting verification';
                }
                
                // Show success message with 6/6 confirmation
                showAlertModal('success', 'Documents Submitted!', 
                    'Documents submitted successfully! You have uploaded all 6 required documents (6/6).\n\nYou can now take the online exam.',
                    'Note: All 6 documents are saved and ready for verification.');
                
                // Then redirect to exam after a brief delay
                setTimeout(() => {
                    showSection('exam');
                }, 1500);
            }
        }, 500);
    } else {
        const remainingDocs = totalDocs - newSavedCount;
        const uploadedCount = newSavedCount - savedCount;
        
        const success = saveUserData();
        if (success) {
            console.log('Partial documents saved to localStorage');
        } else {
            console.error('Failed to save partial documents to localStorage');
        }
        
        updateDashboard();
        updateDocumentsSummary();
        renderDocumentsList();
        updateSubmitButtonState();
        
        if (missingDocsElement) {
            missingDocsElement.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 8px; background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid var(--primary-blue);">
                    <span style="color: var(--primary-blue); font-size: 20px;">📄</span>
                    <div>
                        <strong style="color: var(--primary-blue);">Documents Saved</strong>
                        <p style="margin: 8px 0; color: #333;">
                            ${uploadedCount} document(s) saved successfully. Progress: ${newSavedCount}/${totalDocs}
                        </p>
                        ${newRejectedCount > 0 ? `
                        <div style="color: #d32f2f; font-weight: bold; margin-top: 5px;">
                            ⚠️ ${newRejectedCount} document(s) were rejected and need re-upload
                        </div>
                        ` : ''}
                        ${remainingDocs > 0 ? `
                        <div style="color: #ff9800; font-weight: bold; margin-top: 5px;">
                            Still missing ${remainingDocs} document(s)
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            missingDocsElement.style.display = 'block';
        }
        
        if (missingDocsElement) {
            missingDocsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function getDocumentDisplayName(docId) {
    const names = {
        picture: '2x2 ID Picture',
        birthcert: 'Birth Certificate',
        reportcard: 'Report Card',
        goodmoral: 'Good Moral Certificate',
        tor: 'Transcript of Records',
        diploma: 'High School Diploma'
    };
    return names[docId] || docId;
}

// ===== FIXED: EXAM SECTION =====
function loadExamSection() {
    const examSection = document.getElementById('examSection');
    if (!examSection) return;
    
    if (!userApplication || !userApplication.program) {
        examSection.innerHTML = `
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
    
    // Use the proper allDocumentsUploaded function
    if (!allDocumentsUploaded()) {
        const uploadedCount = countUploadedDocuments();
        examSection.innerHTML = `
            <div class="content-header">
                <h1>Online Qualification Exam</h1>
                <p>Please upload all documents first</p>
            </div>
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
                <h3 style="color: var(--primary-blue); margin-bottom: 15px;">Documents Required</h3>
                <p>You need to upload all 6 required documents before taking the exam.</p>
                <p style="color: var(--danger); margin: 15px 0; font-weight: 500; background: #ffebee; padding: 10px; border-radius: 8px;">
                    Currently uploaded: ${uploadedCount}/6 documents
                </p>
                <button class="btn btn-primary" style="margin-top: 20px;" onclick="showSection('documents')">
                    Upload Documents Now
                </button>
            </div>
        `;
        return;
    }
    
    const examTitle = document.getElementById('examProgramTitle');
    const examDescription = document.getElementById('examDescription');
    const examStatusInfo = document.getElementById('examStatusInfo');
    const startExamBtn = document.getElementById('startExamBtn');
    
    if (examTitle) examTitle.textContent = `${getProgramName(userApplication.program)} Qualification Exam`;
    if (examDescription) examDescription.textContent = `Take the qualification exam for the ${getProgramName(userApplication.program)} program. This exam will test your basic knowledge and aptitude for the program.`;
    
    if (allDocumentsUploaded() && !userApplication.exam.taken) {
        examSection.classList.add('exam-auto-enabled');
    }
    
    if (userApplication.exam.taken) {
        if (!userApplication.exam.passed) {
            if (examStatusInfo) {
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
            }
        } else {
            if (examStatusInfo) {
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
        }
        if (startExamBtn) {
            startExamBtn.textContent = 'Exam Already Taken';
            startExamBtn.disabled = true;
            startExamBtn.className = 'btn btn-primary btn-start-exam btn-disabled';
        }
    } else {
        if (examStatusInfo) {
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
        }
        if (startExamBtn) {
            startExamBtn.textContent = 'Start Exam Now';
            startExamBtn.disabled = false;
            startExamBtn.className = 'btn btn-primary btn-start-exam';
        }
    }
}

function startExam() {
    if (userApplication.exam.taken) {
        showAlertModal('error', 'Exam Already Taken', 'You have already taken the exam.');
        return;
    }
    
    if (!allDocumentsUploaded()) {
        showAlertModal('error', 'Documents Required', 'Please upload all required documents first.');
        showSection('documents');
        return;
    }
    
    if (Object.keys(pendingDocuments).length > 0) {
        checkDocumentsCompletion();
        setTimeout(() => {
            proceedToExam();
        }, 1000);
    } else {
        proceedToExam();
    }
}

function proceedToExam() {
    const username = sessionStorage.getItem('username');
    if (!username) {
        showAlertModal('error', 'Session Expired', 'Please login again.');
        setTimeout(() => {
            logout();
        }, 2000);
        return;
    }
    
    // Ensure all UI updates are complete before redirecting
    updateDashboard();
    updateDocumentsSummary();
    
    // Force a brief pause to ensure UI updates are rendered
    setTimeout(() => {
        saveUserData();
        
        window.location.href = `exam.html?program=${userApplication.program}&applicationId=${userApplication.applicationId}&username=${encodeURIComponent(username)}`;
    }, 500);
}

// ===== STATUS SECTION =====
function loadStatusSection() {
    const statusSection = document.getElementById('statusSection');
    if (!statusSection) return;
    
    if (!userApplication) {
        statusSection.innerHTML = `
            <div class="content-header">
                <h1>Application Progress</h1>
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

    updateApplicationInfo();
    updateDocumentsStatus();
    updateExamResults();
    updateApplicationTimeline();
    showAdminNoteIfComplete();
    checkForApproval();
}

function showAdminNoteIfComplete() {
    const existingNote = document.getElementById('adminNoteContainer');
    if (existingNote) {
        existingNote.remove();
    }
    
    if (userApplication.status === 'pending' || userApplication.status === 'under-review' || userApplication.status === 'accepted' || userApplication.status === 'rejected' || userApplication.status === 'approved') {
        const adminNoteContainer = document.createElement('div');
        adminNoteContainer.id = 'adminNoteContainer';
        adminNoteContainer.style.cssText = 'margin: 30px 0;';
        
        if (userApplication.status === 'pending') {
            adminNoteContainer.innerHTML = `
                <div class="admin-note">
                    <div class="admin-note-header">
                        <span style="font-size: 20px;">📋</span>
                        <h3>Application Complete - Awaiting Admin Review</h3>
                    </div>
                    <div class="admin-note-content">
                        <p><strong>Progress:</strong> Your application is now complete and submitted for review.</p>
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
        } else if (userApplication.status === 'under-review') {
            adminNoteContainer.innerHTML = `
                <div class="admin-note" style="background: #fff3e0; border-left: 4px solid #ff9800;">
                    <div class="admin-note-header">
                        <span style="font-size: 20px;">🔍</span>
                        <h3>Application Under Review</h3>
                    </div>
                    <div class="admin-note-content">
                        <p><strong>Progress:</strong> Admin is currently reviewing your documents.</p>
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
        } else if (userApplication.status === 'accepted' || userApplication.status === 'approved') {
            adminNoteContainer.innerHTML = `
                <div class="admin-note" style="background: #e8f5e9; border-left: 4px solid #4caf50;">
                    <div class="admin-note-header">
                        <span style="font-size: 20px;">✅</span>
                        <h3>Application Approved!</h3>
                    </div>
                    <div class="admin-note-content">
                        <p><strong>Progress:</strong> Congratulations! Your application has been approved.</p>
                        <p><strong>Next Steps:</strong></p>
                        <ul>
                            <li>✅ Application approved</li>
                            <li>✅ Documents verified</li>
                            <li>✅ Exam passed</li>
                            <li>📅 Interview schedule: ${userApplication.adminReview.interviewDate ? new Date(userApplication.adminReview.interviewDate).toLocaleDateString() : 'Will be sent via SMS'}</li>
                            <li>📍 Location: ${userApplication.adminReview.interviewLocation || 'To be announced'}</li>
                        </ul>
                        <div class="note-important">
                            <strong>Important:</strong> Please check your SMS for interview details and further instructions.
                        </div>
                    </div>
                </div>
            `;
        } else if (userApplication.status === 'rejected') {
            adminNoteContainer.innerHTML = `
                <div class="admin-note" style="background: #ffebee; border-left: 4px solid #f44336;">
                    <div class="admin-note-header">
                        <span style="font-size: 20px;">❌</span>
                        <h3>Application Rejected</h3>
                    </div>
                    <div class="admin-note-content">
                        <p><strong>Progress:</strong> Your application has been rejected.</p>
                        ${userApplication.exam.taken && !userApplication.exam.passed ? 
                            `<p><strong>Reason:</strong> Failed qualification exam (Score: ${userApplication.exam.score}%)</p>` :
                            `<p><strong>Review Date:</strong> ${userApplication.adminReview.reviewDate ? new Date(userApplication.adminReview.reviewDate).toLocaleDateString() : 'N/A'}</p>
                            <p><strong>Reviewer:</strong> ${userApplication.adminReview.reviewer || 'Administrator'}</p>`
                        }
                        <p><strong>Account Deletion:</strong> Your account will be deleted in 7 days from rejection date.</p>
                        <p><strong>Reason:</strong></p>
                        <div style="background: #ffcdd2; padding: 10px; border-radius: 5px; margin: 10px 0;">
                            ${userApplication.adminReview.notes || 'No specific reason provided.'}
                        </div>
                        <div class="note-important">
                            <strong>Note:</strong> You cannot upload new documents or modify this application.
                        </div>
                    </div>
                </div>
            `;
        }
        
        const contentHeader = document.querySelector('#statusSection .content-header');
        if (contentHeader) {
            contentHeader.parentNode.insertBefore(adminNoteContainer, contentHeader.nextSibling);
        }
    }
}

function updateApplicationInfo() {
    const appId = document.getElementById('statusApplicationId');
    const program = document.getElementById('statusProgram');
    const statusBadge = document.getElementById('statusBadge');
    const dateApplied = document.getElementById('statusDateApplied');
    const lastUpdated = document.getElementById('statusLastUpdated');

    if (appId) appId.textContent = userApplication.applicationId || '--';
    if (program) program.textContent = userApplication.program ? getProgramName(userApplication.program) : '--';

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
        case 'approved':
            badgeClass = 'badge-approved';
            statusText = 'Accepted - Interview Scheduled';
            break;
        case 'rejected':
            badgeClass = 'badge-rejected';
            statusText = userApplication.exam.taken && !userApplication.exam.passed ? 'Rejected (Failed Exam)' : 'Rejected (Admin)';
            break;
    }

    if (statusBadge) {
        statusBadge.className = `status-badge ${badgeClass}`;
        statusBadge.textContent = statusText;
    }

    if (dateApplied) {
        if (userApplication.submittedDate) {
            const date = new Date(userApplication.submittedDate);
            dateApplied.textContent = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            dateApplied.textContent = '--';
        }
    }

    if (lastUpdated) {
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
}

function updateDocumentsStatus() {
    const documentsList = document.getElementById('statusDocumentsList');
    if (!documentsList) return;
    
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
        const isUploaded = docData && docData.uploaded === true;
        const isVerified = docData && docData.verified === true;
        const isRejected = docData && docData.rejected === true;
        const isApproved = userApplication.status === 'approved';
        
        let statusText = 'Not Uploaded';
        let statusClass = 'status-required';
        
        if (isUploaded) {
            if (isRejected) {
                statusText = 'Rejected ❌';
                statusClass = 'status-required';
            } else if (isVerified || isApproved) {
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
                    ${isRejected && docData.adminNote ? `<br><small style="color: #d32f2f; font-style: italic;">Note: ${docData.adminNote}</small>` : ''}
                    ${docData && docData.filename ? `<br><small style="color: var(--medium-gray);">${docData.filename}</small>` : ''}
                </div>
            </div>
        `;
    });

    let uploadedDocs = 0;
    Object.values(userApplication.documents).forEach(doc => {
        if (doc.uploaded === true) {
            uploadedDocs++;
        }
    });
    const rejectedDocs = Object.values(userApplication.documents).filter(d => d.rejected === true).length;
    const totalDocs = Object.keys(userApplication.documents).length;
    const progress = Math.round((uploadedDocs / totalDocs) * 100);
    
    html += `
        <div class="detail-row" style="margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--light-blue);">
            <div class="detail-label">Documents:</div>
            <div class="detail-value">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="flex: 1; background: var(--light-blue); height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${progress}%; background: var(--primary-blue); height: 100%; border-radius: 5px;"></div>
                    </div>
                    <div style="font-weight: 600; color: var(--primary-blue);">${uploadedDocs}/${totalDocs} (${progress}%)</div>
                </div>
                ${rejectedDocs > 0 ? 
                    `<div style="font-size: 12px; color: #d32f2f; margin-top: 5px;">
                        ⚠️ ${rejectedDocs} document(s) rejected - please re-upload
                    </div>` : ''
                }
                ${uploadedDocs < totalDocs && rejectedDocs === 0 ? 
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
        if (examResultStatus) examResultStatus.textContent = 'Completed';
        if (examScore) examScore.textContent = `${userApplication.exam.score}%`;
        if (examResult) {
            examResult.textContent = userApplication.exam.passed ? 'Passed ✓' : 'Failed';
            examResult.style.color = userApplication.exam.passed ? 'var(--success)' : 'var(--danger)';
            examResult.style.fontWeight = '600';
        }
        
        if (examDate) {
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
        }
    } else {
        if (examResultStatus) examResultStatus.textContent = 'Not Taken';
        if (examScore) examScore.textContent = '--';
        if (examResult) examResult.textContent = '--';
        if (examDate) examDate.textContent = '--';
    }
}

function updateApplicationTimeline() {
    const timeline = document.getElementById('applicationTimeline');
    if (!timeline) return;
    
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
                    <p>Application progress updated</p>
                </div>
            </div>
        `;
    });

    timeline.innerHTML = html;
}

// ===== APPROVAL CONGRATULATIONS SYSTEM =====
function checkForApproval() {
    if (userApplication && userApplication.status === 'approved') {
        showApprovalCongratulations();
        disableDocumentUploads();
    } else {
        hideApprovalCongratulations();
    }
}

function showApprovalCongratulations() {
    let banner = document.getElementById('approvalCongratulationsBanner');
    
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'approvalCongratulationsBanner';
        banner.className = 'approval-congratulations-banner';
        
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(banner, mainContent.firstChild);
        }
    }
    
    const interviewDate = userApplication.adminReview?.interviewDate ? 
        new Date(userApplication.adminReview.interviewDate).toLocaleDateString() : 
        'Will be sent via SMS';
    
    banner.innerHTML = `
        <h3>🎉 Congratulations! Your Application Has Been Approved</h3>
        <p>Your scholarship application for <strong>${getProgramName(userApplication.program)}</strong> has been approved by the administrator.</p>
        <ul>
            <li>✅ Your documents have been verified</li>
            <li>✅ Your exam score met the requirements</li>
            <li>📅 Interview schedule: ${interviewDate}</li>
            <li>📍 Location: ${userApplication.adminReview?.interviewLocation || 'To be announced'}</li>
        </ul>
        <p style="margin-top: 15px; font-size: 14px;">
            <strong>Next Steps:</strong> Please wait for further instructions via SMS regarding your enrollment process.
        </p>
    `;
    
    banner.style.display = 'block';
}

function hideApprovalCongratulations() {
    const banner = document.getElementById('approvalCongratulationsBanner');
    if (banner) {
        banner.style.display = 'none';
    }
}

function disableDocumentUploads() {
    const submitBtn = document.getElementById('submitDocumentsBtn');
    if (submitBtn) {
        submitBtn.innerHTML = '✅ Application Approved - Documents Locked';
        submitBtn.disabled = true;
        submitBtn.className = 'btn btn-primary btn-disabled';
    }
}

// ===== PROFILE SECTION =====
function loadProfileSection() {
    if (!currentUser || !currentUser.personal || !currentUser.account) {
        showAlertModal('error', 'Profile Error', 'Error loading profile data. Please try logging out and back in.');
        return;
    }
    
    const profileFullName = document.getElementById('profileFullName');
    const profileEmail = document.getElementById('profileEmail');
    const profileUsername = document.getElementById('profileUsername');
    const profileCreatedDate = document.getElementById('profileCreatedDate');
    
    if (profileFullName) profileFullName.textContent = 
        `${currentUser.personal.firstName || ''} ${currentUser.personal.lastName || ''}`.trim();
    if (profileEmail) profileEmail.textContent = currentUser.personal.email || 'No email set';
    if (profileUsername) profileUsername.textContent = currentUser.account.username || 'No username';
    
    if (profileCreatedDate) {
        if (currentUser.registrationDate) {
            const regDate = new Date(currentUser.registrationDate);
            profileCreatedDate.textContent = 
                regDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
        } else {
            profileCreatedDate.textContent = 
                new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
        }
    }
    
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (currentPassword) currentPassword.value = '';
    if (newPassword) newPassword.value = '';
    if (confirmPassword) confirmPassword.value = '';
    
    const currentPasswordError = document.getElementById('currentPasswordError');
    const newPasswordError = document.getElementById('newPasswordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    const passwordSuccess = document.getElementById('passwordSuccess');
    
    if (currentPasswordError) currentPasswordError.style.display = 'none';
    if (newPasswordError) newPasswordError.style.display = 'none';
    if (confirmPasswordError) confirmPasswordError.style.display = 'none';
    if (passwordSuccess) passwordSuccess.style.display = 'none';
    
    const passwordStrength = document.getElementById('passwordStrength');
    if (passwordStrength) passwordStrength.className = 'strength-bar';
    
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
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const errorEl = document.getElementById('confirmPasswordError');
    const successEl = document.getElementById('passwordSuccess');
    
    if (!errorEl || !successEl || !newPassword || !confirmPassword) return;
    
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    if (confirmPassword.value && newPassword.value !== confirmPassword.value) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.style.display = 'block';
    } else if (confirmPassword.value && newPassword.value === confirmPassword.value && newPassword.value.length >= 8) {
        successEl.style.display = 'block';
    }
}

function updatePassword() {
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (!currentPassword || !newPassword || !confirmPassword) return;
    
    const currentPasswordError = document.getElementById('currentPasswordError');
    const newPasswordError = document.getElementById('newPasswordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    
    if (currentPasswordError) currentPasswordError.style.display = 'none';
    if (newPasswordError) newPasswordError.style.display = 'none';
    if (confirmPasswordError) confirmPasswordError.style.display = 'none';
    
    let isValid = true;
    
    if (!currentPassword.value) {
        if (currentPasswordError) {
            currentPasswordError.textContent = 'Current password is required';
            currentPasswordError.style.display = 'block';
        }
        isValid = false;
    } else if (currentPassword.value !== currentUser.account.password) {
        if (currentPasswordError) {
            currentPasswordError.textContent = 'Current password is incorrect';
            currentPasswordError.style.display = 'block';
        }
        isValid = false;
    }
    
    if (!newPassword.value) {
        if (newPasswordError) {
            newPasswordError.textContent = 'New password is required';
            newPasswordError.style.display = 'block';
        }
        isValid = false;
    } else if (newPassword.value.length < 8) {
        if (newPasswordError) {
            newPasswordError.textContent = 'Password must be at least 8 characters';
            newPasswordError.style.display = 'block';
        }
        isValid = false;
    } else if (!/[A-Z]/.test(newPassword.value) || !/[a-z]/.test(newPassword.value) || !/[0-9]/.test(newPassword.value)) {
        if (newPasswordError) {
            newPasswordError.textContent = 'Password must contain uppercase, lowercase, and number';
            newPasswordError.style.display = 'block';
        }
        isValid = false;
    }
    
    if (newPassword.value !== confirmPassword.value) {
        if (confirmPasswordError) {
            confirmPasswordError.textContent = 'Passwords do not match';
            confirmPasswordError.style.display = 'block';
        }
        isValid = false;
    }
    
    if (newPassword.value === currentPassword.value) {
        if (newPasswordError) {
            newPasswordError.textContent = 'New password must be different from current password';
            newPasswordError.style.display = 'block';
        }
        isValid = false;
    }
    
    if (!isValid) return;
    
    const rememberedUser = JSON.parse(localStorage.getItem('rememberedUser') || '{}');
    if (rememberedUser.username === currentUser.account.username) {
        localStorage.removeItem('rememberedUser');
    }
    
    currentUser.account.password = newPassword.value;
    
    if (userApplication && userApplication.timeline) {
        addTimelineEvent('Password updated');
    }
    
    if (saveUserData()) {
        showAlertModal('success', 'Password Updated', 'Password updated successfully! You will be logged out to apply the changes.');
        
        setTimeout(() => {
            logout();
        }, 2000);
    } else {
        showAlertModal('error', 'Update Failed', 'Error updating password. Please try again.');
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
    
    const timelineEvent = {
        date: new Date().toISOString(),
        event: event
    };
    
    userApplication.timeline.push(timelineEvent);
    
    if (currentSection === 'status') {
        updateApplicationTimeline();
    }
    
    saveUserData();
    
    return timelineEvent;
}

function saveUserData() {
    try {
        const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const userIndex = users.findIndex(u => u.account?.username === currentUser.account.username);
        
        if (userIndex === -1) {
            console.error('User not found in registeredUsers');
            return false;
        }
        
        if (!currentUser.applications) {
            currentUser.applications = [];
        }
        
        const appIndex = currentUser.applications.findIndex(app => 
            app.applicationId === userApplication.applicationId
        );
        
        if (appIndex === -1) {
            currentUser.applications.push(userApplication);
        } else {
            currentUser.applications[appIndex] = userApplication;
        }
        
        users[userIndex] = currentUser;
        
        localStorage.setItem('registeredUsers', JSON.stringify(users));
        
        // Only store current application in sessionStorage for immediate access
        sessionStorage.setItem('currentApplication', JSON.stringify(userApplication));
        
        console.log('Data saved successfully to localStorage:', {
            userId: currentUser.account.username,
            applicationId: userApplication.applicationId,
            documentsCount: Object.values(userApplication.documents).filter(d => d.uploaded === true).length,
            totalUsers: users.length,
            documents: userApplication.documents
        });
        
        const savedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const savedUser = savedUsers.find(u => u.account?.username === currentUser.account.username);
        
        if (savedUser && savedUser.applications) {
            const savedApp = savedUser.applications.find(app => app.applicationId === userApplication.applicationId);
            if (savedApp && savedApp.documents) {
                console.log('Verification - Saved documents:', Object.values(savedApp.documents).filter(d => d.uploaded === true).length);
            }
        }
        
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
    const examResult = sessionStorage.getItem('examResult');
    if (examResult) {
        try {
            const result = JSON.parse(examResult);
            
            if (result.applicationId === userApplication.applicationId) {
                userApplication.exam = {
                    taken: true,
                    score: result.score,
                    passed: result.passed,
                    dateTaken: result.dateTaken,
                    maxScore: 100,
                    passingScore: 75
                };
                
                if (!result.passed) {
                    userApplication.status = 'rejected';
                    userApplication.adminReview = {
                        reviewDate: new Date().toISOString(),
                        reviewer: 'System',
                        decision: 'rejected',
                        notes: 'Automatically rejected due to failed qualification exam.',
                        deletionDate: null
                    };
                    
                    // MOVE DOCUMENTS TO REJECTION STORAGE USING ADMIN FORMAT
                    const documentRejectionReasons = JSON.parse(localStorage.getItem('documentRejectionReasons') || '{}');
                    const timestamp = new Date().toISOString();
                    
                    Object.keys(userApplication.documents).forEach(docKey => {
                        const doc = userApplication.documents[docKey];
                        if (doc.uploaded === true) {
                            const rejectionKey = `${userApplication.applicationId}_${docKey}`;
                            
                            // Add to rejection storage using admin format
                            documentRejectionReasons[rejectionKey] = {
                                applicationId: userApplication.applicationId,
                                documentId: docKey,
                                reason: 'Failed qualification exam',
                                rejectedBy: 'System',
                                rejectionDate: timestamp,
                                documentType: doc.type || docKey,
                                studentName: `${currentUser.personal.firstName} ${currentUser.personal.lastName}`,
                                studentEmail: currentUser.personal.email,
                                originalData: {
                                    filename: doc.filename,
                                    filetype: doc.filetype,
                                    size: doc.size,
                                    dataUrl: doc.dataUrl,
                                    uploadDate: doc.lastModified ? new Date(doc.lastModified).toISOString() : timestamp,
                                    examScore: userApplication.exam.score,
                                    examDate: userApplication.exam.dateTaken,
                                    program: userApplication.program
                                }
                            };
                            
                            // CLEAR THE DOCUMENT FROM USER STORAGE
                            doc.uploaded = false;
                            doc.filename = null;
                            doc.filetype = null;
                            doc.size = null;
                            doc.dataUrl = null;
                            doc.verified = false;
                            doc.rejected = false;
                            doc.adminNote = '';
                        }
                    });
                    
                    localStorage.setItem('documentRejectionReasons', JSON.stringify(documentRejectionReasons));
                    
                    const deletionDate = new Date();
                    deletionDate.setDate(deletionDate.getDate() + 7);
                    
                    currentUser.failedExam = {
                        markedForDeletion: true,
                        deletionDate: deletionDate.toISOString(),
                        failedDate: userApplication.exam.dateTaken || new Date().toISOString(),
                        score: userApplication.exam.score
                    };
                    
                    addTimelineEvent(`Exam failed - Score: ${result.score}%`);
                    addTimelineEvent('Documents moved to rejection storage');
                    addTimelineEvent('Account marked for deletion in 7 days');
                    
                    setTimeout(() => {
                        showAlertModal('error', 'Exam Failed', 
                            `Sorry for failing, no another chances for taking. Better luck next school year!\n\nYour account will be deleted in 7 days.`);
                    }, 500);
                } else if (result.passed && allDocumentsUploaded()) {
                    userApplication.status = 'pending';
                    addTimelineEvent(`Exam passed - Score: ${result.score}%`);
                    addTimelineEvent('All requirements met - Application submitted for review');
                    
                    setTimeout(() => {
                        showAlertModal('success', 'Exam Passed!', 
                            'Congratulations! You passed the exam and all documents are submitted.\n\nYour application is now complete and pending review.\n\nPlease wait for admin\'s approval and interview schedule notification.');
                    }, 500);
                } else if (result.passed) {
                    userApplication.status = 'exam-completed';
                    addTimelineEvent(`Exam passed - Score: ${result.score}%`);
                    addTimelineEvent('Exam complete - Please submit remaining documents');
                    
                    setTimeout(() => {
                        showAlertModal('success', 'Exam Passed!', 
                            'Congratulations! You passed the exam.\n\nPlease submit all required documents to complete your application.');
                    }, 500);
                }
                
                saveUserData();
                updateDashboard();
                
                sessionStorage.removeItem('examResult');
                
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
    
    checkForAdminUpdates();
}

function checkForAdminUpdates() {
    if (userApplication && userApplication.adminReview && userApplication.adminReview.decision) {
        if (userApplication.adminReview.decision === 'rejected') {
            userApplication.status = 'rejected';
            
            if (userApplication.exam.taken && !userApplication.exam.passed) {
                // This is exam failure, handled elsewhere
            } else {
                const deletionDate = new Date();
                deletionDate.setDate(deletionDate.getDate() + 7);
                userApplication.adminReview.deletionDate = deletionDate.toISOString();
                
                currentUser.failedExam = {
                    markedForDeletion: true,
                    deletionDate: deletionDate.toISOString(),
                    failedDate: null,
                    score: null,
                    reason: 'Application rejected by administrator'
                };
                
                addTimelineEvent('Application rejected by admin');
                addTimelineEvent('Account marked for deletion in 7 days');
            }
        } else if (userApplication.adminReview.decision === 'accepted' || userApplication.adminReview.decision === 'approved') {
            userApplication.status = 'approved';
            addTimelineEvent('Application accepted by admin');
            addTimelineEvent('Interview scheduled - Check SMS for details');
            checkForApproval();
        }
        
        saveUserData();
        updateDashboard();
        
        if (currentSection === 'status') {
            loadStatusSection();
        }
    }
}

function checkFailedAccountStatus() {
    updateCountdownDisplay();
}