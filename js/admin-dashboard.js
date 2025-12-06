// ===== GLOBAL VARIABLES =====
let allApplicants = [];
let filteredApplicants = [];
let adminData = null;
let currentInterviewAppId = null;
let programsData = [];
let currentViewSection = 'overview';
let documentRejectionReasons = JSON.parse(localStorage.getItem('documentRejectionReasons') || '{}');

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', function() {
    checkAdminLogin();
    initializePrograms();
    loadAllApplicants();
    updateDashboard();
    // Setup event listeners after everything is loaded
    setTimeout(setupEventListeners, 100);
});

// ===== ADMIN AUTHENTICATION =====
function checkAdminLogin() {
    const isAdminLoggedIn = sessionStorage.getItem('isAdminLoggedIn');
    const adminUsername = sessionStorage.getItem('adminUsername');
    const userType = sessionStorage.getItem('userType');
    const username = sessionStorage.getItem('username');
    
    let isAdmin = false;
    let adminUser = null;
    
    // Check if any admin session exists
    if (isAdminLoggedIn === 'true') {
        isAdmin = true;
        adminUser = adminUsername || username;
    } else if (userType === 'admin') {
        isAdmin = true;
        adminUser = username;
    } else {
        const possibleAdmins = ['admin', 'administrator', 'superadmin'];
        if (username && possibleAdmins.includes(username.toLowerCase())) {
            isAdmin = true;
            adminUser = username;
        }
    }
    
    if (!isAdmin || !adminUser) {
        alert('Please login as administrator to access this dashboard.');
        window.location.href = 'login.html';
        return;
    }
    
    // Set admin data from session ONLY - NO localStorage for admin data
    adminData = {
        username: adminUser,
        fullName: adminUser === 'admin' ? 'System Administrator' : adminUser,
        role: adminUser === 'admin' ? 'Super Admin' : 'Administrator'
    };
    
    // Update session storage for authentication
    sessionStorage.setItem('isAdminLoggedIn', 'true');
    sessionStorage.setItem('adminUsername', adminUser);
    sessionStorage.setItem('userType', 'admin');
    sessionStorage.setItem('isLoggedIn', 'true');
    
    // Update admin info in header
    const adminNameEl = document.getElementById('adminName');
    const adminRoleEl = document.getElementById('adminRole');
    const adminAvatarEl = document.getElementById('adminAvatar');
    
    if (adminNameEl) adminNameEl.textContent = adminData.fullName;
    if (adminRoleEl) adminRoleEl.textContent = adminData.role;
    if (adminAvatarEl) {
        const firstLetter = adminData.fullName.charAt(0).toUpperCase();
        adminAvatarEl.textContent = firstLetter;
    }
}

// ===== PROGRAM MANAGEMENT =====
function initializePrograms() {
    // Load programs from localStorage (this is application data, not admin data)
    programsData = JSON.parse(localStorage.getItem('programsData') || '[]');
    
    if (programsData.length === 0) {
        programsData = [
            {
                id: 'wadt',
                name: 'Web Application Development Training',
                code: 'WADT-2024',
                totalSlots: 50,
                duration: 3,
                passingScore: 75,
                description: 'Full-stack web development training program covering frontend and backend technologies.',
                active: true
            },
            {
                id: 'hrt',
                name: 'Hotel & Restaurant Technology',
                code: 'HRT-2024',
                totalSlots: 50,
                duration: 3,
                passingScore: 75,
                description: 'Hospitality management program focusing on hotel and restaurant operations.',
                active: true
            }
        ];
        localStorage.setItem('programsData', JSON.stringify(programsData));
    }
}

function loadPrograms() {
    const programsList = document.getElementById('programsList');
    if (!programsList) {
        console.error('programsList element not found');
        return;
    }
    
    programsList.innerHTML = '';
    
    // Calculate approved students per program
    const approvedPerProgram = {};
    allApplicants.forEach(applicant => {
        if (applicant.status === 'approved' && applicant.program) {
            approvedPerProgram[applicant.program] = (approvedPerProgram[applicant.program] || 0) + 1;
        }
    });
    
    programsData.forEach(program => {
        const approvedCount = approvedPerProgram[program.id] || 0;
        const availableSlots = Math.max(0, program.totalSlots - approvedCount);
        const fillPercentage = (approvedCount / program.totalSlots) * 100;
        
        const programCard = document.createElement('div');
        programCard.className = 'program-card';
        programCard.innerHTML = `
            <div class="program-header">
                <h3>${program.name}</h3>
                <div class="program-actions">
                    <button class="btn-icon btn-edit" onclick="editProgram('${program.id}')" title="Edit Program">✏️</button>
                </div>
            </div>
            <div class="program-info">
                <div class="info-item">
                    <div class="info-label">Program Code</div>
                    <div class="info-value">${program.code}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Duration</div>
                    <div class="info-value">${program.duration || 3} years</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Total Slots</div>
                    <div class="info-value">${program.totalSlots}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Available Slots</div>
                    <div class="info-value">${availableSlots}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Approved Students</div>
                    <div class="info-value">${approvedCount}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Passing Score</div>
                    <div class="info-value">${program.passingScore}%</div>
                </div>
            </div>
            <div class="program-slots-info">
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                    <span>Slot Usage: ${approvedCount}/${program.totalSlots}</span>
                    <span>${Math.round(fillPercentage)}% filled</span>
                </div>
                <div class="slot-progress">
                    <div class="slot-progress-fill" style="width: ${fillPercentage}%"></div>
                </div>
            </div>
            <div class="program-info">
                <div class="info-item" style="grid-column: 1 / -1;">
                    <div class="info-label">Description</div>
                    <div class="info-value">${program.description}</div>
                </div>
            </div>
        `;
        programsList.appendChild(programCard);
    });
}

function editProgram(programId) {
    const program = programsData.find(p => p.id === programId);
    if (!program) return;
    
    document.getElementById('programModalTitle').textContent = 'Edit Program';
    document.getElementById('programId').value = program.id;
    document.getElementById('programName').value = program.name;
    document.getElementById('programCode').value = program.code;
    document.getElementById('totalSlots').value = program.totalSlots;
    document.getElementById('programDuration').value = program.duration || 3;
    document.getElementById('passingScore').value = program.passingScore;
    document.getElementById('programDescription').value = program.description;
    
    document.getElementById('programModal').style.display = 'flex';
}

function saveProgram() {
    const programId = document.getElementById('programId').value;
    const name = document.getElementById('programName').value.trim();
    const code = document.getElementById('programCode').value.trim();
    const totalSlots = parseInt(document.getElementById('totalSlots').value);
    const duration = parseInt(document.getElementById('programDuration').value);
    const passingScore = parseInt(document.getElementById('passingScore').value);
    const description = document.getElementById('programDescription').value.trim();
    
    if (!name || !code || !totalSlots || !duration || !passingScore || !description) {
        alert('Please fill all required fields');
        return;
    }
    
    if (programId) {
        // Update existing program
        const index = programsData.findIndex(p => p.id === programId);
        if (index !== -1) {
            programsData[index] = {
                ...programsData[index],
                name,
                code,
                totalSlots,
                duration,
                passingScore,
                description
            };
        }
    } else {
        // Add new program
        const newId = name.toLowerCase().replace(/\s+/g, '-');
        programsData.push({
            id: newId,
            name,
            code,
            totalSlots,
            duration,
            passingScore,
            description,
            active: true
        });
    }
    
    localStorage.setItem('programsData', JSON.stringify(programsData));
    loadPrograms();
    closeModal();
    alert('Program saved successfully!');
}

// ===== APPLICANT MANAGEMENT =====
function loadAllApplicants() {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const userExamData = JSON.parse(localStorage.getItem('userExamData') || '{}');
    allApplicants = [];
    
    registeredUsers.forEach(user => {
        if (user.applications && user.applications.length > 0) {
            user.applications.forEach(application => {
                if (application.status !== 'cancelled') {
                    // Merge exam data from userExamData (using username as key)
                    const username = user.account?.username;
                    let examData = {};
                    
                    // First try to get from userExamData using username
                    if (username && userExamData[username]) {
                        examData = userExamData[username];
                    }
                    // If not found, try using applicationId
                    else if (userExamData[application.applicationId]) {
                        examData = userExamData[application.applicationId];
                    }
                    // Finally, fall back to application.exam
                    else if (application.exam) {
                        examData = application.exam;
                    }
                    
                    // Calculate if all documents are uploaded
                    const allDocsUploaded = application.documents ? 
                        Object.values(application.documents).filter(doc => !doc.rejected).every(doc => doc.uploaded) : false;
                    
                    // NEW: Simplified status system - only waiting, approved, rejected
                    let status = application.status;
                    
                    // Convert old statuses to new system
                    if (status === 'pending' || status === 'need-exam' || status === 'under-review' || 
                        status === 'applied' || status === 'documents-completed' || status === 'exam-completed' ||
                        status === 'completed') {
                        status = 'waiting';
                    }
                    
                    // Initialize interview status if not exists
                    if (!application.interviewStatus) {
                        application.interviewStatus = 'not-scheduled';
                    }
                    
                    const applicant = {
                        ...user,
                        application: application,
                        applicationId: application.applicationId,
                        program: application.program,
                        status: status,
                        submittedDate: application.submittedDate,
                        documents: application.documents || {},
                        exam: examData,
                        interviewStatus: application.interviewStatus,
                        interviewDate: application.interviewDate,
                        interviewNotes: application.interviewNotes
                    };
                    
                    allApplicants.push(applicant);
                }
            });
        }
    });
    
    // Update localStorage with corrected statuses
    updateApplicantStatusesInStorage();
    
    filteredApplicants = [...allApplicants];
    updateNotificationBadges();
}

function updateApplicantStatusesInStorage() {
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    let updated = false;
    
    users.forEach(user => {
        if (user.applications) {
            user.applications.forEach(application => {
                if (application.status !== 'cancelled' && application.status !== 'approved' && application.status !== 'rejected') {
                    // Convert all other statuses to 'waiting'
                    if (application.status === 'pending' || application.status === 'need-exam' || 
                        application.status === 'under-review' || application.status === 'applied' ||
                        application.status === 'documents-completed' || application.status === 'exam-completed' ||
                        application.status === 'completed') {
                        application.status = 'waiting';
                        updated = true;
                    }
                }
            });
        }
    });
    
    if (updated) {
        localStorage.setItem('registeredUsers', JSON.stringify(users));
    }
}

function updateDashboard() {
    updateStatistics();
    loadRecentApplications();
}

function updateStatistics() {
    const total = allApplicants.length;
    const waiting = allApplicants.filter(app => app.status === 'waiting').length;
    const approved = allApplicants.filter(app => app.status === 'approved').length;
    const rejected = allApplicants.filter(app => app.status === 'rejected').length;
    
    document.getElementById('totalApplications').textContent = total;
    document.getElementById('pendingReview').textContent = waiting;
    document.getElementById('approved').textContent = approved;
    document.getElementById('rejected').textContent = rejected;
}

function loadRecentApplications() {
    const tbody = document.getElementById('recentApplicationsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const recentApps = [...allApplicants]
        .sort((a, b) => new Date(b.submittedDate || 0) - new Date(a.submittedDate || 0))
        .slice(0, 10);
    
    if (recentApps.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <p>No applications found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    recentApps.forEach(applicant => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${applicant.applicationId || 'N/A'}</td>
            <td>${applicant.personal.firstName} ${applicant.personal.lastName}</td>
            <td>${getProgramName(applicant.program) || 'N/A'}</td>
            <td>${applicant.submittedDate ? formatDate(applicant.submittedDate) : 'N/A'}</td>
            <td><span class="status-badge badge-${getStatusClass(applicant.status)}">${getStatusText(applicant.status)}</span></td>
            <td><span class="status-badge badge-${getInterviewStatusClass(applicant.interviewStatus)}">${getInterviewStatusText(applicant.interviewStatus)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-view" onclick="viewApplicant('${applicant.applicationId}')" title="View Details">👁️</button>
                    ${applicant.status !== 'approved' && applicant.status !== 'rejected' ? `
                        <button class="btn-icon btn-approve" onclick="approveApplication('${applicant.applicationId}')" title="Approve">✅</button>
                        <button class="btn-icon btn-reject" onclick="rejectApplication('${applicant.applicationId}')" title="Reject">❌</button>
                    ` : ''}
                    <button class="btn-icon" onclick="updateInterviewStatus('${applicant.applicationId}')" title="Update Interview" style="background: #e1bee7; color: #7b1fa2;">📅</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadApplicantsTable() {
    const tbody = document.getElementById('applicantsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredApplicants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>No applicants found matching your criteria</p>
                </td>
            </tr>
        `;
        return;
    }
    
    filteredApplicants.forEach(applicant => {
        // Count only non-rejected uploaded documents
        const uploadedDocs = applicant.documents ? 
            Object.values(applicant.documents).filter(doc => doc.uploaded && !doc.rejected).length : 0;
        const totalDocs = 6;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${applicant.applicationId || 'N/A'}</td>
            <td>${applicant.personal.firstName} ${applicant.personal.lastName}</td>
            <td>${applicant.personal.email}</td>
            <td>${getProgramName(applicant.program) || 'N/A'}</td>
            <td>${applicant.submittedDate ? formatDate(applicant.submittedDate) : 'N/A'}</td>
            <td>${uploadedDocs}/${totalDocs}</td>
            <td>${applicant.exam.taken ? `${applicant.exam.score || 0}%` : 'Not Taken'}</td>
            <td><span class="status-badge badge-${getStatusClass(applicant.status)}">${getStatusText(applicant.status)}</span></td>
            <td><span class="status-badge badge-${getInterviewStatusClass(applicant.interviewStatus)}">${getInterviewStatusText(applicant.interviewStatus)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-view" onclick="viewApplicant('${applicant.applicationId}')" title="View Details">👁️</button>
                    ${applicant.status !== 'approved' && applicant.status !== 'rejected' ? `
                        <button class="btn-icon btn-approve" onclick="approveApplication('${applicant.applicationId}')" title="Approve" ${applicant.status === 'approved' ? 'disabled style="opacity: 0.5;"' : ''}>✅</button>
                        <button class="btn-icon btn-reject" onclick="rejectApplication('${applicant.applicationId}')" title="Reject" ${applicant.status === 'rejected' ? 'disabled style="opacity: 0.5;"' : ''}>❌</button>
                    ` : ''}
                    <button class="btn-icon" onclick="updateInterviewStatus('${applicant.applicationId}')" title="Update Interview" style="background: #e1bee7; color: #7b1fa2;">📅</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateInterviewStatus(applicationId) {
    const applicant = allApplicants.find(app => app.applicationId === applicationId);
    if (!applicant) {
        alert('Applicant not found!');
        return;
    }
    
    currentInterviewAppId = applicationId;
    
    const interviewModal = document.getElementById('interviewModal');
    if (!interviewModal) {
        alert('Interview modal not found!');
        return;
    }
    
    document.getElementById('interviewStatusSelect').value = applicant.interviewStatus || 'not-scheduled';
    document.getElementById('interviewDate').value = applicant.interviewDate || '';
    document.getElementById('interviewNotes').value = applicant.interviewNotes || '';
    
    interviewModal.style.display = 'flex';
}

function saveInterviewStatus() {
    if (!currentInterviewAppId) return;
    
    const interviewStatus = document.getElementById('interviewStatusSelect').value;
    const interviewDate = document.getElementById('interviewDate').value;
    const interviewNotes = document.getElementById('interviewNotes').value;
    
    // Update in localStorage (application data)
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    let updated = false;
    
    users.forEach(user => {
        if (user.applications) {
            user.applications.forEach(app => {
                if (app.applicationId === currentInterviewAppId) {
                    app.interviewStatus = interviewStatus;
                    app.interviewDate = interviewDate;
                    app.interviewNotes = interviewNotes;
                    updated = true;
                }
            });
        }
    });
    
    if (updated) {
        localStorage.setItem('registeredUsers', JSON.stringify(users));
        loadAllApplicants();
        
        if (currentViewSection === 'overview') {
            loadRecentApplications();
        } else if (currentViewSection === 'applicants') {
            loadApplicantsTable();
        }
        
        closeModal();
        alert('Interview status updated successfully!');
    } else {
        alert('Error updating interview status!');
    }
    
    currentInterviewAppId = null;
}

// ===== DOCUMENT MANAGEMENT =====
function loadDocumentsTable() {
    const tbody = document.getElementById('documentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Collect only PENDING (unverified) documents from applicants who are NOT rejected
    let pendingDocuments = [];
    
    filteredApplicants.forEach(applicant => {
        // Skip rejected applicants
        if (applicant.status === 'rejected') {
            return;
        }
        
        if (applicant.documents) {
            Object.entries(applicant.documents).forEach(([docType, docData]) => {
                if (docData.uploaded && docData.filename && !docData.verified && !docData.rejected) {
                    pendingDocuments.push({
                        studentName: `${applicant.personal.firstName} ${applicant.personal.lastName}`,
                        docType: docData.type || docType,
                        fileName: docData.filename,
                        uploadDate: docData.lastModified || applicant.submittedDate,
                        status: 'pending',
                        applicantId: applicant.applicationId,
                        docId: docType,
                        applicant: applicant
                    });
                }
            });
        }
    });
    
    if (pendingDocuments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <p>No pending documents for review</p>
                </td>
            </tr>
        `;
        return;
    }
    
    pendingDocuments.forEach(doc => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${doc.studentName}</td>
            <td>${doc.docType}</td>
            <td>${doc.fileName}</td>
            <td>${doc.uploadDate ? formatDate(doc.uploadDate) : 'N/A'}</td>
            <td><span class="status-badge badge-pending">Pending</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-view" onclick="viewDocument('${doc.applicantId}', '${doc.docId}')" title="View Document">👁️</button>
                    <button class="btn-icon btn-approve" onclick="verifyDocument('${doc.applicantId}', '${doc.docId}')" title="Verify">✅</button>
                    <button class="btn-icon btn-reject" onclick="rejectDocument('${doc.applicantId}', '${doc.docId}')" title="Reject Document">❌</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function viewDocument(applicationId, documentId) {
    const applicant = allApplicants.find(app => app.applicationId === applicationId);
    if (!applicant || !applicant.documents || !applicant.documents[documentId]) {
        alert('Document not found!');
        return;
    }
    
    const doc = applicant.documents[documentId];
    
    const modalContent = document.getElementById('documentPreview');
    
    // Get stored file data URL from document
    const fileDataUrl = doc.dataUrl;
    
    // Check if file is an image based on filename or data URL
    const fileName = doc.filename.toLowerCase();
    const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
                    fileName.endsWith('.png') || fileName.endsWith('.gif') || 
                    fileName.endsWith('.bmp') || fileName.endsWith('.webp') ||
                    (fileDataUrl && fileDataUrl.startsWith('data:image/'));
    
    modalContent.innerHTML = `
        <h4 style="color: var(--primary-blue); margin-bottom: 20px;">${doc.type || documentId}</h4>
        <div style="text-align: center;">
            <p><strong>Student:</strong> ${applicant.personal.firstName} ${applicant.personal.lastName}</p>
            <p><strong>File Name:</strong> ${doc.filename}</p>
            <p><strong>Uploaded:</strong> ${formatDate(doc.lastModified || applicant.submittedDate)}</p>
            <p><strong>Status:</strong> 
                <span class="status-badge ${doc.verified ? 'badge-approved' : 'badge-pending'}">
                    ${doc.verified ? 'Verified' : 'Pending Verification'}
                </span>
            </p>
            
            <div style="margin-top: 20px; padding: 20px; background: var(--light-blue); border-radius: 10px; min-height: 300px;">
                ${isImage && fileDataUrl ? `
                <h5 style="color: var(--primary-blue); margin-bottom: 15px;">Image Preview</h5>
                <div style="max-width: 100%; overflow: hidden; text-align: center;">
                    <img src="${fileDataUrl}" 
                         alt="${doc.filename}" 
                         style="max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
                                ${documentId === 'picture' ? 'width: 200px; height: 200px; object-fit: cover; border: 3px solid var(--primary-blue);' : ''}">
                </div>
                ` : `
                <div style="color: var(--medium-gray);">
                    <h5>Document Preview</h5>
                    <p>File type: ${fileName.split('.').pop().toUpperCase()}</p>
                    <p><em>Document content would be displayed here for PDFs and other formats.</em></p>
                    ${fileDataUrl ? `
                    <div style="margin-top: 20px;">
                        <a href="${fileDataUrl}" target="_blank" class="btn-filter" style="display: inline-block; text-decoration: none;">
                            Open Document
                        </a>
                    </div>
                    ` : ''}
                </div>
                `}
            </div>
            
            <div style="margin-top: 30px;">
                ${!doc.verified ? `
                <button class="btn-filter" onclick="verifyDocument('${applicationId}', '${documentId}', true)" style="background: var(--success);">
                    Verify Document
                </button>
                <button class="btn-filter" onclick="rejectDocument('${applicationId}', '${documentId}', true)" style="background: var(--danger);">
                    Reject Document
                </button>
                ` : `
                <button class="btn-filter" disabled style="background: var(--medium-gray);">
                    Already Verified
                </button>
                `}
                <button class="btn-filter" onclick="closeModal()" style="margin-left: 10px;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('documentModal').style.display = 'flex';
}

function verifyDocument(applicationId, documentId, fromModal = false) {
    if (!confirm('Are you sure you want to verify this document?')) return;
    
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    let updated = false;
    
    users.forEach(user => {
        if (user.applications) {
            user.applications.forEach(app => {
                if (app.applicationId === applicationId && app.documents && app.documents[documentId]) {
                    app.documents[documentId].verified = true;
                    app.documents[documentId].verifiedBy = adminData.fullName || 'Admin';
                    app.documents[documentId].verificationDate = new Date().toISOString();
                    
                    // Remove rejection reason if it exists
                    const rejectionKey = `${applicationId}_${documentId}`;
                    if (documentRejectionReasons[rejectionKey]) {
                        delete documentRejectionReasons[rejectionKey];
                        localStorage.setItem('documentRejectionReasons', JSON.stringify(documentRejectionReasons));
                    }
                    
                    // Check if all documents are verified and update application status
                    const allDocsVerified = app.documents ? 
                        Object.values(app.documents).filter(doc => !doc.rejected).every(doc => doc.uploaded && doc.verified) : false;
                    
                    if (allDocsVerified && app.exam && app.exam.passed) {
                        app.status = 'waiting';
                        app.adminReview = {
                            reviewDate: new Date().toISOString(),
                            reviewer: adminData.fullName || 'Admin',
                            decision: 'under-review',
                            notes: 'All documents verified. Application ready for interview scheduling.'
                        };
                        
                        if (!app.timeline) app.timeline = [];
                        app.timeline.push({
                            date: new Date().toISOString(),
                            event: 'All documents verified by administrator'
                        });
                        app.timeline.push({
                            date: new Date().toISOString(),
                            event: 'Application complete - Ready for interview scheduling'
                        });
                    }
                    
                    updated = true;
                }
            });
        }
    });
    
    if (updated) {
        localStorage.setItem('registeredUsers', JSON.stringify(users));
        loadAllApplicants();
        loadDocumentsTable();
        
        if (fromModal) {
            closeModal();
        }
        alert('Document verified successfully!');
    } else {
        alert('Error verifying document!');
    }
}

function rejectDocument(applicationId, documentId, fromModal = false) {
    const reason = prompt('Please enter the reason for rejecting this document:');
    if (!reason) return;
    
    if (!confirm('Are you sure you want to reject this document? The document will be removed and the student will need to re-upload it.')) return;
    
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    let updated = false;
    
    users.forEach(user => {
        if (user.applications) {
            user.applications.forEach(app => {
                if (app.applicationId === applicationId && app.documents && app.documents[documentId]) {
                    // Save document data before deleting
                    const docData = {
                        filename: app.documents[documentId].filename,
                        type: app.documents[documentId].type,
                        rejectedBy: adminData.fullName || 'Admin',
                        rejectionDate: new Date().toISOString(),
                        reason: reason
                    };
                    
                    // Save rejection reason in localStorage (application data)
                    const rejectionKey = `${applicationId}_${documentId}`;
                    documentRejectionReasons[rejectionKey] = {
                        reason: reason,
                        rejectedBy: adminData.fullName || 'Admin',
                        rejectionDate: new Date().toISOString(),
                        documentType: documentId,
                        studentName: `${user.personal.firstName} ${user.personal.lastName}`,
                        originalData: docData
                    };
                    localStorage.setItem('documentRejectionReasons', JSON.stringify(documentRejectionReasons));
                    
                    // REMOVE the document from student's application
                    app.documents[documentId] = {
                        uploaded: false,
                        filename: null,
                        verified: false,
                        rejected: true,
                        adminNote: reason,
                        type: app.documents[documentId].type || documentId,
                        dataUrl: null // Clear the data URL
                    };
                    
                    // Update application status
                    app.status = 'documents-completed';
                    
                    // Add timeline event
                    if (!app.timeline) app.timeline = [];
                    app.timeline.push({
                        date: new Date().toISOString(),
                        event: `Document "${documentId}" rejected - Student needs to re-upload`
                    });
                    
                    updated = true;
                }
            });
        }
    });
    
    if (updated) {
        localStorage.setItem('registeredUsers', JSON.stringify(users));
        loadAllApplicants();
        loadDocumentsTable();
        
        if (fromModal) {
            closeModal();
        }
        alert('Document rejected and removed! The student will need to re-upload it with corrections.');
    } else {
        alert('Error rejecting document!');
    }
}

// ===== EXAM RESULTS =====
function loadExamResults() {
    const tbody = document.getElementById('examResultsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Get userExamData from localStorage (application data)
    const userExamData = JSON.parse(localStorage.getItem('userExamData') || '{}');
    const examTakers = [];
    
    // Match exam data with applicants
    Object.entries(userExamData).forEach(([key, examData]) => {
        // Check if this exam data has taken property or score
        if ((examData.taken || examData.completedAt) && (examData.score || examData.score?.percentage !== undefined)) {
            // Find applicant by username (key) or applicationId
            let applicant = allApplicants.find(app => {
                // Try to match by username
                if (app.account?.username === key) return true;
                // Try to match by applicationId
                if (app.applicationId === key) return true;
                // Check if username is in user data
                if (app.username === key) return true;
                return false;
            });
            
            // If applicant not found in allApplicants, try to get from registeredUsers
            if (!applicant) {
                const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                const user = users.find(u => u.account?.username === key);
                
                if (user && user.applications && user.applications.length > 0) {
                    // Get the first application
                    const application = user.applications[0];
                    applicant = {
                        ...user,
                        applicationId: application.applicationId,
                        program: application.program,
                        exam: examData,
                        personal: user.personal
                    };
                }
            }
            
            if (applicant) {
                // Format exam data to match expected structure
                const formattedExamData = {
                    taken: true,
                    score: examData.score?.percentage || examData.score,
                    passed: (examData.score?.percentage >= 75) || (examData.score >= 75),
                    dateTaken: examData.completedAt || examData.dateTaken || new Date().toISOString(),
                    passingScore: 75,
                    timeSpent: examData.timeSpent || 0
                };
                
                examTakers.push({
                    ...applicant,
                    exam: formattedExamData
                });
            }
        }
    });
    
    if (examTakers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-icon">💯</div>
                    <p>No exam results available</p>
                </td>
            </tr>
        `;
        updateExamStats(0, 0, 0);
        return;
    }
    
    // Calculate statistics
    const totalExams = examTakers.length;
    const passedExams = examTakers.filter(app => app.exam.passed).length;
    const passRate = totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0;
    
    // Calculate top score
    let topScore = 0;
    examTakers.forEach(app => {
        let scoreValue;
        
        if (app.exam.score && typeof app.exam.score === 'object' && 'percentage' in app.exam.score) {
            scoreValue = app.exam.score.percentage;
        } else if (app.exam.score && typeof app.exam.score === 'number') {
            scoreValue = app.exam.score;
        } else {
            scoreValue = 0;
        }
        
        if (scoreValue !== undefined && scoreValue !== null && !isNaN(scoreValue) && scoreValue > topScore) {
            topScore = scoreValue;
        }
    });
    
    updateExamStats(totalExams, passRate, topScore);
    
    // Populate table
    examTakers.forEach(applicant => {
        const row = document.createElement('tr');
        const scoreValue = applicant.exam.score && typeof applicant.exam.score === 'object' && 'percentage' in applicant.exam.score 
            ? applicant.exam.score.percentage 
            : (applicant.exam.score || 0);
            
        row.innerHTML = `
            <td>${applicant.personal.firstName} ${applicant.personal.lastName}</td>
            <td>${getProgramName(applicant.program) || 'N/A'}</td>
            <td>${scoreValue}%</td>
            <td><span class="status-badge ${applicant.exam.passed ? 'badge-approved' : 'badge-rejected'}">${applicant.exam.passed ? 'Passed' : 'Failed'}</span></td>
            <td>${applicant.exam.dateTaken ? formatDate(applicant.exam.dateTaken) : 'N/A'}</td>
            <td>
                <button class="btn-icon btn-view" onclick="viewExamDetails('${applicant.applicationId}')" title="View Details">👁️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function viewExamDetails(applicationId) {
    const applicant = allApplicants.find(app => app.applicationId === applicationId);
    if (!applicant) {
        alert('Applicant not found!');
        return;
    }
    
    // Get exam data from userExamData (check both username and applicationId)
    const userExamData = JSON.parse(localStorage.getItem('userExamData') || '{}');
    let examData = null;
    
    if (applicant.account?.username && userExamData[applicant.account.username]) {
        examData = userExamData[applicant.account.username];
    } else if (userExamData[applicationId]) {
        examData = userExamData[applicationId];
    } else if (applicant.exam && (applicant.exam.taken || applicant.exam.completedAt)) {
        examData = applicant.exam;
    }
    
    if (!examData) {
        alert('Exam details not found!');
        return;
    }
    
    const modalContent = document.getElementById('applicantDetails');
    modalContent.innerHTML = `
        <h3 style="color: var(--primary-blue); margin-bottom: 20px;">Exam Details</h3>
        
        <div class="applicant-details">
            <div class="detail-section">
                <h4>Student Information</h4>
                <div class="detail-row">
                    <div class="detail-label">Name:</div>
                    <div class="detail-value">${applicant.personal.firstName} ${applicant.personal.lastName}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Program:</div>
                    <div class="detail-value">${getProgramName(applicant.program)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Application ID:</div>
                    <div class="detail-value">${applicationId}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Exam Results</h4>
                <div class="exam-results">
                    <div class="exam-score">${examData.score?.percentage || examData.score || 0}%</div>
                    <div class="exam-details-extended">
                        <div class="detail-row">
                            <div class="detail-label">Result:</div>
                            <div class="detail-value">
                                <span class="status-badge ${(examData.score?.percentage >= 75 || examData.score >= 75) ? 'badge-approved' : 'badge-rejected'}">
                                    ${(examData.score?.percentage >= 75 || examData.score >= 75) ? 'Passed' : 'Failed'}
                                </span>
                            </div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Date Taken:</div>
                            <div class="detail-value">${examData.completedAt || examData.dateTaken ? formatDateTime(examData.completedAt || examData.dateTaken) : 'N/A'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Passing Score:</div>
                            <div class="detail-value">${examData.passingScore || 75}%</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Questions Attempted:</div>
                            <div class="detail-value">${examData.score?.total || 'N/A'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Correct Answers:</div>
                            <div class="detail-value">${examData.score?.correct || 'N/A'}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${examData.answers ? `
            <div class="detail-section">
                <h4>Answer Breakdown</h4>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${Object.entries(examData.answers).map(([questionId, answer], index) => `
                        <div style="margin-bottom: 10px; padding: 10px; background: ${answer.isCorrect ? '#e8f5e9' : '#ffebee'}; border-radius: 5px;">
                            <div style="font-weight: bold;">Question ${index + 1}:</div>
                            <div style="margin-top: 5px; font-size: 13px;">
                                Selected: ${answer.selected}<br>
                                Correct: ${answer.correct}<br>
                                Status: <span style="color: ${answer.isCorrect ? 'green' : 'red'}">${answer.isCorrect ? 'Correct' : 'Incorrect'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <button class="btn-filter" onclick="closeModal()">
                Close
            </button>
        </div>
    `;
    
    document.getElementById('applicantModal').style.display = 'flex';
}

function updateExamStats(total, passRate, topScore) {
    const totalExamsEl = document.getElementById('totalExams');
    const passRateEl = document.getElementById('passRate');
    const topScoreEl = document.getElementById('topScore');
    
    if (totalExamsEl) totalExamsEl.textContent = total;
    if (passRateEl) passRateEl.textContent = `${passRate}%`;
    if (topScoreEl) topScoreEl.textContent = `${topScore}%`;
}

// ===== FILTER FUNCTIONS =====
function filterApplicants() {
    const searchQuery = document.getElementById('applicantSearch');
    
    if (!searchQuery) {
        console.error('Search element not found');
        return;
    }
    
    const searchValue = searchQuery.value.toLowerCase();
    
    filteredApplicants = allApplicants.filter(applicant => {
        // Search filter
        if (searchValue) {
            const fullName = `${applicant.personal.firstName} ${applicant.personal.lastName}`.toLowerCase();
            const email = applicant.personal.email.toLowerCase();
            const appId = (applicant.applicationId || '').toLowerCase();
            const program = getProgramName(applicant.program).toLowerCase();
            
            if (!fullName.includes(searchValue) && 
                !email.includes(searchValue) && 
                !appId.includes(searchValue) &&
                !program.includes(searchValue)) {
                return false;
            }
        }
        
        return true;
    });
    
    refreshCurrentView();
}

function clearFilters() {
    const searchQuery = document.getElementById('applicantSearch');
    
    if (searchQuery) searchQuery.value = '';
    
    filteredApplicants = [...allApplicants];
    refreshCurrentView();
}

// ===== SORTING FUNCTIONS =====
function sortApplicants(sortBy) {
    switch(sortBy) {
        case 'approved':
            filteredApplicants = allApplicants.filter(app => app.status === 'approved');
            break;
        case 'rejected':
            filteredApplicants = allApplicants.filter(app => app.status === 'rejected');
            break;
        case 'waiting':
            filteredApplicants = allApplicants.filter(app => app.status === 'waiting');
            break;
        case 'all':
            filteredApplicants = [...allApplicants];
            break;
        default:
            filteredApplicants = [...allApplicants];
    }
    
    loadApplicantsTable();
}

// ===== APPLICATION MANAGEMENT =====
function viewApplicant(applicationId) {
    const applicant = allApplicants.find(app => app.applicationId === applicationId);
    if (!applicant) {
        alert('Applicant not found!');
        return;
    }
    
    const modalContent = document.getElementById('applicantDetails');
    if (!modalContent) {
        alert('Modal content not found!');
        return;
    }
    
    // Get document rejection reasons for this applicant
    let documentRejectionsHTML = '';
    Object.entries(documentRejectionReasons).forEach(([key, rejection]) => {
        if (key.startsWith(applicationId + '_')) {
            documentRejectionsHTML += `
                <div style="background: #ffebee; padding: 10px; border-radius: 5px; margin: 5px 0; border-left: 3px solid #e53935;">
                    <strong>${rejection.documentType}:</strong> ${rejection.reason}
                    <div style="font-size: 11px; color: #666; margin-top: 3px;">
                        Rejected by ${rejection.rejectedBy} on ${formatDate(rejection.rejectionDate)}
                    </div>
                </div>
            `;
        }
    });
    
    // Create documents grid HTML
    let documentsHTML = '';
    if (applicant.documents) {
        Object.entries(applicant.documents).forEach(([key, doc]) => {
            const docDisplayName = {
                picture: '2x2 ID Picture',
                birthcert: 'Birth Certificate',
                reportcard: 'Report Card',
                goodmoral: 'Good Moral Certificate',
                tor: 'Transcript of Records',
                diploma: 'High School Diploma'
            }[key] || key;
            
            documentsHTML += `
                <div class="document-item ${doc.verified ? 'verified' : doc.rejected ? 'rejected' : doc.uploaded ? '' : 'required'}">
                    <div class="document-header">
                        <div class="document-name">${docDisplayName}</div>
                        <div class="document-actions">
                            <span class="status-badge ${doc.verified ? 'badge-approved' : doc.rejected ? 'badge-rejected' : doc.uploaded ? 'badge-pending' : 'badge-missing'}">
                                ${doc.verified ? 'Verified' : doc.rejected ? 'Rejected' : doc.uploaded ? 'Pending' : 'Missing'}
                            </span>
                        </div>
                    </div>
                    ${doc.uploaded ? `
                        <p style="margin-top: 10px; font-size: 12px;">
                            File: ${doc.filename}<br>
                            ${doc.verified ? `Verified by: ${doc.verifiedBy || 'Admin'} on ${formatDate(doc.verificationDate)}` : ''}
                            ${doc.rejected ? `Rejected: ${doc.rejectionReason || doc.adminNote || 'No reason provided'}` : ''}
                        </p>
                        ${doc.dataUrl && !doc.rejected ? `
                        <div style="margin-top: 10px;">
                            <button class="btn-filter" onclick="viewDocument('${applicant.applicationId}', '${key}')" style="padding: 5px 10px; font-size: 12px;">
                                View Document
                            </button>
                        </div>
                        ` : ''}
                    ` : ''}
                </div>
            `;
        });
    }
    
    modalContent.innerHTML = `
        <div class="applicant-details">
            <div class="detail-section">
                <h4>Personal Information</h4>
                <div class="detail-row">
                    <div class="detail-label">Full Name:</div>
                    <div class="detail-value">${applicant.personal.firstName} ${applicant.personal.lastName}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">${applicant.personal.email}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Phone:</div>
                    <div class="detail-value">${applicant.personal.phone || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Address:</div>
                    <div class="detail-value">${applicant.personal.address || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Registration Date:</div>
                    <div class="detail-value">${formatDate(applicant.registrationDate || applicant.submittedDate)}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Application Details</h4>
                <div class="detail-row">
                    <div class="detail-label">Application ID:</div>
                    <div class="detail-value">${applicant.applicationId}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Program:</div>
                    <div class="detail-value">${getProgramName(applicant.program) || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Status:</div>
                    <div class="detail-value">
                        <span class="status-badge badge-${getStatusClass(applicant.status)}">
                            ${getStatusText(applicant.status)}
                        </span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Interview Status:</div>
                    <div class="detail-value">
                        <span class="status-badge badge-${getInterviewStatusClass(applicant.interviewStatus)}">
                            ${getInterviewStatusText(applicant.interviewStatus)}
                        </span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Date Applied:</div>
                    <div class="detail-value">${applicant.submittedDate ? formatDate(applicant.submittedDate) : 'N/A'}</div>
                </div>
                ${applicant.interviewDate ? `
                <div class="detail-row">
                    <div class="detail-label">Interview Date:</div>
                    <div class="detail-value">${formatDateTime(applicant.interviewDate)}</div>
                </div>
                ` : ''}
            </div>
            
            <div class="detail-section">
                <h4>Documents Status</h4>
                <div class="documents-grid">
                    ${documentsHTML}
                </div>
                
                ${documentRejectionsHTML ? `
                <div style="margin-top: 20px; padding: 15px; background: #fff3e0; border-radius: 8px;">
                    <h5 style="color: #e53935; margin-bottom: 10px;">Document Rejection History:</h5>
                    ${documentRejectionsHTML}
                </div>
                ` : ''}
            </div>
            
            ${applicant.exam.taken || applicant.exam.completedAt ? `
            <div class="detail-section">
                <h4>Exam Results</h4>
                <div class="exam-results">
                    <div class="exam-score">${applicant.exam.score?.percentage || applicant.exam.score || 0}%</div>
                    <div class="exam-details">
                        <div class="detail-row">
                            <div class="detail-label">Result:</div>
                            <div class="detail-value">
                                <span class="status-badge ${(applicant.exam.score?.percentage >= 75 || applicant.exam.score >= 75) ? 'badge-approved' : 'badge-rejected'}">
                                    ${(applicant.exam.score?.percentage >= 75 || applicant.exam.score >= 75) ? 'Passed' : 'Failed'}
                                </span>
                            </div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Date Taken:</div>
                            <div class="detail-value">${applicant.exam.completedAt || applicant.exam.dateTaken ? formatDateTime(applicant.exam.completedAt || applicant.exam.dateTaken) : 'N/A'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Passing Score:</div>
                            <div class="detail-value">${applicant.exam.passingScore || 75}%</div>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${applicant.interviewNotes ? `
            <div class="detail-section">
                <h4>Interview Notes</h4>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    ${applicant.interviewNotes}
                </div>
            </div>
            ` : ''}
        </div>
        
        <div style="margin-top: 30px; display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
            ${applicant.status === 'approved' || applicant.status === 'rejected' ? '' : `
                <button class="btn-filter" onclick="approveApplication('${applicant.applicationId}', true)" style="background: var(--success);">
                    Approve Application
                </button>
                <button class="btn-filter" onclick="rejectApplication('${applicant.applicationId}', true)" style="background: var(--danger);">
                    Reject Application
                </button>
            `}
            
            <button class="btn-filter" onclick="updateInterviewStatus('${applicant.applicationId}')" style="background: #7b1fa2;">
                Update Interview Status
            </button>
            
            <button class="btn-filter" onclick="closeModal()">
                Close
            </button>
        </div>
    `;
    
    document.getElementById('applicantModal').style.display = 'flex';
}

function approveApplication(applicationId, fromModal = false) {
    if (!confirm('Are you sure you want to approve this application?')) return;
    
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    let updated = false;
    
    users.forEach(user => {
        if (user.applications) {
            user.applications.forEach(app => {
                if (app.applicationId === applicationId) {
                    app.status = 'approved';
                    app.adminReview = {
                        reviewDate: new Date().toISOString(),
                        reviewer: adminData.fullName || 'Admin',
                        decision: 'approved',
                        notes: 'Application approved by administrator'
                    };
                    
                    if (!app.timeline) app.timeline = [];
                    app.timeline.push({
                        date: new Date().toISOString(),
                        event: 'Application approved by administrator'
                    });
                    
                    updated = true;
                }
            });
        }
    });
    
    if (updated) {
        localStorage.setItem('registeredUsers', JSON.stringify(users));
        
        loadAllApplicants();
        updateDashboard();
        
        if (fromModal) {
            closeModal();
            setTimeout(() => {
                viewApplicant(applicationId);
            }, 100);
        } else {
            refreshCurrentView();
        }
        
        alert('Application approved successfully!');
    } else {
        alert('Error: Application not found!');
    }
}

function rejectApplication(applicationId, fromModal = false) {
    const reason = prompt('Please enter the reason for rejection:');
    if (!reason) return;
    
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    let updated = false;
    
    users.forEach(user => {
        if (user.applications) {
            user.applications.forEach(app => {
                if (app.applicationId === applicationId) {
                    app.status = 'rejected';
                    app.adminReview = {
                        reviewDate: new Date().toISOString(),
                        reviewer: adminData.fullName || 'Admin',
                        decision: 'rejected',
                        notes: reason
                    };
                    
                    if (!app.timeline) app.timeline = [];
                    app.timeline.push({
                        date: new Date().toISOString(),
                        event: 'Application rejected by administrator'
                    });
                    
                    updated = true;
                }
            });
        }
    });
    
    if (updated) {
        localStorage.setItem('registeredUsers', JSON.stringify(users));
        
        loadAllApplicants();
        updateDashboard();
        
        if (fromModal) {
            closeModal();
            setTimeout(() => {
                viewApplicant(applicationId);
            }, 100);
        } else {
            refreshCurrentView();
        }
        
        alert('Application rejected successfully!');
    } else {
        alert('Error: Application not found!');
    }
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
    
    currentViewSection = sectionId;

    switch(sectionId) {
        case 'applicants':
            loadApplicantsTable();
            break;
        case 'documents':
            loadDocumentsTable();
            break;
        case 'exam':
            loadExamResults();
            break;
        case 'programs':
            loadPrograms();
            break;
        case 'reports':
            loadReportsSection();
            break;
    }
}

// ===== UTILITY FUNCTIONS =====
function getProgramName(programCode) {
    const program = programsData.find(p => p.id === programCode);
    return program ? program.name : programCode;
}

function getStatusText(status) {
    const statusMap = {
        'waiting': 'Waiting',
        'approved': 'Approved',
        'rejected': 'Rejected'
    };
    return statusMap[status] || status;
}

function getStatusClass(status) {
    const classMap = {
        'waiting': 'pending',
        'approved': 'approved',
        'rejected': 'rejected'
    };
    return classMap[status] || 'pending';
}

function getInterviewStatusText(status) {
    const statusMap = {
        'not-scheduled': 'Not Scheduled',
        'scheduled': 'Scheduled',
        'completed': 'Completed',
        'passed': 'Passed',
        'failed': 'Failed'
    };
    return statusMap[status] || status;
}

function getInterviewStatusClass(status) {
    const classMap = {
        'not-scheduled': 'not-scheduled',
        'scheduled': 'scheduled',
        'completed': 'interview-completed',
        'passed': 'interview-passed',
        'failed': 'interview-failed'
    };
    return classMap[status] || 'not-scheduled';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(seconds) {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

function updateNotificationBadges() {
    const waitingApps = allApplicants.filter(app => app.status === 'waiting').length;
    
    let unverifiedDocs = 0;
    allApplicants.forEach(applicant => {
        if (applicant.status !== 'rejected' && applicant.documents) {
            Object.values(applicant.documents).forEach(doc => {
                if (doc.uploaded && !doc.verified && !doc.rejected) {
                    unverifiedDocs++;
                }
            });
        }
    });
    
    const applicantsNotification = document.getElementById('applicantsNotification');
    const documentsNotification = document.getElementById('documentsNotification');
    
    if (applicantsNotification) applicantsNotification.textContent = waitingApps;
    if (documentsNotification) documentsNotification.textContent = unverifiedDocs;
}

function closeModal() {
    const applicantModal = document.getElementById('applicantModal');
    const documentModal = document.getElementById('documentModal');
    const interviewModal = document.getElementById('interviewModal');
    const programModal = document.getElementById('programModal');
    const reportModal = document.getElementById('reportModal');
    
    if (applicantModal) applicantModal.style.display = 'none';
    if (documentModal) documentModal.style.display = 'none';
    if (interviewModal) interviewModal.style.display = 'none';
    if (programModal) programModal.style.display = 'none';
    if (reportModal) reportModal.style.display = 'none';
    
    currentInterviewAppId = null;
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

function setupEventListeners() {
    try {
        // Applicant search
        const applicantSearch = document.getElementById('applicantSearch');
        if (applicantSearch) {
            applicantSearch.addEventListener('input', filterApplicants);
        }
        
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

function refreshCurrentView() {
    switch(currentViewSection) {
        case 'overview':
            loadRecentApplications();
            break;
        case 'applicants':
            loadApplicantsTable();
            break;
        case 'documents':
            loadDocumentsTable();
            break;
        case 'exam':
            loadExamResults();
            break;
    }
}

// ===== REPORTS FUNCTIONS =====
function loadReportsSection() {
    const reportsSection = document.getElementById('reportsSection');
    if (!reportsSection) return;
    
    reportsSection.innerHTML = `
        <div class="content-header">
            <h1>Reports & Analytics</h1>
            <p>View system statistics and generate detailed reports</p>
        </div>
        
        <div class="reports-container">
            <div class="report-card clickable" onclick="generateReport('applicantsPerProgram')">
                <div class="report-card-header">
                    <div class="report-icon">📊</div>
                    <h3>Applicants Per Program</h3>
                </div>
                <div class="report-card-content">
                    <p>View total approved applicants per program with detailed breakdown</p>
                </div>
                <div class="report-card-footer">
                    <span class="report-action">Generate Report →</span>
                </div>
            </div>
            
            <div class="report-card clickable" onclick="generateReport('applicationStatus')">
                <div class="report-card-header">
                    <div class="report-icon">📈</div>
                    <h3>Application Status Report</h3>
                </div>
                <div class="report-card-content">
                    <p>Breakdown of applications by status with visual charts</p>
                </div>
                <div class="report-card-footer">
                    <span class="report-action">Generate Report →</span>
                </div>
            </div>
            
            <div class="report-card clickable" onclick="generateReport('examPerformance')">
                <div class="report-card-header">
                    <div class="report-icon">💯</div>
                    <h3>Exam Performance Report</h3>
                </div>
                <div class="report-card-content">
                    <p>Analyze exam scores, pass rates, and performance trends</p>
                </div>
                <div class="report-card-footer">
                    <span class="report-action">Generate Report →</span>
                </div>
            </div>
            
            <div class="report-card clickable" onclick="generateReport('programStatistics')">
                <div class="report-card-header">
                    <div class="report-icon">🎓</div>
                    <h3>Program Statistics</h3>
                </div>
                <div class="report-card-content">
                    <p>Comprehensive statistics for each training program</p>
                </div>
                <div class="report-card-footer">
                    <span class="report-action">Generate Report →</span>
                </div>
            </div>
        </div>
    `;
}

function generateReport(reportType) {
    let reportData = {};
    let reportTitle = '';
    let reportDescription = '';
    
    switch(reportType) {
        case 'applicantsPerProgram':
            reportTitle = 'Approved Applicants Per Program Report';
            reportDescription = 'Analysis of approved applicants distributed across different training programs';
            const programCounts = {};
            allApplicants.forEach(app => {
                if (app.status === 'approved') {
                    const program = getProgramName(app.program) || 'Unknown';
                    programCounts[program] = (programCounts[program] || 0) + 1;
                }
            });
            reportData = programCounts;
            break;
            
        case 'applicationStatus':
            reportTitle = 'Application Status Report';
            reportDescription = 'Comprehensive breakdown of all applications by current status';
            const statusCounts = {
                'Waiting Review': allApplicants.filter(app => app.status === 'waiting').length,
                'Approved': allApplicants.filter(app => app.status === 'approved').length,
                'Rejected': allApplicants.filter(app => app.status === 'rejected').length
            };
            reportData = statusCounts;
            break;
            
        case 'examPerformance':
            reportTitle = 'Exam Performance Report';
            reportDescription = 'Detailed analysis of exam scores and performance metrics';
            const userExamData = JSON.parse(localStorage.getItem('userExamData') || '{}');
            const examTakers = Object.values(userExamData).filter(exam => (exam.taken || exam.completedAt));
            const passed = examTakers.filter(exam => (exam.score?.percentage >= 75 || exam.score >= 75)).length;
            const failed = examTakers.length - passed;
            
            // Calculate top score
            let topScore = 0;
            examTakers.forEach(exam => {
                let scoreValue;
                
                if (exam.score && typeof exam.score === 'object' && 'percentage' in exam.score) {
                    scoreValue = exam.score.percentage;
                } else if (exam.score && typeof exam.score === 'number') {
                    scoreValue = exam.score;
                } else {
                    scoreValue = 0;
                }
                
                if (scoreValue !== undefined && scoreValue !== null && !isNaN(scoreValue) && scoreValue > topScore) {
                    topScore = scoreValue;
                }
            });
            
            const passRate = examTakers.length > 0 ? Math.round((passed / examTakers.length) * 100) : 0;
            
            reportData = {
                'Total Exams Taken': examTakers.length,
                'Passed': passed,
                'Failed': failed,
                'Pass Rate': `${passRate}%`,
                'Top Score': `${topScore}%`,
                'Minimum Passing Score': '75%'
            };
            break;
            
        case 'programStatistics':
            reportTitle = 'Program Statistics Report';
            reportDescription = 'Comprehensive statistics for each training program';
            const programStats = {};
            
            programsData.forEach(program => {
                const programApps = allApplicants.filter(app => app.program === program.id);
                const approvedCount = programApps.filter(app => app.status === 'approved').length;
                const waitingCount = programApps.filter(app => app.status === 'waiting').length;
                const rejectedCount = programApps.filter(app => app.status === 'rejected').length;
                
                programStats[program.name] = {
                    'Total Applications': programApps.length,
                    'Approved': approvedCount,
                    'Waiting Review': waitingCount,
                    'Rejected': rejectedCount,
                    'Slots Available': program.totalSlots - approvedCount,
                    'Slot Usage': `${approvedCount}/${program.totalSlots}`,
                    'Approval Rate': `${programApps.length > 0 ? Math.round((approvedCount / programApps.length) * 100) : 0}%`
                };
            });
            
            reportData = programStats;
            break;
    }
    
    // Create or get the report modal
    let reportModal = document.getElementById('reportModal');
    if (!reportModal) {
        reportModal = document.createElement('div');
        reportModal.className = 'modal-overlay';
        reportModal.id = 'reportModal';
        reportModal.innerHTML = `
            <div class="modal report-modal">
                <div class="modal-header">
                    <h3 id="reportModalTitle"></h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div id="reportContent"></div>
                </div>
            </div>
        `;
        document.body.appendChild(reportModal);
    }
    
    document.getElementById('reportModalTitle').textContent = reportTitle;
    
    let reportContent = '';
    
    if (reportType === 'programStatistics') {
        reportContent = `
            <div class="report-header">
                <h4 style="color: var(--primary-blue); margin-bottom: 10px;">${reportTitle}</h4>
                <p style="color: var(--medium-gray); margin-bottom: 20px;">${reportDescription}</p>
                <p style="color: var(--medium-gray); font-size: 14px; margin-bottom: 30px;">
                    Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                </p>
            </div>
            
            <div class="report-stats">
                ${Object.entries(reportData).map(([programName, stats]) => `
                    <div class="program-report-card">
                        <div class="program-report-header">
                            <h5 style="color: var(--primary-blue); margin: 0; font-size: 18px;">${programName}</h5>
                        </div>
                        <div class="program-report-content">
                            ${Object.entries(stats).map(([key, value]) => `
                                <div class="stat-row">
                                    <span class="stat-label">${key}:</span>
                                    <span class="stat-value">${value}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <button class="btn-filter" onclick="printReport()" style="background: var(--primary-blue); margin-right: 10px;">
                    Print Report
                </button>
                <button class="btn-filter" onclick="closeModal()">
                    Close
                </button>
            </div>
        `;
    } else {
        reportContent = `
            <div class="report-header">
                <h4 style="color: var(--primary-blue); margin-bottom: 10px;">${reportTitle}</h4>
                <p style="color: var(--medium-gray); margin-bottom: 20px;">${reportDescription}</p>
                <p style="color: var(--medium-gray); font-size: 14px; margin-bottom: 30px;">
                    Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                </p>
            </div>
            
            <div class="report-stats">
                ${Object.entries(reportData).map(([key, value]) => `
                    <div class="stat-row">
                        <span class="stat-label">${key}:</span>
                        <span class="stat-value">${value}</span>
                    </div>
                `).join('')}
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <button class="btn-filter" onclick="printReport()" style="background: var(--primary-blue); margin-right: 10px;">
                    Print Report
                </button>
                <button class="btn-filter" onclick="closeModal()">
                    Close
                </button>
            </div>
        `;
    }
    
    document.getElementById('reportContent').innerHTML = reportContent;
    reportModal.style.display = 'flex';
}

function printReport() {
    window.print();
}

// ===== DEBUG FUNCTIONS =====
window.debugAdmin = function() {
    console.log('=== ADMIN DEBUG INFO ===');
    console.log('Current admin:', adminData);
    console.log('All applicants:', allApplicants);
    console.log('Programs data:', programsData);
    console.log('User exam data:', JSON.parse(localStorage.getItem('userExamData') || '{}'));
    console.log('Document rejection reasons:', documentRejectionReasons);
};

window.createTestStudent = function() {
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
        applications: [{
            applicationId: 'TEST-' + Date.now(),
            program: 'wadt',
            status: 'waiting',
            submittedDate: new Date().toISOString(),
            interviewStatus: 'not-scheduled',
            documents: {
                picture: { 
                    uploaded: true, 
                    filename: 'id_picture.jpg', 
                    verified: false, 
                    type: '2x2 ID Picture',
                    dataUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2UzZjJmZCIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSI0MCIgZmlsbD0iIzQyODVmNCIvPjxyZWN0IHg9IjYwIiB5PSIxMzAiIHdpZHRoPSI4MCIgaGVpZ2h0PSI0MCIgZmlsbD0iIzQyODVmNCIvPjwvc3ZnPg=='
                },
                birthcert: { 
                    uploaded: true, 
                    filename: 'birth_cert.pdf', 
                    verified: false, 
                    type: 'Birth Certificate',
                    dataUrl: 'data:application/pdf;base64,JVBERi0xLg=='
                },
                reportcard: { 
                    uploaded: true, 
                    filename: 'report_card.pdf', 
                    verified: false, 
                    type: 'Report Card',
                    dataUrl: 'data:application/pdf;base64,JVBERi0xLg=='
                },
                goodmoral: { 
                    uploaded: false, 
                    filename: null, 
                    verified: false, 
                    type: 'Certificate of Good Moral Character',
                    dataUrl: null
                },
                tor: { 
                    uploaded: false, 
                    filename: null, 
                    verified: false, 
                    type: 'Transcript of Records (TOR)',
                    dataUrl: null
                },
                diploma: { 
                    uploaded: false, 
                    filename: null, 
                    verified: false, 
                    type: 'High School Diploma',
                    dataUrl: null
                }
            },
            exam: { taken: false }
        }],
        registrationDate: new Date().toISOString()
    };
    
    const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    existingUsers.push(testAccount);
    localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
    
    loadAllApplicants();
    updateDashboard();
    alert('✅ Test student created!');
};