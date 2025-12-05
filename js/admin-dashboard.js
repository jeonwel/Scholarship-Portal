        // ===== GLOBAL VARIABLES =====
        let allApplicants = [];
        let filteredApplicants = [];
        let adminData = null;
        let currentAdmin = null;

        // ===== INITIALIZATION =====
        window.addEventListener('DOMContentLoaded', function() {
            checkAdminLogin();
            loadAllApplicants();
            updateDashboard();
            setupEventListeners();
        });

        // ===== ADMIN AUTHENTICATION =====
        function checkAdminLogin() {
            // Check multiple possible session storage keys
            const isAdminLoggedIn = sessionStorage.getItem('isAdminLoggedIn');
            const adminUsername = sessionStorage.getItem('adminUsername');
            const userType = sessionStorage.getItem('userType');
            const username = sessionStorage.getItem('username');
            
            console.log('Admin login check - Session storage:', {
                isAdminLoggedIn,
                adminUsername,
                userType,
                username,
                allSession: Object.keys(sessionStorage).map(key => ({ key, value: sessionStorage.getItem(key) }))
            });
        
            // Check if any admin session exists
            let isAdmin = false;
            let adminUser = null;
            
            // Check various admin session indicators
            if (isAdminLoggedIn === 'true') {
                isAdmin = true;
                adminUser = adminUsername || username;
            } else if (userType === 'admin') {
                isAdmin = true;
                adminUser = username;
            } else {
                // Check if there's a username that might be admin
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
        
            // Load admin data from localStorage
            const admins = JSON.parse(localStorage.getItem('adminUsers') || '[]');
            console.log('Admin users in localStorage:', admins);
            
            // Find admin by username
            currentAdmin = admins.find(admin => admin.username === adminUser);
            
            if (!currentAdmin) {
                console.log('Admin not found in localStorage, checking if default admin...');
                
                // Check if this is the default admin trying to login
                if (adminUser === 'admin') {
                    // Create default admin account
                    const defaultAdmins = [
                        { 
                            username: 'admin', 
                            password: 'admin123', 
                            userType: 'admin',
                            fullName: 'System Administrator',
                            role: 'Super Admin'
                        }
                    ];
                    
                    // Save to localStorage
                    localStorage.setItem('adminUsers', JSON.stringify(defaultAdmins));
                    currentAdmin = defaultAdmins[0];
                    
                    console.log('Default admin created:', currentAdmin);
                } else {
                    alert('Admin account not found in system. Please contact system administrator.');
                    window.location.href = 'login.html';
                    return;
                }
            }
        
            adminData = currentAdmin;
            
            // Update session storage to ensure proper admin flags
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            sessionStorage.setItem('adminUsername', adminData.username);
            sessionStorage.setItem('userType', 'admin');
            sessionStorage.setItem('isLoggedIn', 'true');
            
            // Update admin info in header
            document.getElementById('adminName').textContent = adminData.fullName || 'Administrator';
            document.getElementById('adminRole').textContent = adminData.role || 'System Administrator';
            
            const firstLetter = (adminData.fullName || 'A').charAt(0).toUpperCase();
            document.getElementById('adminAvatar').textContent = firstLetter;
            
            console.log('Admin authenticated successfully:', adminData);
        }

        function loadAdminData() {
            // This function can be expanded to load admin-specific settings
            console.log('Admin data loaded:', adminData);
        }

        function loadAllApplicants() {
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            allApplicants = [];
            
            registeredUsers.forEach(user => {
                if (user.applications && user.applications.length > 0) {
                    user.applications.forEach(application => {
                        if (application.status !== 'cancelled') {
                            const applicant = {
                                ...user,
                                application: application,
                                applicationId: application.applicationId,
                                program: application.program,
                                status: application.status,
                                submittedDate: application.submittedDate,
                                documents: application.documents || {},
                                exam: application.exam || { taken: false }
                            };
                            allApplicants.push(applicant);
                        }
                    });
                }
            });
            
            filteredApplicants = [...allApplicants];
            updateNotificationBadges();
            console.log('Loaded applicants:', allApplicants.length);
        }

        function updateDashboard() {
            updateStatistics();
            loadRecentApplications();
        }

        function updateStatistics() {
            // Calculate statistics
            const total = allApplicants.length;
            const pending = allApplicants.filter(app => 
                app.status === 'pending' || app.status === 'under-review' || 
                app.status === 'documents-completed' || app.status === 'exam-completed'
            ).length;
            const approved = allApplicants.filter(app => app.status === 'accepted').length;
            const rejected = allApplicants.filter(app => app.status === 'rejected').length;
            
            // Update UI
            document.getElementById('totalApplications').textContent = total;
            document.getElementById('pendingReview').textContent = pending;
            document.getElementById('approved').textContent = approved;
            document.getElementById('rejected').textContent = rejected;
        }

        function loadRecentApplications() {
            const tbody = document.getElementById('recentApplicationsBody');
            tbody.innerHTML = '';
            
            // Get recent applications (last 10)
            const recentApps = [...allApplicants]
                .sort((a, b) => new Date(b.submittedDate || 0) - new Date(a.submittedDate || 0))
                .slice(0, 10);
            
            if (recentApps.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-state">
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
                    <td>${applicant.submittedDate ? new Date(applicant.submittedDate).toLocaleDateString() : 'N/A'}</td>
                    <td><span class="status-badge badge-${getStatusClass(applicant.status)}">${getStatusText(applicant.status)}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon btn-view" onclick="viewApplicant('${applicant.applicationId}')" title="View Details">👁️</button>
                            ${applicant.status !== 'accepted' && applicant.status !== 'rejected' ? `
                                <button class="btn-icon btn-approve" onclick="approveApplication('${applicant.applicationId}')" title="Approve">✅</button>
                                <button class="btn-icon btn-reject" onclick="rejectApplication('${applicant.applicationId}')" title="Reject">❌</button>
                            ` : ''}
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        function loadApplicantsTable() {
            const tbody = document.getElementById('applicantsTableBody');
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
                // Count uploaded documents
                const uploadedDocs = applicant.documents ? 
                    Object.values(applicant.documents).filter(doc => doc.uploaded).length : 0;
                const totalDocs = 6; // Hardcoded based on your system
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${applicant.applicationId || 'N/A'}</td>
                    <td>${applicant.personal.firstName} ${applicant.personal.lastName}</td>
                    <td>${applicant.personal.email}</td>
                    <td>${getProgramName(applicant.program) || 'N/A'}</td>
                    <td>${applicant.submittedDate ? new Date(applicant.submittedDate).toLocaleDateString() : 'N/A'}</td>
                    <td>${uploadedDocs}/${totalDocs}</td>
                    <td>${applicant.exam.taken ? `${applicant.exam.score}%` : 'Not Taken'}</td>
                    <td><span class="status-badge badge-${getStatusClass(applicant.status)}">${getStatusText(applicant.status)}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon btn-view" onclick="viewApplicant('${applicant.applicationId}')" title="View Details">👁️</button>
                            ${applicant.status !== 'accepted' && applicant.status !== 'rejected' ? `
                                <button class="btn-icon btn-approve" onclick="approveApplication('${applicant.applicationId}')" title="Approve" ${applicant.status === 'accepted' ? 'disabled style="opacity: 0.5;"' : ''}>✅</button>
                                <button class="btn-icon btn-reject" onclick="rejectApplication('${applicant.applicationId}')" title="Reject" ${applicant.status === 'rejected' ? 'disabled style="opacity: 0.5;"' : ''}>❌</button>
                            ` : ''}
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        function loadDocumentsTable() {
            const tbody = document.getElementById('documentsTableBody');
            tbody.innerHTML = '';
            
            // Collect all documents from all applicants
            let allDocuments = [];
            
            filteredApplicants.forEach(applicant => {
                if (applicant.documents) {
                    Object.entries(applicant.documents).forEach(([docType, docData]) => {
                        if (docData.uploaded) {
                            allDocuments.push({
                                studentName: `${applicant.personal.firstName} ${applicant.personal.lastName}`,
                                docType: docData.type || docType,
                                fileName: docData.filename,
                                uploadDate: docData.lastModified || applicant.submittedDate,
                                status: docData.verified ? 'verified' : 'pending',
                                applicantId: applicant.applicationId,
                                docId: docType
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
                            <p>No documents uploaded yet</p>
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
                    <td>${doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : 'N/A'}</td>
                    <td><span class="status-badge ${doc.status === 'verified' ? 'badge-approved' : 'badge-pending'}">${doc.status === 'verified' ? 'Verified' : 'Pending'}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon btn-view" onclick="viewDocument('${doc.applicantId}', '${doc.docId}')" title="View Document">👁️</button>
                            <button class="btn-icon btn-approve" onclick="verifyDocument('${doc.applicantId}', '${doc.docId}')" ${doc.status === 'verified' ? 'disabled' : ''} title="Verify">✅</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        function loadExamResults() {
            const tbody = document.getElementById('examResultsBody');
            tbody.innerHTML = '';
            
            // Filter applicants who have taken exam
            const examTakers = filteredApplicants.filter(app => app.exam && app.exam.taken);
            
            if (examTakers.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-state">
                            <div class="empty-state-icon">💯</div>
                            <p>No exam results available</p>
                        </td>
                    </tr>
                `;
                updateExamStats(0, 0, 0, 0);
                return;
            }
            
            // Calculate exam statistics
            const totalExams = examTakers.length;
            const passedExams = examTakers.filter(app => app.exam.passed).length;
            const passRate = Math.round((passedExams / totalExams) * 100);
            const avgScore = Math.round(examTakers.reduce((sum, app) => sum + app.exam.score, 0) / totalExams);
            const topScore = Math.max(...examTakers.map(app => app.exam.score));
            
            updateExamStats(totalExams, passRate, avgScore, topScore);
            
            // Populate table
            examTakers.forEach(applicant => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${applicant.personal.firstName} ${applicant.personal.lastName}</td>
                    <td>${getProgramName(applicant.program) || 'N/A'}</td>
                    <td>${applicant.exam.score}%</td>
                    <td><span class="status-badge ${applicant.exam.passed ? 'badge-approved' : 'badge-rejected'}">${applicant.exam.passed ? 'Passed' : 'Failed'}</span></td>
                    <td>${applicant.exam.dateTaken ? new Date(applicant.exam.dateTaken).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="btn-icon btn-view" onclick="viewExamDetails('${applicant.applicationId}')" title="View Details">👁️</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        function updateExamStats(total, passRate, avgScore, topScore) {
            document.getElementById('totalExams').textContent = total;
            document.getElementById('passRate').textContent = `${passRate}%`;
            document.getElementById('avgScore').textContent = `${avgScore}%`;
            document.getElementById('topScore').textContent = `${topScore}%`;
        }

        // ===== FILTER FUNCTIONS =====
        function filterApplicants() {
            const programFilter = document.getElementById('filterProgram').value;
            const statusFilter = document.getElementById('filterStatus').value;
            const dateFrom = document.getElementById('filterDateFrom').value;
            const dateTo = document.getElementById('filterDateTo').value;
            const searchQuery = document.getElementById('applicantSearch').value.toLowerCase();
            
            filteredApplicants = allApplicants.filter(applicant => {
                // Program filter
                if (programFilter && applicant.program !== programFilter) return false;
                
                // Status filter
                if (statusFilter) {
                    if (statusFilter === 'pending' && !['pending', 'under-review', 'documents-completed', 'exam-completed'].includes(applicant.status)) return false;
                    if (statusFilter === 'approved' && applicant.status !== 'accepted') return false;
                    if (statusFilter === 'rejected' && applicant.status !== 'rejected') return false;
                    if (statusFilter === 'under-review' && applicant.status !== 'under-review') return false;
                }
                
                // Date range filter
                if (dateFrom && applicant.submittedDate) {
                    const submittedDate = new Date(applicant.submittedDate);
                    const fromDate = new Date(dateFrom);
                    if (submittedDate < fromDate) return false;
                }
                
                if (dateTo && applicant.submittedDate) {
                    const submittedDate = new Date(applicant.submittedDate);
                    const toDate = new Date(dateTo);
                    if (submittedDate > toDate) return false;
                }
                
                // Search filter
                if (searchQuery) {
                    const fullName = `${applicant.personal.firstName} ${applicant.personal.lastName}`.toLowerCase();
                    const email = applicant.personal.email.toLowerCase();
                    const appId = (applicant.applicationId || '').toLowerCase();
                    
                    if (!fullName.includes(searchQuery) && !email.includes(searchQuery) && !appId.includes(searchQuery)) {
                        return false;
                    }
                }
                
                return true;
            });
            
            // Reload tables based on current section
            const currentSection = document.querySelector('.content-section[style="display: block;"]').id;
            
            switch(currentSection) {
                case 'applicantsSection':
                    loadApplicantsTable();
                    break;
                case 'documentsSection':
                    loadDocumentsTable();
                    break;
                case 'examSection':
                    loadExamResults();
                    break;
            }
        }

        // ===== APPLICATION MANAGEMENT =====
        function viewApplicant(applicationId) {
            const applicant = allApplicants.find(app => app.applicationId === applicationId);
            if (!applicant) {
                alert('Applicant not found!');
                return;
            }
            
            // Format registration date
            const registrationDate = applicant.registrationDate || applicant.submittedDate;
            const formattedRegDate = registrationDate ? new Date(registrationDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'N/A';
            
            const modalContent = document.getElementById('applicantDetails');
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
                            <div class="detail-value">${formattedRegDate}</div>
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
                            <div class="detail-label">Date Applied:</div>
                            <div class="detail-value">${applicant.submittedDate ? new Date(applicant.submittedDate).toLocaleDateString() : 'N/A'}</div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Documents Status</h4>
                        <div class="documents-grid">
                            ${Object.entries(applicant.documents || {}).map(([key, doc]) => `
                                <div class="document-item ${doc.verified ? 'verified' : doc.uploaded ? '' : 'required'}">
                                    <div class="document-header">
                                        <div class="document-name">${doc.type || key}</div>
                                        <div class="document-actions">
                                            <span class="status-badge ${doc.verified ? 'badge-approved' : doc.uploaded ? 'badge-pending' : 'badge-rejected'}">
                                                ${doc.verified ? 'Verified' : doc.uploaded ? 'Pending' : 'Missing'}
                                            </span>
                                        </div>
                                    </div>
                                    ${doc.uploaded ? `<p style="margin-top: 10px; font-size: 12px;">File: ${doc.filename}</p>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    ${applicant.exam.taken ? `
                    <div class="detail-section">
                        <h4>Exam Results</h4>
                        <div class="exam-results">
                            <div class="exam-score">${applicant.exam.score}%</div>
                            <div class="exam-details">
                                <div class="detail-row">
                                    <div class="detail-label">Result:</div>
                                    <div class="detail-value">
                                        <span class="status-badge ${applicant.exam.passed ? 'badge-approved' : 'badge-rejected'}">
                                            ${applicant.exam.passed ? 'Passed' : 'Failed'}
                                        </span>
                                    </div>
                                </div>
                                <div class="detail-row">
                                    <div class="detail-label">Date Taken:</div>
                                    <div class="detail-value">${new Date(applicant.exam.dateTaken).toLocaleDateString()}</div>
                                </div>
                                <div class="detail-row">
                                    <div class="detail-label">Passing Score:</div>
                                    <div class="detail-value">${applicant.exam.passingScore || 75}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div style="margin-top: 30px; display: flex; gap: 15px; justify-content: center;">
                    ${applicant.status === 'accepted' || applicant.status === 'rejected' ? '' : `
                        <button class="btn-filter" onclick="approveApplication('${applicant.applicationId}', true)" style="background: var(--success);">
                            Approve Application
                        </button>
                        <button class="btn-filter" onclick="rejectApplication('${applicant.applicationId}', true)" style="background: var(--danger);">
                            Reject Application
                        </button>
                    `}
                    
                    <button class="btn-filter" onclick="closeModal()">
                        Close
                    </button>
                </div>
            `;
            
            document.getElementById('applicantModal').style.display = 'flex';
        }

        function approveApplication(applicationId, fromModal = false) {
            if (!confirm('Are you sure you want to approve this application?')) return;
            
            // Update application status in localStorage
            const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            let updated = false;
            
            users.forEach(user => {
                if (user.applications) {
                    user.applications.forEach(app => {
                        if (app.applicationId === applicationId) {
                            app.status = 'accepted';
                            app.adminReview = {
                                reviewDate: new Date().toISOString(),
                                reviewer: adminData.fullName || 'Admin',
                                decision: 'accepted',
                                notes: 'Application approved by administrator'
                            };
                            
                            // Add to timeline
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
                
                // Refresh data
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
            
            // Update application status in localStorage
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
                            
                            // Add to timeline
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
                
                // Refresh data
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

        // ===== DOCUMENT MANAGEMENT =====
        function verifyDocument(applicationId, documentId) {
            const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            let updated = false;
            
            users.forEach(user => {
                if (user.applications) {
                    user.applications.forEach(app => {
                        if (app.applicationId === applicationId && app.documents && app.documents[documentId]) {
                            app.documents[documentId].verified = true;
                            updated = true;
                        }
                    });
                }
            });
            
            if (updated) {
                localStorage.setItem('registeredUsers', JSON.stringify(users));
                loadAllApplicants();
                loadDocumentsTable();
                alert('Document verified successfully!');
            }
        }

        // ===== PROGRAM MANAGEMENT =====
        function editProgram(programId) {
            const programName = getProgramName(programId);
            const newSlots = prompt(`Enter new available slots for ${programName}:`, "50");
            
            if (newSlots && !isNaN(newSlots)) {
                alert(`Updated ${programName} slots to ${newSlots}`);
                // In a real implementation, you would update this in localStorage
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

            // Load section-specific content
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

        function getStatusText(status) {
            const statusMap = {
                'not-started': 'Not Started',
                'applied': 'Applied',
                'documents-completed': 'Documents Completed',
                'exam-completed': 'Exam Completed',
                'pending': 'Pending Review',
                'under-review': 'Under Review',
                'accepted': 'Approved',
                'rejected': 'Rejected'
            };
            return statusMap[status] || status;
        }

        function getStatusClass(status) {
            const classMap = {
                'not-started': 'pending',
                'applied': 'pending',
                'documents-completed': 'pending',
                'exam-completed': 'pending',
                'pending': 'pending',
                'under-review': 'under-review',
                'accepted': 'approved',
                'rejected': 'rejected'
            };
            return classMap[status] || 'pending';
        }

        function updateNotificationBadges() {
            // Count pending applications
            const pendingApps = allApplicants.filter(app => 
                app.status === 'pending' || app.status === 'under-review' || 
                app.status === 'documents-completed' || app.status === 'exam-completed'
            ).length;
            
            // Count unverified documents
            let unverifiedDocs = 0;
            allApplicants.forEach(applicant => {
                if (applicant.documents) {
                    Object.values(applicant.documents).forEach(doc => {
                        if (doc.uploaded && !doc.verified) {
                            unverifiedDocs++;
                        }
                    });
                }
            });
            
            document.getElementById('applicantsNotification').textContent = pendingApps;
            document.getElementById('documentsNotification').textContent = unverifiedDocs;
        }

        function closeModal() {
            document.getElementById('applicantModal').style.display = 'none';
            document.getElementById('documentModal').style.display = 'none';
        }

        function logout() {
            sessionStorage.clear();
            window.location.href = 'login.html';
        }

        function setupEventListeners() {
            // Global search
            document.getElementById('globalSearch').addEventListener('input', function(e) {
                const query = e.target.value.toLowerCase();
                if (query.length >= 2) {
                    showSection('applicants');
                    document.getElementById('applicantSearch').value = query;
                    filterApplicants();
                }
            });
            
            // Applicant search
            document.getElementById('applicantSearch').addEventListener('input', filterApplicants);
            
            // Filter controls
            document.getElementById('filterProgram').addEventListener('change', filterApplicants);
            document.getElementById('filterStatus').addEventListener('change', filterApplicants);
            document.getElementById('filterDateFrom').addEventListener('change', filterApplicants);
            document.getElementById('filterDateTo').addEventListener('change', filterApplicants);
        }

        // Helper function to refresh current view
        function refreshCurrentView() {
            const currentSection = document.querySelector('.content-section[style*="display: block"]').id;
            
            if (currentSection === 'overviewSection') {
                loadRecentApplications();
            } else if (currentSection === 'applicantsSection') {
                loadApplicantsTable();
            } else if (currentSection === 'documentsSection') {
                loadDocumentsTable();
            } else if (currentSection === 'examSection') {
                loadExamResults();
            }
        }

        // ===== REPORTS FUNCTIONS =====
        function generateReport(reportType) {
            let reportData = {};
            let reportTitle = '';
            
            switch(reportType) {
                case 'applicantsPerProgram':
                    reportTitle = 'Applicants Per Program Report';
                    const programCounts = {};
                    allApplicants.forEach(app => {
                        const program = getProgramName(app.program) || 'Unknown';
                        programCounts[program] = (programCounts[program] || 0) + 1;
                    });
                    reportData = programCounts;
                    break;
                    
                case 'applicationStatus':
                    reportTitle = 'Application Status Report';
                    const statusCounts = {};
                    allApplicants.forEach(app => {
                        const status = getStatusText(app.status);
                        statusCounts[status] = (statusCounts[status] || 0) + 1;
                    });
                    reportData = statusCounts;
                    break;
                    
                case 'examPerformance':
                    reportTitle = 'Exam Performance Report';
                    const examTakers = allApplicants.filter(app => app.exam && app.exam.taken);
                    const passed = examTakers.filter(app => app.exam.passed).length;
                    const failed = examTakers.length - passed;
                    const avgScore = examTakers.length > 0 ? 
                        Math.round(examTakers.reduce((sum, app) => sum + app.exam.score, 0) / examTakers.length) : 0;
                    
                    reportData = {
                        'Total Exams Taken': examTakers.length,
                        'Passed': passed,
                        'Failed': failed,
                        'Pass Rate': `${Math.round((passed / examTakers.length) * 100) || 0}%`,
                        'Average Score': `${avgScore}%`
                    };
                    break;
                    
                case 'documentStatus':
                    reportTitle = 'Document Status Report';
                    let uploaded = 0, verified = 0, missing = 0;
                    
                    allApplicants.forEach(applicant => {
                        if (applicant.documents) {
                            Object.values(applicant.documents).forEach(doc => {
                                if (doc.uploaded) {
                                    uploaded++;
                                    if (doc.verified) verified++;
                                } else {
                                    missing++;
                                }
                            });
                        }
                    });
                    
                    reportData = {
                        'Total Documents': uploaded + missing,
                        'Uploaded': uploaded,
                        'Verified': verified,
                        'Pending Verification': uploaded - verified,
                        'Missing': missing
                    };
                    break;
            }
            
            // Display report in modal
            const modalContent = document.getElementById('applicantDetails');
            modalContent.innerHTML = `
                <h3 style="color: var(--primary-blue); margin-bottom: 20px;">${reportTitle}</h3>
                <p style="color: var(--medium-gray); margin-bottom: 30px;">Generated on ${new Date().toLocaleDateString()}</p>
                
                <div style="background: var(--light-blue); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    ${Object.entries(reportData).map(([key, value]) => `
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.5);">
                            <span style="font-weight: 600; color: var(--dark-gray);">${key}:</span>
                            <span style="color: var(--primary-blue); font-weight: bold;">${value}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <button class="btn-filter" onclick="exportReportData('${reportType}')" style="background: var(--success);">
                        Export Report
                    </button>
                    <button class="btn-filter" onclick="closeModal()">
                        Close
                    </button>
                </div>
            `;
            
            document.getElementById('applicantModal').style.display = 'flex';
        }

        function exportReport(format) {
            alert(`${format.toUpperCase()} export feature would be implemented here.`);
            // Implementation would require additional libraries like jsPDF or SheetJS
        }

        function exportReportData(reportType) {
            // Simple export to JSON
            const data = { reportType, data: getReportData(reportType), generated: new Date().toISOString() };
            const dataStr = JSON.stringify(data, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `${reportType}_${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        }

        function getReportData(reportType) {
            // Return the data for the report
            switch(reportType) {
                case 'applicantsPerProgram':
                    const programCounts = {};
                    allApplicants.forEach(app => {
                        const program = getProgramName(app.program) || 'Unknown';
                        programCounts[program] = (programCounts[program] || 0) + 1;
                    });
                    return programCounts;
                    
                case 'applicationStatus':
                    const statusCounts = {};
                    allApplicants.forEach(app => {
                        const status = getStatusText(app.status);
                        statusCounts[status] = (statusCounts[status] || 0) + 1;
                    });
                    return statusCounts;
            }
            return {};
        }

        // ===== DEBUG FUNCTIONS =====
        window.debugAdmin = function() {
            console.log('=== ADMIN DEBUG INFO ===');
            console.log('Current admin:', adminData);
            console.log('All applicants:', allApplicants);
            console.log('Filtered applicants:', filteredApplicants);
            console.log('Session storage:', {
                isAdminLoggedIn: sessionStorage.getItem('isAdminLoggedIn'),
                adminUsername: sessionStorage.getItem('adminUsername'),
                userType: sessionStorage.getItem('userType')
            });
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
                    status: 'pending',
                    submittedDate: new Date().toISOString(),
                    documents: {
                        picture: { uploaded: true, filename: 'id_picture.jpg', verified: false, type: '2x2 ID Picture' },
                        birthcert: { uploaded: true, filename: 'birth_cert.pdf', verified: true, type: 'Birth Certificate' },
                        reportcard: { uploaded: true, filename: 'report_card.pdf', verified: false, type: 'Report Card' },
                        goodmoral: { uploaded: false, filename: null, verified: false, type: 'Certificate of Good Moral Character' },
                        tor: { uploaded: false, filename: null, verified: false, type: 'Transcript of Records (TOR)' },
                        diploma: { uploaded: false, filename: null, verified: false, type: 'High School Diploma' }
                    },
                    exam: { taken: true, score: 85, passed: true, dateTaken: new Date().toISOString() }
                }],
                registrationDate: new Date().toISOString()
            };
            
            const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            existingUsers.push(testAccount);
            localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
            
            loadAllApplicants();
            updateDashboard();
            alert('✅ Test student created with application!');
        };