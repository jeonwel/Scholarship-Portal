// ===== MODAL FUNCTIONS =====
function showModal(type, title, message, onConfirm = null) {
    const modalContainer = document.getElementById('modalContainer');
    
    let icon = 'ℹ️';
    let confirmText = 'OK';
    let cancelText = 'Cancel';
    
    switch(type) {
        case 'info':
            icon = 'ℹ️';
            break;
        case 'warning':
            icon = '⚠️';
            break;
        case 'success':
            icon = '✅';
            break;
        case 'error':
            icon = '❌';
            break;
        case 'confirm':
            icon = '❓';
            confirmText = 'Yes';
            cancelText = 'No';
            break;
    }
    
    const modalHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="modal-icon">${icon}</div>
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                ${type === 'confirm' ? 
                    `<button class="btn btn-outline" onclick="closeModal()">${cancelText}</button>
                     <button class="btn btn-primary" onclick="handleConfirm()">${confirmText}</button>` :
                    `<button class="btn btn-primary" onclick="closeModal()">${confirmText}</button>`
                }
            </div>
        </div>
    `;
    
    modalContainer.innerHTML = modalHTML;
    modalContainer.classList.add('active');
    
    // Store the callback function
    if (onConfirm) {
        modalContainer.dataset.confirmCallback = 'true';
        window.handleConfirm = function() {
            closeModal();
            onConfirm();
        };
    }
    
    // Close modal when clicking outside
    modalContainer.addEventListener('click', function(e) {
        if (e.target === modalContainer) {
            closeModal();
        }
    });
}

function closeModal() {
    const modalContainer = document.getElementById('modalContainer');
    modalContainer.classList.remove('active');
    // Clean up callback
    if (window.handleConfirm) {
        delete window.handleConfirm;
    }
}

// ===== SMOOTH SCROLL FUNCTION =====
function smoothScroll(targetId) {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
        window.scrollTo({
            top: targetElement.offsetTop - 80,
            behavior: 'smooth'
        });
        
        // Close mobile menu if open
        const navMenu = document.getElementById('navMenu');
        navMenu.classList.remove('active');
        
        // Update active navigation link
        updateActiveNavLink(targetId);
        
        return false;
    }
}

// ===== PROGRAM APPLICATION FUNCTION =====
function applyForProgram(program) {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    if (isLoggedIn === 'true') {
        window.location.href = `apply.html?program=${program}`;
    } else {
        showModal('warning', 'Login Required', 
            'Please login first to apply for this program. You will be redirected to the login page.',
            function() {
                window.location.href = 'login.html';
            }
        );
    }
}

// ===== ACTIVE NAVIGATION LINK MANAGEMENT =====
function updateActiveNavLink(targetId) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        
        // Set active based on scroll position or clicked link
        const href = link.getAttribute('href');
        if (href === `#${targetId}` || href === 'index.html' && targetId === 'home') {
            link.classList.add('active');
        }
    });
}

// Listen for scroll to update active nav link
window.addEventListener('scroll', function() {
    const sections = ['programs', 'cta', 'footer'];
    const scrollPosition = window.scrollY + 100;
    
    for (const sectionId of sections) {
        const section = document.getElementById(sectionId);
        if (section) {
            if (scrollPosition >= section.offsetTop && 
                scrollPosition < section.offsetTop + section.offsetHeight) {
                updateActiveNavLink(sectionId);
                break;
            }
        }
    }
});

// ===== AUTHENTICATION FUNCTIONS =====
function updateAuthButtons() {
    const authButtons = document.getElementById('authButtons');
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const username = sessionStorage.getItem('username');
    const userType = sessionStorage.getItem('userType');
    
    if (isLoggedIn === 'true' && username) {
        if (userType === 'admin') {
            authButtons.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color: #1e3c72; font-weight: 600;">👑 ${username}</span>
                    <a href="admin-dashboard.html" class="btn btn-outline">Admin Panel</a>
                    <a href="#" class="btn btn-primary" onclick="confirmLogout()">Logout</a>
                </div>
            `;
        } else {
            authButtons.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color: #1e3c72; font-weight: 600;">👤 ${username}</span>
                    <a href="student-dashboard.html" class="btn btn-outline">Student Panel</a>
                    <a href="#" class="btn btn-primary" onclick="confirmLogout()">Logout</a>
                </div>
            `;
        }
    } else {
        authButtons.innerHTML = `
            <a href="login.html" class="btn btn-outline">Login</a>
            <a href="register.html" class="btn btn-primary">Register</a>
        `;
    }
}

function updateWelcomeMessage() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const username = sessionStorage.getItem('username');
    const fullName = sessionStorage.getItem('fullName');
    
    if (isLoggedIn === 'true' && username) {
        const welcomeElement = document.getElementById('welcomeMessage');
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome back, ${fullName || username}!`;
        }
    }
}

function confirmLogout() {
    showModal('confirm', 'Confirm Logout', 
        'Are you sure you want to logout?',
        logout
    );
}

function logout() {
    sessionStorage.clear();
    localStorage.removeItem('users');
    showModal('success', 'Logged Out', 'You have been successfully logged out.', function() {
        window.location.reload();
    });
}

// ===== MOBILE MENU FUNCTIONS =====
function toggleMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
}

document.addEventListener('click', function(event) {
    const navMenu = document.getElementById('navMenu');
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    
    if (!navMenu.contains(event.target) && !mobileBtn.contains(event.target)) {
        navMenu.classList.remove('active');
    }
});

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', function() {
    updateWelcomeMessage();
    updateAuthButtons();
    
    // Set Home as active by default
    if (window.location.pathname.endsWith('index.html') || 
        window.location.pathname.endsWith('/')) {
        updateActiveNavLink('home');
    }
    
    // Close modal on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});