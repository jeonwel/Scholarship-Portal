// ===== GLOBAL VARIABLES =====
let allApplicants = [];
let filteredApplicants = [];
let adminData = null;
let currentInterviewAppId = null;
let programsData = [];
let currentViewSection = 'overview';
let documentRejectionReasons = JSON.parse(localStorage.getItem('documentRejectionReasons') || '{}');
let currentActionCallback = null;
let currentActionParams = null;

// ===== MODAL FUNCTIONS =====
function showAlert(title, message, icon = 'ℹ️', callback = null) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertIcon').textContent = icon;
    
    const okBtn = document.getElementById('alertOkBtn');
    const cancelBtn = document.getElementById('alertCancelBtn');
    
    okBtn.onclick = function() {
        document.getElementById('alertModal').style.display = 'none';
        if (callback) callback(true);
    };
    
    document.getElementById('alertModal').style.display = 'flex';
}

function showConfirm(title, message, yesCallback, noCallback = null) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    
    const yesBtn = document.getElementById('confirmYesBtn');
    const noBtn = document.getElementById('confirmNoBtn');
    
    yesBtn.onclick = function() {
        document.getElementById('confirmModal').style.display = 'none';
        if (yesCallback) yesCallback();
    };
    
    noBtn.onclick = function() {
        document.getElementById('confirmModal').style.display = 'none';
        if (noCallback) noCallback();
    };
    
    document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

function showRejectionModal(title, instruction, submitCallback) {
    document.getElementById('rejectionTitle').textContent = title;
    document.getElementById('rejectionInstruction').textContent = instruction;
    document.getElementById('rejectionReason').value = '';
    
    const submitBtn = document.getElementById('rejectionSubmitBtn');
    submitBtn.onclick = function() {
        const reason = document.getElementById('rejectionReason').value.trim();
        if (!reason) {
            showAlert('Required', 'Please enter a rejection reason.', '⚠️');
            return;
        }
        document.getElementById('rejectionModal').style.display = 'none';
        submitCallback(reason);
    };
    
    document.getElementById('rejectionModal').style.display = 'flex';
}

function closeRejectionModal() {
    document.getElementById('rejectionModal').style.display = 'none';
}

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', function() {
    checkAdminLogin();
    initializePrograms();
    loadAllApplicants();
    updateDashboard();
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
        showAlert('Access Denied', 'Please login as administrator to access this dashboard.', '🔒', function() {
            window.location.href = 'login.html';
        });
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
        showAlert('Required Fields', 'Please fill all required fields', '⚠️');
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
    showAlert('Success', 'Program saved successfully!', '✅');
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
                    
                    // UPDATED: For rejected applicants, don't count missing documents
                    let uploadedCount = 0;
                    let rejectedCount = 0;
                    let totalDocs = 6;
                    
                    if (application.documents) {
                        if (application.status === 'rejected') {
                            // For rejected applicants, only count uploaded documents
                            uploadedCount = Object.values(application.documents).filter(doc => 
                                doc.uploaded && !doc.rejected
                            ).length;
                            
                            // Count rejected documents
                            rejectedCount = Object.values(application.documents).filter(doc => 
                                doc.rejected
                            ).length;
                            
                            // For rejected applicants, missing documents don't count
                            totalDocs = uploadedCount + rejectedCount;
                        } else {
                            // For non-rejected applicants, count normally
                            uploadedCount = Object.values(application.documents).filter(doc => 
                                doc.uploaded && !doc.rejected
                            ).length;
                            
                            rejectedCount = Object.values(application.documents).filter(doc => 
                                doc.rejected
                            ).length;
                        }
                    }
                    
                    // Check if all required documents are uploaded (excluding rejected ones)
                    const allDocsUploaded = application.status === 'rejected' ? 
                        true : // For rejected applicants, consider documents as "uploaded" for display
                        (uploadedCount === 6) && (rejectedCount === 0);
                    
                    // Save document stats to application
                    application.documentsStats = {
                        uploadedCount,
                        rejectedCount,
                        totalDocs: application.status === 'rejected' ? uploadedCount + rejectedCount : 6,
                        allDocsUploaded
                    };
                    
                    // NEW: Check if applicant failed exam (score < 75)
                    let status = application.status;
                    let examFailed = false;
                    
                    // Check exam score
                    if (examData && (examData.taken || examData.completedAt)) {
                        const scoreValue = examData.score && typeof examData.score === 'object' && 'percentage' in examData.score 
                            ? examData.score.percentage 
                            : (examData.score || 0);
                        
                        if (scoreValue < 75) {
                            status = 'rejected';
                            examFailed = true;
                            // Update application status in storage if exam failed
                            if (application.status !== 'rejected') {
                                application.status = 'rejected';
                                application.adminReview = {
                                    reviewDate: new Date().toISOString(),
                                    reviewer: 'System',
                                    decision: 'rejected',
                                    notes: 'Automatically rejected due to failing exam score'
                                };
                                
                                if (!application.timeline) application.timeline = [];
                                application.timeline.push({
                                    date: new Date().toISOString(),
                                    event: 'Application automatically rejected - Exam score below passing (75%)'
                                });
                            }
                        }
                    }
                    
                    // Convert old statuses to new system if not rejected by exam
                    if (!examFailed && (status === 'pending' || status === 'need-exam' || status === 'under-review' || 
                        status === 'applied' || status === 'documents-completed' || status === 'exam-completed' ||
                        status === 'completed')) {
                        status = 'waiting';
                    }
                    
                    // If application is rejected by admin, set status to rejected
                    if (application.adminReview?.decision === 'rejected') {
                        status = 'rejected';
                    }
                    
                    // Initialize interview status if not exists
                    if (!application.interviewStatus) {
                        application.interviewStatus = 'not-scheduled';
                    }
                    
                    // Auto-update interview status based on interview date
                    if (application.interviewDate && !application.interviewCompleted) {
                        const interviewDate = new Date(application.interviewDate);
                        const now = new Date();
                        if (interviewDate <= now && application.interviewStatus === 'scheduled') {
                            application.interviewStatus = 'completed';
                            if (!application.interviewCompleted) {
                                application.interviewCompleted = true;
                            }
                        }
                    }
                    
                    const applicant = {
                        ...user,
                        application: application,
                        applicationId: application.applicationId,
                        program: application.program,
                        status: status,
                        submittedDate: application.submittedDate,
                        documents: application.documents || {},
                        documentsStats: application.documentsStats,
                        exam: examData,
                        interviewStatus: application.interviewStatus,
                        interviewDate: application.interviewDate,
                        interviewNotes: application.interviewNotes,
                        examFailed: examFailed
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
                if (application.status !== 'cancelled') {
                    // Check exam score for auto-rejection
                    if (application.exam && (application.exam.taken || application.exam.completedAt)) {
                        const scoreValue = application.exam.score && typeof application.exam.score === 'object' && 'percentage' in application.exam.score 
                            ? application.exam.score.percentage 
                            : (application.exam.score || 0);
                        
                        if (scoreValue < 75 && application.status !== 'rejected') {
                            application.status = 'rejected';
                            application.adminReview = {
                                reviewDate: new Date().toISOString(),
                                reviewer: 'System',
                                decision: 'rejected',
                                notes: 'Automatically rejected due to failing exam score'
                            };
                            
                            if (!application.timeline) application.timeline = [];
                            application.timeline.push({
                                date: new Date().toISOString(),
                                event: 'Application automatically rejected - Exam score below passing (75%)'
                            });
                            updated = true;
                        }
                    }
                    
                    // Check if admin rejected the application
                    if (application.adminReview?.decision === 'rejected') {
                        if (application.status !== 'rejected') {
                            application.status = 'rejected';
                            updated = true;
                        }
                    } else if (application.status !== 'approved' && application.status !== 'rejected') {
                        // Convert all other statuses to 'waiting'
                        if (application.status === 'pending' || application.status === 'need-exam' || 
                            application.status === 'under-review' || application.status === 'applied' ||
                            application.status === 'documents-completed' || application.status === 'exam-completed' ||
                            application.status === 'completed') {
                            application.status = 'waiting';
                            updated = true;
                        }
                    }
                    
                    // Auto-update interview status based on date
                    if (application.interviewDate && !application.interviewCompleted) {
                        const interviewDate = new Date(application.interviewDate);
                        const now = new Date();
                        if (interviewDate <= now && application.interviewStatus === 'scheduled') {
                            application.interviewStatus = 'completed';
                            application.interviewCompleted = true;
                            updated = true;
                        }
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

function loadApplicantsTable() {
    const tbody = document.getElementById('applicantsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Show all applicants including those rejected by exam
    const displayApplicants = filteredApplicants;
    
    if (displayApplicants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>No applicants found matching your criteria</p>
                </td>
            </tr>
        `;
        return;
    }
    
    displayApplicants.forEach(applicant => {
        // UPDATED: For rejected applicants, show different document count
        let uploadedDocs = applicant.documentsStats?.uploadedCount || 0;
        let totalDocs = applicant.status === 'rejected' ? 
            (applicant.documentsStats?.uploadedCount || 0) + (applicant.documentsStats?.rejectedCount || 0) : 
            6;
        
        // If rejected applicant has no uploaded documents, show "0/0"
        if (applicant.status === 'rejected' && uploadedDocs === 0) {
            totalDocs = 0;
        }
        
        const displayCount = `${uploadedDocs}/${totalDocs}`;
        
        // Calculate exam score
        let examScore = 'Not Taken';
        if (applicant.exam && (applicant.exam.taken || applicant.exam.completedAt)) {
            const scoreValue = applicant.exam.score && typeof applicant.exam.score === 'object' && 'percentage' in applicant.exam.score 
                ? applicant.exam.score.percentage 
                : (applicant.exam.score || 0);
            examScore = `${scoreValue}%`;
        }
        
        // Check if all 6 documents are uploaded (only for non-rejected)
        const allDocsUploaded = applicant.status === 'rejected' ? true : applicant.documentsStats?.allDocsUploaded;
        
        // Check if all uploaded documents are verified
        let allDocsVerified = true;
        if (applicant.documents) {
            allDocsVerified = Object.values(applicant.documents).every(doc => 
                !doc.uploaded || (doc.uploaded && doc.verified)
            );
        }
        
        // Check if exam is passed
        const examPassed = applicant.exam && (applicant.exam.taken || applicant.exam.completedAt) && 
            ((applicant.exam.score && typeof applicant.exam.score === 'object' && 'percentage' in applicant.exam.score 
                ? applicant.exam.score.percentage 
                : (applicant.exam.score || 0)) >= 75);
        
        // Determine if approve button should be disabled - REMOVED interview requirement
        const canApprove = applicant.status === 'waiting' && 
            allDocsUploaded && 
            allDocsVerified && 
            examPassed;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${applicant.applicationId || 'N/A'}</td>
            <td>${applicant.personal.firstName} ${applicant.personal.lastName}</td>
            <td>${applicant.personal.email}</td>
            <td>${getProgramName(applicant.program) || 'N/A'}</td>
            <td>${applicant.submittedDate ? formatDate(applicant.submittedDate) : 'N/A'}</td>
            <td>${displayCount}</td>
            <td>${examScore}</td>
            <td><span class="status-badge badge-${getStatusClass(applicant.status)}">${getStatusText(applicant.status)}</span></td>
            <td><span class="status-badge badge-${getInterviewStatusClass(applicant.interviewStatus)}">${getInterviewStatusText(applicant.interviewStatus)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-view" onclick="viewApplicant('${applicant.applicationId}')" title="View Details">👁️</button>
                    ${applicant.status === 'waiting' ? `
                        <button class="btn-icon btn-approve" onclick="approveApplication('${applicant.applicationId}')" title="Approve" ${!canApprove ? 'disabled style="opacity: 0.5;"' : ''}>✅</button>
                        <button class="btn-icon btn-reject" onclick="rejectApplication('${applicant.applicationId}')" title="Reject">❌</button>
                    ` : ''}
                    ${applicant.status !== 'rejected' ? `
                        <button class="btn-icon" onclick="updateInterviewStatus('${applicant.applicationId}')" title="Schedule Interview" style="background: #e1bee7; color: #7b1fa2;">📅</button>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateInterviewStatus(applicationId) {
    const applicant = allApplicants.find(app => app.applicationId === applicationId);
    if (!applicant) {
        showAlert('Not Found', 'Applicant not found!', '⚠️');
        return;
    }
    
    // Disable for rejected applicants
    if (applicant.status === 'rejected') {
        showAlert('Cannot Schedule', 'Cannot schedule interview for rejected applicants!', '❌');
        return;
    }
    
    currentInterviewAppId = applicationId;
    
    const interviewModal = document.getElementById('interviewModal');
    if (!interviewModal) {
        showAlert('Error', 'Interview modal not found!', '⚠️');
        return;
    }
    
    // Set current date/time as minimum for scheduling
    const now = new Date();
    const minDate = now.toISOString().slice(0, 16);
    document.getElementById('interviewDate').min = minDate;
    
    // If already has interview date, pre-fill it
    document.getElementById('interviewDate').value = applicant.interviewDate || '';
    document.getElementById('interviewNotes').value = applicant.interviewNotes || '';
    
    interviewModal.style.display = 'flex';
}

function saveInterviewSchedule() {
    if (!currentInterviewAppId) return;
    
    const interviewDate = document.getElementById('interviewDate').value;
    const interviewNotes = document.getElementById('interviewNotes').value;
    
    if (!interviewDate) {
        showAlert('Required', 'Please select an interview date and time!', '⚠️');
        return;
    }
    
    // Update in localStorage (application data)
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    let updated = false;
    
    users.forEach(user => {
        if (user.applications) {
            user.applications.forEach(app => {
                if (app.applicationId === currentInterviewAppId) {
                    // Set interview status to "scheduled" automatically
                    app.interviewStatus = 'scheduled';
                    app.interviewDate = interviewDate;
                    app.interviewNotes = interviewNotes;
                    app.interviewCompleted = false;
                    updated = true;
                    
                    // Add to timeline
                    if (!app.timeline) app.timeline = [];
                    app.timeline.push({
                        date: new Date().toISOString(),
                        event: `Interview scheduled for ${formatDateTime(interviewDate)}`
                    });
                }
            });
        }
    });
    
    if (updated) {
        localStorage.setItem('registeredUsers', JSON.stringify(users));
        loadAllApplicants();
        
        if (currentViewSection === 'applicants') {
            loadApplicantsTable();
        }
        
        closeModal();
        showAlert('Success', 'Interview scheduled successfully! The status has been automatically set to "Scheduled".', '✅');
    } else {
        showAlert('Error', 'Error scheduling interview!', '❌');
    }
    
    currentInterviewAppId = null;
}

function removeInterviewSchedule() {
    if (!currentInterviewAppId) return;
    
    showConfirm('Remove Schedule', 'Are you sure you want to remove the interview schedule?', function() {
        const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        let updated = false;
        
        users.forEach(user => {
            if (user.applications) {
                user.applications.forEach(app => {
                    if (app.applicationId === currentInterviewAppId) {
                        // Reset interview status
                        app.interviewStatus = 'not-scheduled';
                        app.interviewDate = null;
                        app.interviewNotes = null;
                        app.interviewCompleted = false;
                        updated = true;
                        
                        // Add to timeline
                        if (!app.timeline) app.timeline = [];
                        app.timeline.push({
                            date: new Date().toISOString(),
                            event: 'Interview schedule removed'
                        });
                    }
                });
            }
        });
        
        if (updated) {
            localStorage.setItem('registeredUsers', JSON.stringify(users));
            loadAllApplicants();
            
            if (currentViewSection === 'applicants') {
                loadApplicantsTable();
            }
            
            closeModal();
            showAlert('Success', 'Interview schedule removed successfully!', '✅');
        } else {
            showAlert('Error', 'Error removing interview schedule!', '❌');
        }
        
        currentInterviewAppId = null;
    });
}

// ===== DOCUMENT MANAGEMENT =====
function updateDocumentRejectionStorage(applicationId, documentId, reason, userData, docData) {
    const rejectionKey = `${applicationId}_${documentId}`;
    const timestamp = new Date().toISOString();
    
    // Store rejection in central storage with user identification
    documentRejectionReasons[rejectionKey] = {
        applicationId: applicationId,
        documentId: documentId,
        reason: reason,
        rejectedBy: adminData.fullName || 'Admin',
        rejectionDate: timestamp,
        documentType: documentId,
        studentName: `${userData.personal.firstName} ${userData.personal.lastName}`,
        studentEmail: userData.personal.email,
        originalData: docData
    };
    
    localStorage.setItem('documentRejectionReasons', JSON.stringify(documentRejectionReasons));
}

function archiveRejectedApplicantDocuments(applicationId, applicantData, rejectionReason) {
    const timestamp = new Date().toISOString();
    
    if (applicantData.documents) {
        Object.entries(applicantData.documents).forEach(([docType, docData]) => {
            // Check if document has any uploaded data (filename or fileName)
            const hasFileName = docData.filename || docData.fileName;
            if (docData.uploaded && hasFileName) {
                const rejectionKey = `${applicationId}_${docType}_application_rejection`;
                
                // Store in documentRejectionReasons with application rejection context
                documentRejectionReasons[rejectionKey] = {
                    applicationId: applicationId,
                    documentId: docType,
                    reason: `Application rejected: ${rejectionReason}`,
                    rejectedBy: adminData.fullName || 'Admin',
                    rejectionDate: timestamp,
                    documentType: docType,
                    studentName: `${applicantData.personal.firstName} ${applicantData.personal.lastName}`,
                    studentEmail: applicantData.personal.email,
                    originalData: {
                        filename: docData.filename || docData.fileName,
                        type: docData.type || docType,
                        filetype: docData.filetype || null,
                        size: docData.size || null,
                        uploadDate: docData.lastModified || applicantData.submittedDate,
                        dataUrl: docData.dataUrl || null,
                        verified: docData.verified || false
                    },
                    rejectionContext: 'application'
                };
            }
        });
    }
    
    localStorage.setItem('documentRejectionReasons', JSON.stringify(documentRejectionReasons));
}

// UPDATED: Function to clear ALL applicant documents from storage when application is rejected
function clearApplicantDocumentsOnRejection(applicationId) {
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    let updated = false;
    
    // Create a deep copy to modify
    const updatedUsers = JSON.parse(JSON.stringify(users));
    
    updatedUsers.forEach(user => {
        if (user.applications) {
            user.applications.forEach(app => {
                if (app.applicationId === applicationId) {
                    // Save exam data
                    const savedExamData = app.exam || {};
                    
                    // Document names mapping
                    const documentNames = {
                        picture: '2x2 ID Picture',
                        birthcert: 'Birth Certificate',
                        reportcard: 'Report Card',
                        goodmoral: 'Certificate of Good Moral Character',
                        tor: 'Transcript of Records (TOR)',
                        diploma: 'High School Diploma'
                    };
                    
                    // Initialize documents
                    if (!app.documents) {
                        app.documents = {};
                    }
                    
                    // Clear ALL documents completely
                    Object.keys(documentNames).forEach(docType => {
                        // Get the document type name
                        const docTypeName = (app.documents[docType] && app.documents[docType].type) || documentNames[docType];
                        
                        // Archive uploaded documents
                        if (app.documents[docType] && app.documents[docType].uploaded) {
                            const timestamp = new Date().toISOString();
                            const rejectionKey = `${applicationId}_${docType}_application_rejection`;
                            
                            documentRejectionReasons[rejectionKey] = {
                                applicationId: applicationId,
                                documentId: docType,
                                reason: 'Application rejected - Document cleared',
                                rejectedBy: adminData.fullName || 'Admin',
                                rejectionDate: timestamp,
                                documentType: docTypeName,
                                studentName: `${user.personal.firstName} ${user.personal.lastName}`,
                                studentEmail: user.personal.email,
                                originalData: {
                                    filename: app.documents[docType].filename || app.documents[docType].fileName,
                                    type: app.documents[docType].type,
                                    filetype: app.documents[docType].filetype,
                                    size: app.documents[docType].size,
                                    uploadDate: app.documents[docType].lastModified || app.submittedDate,
                                    dataUrl: app.documents[docType].dataUrl,
                                    verified: app.documents[docType].verified || false
                                },
                                rejectionContext: 'application'
                            };
                        }
                        
                        // COMPLETELY RESET the document
                        app.documents[docType] = {
                            uploaded: false,
                            filename: null,
                            filetype: null,
                            size: null,
                            verified: false,
                            rejected: true,
                            type: docTypeName,
                            dataUrl: null,
                            lastModified: new Date().toISOString()
                        };
                    });
                    
                    // Restore exam data
                    app.exam = savedExamData;
                    
                    // Clear interview data
                    app.interviewStatus = 'not-scheduled';
                    app.interviewDate = null;
                    app.interviewNotes = null;
                    app.interviewCompleted = false;
                    
                    // Add timeline
                    if (!app.timeline) app.timeline = [];
                    app.timeline.push({
                        date: new Date().toISOString(),
                        event: 'Application rejected - All documents cleared and marked as rejected'
                    });
                    
                    updated = true;
                }
            });
        }
    });
    
    if (updated) {
        // Save document rejections
        localStorage.setItem('documentRejectionReasons', JSON.stringify(documentRejectionReasons));
        
        // Save the updated users
        localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
        
        // Force reload the data
        loadAllApplicants();
        updateDashboard();
        
        // Show success message
        showAlert('Success', 'All documents cleared and marked as rejected!', '✅');
    }
    
    return updated;
}

function loadDocumentsTable() {
    const tbody = document.getElementById('documentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Collect only documents that need admin action:
    // 1. Uploaded but not verified (pending) - ONLY show non-verified documents
    // 2. DO NOT show verified documents anymore
    let allDocuments = [];
    
    filteredApplicants.forEach(applicant => {
        // Skip rejected applicants
        if (applicant.status === 'rejected') {
            return;
        }
        
        // Skip approved applicants
        if (applicant.status === 'approved') {
            return;
        }
        
        if (applicant.documents) {
            Object.entries(applicant.documents).forEach(([docType, docData]) => {
                // Show only pending documents (uploaded but not verified)
                if (docData.uploaded && (docData.filename || docData.fileName) && !docData.verified) {
                    allDocuments.push({
                        studentName: `${applicant.personal.firstName} ${applicant.personal.lastName}`,
                        docType: docData.type || docType,
                        fileName: docData.filename || docData.fileName,
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
    
    if (allDocuments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <p>No pending documents found for review</p>
                    <p style="font-size: 12px; margin-top: 5px;">All uploaded documents have been verified</p>
                </td>
            </tr>
        `;
        return;
    }
    
    allDocuments.forEach(doc => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${doc.studentName}</td>
            <td>${doc.docType}</td>
            <td>${doc.fileName}</td>
            <td>${doc.uploadDate ? formatDate(doc.uploadDate) : 'N/A'}</td>
            <td><span class="status-badge badge-pending">Pending Review</span></td>
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
        showAlert('Not Found', 'Document not found!', '⚠️');
        return;
    }
    
    const doc = applicant.documents[documentId];
    
    const modalContent = document.getElementById('documentPreview');
    
    // Get stored file data URL from document
    const fileDataUrl = doc.dataUrl;
    
    // Get filename (handle both filename and fileName properties)
    const fileName = doc.filename || doc.fileName || '';
    const fileNameLower = fileName.toLowerCase();
    
    // Check if file is an image based on filename or data URL
    const isImage = fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg') || 
                    fileNameLower.endsWith('.png') || fileNameLower.endsWith('.gif') || 
                    fileNameLower.endsWith('.bmp') || fileNameLower.endsWith('.webp') ||
                    (fileDataUrl && fileDataUrl.startsWith('data:image/'));
    
    // REMOVED: Approve and Reject buttons from document preview
    modalContent.innerHTML = `
        <h4 style="color: var(--primary-blue); margin-bottom: 20px;">${doc.type || documentId}</h4>
        <div style="text-align: center;">
            <p><strong>Student:</strong> ${applicant.personal.firstName} ${applicant.personal.lastName}</p>
            <p><strong>File Name:</strong> ${fileName || 'N/A'}</p>
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
                         alt="${fileName}" 
                         style="max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
                                ${documentId === 'picture' ? 'width: 200px; height: 200px; object-fit: cover; border: 3px solid var(--primary-blue);' : ''}">
                </div>
                ` : `
                <div style="color: var(--medium-gray);">
                    <h5>Document Preview</h5>
                    <p>File type: ${fileName ? fileName.split('.').pop().toUpperCase() : 'N/A'}</p>
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
                <button class="btn-filter" onclick="closeModal()">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('documentModal').style.display = 'flex';
}

function verifyDocument(applicationId, documentId, fromModal = false) {
    showConfirm('Verify Document', 'Are you sure you want to verify this document?', function() {
        const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        let updated = false;
        
        users.forEach(user => {
            if (user.applications) {
                user.applications.forEach(app => {
                    if (app.applicationId === applicationId && app.documents && app.documents[documentId]) {
                        // Mark document as verified
                        app.documents[documentId].verified = true;
                        app.documents[documentId].verifiedBy = adminData.fullName || 'Admin';
                        app.documents[documentId].verificationDate = new Date().toISOString();
                        
                        // Check if all documents are verified
                        const allDocsVerified = app.documents ? 
                            Object.values(app.documents).every(doc => doc.uploaded && doc.verified) : false;
                        
                        if (allDocsVerified && app.exam && app.exam.passed) {
                            app.status = 'waiting';
                            app.adminReview = {
                                reviewDate: new Date().toISOString(),
                                reviewer: adminData.fullName || 'Admin',
                                decision: 'under-review',
                                notes: 'All documents verified. Application ready for final review.'
                            };
                            
                            if (!app.timeline) app.timeline = [];
                            app.timeline.push({
                                date: new Date().toISOString(),
                                event: 'All documents verified by administrator'
                            });
                            app.timeline.push({
                                date: new Date().toISOString(),
                                event: 'Application complete - Ready for final approval'
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
            loadDocumentsTable(); // Document will be removed from review table
            
            if (fromModal) {
                closeModal();
            }
            showAlert('Success', 'Document verified successfully!', '✅');
        } else {
            showAlert('Error', 'Error verifying document!', '❌');
        }
    });
}

function rejectDocument(applicationId, documentId, fromModal = false) {
    showRejectionModal(
        'Reject Document',
        'Please provide a reason for rejecting this document. The document will be removed and the student will need to re-upload it.',
        function(reason) {
            showConfirm('Confirm Rejection', 'Are you sure you want to reject this document? The document will be removed and the student will need to re-upload it.', function() {
                const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                let updated = false;
                
                users.forEach(user => {
                    if (user.applications) {
                        user.applications.forEach(app => {
                            if (app.applicationId === applicationId && app.documents && app.documents[documentId]) {
                                // Save document data before deleting
                                const docData = {
                                    filename: app.documents[documentId].filename || app.documents[documentId].fileName,
                                    type: app.documents[documentId].type,
                                    filetype: app.documents[documentId].filetype,
                                    size: app.documents[documentId].size,
                                    lastModified: app.documents[documentId].lastModified,
                                    dataUrl: app.documents[documentId].dataUrl
                                };
                                
                                // Store rejection in documentRejectionReasons
                                updateDocumentRejectionStorage(applicationId, documentId, reason, user, docData);
                                
                                // Clear the document from student's application
                                app.documents[documentId] = {
                                    uploaded: false,      // ← Marks as not uploaded
                                    filename: null,       // ← Clears filename
                                    filetype: null,       // ← Clears file type
                                    size: null,           // ← Clears file size
                                    verified: false,      // ← Resets verification
                                    rejected: true,       // ← CRITICAL: Marks document as rejected
                                    type: docData.type || documentId,
                                    dataUrl: null,        // ← REMOVES the actual file data/URL
                                    lastModified: new Date().toISOString()
                                };
                                
                                // Update application timeline
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
                    loadDocumentsTable(); // Document will vanish from review table
                    
                    if (fromModal) {
                        closeModal();
                    }
                    showAlert('Document Rejected', 'Document rejected and removed! The student will need to re-upload it with corrections.', '✅');
                } else {
                    showAlert('Error', 'Error rejecting document!', '❌');
                }
            });
        }
    );
}

// ===== EXAM RESULTS =====
function loadExamResults() {
    const tbody = document.getElementById('examResultsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Get userExamData from localStorage (application data)
    const userExamData = JSON.parse(localStorage.getItem('userExamData') || '{}');
    const examTakers = [];
    
    // Match exam data with applicants - INCLUDE REJECTED APPLICANTS TOO
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
    
    // Also check all applicants directly for exam data (including rejected ones)
    allApplicants.forEach(applicant => {
        if (applicant.exam && (applicant.exam.taken || applicant.exam.completedAt)) {
            // Check if already added from userExamData
            const alreadyAdded = examTakers.some(taker => 
                taker.applicationId === applicant.applicationId || 
                taker.account?.username === applicant.account?.username
            );
            
            if (!alreadyAdded) {
                examTakers.push(applicant);
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
    const passedExams = examTakers.filter(app => 
        (app.exam.score && typeof app.exam.score === 'object' && 'percentage' in app.exam.score 
            ? app.exam.score.percentage 
            : (app.exam.score || 0)) >= 75
    ).length;
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
    
    // Populate table - INCLUDING REJECTED APPLICANTS
    examTakers.forEach(applicant => {
        const row = document.createElement('tr');
        const scoreValue = applicant.exam.score && typeof applicant.exam.score === 'object' && 'percentage' in applicant.exam.score 
            ? applicant.exam.score.percentage 
            : (applicant.exam.score || 0);
            
        row.innerHTML = `
            <td>${applicant.personal.firstName} ${applicant.personal.lastName}</td>
            <td>${getProgramName(applicant.program) || 'N/A'}</td>
            <td>${scoreValue}%</td>
            <td><span class="status-badge ${scoreValue >= 75 ? 'badge-approved' : 'badge-rejected'}">${scoreValue >= 75 ? 'Passed' : 'Failed'}</span></td>
            <td>${applicant.exam.dateTaken || applicant.exam.completedAt ? formatDate(applicant.exam.dateTaken || applicant.exam.completedAt) : 'N/A'}</td>
            <td>
                <button class="btn-icon btn-view" onclick="viewExamDetails('${applicant.applicationId || applicant.account?.username}')" title="View Details">👁️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function viewExamDetails(identifier) {
    // identifier can be applicationId or username
    let applicant = allApplicants.find(app => 
        app.applicationId === identifier || app.account?.username === identifier
    );
    
    // If not found in allApplicants, check userExamData
    if (!applicant) {
        const userExamData = JSON.parse(localStorage.getItem('userExamData') || '{}');
        const examData = userExamData[identifier];
        
        if (examData) {
            // Try to find user data
            const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            const user = users.find(u => 
                u.account?.username === identifier || 
                (u.applications && u.applications.some(app => app.applicationId === identifier))
            );
            
            if (user) {
                applicant = {
                    personal: user.personal,
                    account: user.account,
                    exam: examData,
                    applicationId: identifier,
                    program: user.applications?.[0]?.program
                };
            } else {
                applicant = {
                    personal: { firstName: 'Unknown', lastName: 'Student', email: 'N/A' },
                    exam: examData,
                    applicationId: identifier,
                    program: 'N/A'
                };
            }
        }
    }
    
    if (!applicant) {
        showAlert('Not Found', 'Exam details not found!', '⚠️');
        return;
    }
    
    const examData = applicant.exam;
    
    const modalContent = document.getElementById('applicantDetails');
    const scoreValue = examData.score && typeof examData.score === 'object' && 'percentage' in examData.score 
        ? examData.score.percentage 
        : (examData.score || 0);
        
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
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">${applicant.personal.email || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Program:</div>
                    <div class="detail-value">${getProgramName(applicant.program) || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Identifier:</div>
                    <div class="detail-value">${applicant.applicationId || identifier}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Exam Results</h4>
                <div class="exam-results">
                    <div class="exam-score">${scoreValue}%</div>
                    <div class="exam-details-extended">
                        <div class="detail-row">
                            <div class="detail-label">Result:</div>
                            <div class="detail-value">
                                <span class="status-badge ${scoreValue >= 75 ? 'badge-approved' : 'badge-rejected'}">
                                    ${scoreValue >= 75 ? 'Passed' : 'Failed'}
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
        showAlert('Not Found', 'Applicant not found!', '⚠️');
        return;
    }
    
    const modalContent = document.getElementById('applicantDetails');
    if (!modalContent) {
        showAlert('Error', 'Modal content not found!', '⚠️');
        return;
    }
    
    // Get document rejection reasons for this applicant (including application rejections)
    let documentRejectionsHTML = '';
    Object.entries(documentRejectionReasons).forEach(([key, rejection]) => {
        if (key.startsWith(applicationId + '_')) {
            const isApplicationRejection = key.includes('_application_rejection') || rejection.rejectionContext === 'application';
            documentRejectionsHTML += `
                <div style="background: ${isApplicationRejection ? '#ffebee' : '#fff3e0'}; padding: 10px; border-radius: 5px; margin: 5px 0; border-left: 3px solid ${isApplicationRejection ? '#e53935' : '#ff9800'};">
                    <strong>${rejection.documentType}:</strong> ${rejection.reason}
                    <div style="font-size: 11px; color: #666; margin-top: 3px;">
                        Rejected by ${rejection.rejectedBy} on ${formatDate(rejection.rejectionDate)}
                        ${isApplicationRejection ? ' (Application Rejection)' : ''}
                    </div>
                </div>
            `;
        }
    });
    
    // Create documents grid HTML - Show documents that are uploaded or missing
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
            
            // Get document status
            let statusClass = '';
            let statusText = '';
            
            if (doc.rejected) {
                statusClass = 'badge-rejected';
                statusText = 'Rejected';
            } else if (doc.verified) {
                statusClass = 'badge-approved';
                statusText = 'Verified';
            } else if (doc.uploaded) {
                statusClass = 'badge-pending';
                statusText = 'Pending';
            } else {
                statusClass = 'badge-missing';
                statusText = 'Missing';
            }
            
            documentsHTML += `
                <div class="document-item ${doc.verified ? 'verified' : doc.uploaded ? '' : 'required'}">
                    <div class="document-header">
                        <div class="document-name">${docDisplayName}</div>
                        <div class="document-actions">
                            <span class="status-badge ${statusClass}">
                                ${statusText}
                            </span>
                        </div>
                    </div>
                    ${doc.uploaded && !doc.rejected ? `
                        <p style="margin-top: 10px; font-size: 12px;">
                            File: ${doc.filename || doc.fileName || 'N/A'}<br>
                            ${doc.verified ? `Verified by: ${doc.verifiedBy || 'Admin'} on ${formatDate(doc.verificationDate)}` : ''}
                        </p>
                        ${doc.dataUrl ? `
                        <div style="margin-top: 10px;">
                            <button class="btn-filter" onclick="viewDocument('${applicant.applicationId}', '${key}')" style="padding: 5px 10px; font-size: 12px;">
                                View Document
                            </button>
                        </div>
                        ` : ''}
                    ` : doc.rejected ? `
                        <p style="margin-top: 10px; font-size: 12px; color: #e53935;">
                            <em>Document cleared and marked as rejected</em>
                        </p>
                    ` : ''}
                </div>
            `;
        });
    }
    
    // Check if all 6 documents are uploaded (only for non-rejected)
    const allDocsUploaded = applicant.status === 'rejected' ? true : applicant.documentsStats?.allDocsUploaded;
    
    // Check if all uploaded documents are verified
    let allDocsVerified = true;
    if (applicant.documents && applicant.status !== 'rejected') {
        allDocsVerified = Object.values(applicant.documents).every(doc => 
            !doc.uploaded || (doc.uploaded && doc.verified)
        );
    }
    
    // Check if exam is passed
    const examPassed = applicant.exam && (applicant.exam.taken || applicant.exam.completedAt) && 
        ((applicant.exam.score && typeof applicant.exam.score === 'object' && 'percentage' in applicant.exam.score 
            ? applicant.exam.score.percentage 
            : (applicant.exam.score || 0)) >= 75);
    
    // Determine if approve button should be disabled - REMOVED interview requirement
    const canApprove = applicant.status === 'waiting' && 
        allDocsUploaded && 
        allDocsVerified && 
        examPassed;
    
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
                
                <div style="margin-top: 15px; font-size: 14px; color: #666">
                    ${applicant.status === 'rejected' ? `
                    <strong>Document Status:</strong> All documents cleared and marked as rejected
                    ` : `
                    <strong>Document Progress:</strong> ${applicant.documentsStats?.uploadedCount || 0}/6 uploaded
                    ${allDocsUploaded ? '✓ All documents uploaded' : '✗ Not all documents uploaded'}
                    ${allDocsUploaded && allDocsVerified ? '✓ All documents verified' : allDocsUploaded ? '✗ Not all documents verified' : ''}
                    `}
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
            ${applicant.status === 'waiting' ? `
                <button class="btn-filter" onclick="approveApplication('${applicant.applicationId}', true)" style="background: var(--success);" ${!canApprove ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                    Approve Application
                </button>
                <button class="btn-filter" onclick="rejectApplication('${applicant.applicationId}', true)" style="background: var(--danger);">
                    Reject Application
                </button>
            ` : ''}
            
            ${applicant.status !== 'rejected' ? `
                <button class="btn-filter" onclick="updateInterviewStatus('${applicant.applicationId}')" style="background: #7b1fa2;">
                    ${applicant.interviewStatus === 'scheduled' ? 'Reschedule Interview' : 'Schedule Interview'}
                </button>
            ` : ''}
            
            <button class="btn-filter" onclick="closeModal()">
                Close
            </button>
        </div>
        
        ${applicant.status === 'waiting' && !canApprove ? `
        <div style="margin-top: 20px; padding: 15px; background: #fff3e0; border-radius: 8px; border-left: 4px solid #ff9800;">
            <h5 style="color: #ef6c00; margin-bottom: 10px;">Approval Requirements Not Met:</h5>
            <ul style="margin: 0; padding-left: 20px; color: #666;">
                ${!allDocsUploaded ? '<li>All 6 documents must be uploaded</li>' : ''}
                ${allDocsUploaded && !allDocsVerified ? '<li>All uploaded documents must be verified</li>' : ''}
                ${!examPassed ? '<li>Exam must be passed (score ≥ 75%)</li>' : ''}
            </ul>
        </div>
        ` : ''}
    `;
    
    document.getElementById('applicantModal').style.display = 'flex';
}

function approveApplication(applicationId, fromModal = false) {
    const applicant = allApplicants.find(app => app.applicationId === applicationId);
    if (!applicant) {
        showAlert('Not Found', 'Applicant not found!', '⚠️');
        return;
    }
    
    // Check if all 6 documents are uploaded
    const allDocsUploaded = applicant.documentsStats?.allDocsUploaded;
    if (!allDocsUploaded) {
        showAlert('Cannot Approve', 'Cannot approve application! All 6 documents must be uploaded.', '❌');
        return;
    }
    
    // Check if all uploaded documents are verified
    let allDocsVerified = true;
    let unverifiedDocs = [];
    
    if (applicant.documents) {
        Object.entries(applicant.documents).forEach(([docType, doc]) => {
            if (doc.uploaded && !doc.verified) {
                allDocsVerified = false;
                unverifiedDocs.push(docType);
            }
        });
    }
    
    if (!allDocsVerified) {
        const docNames = {
            picture: '2x2 ID Picture',
            birthcert: 'Birth Certificate',
            reportcard: 'Report Card',
            goodmoral: 'Good Moral Certificate',
            tor: 'Transcript of Records',
            diploma: 'High School Diploma'
        };
        
        const unverifiedDocNames = unverifiedDocs.map(doc => docNames[doc] || doc).join(', ');
        showAlert('Cannot Approve', `Cannot approve application! The following documents are not verified: ${unverifiedDocNames}`, '❌');
        return;
    }
    
    // Check if exam is passed
    const examPassed = applicant.exam && (applicant.exam.taken || applicant.exam.completedAt) && 
        ((applicant.exam.score && typeof applicant.exam.score === 'object' && 'percentage' in applicant.exam.score 
            ? applicant.exam.score.percentage 
            : (applicant.exam.score || 0)) >= 75);
    
    if (!examPassed) {
        showAlert('Cannot Approve', 'Cannot approve application! Applicant must pass the exam (score ≥ 75%).', '❌');
        return;
    }
    
    showConfirm('Approve Application', 'Are you sure you want to approve this application?', function() {
        const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        let updated = false;
        
        users.forEach(user => {
            if (user.applications) {
                user.applications.forEach(app => {
                    if (app.applicationId === applicationId) {
                        // Automatically verify all documents when approving
                        if (app.documents) {
                            Object.entries(app.documents).forEach(([docType, doc]) => {
                                if (doc.uploaded && !doc.verified) {
                                    doc.verified = true;
                                    doc.verifiedBy = adminData.fullName || 'Admin';
                                    doc.verificationDate = new Date().toISOString();
                                }
                            });
                        }
                        
                        app.status = 'approved';
                        app.adminReview = {
                            reviewDate: new Date().toISOString(),
                            reviewer: adminData.fullName || 'Admin',
                            decision: 'approved',
                            notes: 'Application approved by administrator. All documents automatically verified.'
                        };
                        
                        if (!app.timeline) app.timeline = [];
                        app.timeline.push({
                            date: new Date().toISOString(),
                            event: 'All documents automatically verified upon approval'
                        });
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
            
            showAlert('Success', 'Application approved successfully! All documents have been automatically verified.', '✅');
        } else {
            showAlert('Error', 'Application not found!', '❌');
        }
    });
}

// MODIFIED: Function to reject application and clear documents just like document rejection
function rejectApplication(applicationId, fromModal = false) {
    const applicant = allApplicants.find(app => app.applicationId === applicationId);
    if (!applicant) {
        showAlert('Not Found', 'Applicant not found!', '⚠️');
        return;
    }
    
    showRejectionModal(
        'Reject Application',
        'Please provide a reason for rejecting this application. All documents will be cleared and marked as rejected.',
        function(reason) {
            showConfirm('Confirm Rejection', 'Are you sure? All documents will be cleared.', function() {
                // First clear all documents
                const documentsCleared = clearApplicantDocumentsOnRejection(applicationId);
                
                if (documentsCleared) {
                    // Now update the application status
                    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                    let statusUpdated = false;
                    
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
                                    
                                    statusUpdated = true;
                                }
                            });
                        }
                    });
                    
                    if (statusUpdated) {
                        localStorage.setItem('registeredUsers', JSON.stringify(users));
                        
                        // Force reload
                        loadAllApplicants();
                        updateDashboard();
                        
                        if (fromModal) {
                            closeModal();
                        } else {
                            refreshCurrentView();
                        }
                        
                        showAlert('Success', 'Application rejected! All documents cleared.', '✅');
                    }
                }
            });
        }
    );
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
            // Reports are loaded via HTML
            break;
    }
}

// ===== REPORTS FUNCTIONS =====
function generateReport(reportType) {
    let reportData = {};
    let reportTitle = '';
    let reportDescription = '';
    
    switch(reportType) {
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
            
        case 'documentsReport':
            reportTitle = 'Documents Report';
            reportDescription = 'Comprehensive analysis of document verification and rejection statuses';
            
            // Load all documents from registered users
            const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            
            let totalDocuments = 0;
            let verifiedDocuments = 0;
            let pendingDocuments = 0;
            let rejectedDocuments = 0;
            let missingDocuments = 0;
            
            const documentBreakdown = {
                'picture': { name: '2x2 ID Picture', verified: 0, pending: 0, rejected: 0, missing: 0 },
                'birthcert': { name: 'Birth Certificate', verified: 0, pending: 0, rejected: 0, missing: 0 },
                'reportcard': { name: 'Report Card', verified: 0, pending: 0, rejected: 0, missing: 0 },
                'goodmoral': { name: 'Good Moral Certificate', verified: 0, pending: 0, rejected: 0, missing: 0 },
                'tor': { name: 'Transcript of Records', verified: 0, pending: 0, rejected: 0, missing: 0 },
                'diploma': { name: 'High School Diploma', verified: 0, pending: 0, rejected: 0, missing: 0 }
            };
            
            users.forEach(user => {
                if (user.applications) {
                    user.applications.forEach(application => {
                        // UPDATED: Skip rejected applications for document counting
                        if (application.status === 'rejected') {
                            return;
                        }
                        
                        if (application.documents) {
                            Object.entries(application.documents).forEach(([docType, doc]) => {
                                totalDocuments++;
                                
                                if (doc.uploaded) {
                                    if (doc.verified) {
                                        verifiedDocuments++;
                                        documentBreakdown[docType].verified++;
                                    } else {
                                        pendingDocuments++;
                                        documentBreakdown[docType].pending++;
                                    }
                                } else {
                                    missingDocuments++;
                                    documentBreakdown[docType].missing++;
                                }
                            });
                        }
                    });
                }
            });
            
            // Add rejected documents from documentRejectionReasons
            rejectedDocuments = Object.keys(documentRejectionReasons).length;
            
            // Update breakdown with rejected documents
            Object.values(documentRejectionReasons).forEach(rejection => {
                if (documentBreakdown[rejection.documentId]) {
                    documentBreakdown[rejection.documentId].rejected++;
                }
            });
            
            reportData = {
                'Total Documents Tracked': totalDocuments,
                'Verified Documents': verifiedDocuments,
                'Pending Verification': pendingDocuments,
                'Rejected Documents': rejectedDocuments,
                'Missing Documents': missingDocuments,
                'Verification Rate': `${totalDocuments > 0 ? Math.round((verifiedDocuments / totalDocuments) * 100) : 0}%`
            };
            
            // Add document breakdown
            reportData.documentBreakdown = documentBreakdown;
            break;
    }
    
    const reportContent = document.getElementById('reportContent');
    
    let reportHTML = '';
    
    if (reportType === 'programStatistics') {
        reportHTML = `
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
        `;
    } else if (reportType === 'documentsReport') {
        const { documentBreakdown, ...mainStats } = reportData;
        
        reportHTML = `
            <div class="report-header">
                <h4 style="color: var(--primary-blue); margin-bottom: 10px;">${reportTitle}</h4>
                <p style="color: var(--medium-gray); margin-bottom: 20px;">${reportDescription}</p>
                <p style="color: var(--medium-gray); font-size: 14px; margin-bottom: 30px;">
                    Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                </p>
            </div>
            
            <div class="report-stats">
                ${Object.entries(mainStats).map(([key, value]) => `
                    <div class="stat-row">
                        <span class="stat-label">${key}:</span>
                        <span class="stat-value">${value}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="document-breakdown">
                <h5 style="color: var(--primary-blue); margin-top: 30px; margin-bottom: 15px;">Document Type Breakdown</h5>
                <div class="documents-report-grid">
                    ${Object.entries(documentBreakdown).map(([docId, docStats]) => `
                        <div class="document-stat-card">
                            <div class="document-stat-header">
                                <div class="document-stat-icon ${
                                    docStats.verified > 0 ? 'verified' : 
                                    docStats.pending > 0 ? 'pending' : 
                                    docStats.rejected > 0 ? 'rejected' : 'uploaded'
                                }">
                                    ${docId === 'picture' ? '🖼️' : 
                                      docId === 'birthcert' ? '📄' : 
                                      docId === 'reportcard' ? '📊' : 
                                      docId === 'goodmoral' ? '📜' : 
                                      docId === 'tor' ? '🎓' : '📜'}
                                </div>
                                <div class="document-stat-title">${docStats.name}</div>
                            </div>
                            <div class="document-stat-number">${docStats.verified + docStats.pending + docStats.rejected + docStats.missing}</div>
                            <div class="document-stat-label">Total Documents</div>
                            <div class="document-breakdown-list">
                                <div class="document-breakdown-item">
                                    <span class="document-breakdown-name">Verified:</span>
                                    <span class="document-breakdown-count" style="color: var(--success);">${docStats.verified}</span>
                                </div>
                                <div class="document-breakdown-item">
                                    <span class="document-breakdown-name">Pending:</span>
                                    <span class="document-breakdown-count" style="color: var(--warning);">${docStats.pending}</span>
                                </div>
                                <div class="document-breakdown-item">
                                    <span class="document-breakdown-name">Rejected:</span>
                                    <span class="document-breakdown-count" style="color: var(--danger);">${docStats.rejected}</span>
                                </div>
                                <div class="document-breakdown-item">
                                    <span class="document-breakdown-name">Missing:</span>
                                    <span class="document-breakdown-count" style="color: var(--medium-gray);">${docStats.missing}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${Object.keys(documentRejectionReasons).length > 0 ? `
            <div class="rejection-summary" style="margin-top: 30px;">
                <h5 style="color: var(--primary-blue); margin-bottom: 15px;">Rejection Reasons Summary</h5>
                <div style="background: var(--light-blue); padding: 20px; border-radius: 8px;">
                    <p><strong>Total Rejections:</strong> ${Object.keys(documentRejectionReasons).length}</p>
                    <p><strong>Most Common Rejection:</strong> ${getMostCommonRejectionReason()}</p>
                    <button class="btn-filter" onclick="viewDocumentRejections()" style="margin-top: 10px;">
                        View All Rejection Details
                    </button>
                </div>
            </div>
            ` : ''}
        `;
    } else {
        reportHTML = `
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
        `;
    }
    
    reportHTML += `
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <button class="btn-filter" onclick="printReport()" style="background: var(--primary-blue); margin-right: 10px;">
                Print Report
            </button>
            <button class="btn-filter" onclick="closeModal()">
                Close
            </button>
        </div>
    `;
    
    document.getElementById('reportModalTitle').textContent = reportTitle;
    reportContent.innerHTML = reportHTML;
    document.getElementById('reportModal').style.display = 'flex';
}

function getMostCommonRejectionReason() {
    if (Object.keys(documentRejectionReasons).length === 0) {
        return 'No rejections recorded';
    }
    
    const reasons = {};
    Object.values(documentRejectionReasons).forEach(rejection => {
        // Extract main reason (first sentence or first 50 chars)
        let reason = rejection.reason;
        if (reason.includes('.')) {
            reason = reason.split('.')[0];
        }
        if (reason.length > 50) {
            reason = reason.substring(0, 50) + '...';
        }
        
        reasons[reason] = (reasons[reason] || 0) + 1;
    });
    
    let mostCommon = '';
    let maxCount = 0;
    
    Object.entries(reasons).forEach(([reason, count]) => {
        if (count > maxCount) {
            mostCommon = reason;
            maxCount = count;
        }
    });
    
    return `${mostCommon} (${maxCount} times)`;
}

function printReport() {
    window.print();
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
        if (applicant.status !== 'rejected' && applicant.status !== 'approved' && applicant.documents) {
            Object.values(applicant.documents).forEach(doc => {
                if (doc.uploaded && !doc.verified) {
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
    showConfirm('Confirm Logout', 'Are you sure you want to logout?', function() {
        sessionStorage.clear();
        window.location.href = 'login.html';
    });
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
            // Nothing to load since Recent Applications is removed
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

// ===== DEBUG FUNCTIONS =====
// window.debugAdmin = function() {
//     console.log('=== ADMIN DEBUG INFO ===');
//     console.log('Current admin:', adminData);
//     console.log('All applicants:', allApplicants);
//     console.log('Programs data:', programsData);
//     console.log('User exam data:', JSON.parse(localStorage.getItem('userExamData') || '{}'));
//     console.log('Document rejection reasons:', documentRejectionReasons);
// };

// window.createTestStudent = function() {
//     const testAccount = {
//         personal: {
//             firstName: "Test",
//             lastName: "Student",
//             email: "test@student.com",
//             phone: "09123456789",
//             birthdate: "2000-01-01",
//             address: "Test Address",
//             gender: "male"
//         },
//         account: {
//             username: "teststudent",
//             password: "test1234",
//             securityQuestion: "What is your favorite color?",
//             securityAnswer: "blue"
//         },
//         applications: [{
//             applicationId: 'TEST-' + Date.now(),
//             program: 'wadt',
//             status: 'waiting',
//             submittedDate: new Date().toISOString(),
//             interviewStatus: 'not-scheduled',
//             documents: {
//                 picture: { 
//                     uploaded: true, 
//                     filename: 'id_picture.jpg', 
//                     verified: false, 
//                     type: '2x2 ID Picture',
//                     dataUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2UzZjJmZCIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSI0MCIgZmlsbD0iIzQyODVmNCIvPjxyZWN0IHg9IjYwIiB5PSIxMzAiIHdpZHRoPSI4MCIgaGVpZ2h0PSI0MCIgZmlsbD0iIzQyODVmNCIvPjwvc3ZnPg=='
//                 },
//                 birthcert: { 
//                     uploaded: true, 
//                     filename: 'birth_cert.pdf', 
//                     verified: false, 
//                     type: 'Birth Certificate',
//                     dataUrl: 'data:application/pdf;base64,JVBERi0xLg=='
//                 },
//                 reportcard: { 
//                     uploaded: true, 
//                     filename: 'report_card.pdf', 
//                     verified: false, 
//                     type: 'Report Card',
//                     dataUrl: 'data:application/pdf;base64,JVBERi0xLg=='
//                 },
//                 goodmoral: { 
//                     uploaded: false, 
//                     filename: null, 
//                     verified: false, 
//                     type: 'Certificate of Good Moral Character',
//                     dataUrl: null
//                 },
//                 tor: { 
//                     uploaded: false, 
//                     filename: null, 
//                     verified: false, 
//                     type: 'Transcript of Records (TOR)',
//                     dataUrl: null
//                 },
//                 diploma: { 
//                     uploaded: false, 
//                     filename: null, 
//                     verified: false, 
//                     type: 'High School Diploma',
//                     dataUrl: null
//                 }
//             },
//             exam: { taken: false }
//         }],
//         registrationDate: new Date().toISOString()
//     };
    
//     const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
//     existingUsers.push(testAccount);
//     localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
    
//     loadAllApplicants();
//     updateDashboard();
//     showAlert('Success', '✅ Test student created!', '✅');
// };

window.viewDocumentRejections = function() {
    if (Object.keys(documentRejectionReasons).length === 0) {
        showAlert('No Data', 'No document rejections found!', '📄');
        return;
    }
    
    let content = '<h3 style="color: var(--primary-blue); margin-bottom: 20px;">Document Rejection Archive</h3>';
    
    // Group by application
    const groupedByApplication = {};
    
    Object.entries(documentRejectionReasons).forEach(([key, rejection]) => {
        if (!groupedByApplication[rejection.applicationId]) {
            groupedByApplication[rejection.applicationId] = [];
        }
        groupedByApplication[rejection.applicationId].push(rejection);
    });
    
    Object.entries(groupedByApplication).forEach(([appId, rejections]) => {
        const firstRejection = rejections[0];
        const isApplicationRejection = rejections.some(r => 
            r.rejectionContext === 'application' || r.reason.includes('Application rejected')
        );
        
        content += `
            <div style="background: ${isApplicationRejection ? '#ffebee' : '#fff3e0'}; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid ${isApplicationRejection ? '#e53935' : '#ff9800'};">
                <h4 style="color: ${isApplicationRejection ? '#e53935' : '#ef6c00'}; margin-top: 0;">
                    ${firstRejection.studentName} - ${appId}
                    ${isApplicationRejection ? ' (Application Rejected)' : ''}
                </h4>
                <p><strong>Email:</strong> ${firstRejection.studentEmail}</p>
                
                <div style="margin-top: 10px;">
                    <strong>Rejected Documents:</strong> ${rejections.length} document(s)
                    ${rejections.map((rejection, index) => `
                        <div style="background: white; padding: 8px; margin-top: 5px; border-radius: 4px; font-size: 14px;">
                            <div><strong>${index + 1}. ${rejection.documentType}:</strong></div>
                            <div style="margin-left: 10px;">
                                <div><strong>Reason:</strong> ${rejection.reason}</div>
                                <div><strong>File:</strong> ${rejection.originalData?.filename || 'N/A'}</div>
                                <div><strong>Rejected by:</strong> ${rejection.rejectedBy} on ${formatDate(rejection.rejectionDate)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    // Create a modal to display the archive
    const archiveModal = document.createElement('div');
    archiveModal.className = 'modal-overlay';
    archiveModal.id = 'archiveModal';
    archiveModal.innerHTML = `
        <div class="modal" style="max-width: 800px;">
            <div class="modal-header">
                <h3>Document Rejection Archive</h3>
                <button class="modal-close" onclick="closeArchiveModal()">×</button>
            </div>
            <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
                ${content}
            </div>
            <div class="modal-footer" style="text-align: center; padding: 15px; border-top: 1px solid #eee;">
                <button class="btn-filter" onclick="closeArchiveModal()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(archiveModal);
    archiveModal.style.display = 'flex';
};

function closeArchiveModal() {
    const archiveModal = document.getElementById('archiveModal');
    if (archiveModal) {
        archiveModal.style.display = 'none';
        document.body.removeChild(archiveModal);
    }
}