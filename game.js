// Time Runner 2077 — Pro (Phaser 3)
// No external assets: shapes are drawn at runtime and turned into textures.
// Features:
// - Responsive canvas
// - Mobile touch buttons + swipe (up/down)
// - Coins, obstacles, score, best (localStorage)
// - Shop to change player skin (color) using coins
// - Pause, Restart, simple sound using oscillator (WebAudio)

// -------------------- Config --------------------
const WIDTH = 900;
const HEIGHT = 500;

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: 0x071225,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WIDTH,
    height: HEIGHT
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1400 }, debug: false }
  },
  scene: [BootScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);

// -------------------- BootScene --------------------
function BootScene() {
  Phaser.Scene.call(this, { key: 'BootScene' });
}
BootScene.prototype = Object.create(Phaser.Scene.prototype);
BootScene.prototype.constructor = BootScene;

BootScene.prototype.preload = function() {
  // Create simple textures at runtime to avoid external files
  // Player texture (rectangle)
  const g = this.make.graphics({x:0,y:0,add:false});
  g.fillStyle(0xffffff,1);
  g.fillRoundedRect(0,0,48,72,8);
  g.generateTexture('player_default',48,72);
  g.clear();

  // Obstacle
  g.fillStyle(0xff4d4f,1);
  g.fillRect(0,0,40,80);
  g.generateTexture('obs1',40,80);
  g.clear();

  // Coin
  g.fillStyle(0xffd166,1);
  g.fillCircle(12,12,12);
  g.generateTexture('coin',24,24);
  g.clear();

  // Ground tile
  g.fillStyle(0x0f1724,1);
  g.fillRect(0,0,200,60);
  g.generateTexture('ground',200,60);
  g.clear();
};

BootScene.prototype.create = function() {
  this.scene.start('GameScene');
};

// -------------------- GameScene --------------------
function GameScene() {
  Phaser.Scene.call(this, { key: 'GameScene' });
}
GameScene.prototype = Object.create(Phaser.Scene.prototype);
GameScene.prototype.constructor = GameScene;

GameScene.prototype.create = function() {
  // Load persistent data
  this.best = parseInt(localStorage.getItem('tr_best') || '0');
  this.coins = parseInt(localStorage.getItem('tr_coins') || '0');
  this.playerSkin = localStorage.getItem('tr_skin') || 'player_default';

  // ground
  this.ground = this.add.tileSprite(WIDTH/2, HEIGHT-40, WIDTH, 60, 'ground');
  this.physics.add.existing(this.ground, true);

  // player
  this.player = this.physics.add.sprite(140, HEIGHT-120, this.playerSkin);
  this.player.setCollideWorldBounds(true);
  this.player.setSize(40,68,true);
  this.player.setOrigin(0.5,0.5);
  this.player.isSliding = false;

  // collider
  this.physics.add.collider(this.player, this.ground);

  // groups
  this.obstacles = this.physics.add.group();
  this.coinsGroup = this.physics.add.group();

  // collisions
  this.physics.add.collider(this.obstacles, this.ground);
  this.physics.add.overlap(this.player, this.coinsGroup, this.collectCoin, null, this);
  this.physics.add.collider(this.player, this.obstacles, this.hitObstacle, null, this);

  // input
  this.cursors = this.input.keyboard.createCursorKeys();

  // swipe detection for mobile
  this.input.on('pointerdown', (p) => { this.startSwipe = {x:p.x,y:p.y,time:Date.now()}; });
  this.input.on('pointerup', (p) => {
    if(!this.startSwipe) return;
    const dx = p.x - this.startSwipe.x; const dy = p.y - this.startSwipe.y;
    const dt = Date.now() - this.startSwipe.time;
    if(dt < 400 && Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx)) {
      if(dy < 0) this.playerJump();
      else this.playerSlide();
    } else {
      // tap = jump
      this.playerJump();
    }
    this.startSwipe = null;
  });

  // UI (DOM)
  this.updateHUD();

  // spawn timers
  this.speed = 320;
  this.spawnTimer = 0;
  this.score = 0;
  this.isRunning = true;

  // increasing difficulty
  this.time.addEvent({ delay: 2000, loop:true, callback: ()=>{ this.speed += 8; }});

  // score increment
  this.time.addEvent({ delay: 200, loop:true, callback: ()=>{ if(this.isRunning){ this.score += 1; this.updateHUD(); }}});
};

GameScene.prototype.update = function(time, delta) {
  if(!this.isRunning) return;

  // move ground visual
  this.ground.tilePositionX += this.speed * delta/1000;

  // spawn obstacles
  this.spawnTimer += delta;
  if(this.spawnTimer > Phaser.Math.Between(1000, 1400)) {
    this.spawnTimer = 0;
    this.spawnObstacle();
    if(Math.random() < 0.6) this.spawnCoin();
  }

  // move groups manually for fine control (we created physics bodies immovable)
  this.obstacles.getChildren().forEach(o => {
    o.x -= (this.speed * delta/1000);
    if(o.x < -100) { o.destroy(); }
  });
  this.coinsGroup.getChildren().forEach(c => {
    c.x -= (this.speed * delta/1000);
    if(c.x < -50) c.destroy();
  });

  // simple jump/slide keyboard
  if(this.cursors.up.isDown) this.playerJump();
  if(this.cursors.down.isDown) this.playerSlide();

  // slide timeout
  if(this.player.isSliding) {
    this.player.slideTimer -= delta;
    if(this.player.slideTimer <= 0) this.endSlide();
  }
};

// ---------------- GameScene Methods ----------------
GameScene.prototype.playerJump = function() {
  if(!this.player) return;
  if(this.player.body.blocked.down || this.player.body.touching.down) {
    this.player.setVelocityY(-520);
    playBeep(800,0.06);
  }
};

GameScene.prototype.playerSlide = function() {
  if(!this.player || this.player.isSliding) return;
  this.player.isSliding = true;
  this.player.slideTimer = 420;
  this.player.setScale(1,0.6);
  this.player.body.setSize(this.player.body.width, this.player.body.height*0.6, true);
  this.player.y += 18;
};

GameScene.prototype.endSlide = function() {
  if(!this.player) return;
  this.player.isSliding = false;
  this.player.setScale(1,1);
  this.player.body.setSize(40,68,true);
  this.player.y -= 18;
};

GameScene.prototype.spawnObstacle = function() {
  const h = Phaser.Math.Between(40, 100);
  const y = HEIGHT - 40 - h/2;
  const x = WIDTH + 60;
  const obs = this.add.sprite(x, y, 'obs1');
  this.physics.add.existing(obs);
  obs.body.setAllowGravity(false);
  obs.body.immovable = true;
  this.obstacles.add(obs);
};

GameScene.prototype.spawnCoin = function() {
  const x = WIDTH + 60;
  const y = Phaser.Math.Between(HEIGHT-220, HEIGHT-140);
  const coin = this.add.sprite(x, y, 'coin');
  this.physics.add.existing(coin);
  coin.body.setAllowGravity(false);
  coin.body.immovable = true;
  this.coinsGroup.add(coin);
};

GameScene.prototype.collectCoin = function(player, coin) {
  playBeep(1200,0.04);
  coin.destroy();
  this.coins += 5;
  localStorage.setItem('tr_coins', ''+this.coins);
  this.updateHUD();
  // small score bonus
  this.score += 25;
  this.updateHUD();
};

GameScene.prototype.hitObstacle = function() {
  playBeep(200,0.12);
  this.gameOver();
};

GameScene.prototype.gameOver = function() {
  this.isRunning = false;
  // freeze groups
  this.obstacles.getChildren().forEach(o => o.body && (o.body.enable = false));
  this.coinsGroup.getChildren().forEach(c => c.body && (c.body.enable = false));
  // store best
  if(this.score > this.best) {
    this.best = this.score;
    localStorage.setItem('tr_best', ''+this.best);
  }
  // store skin/coins already stored
  // show simple overlay via DOM (alert harmless but we add nicer)
  setTimeout(()=>{
    if(confirm(`Game Over!\nسکور: ${this.score}\nBest: ${this.best}\n\nدوبارہ کھیلیں؟`)) {
      location.reload();
    }
  },200);
};

GameScene.prototype.updateHUD = function() {
  document.getElementById('coins').innerText = 'Coins: ' + (this.coins || 0);
  document.getElementById('best').innerText = 'Best: ' + (this.best || 0);
};

// -------------------- UIScene (handles buttons + shop UI) --------------------
function UIScene() {
  Phaser.Scene.call(this, { key: 'UIScene', active:true });
}
UIScene.prototype = Object.create(Phaser.Scene.prototype);
UIScene.prototype.constructor = UIScene;

UIScene.prototype.create = function() {
  const gameScene = this.scene.get('GameScene');

  // connect DOM buttons
  document.getElementById('btn-jump').addEventListener('click', ()=>{ gameScene.playerJump(); });
  document.getElementById('btn-slide').addEventListener('click', ()=>{ gameScene.playerSlide(); });
  document.getElementById('btn-pause').addEventListener('click', ()=>{ this.togglePause(); });
  document.getElementById('btn-shop').addEventListener('click', ()=>{ this.openShop(); });
  document.getElementById('close-shop').addEventListener('click', ()=>{ this.closeShop(); });

  document.getElementById('btn-share').addEventListener('click', ()=> {
    const url = location.href;
    if(navigator.share) {
      navigator.share({ title:'Time Runner 2077', text:'Play this cool Runner!', url });
    } else {
      prompt('Copy link to share', url);
    }
  });

  // build shop items
  this.shopItems = [
    { id:'skin_blue', name:'Neon Blue', color:0x7c3aed, price: 30 },
    { id:'skin_cyan', name:'Cyber Cyan', color:0x06b6d4, price: 60 },
    { id:'skin_gold', name:'Gold', color:0xffd166, price: 120 }
  ];
  this.renderShop();
};

UIScene.prototype.togglePause = function() {
  const gs = this.scene.get('GameScene');
  if(gs.isRunning) {
    gs.isRunning = false;
    this.scene.pause('GameScene');
    document.getElementById('btn-pause').innerText = 'Resume';
  } else {
    gs.isRunning = true;
    this.scene.resume('GameScene');
    document.getElementById('btn-pause').innerText = 'Pause';
  }
};

UIScene.prototype.openShop = function() {
  document.getElementById('modal').classList.remove('hidden');
};

UIScene.prototype.closeShop = function() {
  document.getElementById('modal').classList.add('hidden');
  this.renderShop();
};

UIScene.prototype.renderShop = function() {
  const container = document.getElementById('shop-list');
  container.innerHTML = '';
  const gs = this.scene.get('GameScene');

  this.shopItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `<div style="height:48px;background:#041224;border-radius:6px;display:flex;align-items:center;justify-content:center">
      <div style="width:36px;height:56px;border-radius:6px;background:${hexFromNum(item.color)}"></div>
    </div>
    <div style="margin-top:8px;font-weight:700">${item.name}</div>
    <div>Price: ${item.price}</div>`;
    const btn = document.createElement('button');
    btn.innerText = 'Buy / Equip';
    btn.onclick = ()=> {
      if(gs.coins >= item.price) {
        gs.coins -= item.price;
        localStorage.setItem('tr_coins',''+gs.coins);
        // create a new texture for skin and set player texture
        createColoredPlayerTexture(this, item.id, item.color);
        gs.player.setTexture(item.id);
        localStorage.setItem('tr_skin',item.id);
        gs.updateHUD();
        this.renderShop();
      } else {
        alert('Not enough coins');
      }
    };
    div.appendChild(btn);
    container.appendChild(div);
  });
};

// helper to render color hex
function hexFromNum(num) {
  return '#' + ('000000' + num.toString(16)).slice(-6);
}

// create texture helper
function createColoredPlayerTexture(scene, key, color) {
  if(scene.textures.exists(key)) return;
  const g = scene.make.graphics({x:0,y:0,add:false});
  g.fillStyle(color,1);
  g.fillRoundedRect(0,0,48,72,8);
  g.generateTexture(key,48,72);
  g.clear();
}

// ---------------- Sound util ----------------
let audioCtx;
function playBeep(freq = 440, vol = 0.05, duration=0.12) {
  try {
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + duration);
  } catch(e) {
    // no-op
  }
}

// ----------------- End of file -----------------
