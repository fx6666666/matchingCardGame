const gameBoard = document.getElementById('gameBoard');
const timerCounter = document.getElementById('timer');
const movesCounter = document.getElementById('moves');
const matchesCounter = document.getElementById('matches');
const restartBtn = document.getElementById('restartBtn');
const changeDifficultyBtn = document.getElementById('changeDifficultyBtn');
const difficultySelect = document.getElementById('difficultySelect');
const gameArea = document.getElementById('gameArea');
const winModal = document.getElementById('winModal');
const fireworksCanvas = document.getElementById('fireworksCanvas');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

const allFruits = [
    { name: 'apple', emoji: '🍎' },
    { name: 'orange', emoji: '🍊' },
    { name: 'banana', emoji: '🍌' },
    { name: 'grape', emoji: '🍇' },
    { name: 'watermelon', emoji: '🍉' },
    { name: 'strawberry', emoji: '🍓' },
    { name: 'peach', emoji: '🍑' },
    { name: 'cherry', emoji: '🍒' },
    { name: 'lemon', emoji: '🍋' },
    { name: 'kiwi', emoji: '🥝' },
    { name: 'pineapple', emoji: '🍍' },
    { name: 'mango', emoji: '🥭' },
    { name: 'pear', emoji: '🍐' },
    { name: 'plum', emoji: '🍑' },
    { name: 'coconut', emoji: '🥥' },
    { name: 'blueberry', emoji: '🫐' },
    { name: 'apricot', emoji: '🍑' },
    { name: 'raspberry', emoji: '🫐' }
];

let cards = [];
let flippedCards = [];
let moves = 0;
let matches = 0;
let isProcessing = false;
let seconds = 0;
let timerInterval = null;
let gridSize = 4;
let audioContext = null;
let isMemorizing = false;
let memorizeSeconds = 0;
let memorizeTimerInterval = null;
let currentMemorizeTime = 5;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    initAudio();
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'flip') {
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'match') {
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function startTimer() {
    timerInterval = setInterval(() => {
        seconds++;
        timerCounter.textContent = formatTime(seconds);
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function createCards() {
    cards = [];
    const totalCards = gridSize * gridSize;
    const pairsNeeded = Math.floor(totalCards / 2);
    const hasExtraCard = totalCards % 2 === 1;
    const selectedFruits = allFruits.slice(0, pairsNeeded);
    
    selectedFruits.forEach(fruit => {
        cards.push({ ...fruit, id: `${fruit.name}-1` });
        cards.push({ ...fruit, id: `${fruit.name}-2` });
    });
    
    if (hasExtraCard) {
        cards.push({ ...selectedFruits[0], id: `${selectedFruits[0].name}-3` });
    }
    
    cards = shuffleArray(cards);
}

function renderBoard() {
    gameBoard.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const headerHeight = 80;
    const statsHeight = 60;
    const buttonsHeight = 80;
    const availableHeight = screenHeight - headerHeight - statsHeight - buttonsHeight - 60;
    const availableWidth = screenWidth - 80;
    const maxBoardSize = Math.min(availableWidth, availableHeight);
    const cardSize = Math.floor((maxBoardSize - (gridSize + 1) * 10) / gridSize);
    const boardSize = cardSize * gridSize + (gridSize + 1) * 10;
    
    gameBoard.style.width = `${boardSize}px`;
    gameBoard.style.height = `${boardSize}px`;
    
    gameBoard.innerHTML = '';
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.id = card.id;
        cardElement.dataset.name = card.name;
        cardElement.innerHTML = `
            <div class="card-inner">
                <div class="card-back"></div>
                <div class="card-front">
                    <span style="font-size: ${cardSize * 0.5}px;">${card.emoji}</span>
                </div>
            </div>
        `;
        cardElement.addEventListener('click', flipCard);
        gameBoard.appendChild(cardElement);
    });
}

function flipCard(event) {
    if (isProcessing) return;
    
    const card = event.currentTarget;
    if (card.classList.contains('flipped') || card.classList.contains('matched')) {
        return;
    }
    
    if (!timerInterval) {
        startTimer();
    }
    
    card.classList.add('flipped');
    flippedCards.push(card);
    
    if (flippedCards.length === 2) {
        moves++;
        movesCounter.textContent = moves;
        checkMatch();
    }
}

function checkMatch() {
    isProcessing = true;
    const [card1, card2] = flippedCards;
    const name1 = card1.dataset.name;
    const name2 = card2.dataset.name;
    
    if (name1 === name2) {
        playSound('match');
        setTimeout(() => {
            card1.classList.add('matched');
            card2.classList.add('matched');
            matches++;
            matchesCounter.textContent = matches;
            flippedCards = [];
            isProcessing = false;
            
            const totalPairs = Math.ceil(gridSize * gridSize / 2);
            if (matches === totalPairs) {
                stopTimer();
                showWinModal();
            }
        }, 500);
    } else {
        setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            flippedCards = [];
            isProcessing = false;
        }, 1000);
    }
}

let fireworksAnimationId = null;
let fireworksParticles = [];

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = {
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10
        };
        this.alpha = 1;
        this.friction = 0.98;
        this.gravity = 0.05;
        this.size = Math.random() * 4 + 2;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
    
    update() {
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.velocity.y += this.gravity;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.01;
    }
}

class Firework {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.velocity = { x: 0, y: -8 - Math.random() * 4 };
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        this.exploded = false;
        this.particles = [];
    }
    
    draw(ctx) {
        if (!this.exploded) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        
        this.particles.forEach(particle => particle.draw(ctx));
    }
    
    update() {
        if (!this.exploded) {
            this.velocity.y += 0.15;
            this.y += this.velocity.y;
            
            if (this.velocity.y >= 0) {
                this.explode();
            }
        }
        
        this.particles.forEach(particle => particle.update());
        this.particles = this.particles.filter(particle => particle.alpha > 0);
    }
    
    explode() {
        this.exploded = true;
        for (let i = 0; i < 80; i++) {
            this.particles.push(new Particle(this.x, this.y, this.color));
        }
    }
}

function animateFireworks() {
    const ctx = fireworksCanvas.getContext('2d');
    ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    
    fireworksParticles.forEach(firework => {
        firework.draw(ctx);
        firework.update();
    });
    
    fireworksParticles = fireworksParticles.filter(firework => {
        if (firework.exploded) {
            return firework.particles.length > 0;
        }
        return true;
    });
    
    if (fireworksParticles.length > 0) {
        fireworksAnimationId = requestAnimationFrame(animateFireworks);
    }
}

function startFireworks() {
    fireworksCanvas.width = winModal.offsetWidth;
    fireworksCanvas.height = winModal.offsetHeight;
    fireworksParticles = [];
    
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const x = Math.random() * fireworksCanvas.width;
            const y = fireworksCanvas.height * 0.3 + Math.random() * fireworksCanvas.height * 0.3;
            fireworksParticles.push(new Firework(x, y));
        }, i * 300);
    }
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const x = Math.random() * fireworksCanvas.width;
            const y = fireworksCanvas.height * 0.3 + Math.random() * fireworksCanvas.height * 0.3;
            fireworksParticles.push(new Firework(x, y));
        }, 1500 + i * 100);
    }
    
    animateFireworks();
}

function showWinModal() {
    document.getElementById('modalDifficulty').textContent = `${gridSize}×${gridSize}`;
    document.getElementById('modalTime').textContent = formatTime(seconds);
    document.getElementById('modalMoves').textContent = moves;
    
    winModal.classList.add('active');
    startFireworks();
}

function hideWinModal() {
    winModal.classList.remove('active');
    if (fireworksAnimationId) {
        cancelAnimationFrame(fireworksAnimationId);
        fireworksAnimationId = null;
    }
    fireworksParticles = [];
}

function startGame(size) {
    gridSize = size;
    difficultySelect.style.display = 'none';
    gameArea.style.display = 'block';
    restartGame();
}

function showCardsForSeconds(memorizeTime) {
    isMemorizing = true;
    memorizeSeconds = memorizeTime;
    document.getElementById('memorizeTimer').style.display = 'block';
    document.getElementById('memorizeCountdown').textContent = memorizeSeconds;
    
    document.querySelectorAll('.card').forEach(card => {
        card.classList.add('flipped');
        card.style.pointerEvents = 'none';
    });
    
    memorizeTimerInterval = setInterval(() => {
        memorizeSeconds--;
        document.getElementById('memorizeCountdown').textContent = memorizeSeconds;
        
        if (memorizeSeconds <= 0) {
            stopMemorizeTimer();
            document.querySelectorAll('.card').forEach(card => {
                card.classList.remove('flipped');
                card.style.pointerEvents = 'auto';
            });
            document.getElementById('memorizeTimer').style.display = 'none';
            isMemorizing = false;
        }
    }, 1000);
}

function stopMemorizeTimer() {
    if (memorizeTimerInterval) {
        clearInterval(memorizeTimerInterval);
        memorizeTimerInterval = null;
    }
}

function restartGame(memorizeTime = null) {
    console.log('restartGame called');
    flippedCards = [];
    moves = 0;
    matches = 0;
    seconds = 0;
    isProcessing = false;
    stopTimer();
    stopMemorizeTimer();
    timerCounter.textContent = formatTime(seconds);
    movesCounter.textContent = moves;
    matchesCounter.textContent = matches;
    createCards();
    renderBoard();
    
    document.querySelectorAll('.card').forEach(card => {
        card.style.pointerEvents = 'auto';
        card.classList.remove('flipped', 'matched');
    });
    
    const timeToMemorize = memorizeTime !== null && memorizeTime !== undefined && typeof memorizeTime === 'number' ? memorizeTime : currentMemorizeTime;
    
    setTimeout(() => {
        showCardsForSeconds(timeToMemorize);
    }, 100);
}

function goToDifficultySelect() {
    difficultySelect.style.display = 'block';
    gameArea.style.display = 'none';
    stopTimer();
}

let selectedGridSize = 4;
let selectedMemorizeTime = 5;
const timeModal = document.getElementById('timeModal');

function showTimeModal() {
    timeModal.style.display = 'flex';
}

function hideTimeModal() {
    timeModal.style.display = 'none';
}

document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedGridSize = parseInt(btn.dataset.size);
        showTimeModal();
    });
});

document.querySelectorAll('.modal-time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedMemorizeTime = parseInt(btn.dataset.time);
        currentMemorizeTime = selectedMemorizeTime;
        gridSize = selectedGridSize;
        hideTimeModal();
        difficultySelect.style.display = 'none';
        gameArea.style.display = 'block';
        restartGame(selectedMemorizeTime);
    });
});

restartBtn.addEventListener('click', () => {
    restartGame(currentMemorizeTime);
});
changeDifficultyBtn.addEventListener('click', goToDifficultySelect);
playAgainBtn.addEventListener('click', () => {
    hideWinModal();
    restartGame();
});
closeModalBtn.addEventListener('click', () => {
    hideWinModal();
    goToDifficultySelect();
});