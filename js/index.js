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
        alert('Please login first to apply for this program.');
        window.location.href = 'login.html';
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
                    <a href="#" class="btn btn-primary" onclick="logout()">Logout</a>
                </div>
            `;
        } else {
            authButtons.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color: #1e3c72; font-weight: 600;">👤 ${username}</span>
                    <a href="dashboard.html" class="btn btn-outline">Dashboard</a>
                    <a href="#" class="btn btn-primary" onclick="logout()">Logout</a>
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

function logout() {
    sessionStorage.clear();
    window.location.reload();
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
});