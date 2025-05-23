const player = document.getElementById('player');
const gameArea = document.getElementById('game-area');
const fireballContainer = document.getElementById('fireball-container');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('startButton');
const gameOverScreen = document.getElementById('game-over-screen');
const restartButton = document.getElementById('restartButton');

// NEW: Scoreboard DOM elements
const currentScoreDisplay = document.getElementById('current-score');
const finalScoreDisplay = document.getElementById('final-score');

// Game state variables
let isRunning = false;
let isJumping = false;
let isSliding = false;
let score = 0; // NEW: Initialize score variable

// Define the ground level in pixels from the bottom of the game area
const groundLevel = 90; // Your existing ground level from the provided code
let playerBottom = groundLevel;

let gravity = 3.5; // Your existing gravity
let jumpStrength = 50; // Your existing jump strength
let slideDuration = 600;
let gameSpeed = 5;
let animationFrameId;
let playerAnimationInterval;
let deadAnimationTimer;

// Character Animation Frame Counters
let currentRunFrame = 0;
let currentJumpFrame = 0;
let currentSlideFrame = 0;
let currentDeadFrame = 0;
const animationFrameRate = 100;

// Image paths (ensure these paths are correct relative to your script.js)
const runFrames = Array.from({ length: 10 }, (_, i) => `Run__${String(i).padStart(3, '0')}.png`);
const jumpFrames = Array.from({ length: 10 }, (_, i) => `Jump__${String(i).padStart(3, '0')}.png`);
const slideFrames = Array.from({ length: 10 }, (_, i) => `Slide__${String(i).padStart(3, '0')}.png`);
const deadFrames = Array.from({ length: 10 }, (_, i) => `Dead__${String(i).padStart(3, '0')}.png`);

// Preload images for smoother animation
function preloadImages(arr) {
    arr.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

preloadImages(runFrames);
preloadImages(jumpFrames);
preloadImages(slideFrames);
preloadImages(deadFrames);
preloadImages(['fire_ball.png', 'Background.jpg']);

// --- Character Animation Logic ---
let currentAnimationState = 'run';

function animatePlayer() {
    if (!isRunning && currentAnimationState !== 'dead') {
        clearInterval(playerAnimationInterval);
        return;
    }

    switch (currentAnimationState) {
        case 'run':
            if (!isJumping && !isSliding) {
                player.src = runFrames[currentRunFrame];
                currentRunFrame = (currentRunFrame + 1) % runFrames.length;
            }
            break;
        case 'jump':
            player.src = jumpFrames[currentJumpFrame];
            currentJumpFrame = (currentJumpFrame + 1) % jumpFrames.length;
            if (currentJumpFrame >= jumpFrames.length) {
                currentJumpFrame = jumpFrames.length - 1;
            }
            break;
        case 'slide':
            player.src = slideFrames[currentSlideFrame];
            currentSlideFrame = (currentSlideFrame + 1) % slideFrames.length;
            if (currentSlideFrame >= slideFrames.length) {
                currentSlideFrame = slideFrames.length - 1;
            }
            break;
        case 'dead':
            if (currentDeadFrame < deadFrames.length) {
                player.src = deadFrames[currentDeadFrame];
            }
            break;
    }
}

function startPlayerAnimationLoop() {
    clearInterval(playerAnimationInterval);
    playerAnimationInterval = setInterval(animatePlayer, animationFrameRate);
}


// --- Game Loop ---
function gameLoop() {
    if (!isRunning) return;

    // Apply gravity to player
    if (playerBottom > groundLevel) {
        playerBottom -= gravity;
        if (playerBottom < groundLevel) {
            playerBottom = groundLevel;
        }
        player.style.bottom = playerBottom + 'px';
        player.classList.add('player-jumping');

        if (playerBottom === groundLevel) {
            player.classList.remove('player-jumping');
            isJumping = false;
            if (!isSliding) {
                currentAnimationState = 'run';
                currentRunFrame = 0;
            }
        }
    } else if (playerBottom < groundLevel) { // Ensures player snaps to ground if somehow below it
        playerBottom = groundLevel;
        player.style.bottom = playerBottom + 'px';
        player.classList.remove('player-jumping');
        isJumping = false;
        if (!isSliding) {
            currentAnimationState = 'run';
            currentRunFrame = 0;
        }
    }


    // Move fireballs and check for collisions
    Array.from(fireballContainer.children).forEach(fireball => {
        let fireballLeft = parseInt(fireball.style.left);
        fireball.style.left = (fireballLeft - gameSpeed) + 'px';

        // Check if fireball has passed the player and hasn't been scored yet
        // Player's left edge is player.offsetLeft
        // Fireball's right edge is fireballLeft + fireball.offsetWidth
        if (fireballLeft + fireball.offsetWidth < player.offsetLeft && fireball.dataset.scored === 'false') {
            score += 10; // Add 10 points
            currentScoreDisplay.textContent = score; // Update displayed score
            fireball.dataset.scored = 'true'; // Mark as scored
        }

        // Remove fireball if off-screen
        if (fireballLeft + fireball.offsetWidth < 0) {
            fireball.remove();
        }

        // Collision detection
        if (checkCollision(player, fireball)) {
            console.log("COLLISION DETECTED!");
            gameOver();
            return; // Stop processing fireballs if game over
        }
    });

    if (isRunning) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// --- Player Actions ---
function jump() {
    if (!isJumping && !isSliding && isRunning) {
        isJumping = true;
        currentAnimationState = 'jump';
        currentJumpFrame = 0;
        player.classList.add('player-jumping');

        playerBottom += jumpStrength * 5;
        player.style.bottom = playerBottom + 'px';
    }
}

function slide() {
    if (!isSliding && !isJumping && isRunning) {
        isSliding = true;
        currentAnimationState = 'slide';
        currentSlideFrame = 0;
        player.classList.add('player-sliding');

        // Set the player's sprite to the first slide frame immediately
        player.src = slideFrames[0];

        const amountToSinkBelowGround = 30; // Your desired deeper slide
        playerBottom = groundLevel - amountToSinkBelowGround;
        player.style.bottom = playerBottom + 'px';

        setTimeout(() => {
            isSliding = false;
            player.classList.remove('player-sliding');
            player.style.height = '80px'; // Reset player's height to normal (standing)
            playerBottom = groundLevel; // Bring player back to ground level
            player.style.bottom = playerBottom + 'px';

            currentAnimationState = 'run';
            currentRunFrame = 0; // Reset run animation frame
        }, slideDuration);
    }
}


// --- Fireball Spawning ---
function createFireball() {
    if (!isRunning) return;

    const fireball = document.createElement('div');
    fireball.classList.add('fireball');
    fireball.style.left = gameArea.offsetWidth + 'px';
    fireball.dataset.scored = 'false'; // NEW: Initialize custom attribute for scoring

    const playerStandingHeight = 80;
    const playerSlidingHeight = 50;
    const fireballHeight = 50;

    let fireballBottom;
    const spawnType = Math.random();

    if (spawnType < 0.5) { // 'Jump over' fireball (lower)
        const minBottom = groundLevel + playerSlidingHeight + 5;
        const maxBottom = groundLevel + playerStandingHeight - (fireballHeight / 2) - 10;
        fireballBottom = Math.random() * (maxBottom - minBottom) + minBottom;
    } else { // 'Slide under' fireball (higher)
        const minBottom = groundLevel + playerStandingHeight + 10;
        const maxBottom = gameArea.offsetHeight - fireballHeight - 20;
        fireballBottom = Math.random() * (maxBottom - minBottom) + minBottom;
    }
    fireball.style.bottom = fireballBottom + 'px';

    fireballContainer.appendChild(fireball);
}

let fireballSpawnInterval;

function startFireballSpawning() {
    stopFireballSpawning();
    fireballSpawnInterval = setInterval(createFireball, 1500 + Math.random() * 1000);
}

function stopFireballSpawning() {
    clearInterval(fireballSpawnInterval);
}

// --- Collision Detection (Axis-Aligned Bounding Box) ---
function checkCollision(element1, element2) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    const collision = !(
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom ||
        rect1.right < rect2.left ||
        rect1.left > rect2.right
    );

    return collision;
}

// --- Game State Management ---
function startGame() {
    cancelAnimationFrame(animationFrameId);
    stopFireballSpawning();
    clearInterval(playerAnimationInterval);
    clearInterval(deadAnimationTimer);

    isRunning = true;
    isJumping = false;
    isSliding = false;
    score = 0; // NEW: Reset score for a new game
    currentScoreDisplay.textContent = score; // NEW: Update displayed score to 0

    currentRunFrame = 0;
    currentJumpFrame = 0;
    currentSlideFrame = 0;
    currentDeadFrame = 0;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    playerBottom = groundLevel;
    player.style.bottom = playerBottom + 'px';
    player.style.height = '80px';
    player.src = runFrames[0];
    player.classList.remove('player-dead', 'player-sliding', 'player-jumping');
    player.style.transform = 'scale(1)';

    fireballContainer.innerHTML = '';

    currentAnimationState = 'run';
    startPlayerAnimationLoop();
    startFireballSpawning();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    if (!isRunning) return;

    isRunning = false;
    console.log("Game Over initiated!");

    cancelAnimationFrame(animationFrameId);
    stopFireballSpawning();
    clearInterval(playerAnimationInterval);

    // NEW: Display final score on game over screen
    finalScoreDisplay.textContent = score;

    currentDeadFrame = 0;
    currentAnimationState = 'dead';
    clearInterval(deadAnimationTimer);

    deadAnimationTimer = setInterval(() => {
        if (currentDeadFrame < deadFrames.length) {
            animatePlayer();
            currentDeadFrame++;
        } else {
            clearInterval(deadAnimationTimer);
            gameOverScreen.classList.remove('hidden');
        }
    }, animationFrameRate);
}

// --- Event Listeners ---
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

document.addEventListener('keydown', (event) => {
    if (isRunning) {
        if (event.key === 'ArrowUp') {
            jump();
        } else if (event.key === 'ArrowDown') {
            slide();
        }
    }
});

// Initial setup when page loads
window.onload = () => {
    player.style.bottom = groundLevel + 'px';
    player.src = runFrames[0];
    currentScoreDisplay.textContent = score; // NEW: Ensure initial score is 0 on load
};