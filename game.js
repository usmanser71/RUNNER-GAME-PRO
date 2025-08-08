const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 400;

let player = { x: 50, y: 300, width: 50, height: 50, color: "yellow", dy: 0, gravity: 0.5, jumpPower: -10, onGround: true };
let obstacles = [];
let score = 0;
let gameOver = false;

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function drawObstacles() {
    ctx.fillStyle = "red";
    obstacles.forEach(obs => ctx.fillRect(obs.x, obs.y, obs.width, obs.height));
}

function updatePlayer() {
    player.y += player.dy;
    player.dy += player.gravity;

    if (player.y + player.height >= canvas.height - 50) {
        player.y = canvas.height - 50 - player.height;
        player.dy = 0;
        player.onGround = true;
    }
}

function updateObstacles() {
    obstacles.forEach(obs => obs.x -= 5);
    obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
}

function spawnObstacle() {
    let height = 50;
    obstacles.push({ x: canvas.width, y: canvas.height - 50 - height, width: 30, height: height });
}

function detectCollision() {
    obstacles.forEach(obs => {
        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            gameOver = true;
        }
    });
}

function drawScore() {
    document.getElementById("score").textContent = score;
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawPlayer();
    drawObstacles();
    updatePlayer();
    updateObstacles();
    detectCollision();
    drawScore();

    if (!gameOver) {
        score++;
        requestAnimationFrame(gameLoop);
    } else {
        document.getElementById("restartBtn").style.display = "block";
    }
}

document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && player.onGround) {
        player.dy = player.jumpPower;
        player.onGround = false;
    }
});

document.getElementById("restartBtn").addEventListener("click", () => {
    obstacles = [];
    score = 0;
    player.y = 300;
    gameOver = false;
    document.getElementById("restartBtn").style.display = "none";
    gameLoop();
});

setInterval(spawnObstacle, 1500);
gameLoop();
