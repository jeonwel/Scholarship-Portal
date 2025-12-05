       // XML data containing all questions
        const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<exam>
    <question>
        <text>What is the capital of France?</text>
        <options>
            <option correct="false">London</option>
            <option correct="true">Paris</option>
            <option correct="false">Berlin</option>
            <option correct="false">Madrid</option>
        </options>
    </question>
    <question>
        <text>What is 2 + 2?</text>
        <options>
            <option correct="false">3</option>
            <option correct="true">4</option>
            <option correct="false">5</option>
            <option correct="false">6</option>
        </options>
    </question>
    <question>
        <text>Which planet is known as the Red Planet?</text>
        <options>
            <option correct="false">Venus</option>
            <option correct="false">Jupiter</option>
            <option correct="true">Mars</option>
            <option correct="false">Saturn</option>
        </options>
    </question>
    <question>
        <text>What is the largest ocean on Earth?</text>
        <options>
            <option correct="false">Atlantic Ocean</option>
            <option correct="true">Pacific Ocean</option>
            <option correct="false">Indian Ocean</option>
            <option correct="false">Arctic Ocean</option>
        </options>
    </question>
    <question>
        <text>How many continents are there?</text>
        <options>
            <option correct="false">5</option>
            <option correct="false">6</option>
            <option correct="true">7</option>
            <option correct="false">8</option>
        </options>
    </question>
    <question>
        <text>What is the boiling point of water at sea level?</text>
        <options>
            <option correct="false">90°C</option>
            <option correct="true">100°C</option>
            <option correct="false">110°C</option>
            <option correct="false">120°C</option>
        </options>
    </question>
    <question>
        <text>Who painted the Mona Lisa?</text>
        <options>
            <option correct="false">Pablo Picasso</option>
            <option correct="false">Vincent van Gogh</option>
            <option correct="true">Leonardo da Vinci</option>
            <option correct="false">Michelangelo</option>
        </options>
    </question>
    <question>
        <text>What is the chemical symbol for gold?</text>
        <options>
            <option correct="false">Go</option>
            <option correct="false">Gd</option>
            <option correct="true">Au</option>
            <option correct="false">Ag</option>
        </options>
    </question>
    <question>
        <text>How many days are in a leap year?</text>
        <options>
            <option correct="false">364</option>
            <option correct="false">365</option>
            <option correct="true">366</option>
            <option correct="false">367</option>
        </options>
    </question>
    <question>
        <text>What is the smallest prime number?</text>
        <options>
            <option correct="false">0</option>
            <option correct="false">1</option>
            <option correct="true">2</option>
            <option correct="false">3</option>
        </options>
    </question>
    <question>
        <text>Which gas do plants absorb from the atmosphere?</text>
        <options>
            <option correct="false">Oxygen</option>
            <option correct="false">Nitrogen</option>
            <option correct="true">Carbon Dioxide</option>
            <option correct="false">Hydrogen</option>
        </options>
    </question>
    <question>
        <text>What is the speed of light approximately?</text>
        <options>
            <option correct="false">300,000 km/h</option>
            <option correct="true">300,000 km/s</option>
            <option correct="false">150,000 km/s</option>
            <option correct="false">500,000 km/s</option>
        </options>
    </question>
    <question>
        <text>How many sides does a hexagon have?</text>
        <options>
            <option correct="false">5</option>
            <option correct="true">6</option>
            <option correct="false">7</option>
            <option correct="false">8</option>
        </options>
    </question>
    <question>
        <text>What is the largest mammal in the world?</text>
        <options>
            <option correct="false">African Elephant</option>
            <option correct="true">Blue Whale</option>
            <option correct="false">Giraffe</option>
            <option correct="false">Polar Bear</option>
        </options>
    </question>
    <question>
        <text>In which year did World War II end?</text>
        <options>
            <option correct="false">1944</option>
            <option correct="true">1945</option>
            <option correct="false">1946</option>
            <option correct="false">1947</option>
        </options>
    </question>
    <question>
        <text>What is the primary language spoken in Brazil?</text>
        <options>
            <option correct="false">Spanish</option>
            <option correct="true">Portuguese</option>
            <option correct="false">English</option>
            <option correct="false">French</option>
        </options>
    </question>
</exam>`;

        let questions = [];
        let currentQuestion = 0;
        let userAnswers = [];
        let timerInterval;
        let timeLeft = 300; // 5 minutes in seconds
        const RESET_DAYS = 7;
        let currentUser = null;

        // Parse XML data
        function parseXML() {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlData, "text/xml");
            const questionNodes = xmlDoc.getElementsByTagName("question");

            for (let i = 0; i < questionNodes.length; i++) {
                const questionNode = questionNodes[i];
                const text = questionNode.getElementsByTagName("text")[0].textContent;
                const optionNodes = questionNode.getElementsByTagName("option");
                const options = [];

                for (let j = 0; j < optionNodes.length; j++) {
                    options.push({
                        text: optionNodes[j].textContent,
                        correct: optionNodes[j].getAttribute("correct") === "true"
                    });
                }

                questions.push({ text, options });
                userAnswers.push(null);
            }
        }

        // Get current logged-in user
        function getCurrentUser() {
            try {
                // Get username from session storage
                const username = sessionStorage.getItem('username');
                if (!username) {
                    console.error('No user logged in');
                    return null;
                }

                // Load user from localStorage
                const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                const user = users.find(u => u.account?.username === username);
                
                if (!user) {
                    console.error('User not found in registeredUsers');
                    return null;
                }
                
                return user;
            } catch (error) {
                console.error('Error getting current user:', error);
                return null;
            }
        }

        // Get user-specific exam data
        function getUserExamData() {
            try {
                const username = sessionStorage.getItem('username');
                if (!username) {
                    console.error('No username in sessionStorage');
                    return null;
                }
                
                // Load exam data from localStorage
                const examData = JSON.parse(localStorage.getItem('userExamData') || '{}');
                return examData[username] || null;
            } catch (error) {
                console.error('Error getting user exam data:', error);
                return null;
            }
        }

        // Save user-specific exam data
        function saveUserExamData(examData) {
            try {
                const username = sessionStorage.getItem('username');
                if (!username) {
                    console.error('No username in sessionStorage');
                    return false;
                }
                
                // Load existing exam data
                const allExamData = JSON.parse(localStorage.getItem('userExamData') || '{}');
                
                // Update this user's exam data
                allExamData[username] = examData;
                
                // Save back to localStorage
                localStorage.setItem('userExamData', JSON.stringify(allExamData));
                return true;
            } catch (error) {
                console.error('Error saving user exam data:', error);
                return false;
            }
        }

        // Check if exam is available for current user
        function checkExamAvailability() {
            try {
                // Check if user is logged in
                const username = sessionStorage.getItem('username');
                if (!username) {
                    alert('Please login first to take the exam.');
                    window.location.href = 'login.html';
                    return false;
                }

                // Get user's exam data
                const userExamData = getUserExamData();
                
                if (!userExamData) {
                    // User hasn't taken exam yet
                    return true;
                }

                // Check if 7 days have passed since last exam
                if (userExamData.completedAt) {
                    const completedDate = new Date(userExamData.completedAt);
                    const now = new Date();
                    const daysPassed = (now - completedDate) / (1000 * 60 * 60 * 24);
                    
                    if (daysPassed < RESET_DAYS) {
                        showLockedScreen(completedDate, userExamData);
                        return false;
                    }
                }
                return true;
            } catch (error) {
                console.error('Error checking exam availability:', error);
                return true; // Allow exam by default if error
            }
        }

        function showLockedScreen(completedDate, examData) {
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('lockedScreen').style.display = 'block';
            
            // Display last score
            if (examData.score !== undefined) {
                document.getElementById('lastScore').innerHTML = `
                    <h3>Your Last Score: ${examData.score.percentage}%</h3>
                    <p>Correct Answers: ${examData.score.correct} / ${examData.score.total}</p>
                    <p>Date Taken: ${new Date(examData.completedAt).toLocaleDateString()}</p>
                `;
            }
            
            updateCountdown(completedDate);
            setInterval(() => updateCountdown(completedDate), 1000);
        }

        function updateCountdown(completedDate) {
            const resetDate = new Date(completedDate);
            resetDate.setDate(resetDate.getDate() + RESET_DAYS);
            
            const now = new Date();
            const timeDiff = resetDate - now;
            
            if (timeDiff <= 0) {
                location.reload();
                return;
            }
            
            const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
            
            document.getElementById('countdownTime').textContent = 
                `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }

        function saveExamCompletion(correct, total, percentage) {
            try {
                const username = sessionStorage.getItem('username');
                if (!username) {
                    console.error('No username found for saving exam completion');
                    return false;
                }

                const examData = {
                    completedAt: new Date().toISOString(),
                    score: {
                        correct: correct,
                        total: total,
                        percentage: percentage
                    }
                };
                
                return saveUserExamData(examData);
            } catch (error) {
                console.error('Error saving exam completion:', error);
                return false;
            }
        }

        function startExam() {
            if (!checkExamAvailability()) return;
            
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('questionContainer').style.display = 'block';
            startTimer();
            displayQuestion();
        }

        function startTimer() {
            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();

                if (timeLeft <= 60) {
                    document.getElementById('timer').classList.add('warning');
                }

                if (timeLeft <= 0) {
                    endExam();
                }
            }, 1000);
        }

        function updateTimerDisplay() {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            document.getElementById('timer').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        function displayQuestion() {
            const question = questions[currentQuestion];
            document.getElementById('questionNumber').textContent = 
                `Question ${currentQuestion + 1} of ${questions.length}`;
            document.getElementById('questionText').textContent = question.text;

            const optionsList = document.getElementById('options');
            optionsList.innerHTML = '';

            question.options.forEach((option, index) => {
                const li = document.createElement('li');
                li.className = 'option';
                li.textContent = option.text;
                if (userAnswers[currentQuestion] === index) {
                    li.classList.add('selected');
                }
                li.onclick = () => selectOption(index);
                optionsList.appendChild(li);
            });

            document.getElementById('prevBtn').disabled = currentQuestion === 0;
            document.getElementById('nextBtn').textContent = 
                currentQuestion === questions.length - 1 ? 'Submit' : 'Next';
        }

        function selectOption(index) {
            userAnswers[currentQuestion] = index;
            const options = document.querySelectorAll('.option');
            options.forEach((opt, i) => {
                opt.classList.toggle('selected', i === index);
            });
        }

        function previousQuestion() {
            if (currentQuestion > 0) {
                currentQuestion--;
                displayQuestion();
            }
        }

        function nextQuestion() {
            if (currentQuestion < questions.length - 1) {
                currentQuestion++;
                displayQuestion();
            } else {
                endExam();
            }
        }

        function endExam() {
            clearInterval(timerInterval);
            document.getElementById('questionContainer').style.display = 'none';
            document.getElementById('resultsScreen').style.display = 'block';
            calculateScore();
        }

        function calculateScore() {
            let correct = 0;
            questions.forEach((question, index) => {
                const userAnswer = userAnswers[index];
                if (userAnswer !== null && question.options[userAnswer].correct) {
                    correct++;
                }
            });

            const percentage = ((correct / questions.length) * 100).toFixed(1);
            const passed = percentage >= 75;
            
            // Save exam completion with score (user-specific)
            saveExamCompletion(correct, questions.length, percentage);
            
            // Also save exam result to the user's application data
            saveExamToUserApplication(percentage, passed, correct, questions.length);
            
            // Save exam result to session storage for dashboard
            const examResult = {
                score: parseFloat(percentage),
                passed: passed,
                correct: correct,
                total: questions.length,
                dateTaken: new Date().toISOString(),
                applicationId: new URLSearchParams(window.location.search).get('applicationId')
            };
            sessionStorage.setItem('examResult', JSON.stringify(examResult));
            
            document.getElementById('score').textContent = `${correct} / ${questions.length}`;
            document.getElementById('scoreDetails').innerHTML = `
                <h3>Score: ${percentage}%</h3>
                <p>Correct Answers: ${correct}</p>
                <p>Wrong Answers: ${questions.length - correct}</p>
                <p>Time Taken: ${formatTime(300 - timeLeft)}</p>
                <p style="margin-top: 15px; padding: 10px; border-radius: 5px; background: ${passed ? '#e8f5e9' : '#ffebee'}; color: ${passed ? '#2e7d32' : '#c62828'};">
                    ${passed ? '✅ You passed the exam!' : '❌ Score below passing (75%)'}
                </p>
                <button class="btn btn-primary" style="margin-top: 20px;" onclick="returnToDashboard()">
                    Return to Dashboard
                </button>
            `;
        }
        
        function saveExamToUserApplication(percentage, passed, correct, total) {
            try {
                const username = sessionStorage.getItem('username');
                if (!username) return false;
                
                // Get current user data
                const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                const userIndex = users.findIndex(u => u.account?.username === username);
                
                if (userIndex === -1) return false;
                
                // Find active application
                const currentUser = users[userIndex];
                if (!currentUser.applications || currentUser.applications.length === 0) return false;
                
                const activeApplication = currentUser.applications.find(app => 
                    app.status && app.status !== 'cancelled' && !app.status.includes('rejected')
                );
                
                if (activeApplication) {
                    // Update exam data in application
                    activeApplication.exam = {
                        taken: true,
                        score: parseFloat(percentage),
                        passed: passed,
                        dateTaken: new Date().toISOString(),
                        maxScore: 100,
                        passingScore: 75,
                        details: {
                            correct: correct,
                            total: total,
                            percentage: percentage
                        }
                    };
                    
                    // Save updated user data
                    localStorage.setItem('registeredUsers', JSON.stringify(users));
                    console.log('Exam saved to user application');
                    return true;
                }
                
                return false;
            } catch (error) {
                console.error('Error saving exam to user application:', error);
                return false;
            }
        }
        
        function returnToDashboard() {
            window.location.href = 'student-dashboard.html';
        }

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        // Initialize
        parseXML();
        
        // Check exam availability on page load
        window.onload = function() {
            // Check if user is logged in
            const isLoggedIn = sessionStorage.getItem('isLoggedIn');
            const userType = sessionStorage.getItem('userType');
            
            if (isLoggedIn !== 'true' || userType !== 'student') {
                alert('Please login as a student to take the exam.');
                window.location.href = 'login.html';
                return;
            }
            
            checkExamAvailability();
        };