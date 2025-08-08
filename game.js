let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");

let player = { x: 50, y: 250, width: 30, height: 30, color: "red", dy: 0 };
let gravity = 0.5;
let jumpPower = -8;
let obstacles = [];
let score = 0;
let gameInterval;

function startGame() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("shop").style.display = "none";
    canvas.style.display = "block";
    score = 0;
    player.y = 250;
    obstacles = [];
    gameInterval = setInterval(updateGame, 20);
    window.addEventListener("keydown", jump);
}

function openShop() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("shop").style.display = "block";
}

function backToMenu() {
    document.getElementById("shop").style.display = "none";
    document.getElementById("menu").style.display = "block";
}

function jump(e) {
    if (e.code === "Space") {
        player.dy = jumpPower;
    }
}

function updateGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Gravity
    player.dy += gravity;
    player.y += player.dy;

    if (player.y > canvas.height - player.height) {
        player.y = canvas.height - player.height;
        player.dy = 0;
    }

    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Obstacles
    if (Math.random() < 0.02) {
        obstacles.push({ x: canvas.width, y: 270, width: 20, height: 50 });
    }

    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= 3;
        ctx.fillStyle = "green";
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Collision detection
        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            gameOver();
        }
    }

    obstacles = obstacles.filter(obs => obs.x + obs.width > 0);

    // Score
    score++;
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("Score: " + score, 10, 20);
}

function gameOver() {
    clearInterval(gameInterval);
    alert("Game Over! Your score: " + score);
    backToMenu();
}
