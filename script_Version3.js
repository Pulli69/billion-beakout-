// Super Breakout - script.js (updated: image placeholders + judged Game Over)
// Self-contained. Upload images via the UI; images are saved in localStorage.

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  // UI refs
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const levelEl = document.getElementById('level');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const soundToggle = document.getElementById('soundToggle');

  // Image inputs
  const paddleImageInput = document.getElementById('paddleImageInput');
  const ballImageInput = document.getElementById('ballImageInput');
  const brickImageInput = document.getElementById('brickImageInput');
  const bgImageInput = document.getElementById('bgImageInput');
  const gameOverImageInput = document.getElementById('gameOverImageInput');
  const clearPaddle = document.getElementById('clearPaddle');
  const clearBall = document.getElementById('clearBall');
  const clearBrick = document.getElementById('clearBrick');
  const clearBg = document.getElementById('clearBg');
  const clearGameOver = document.getElementById('clearGameOver');

  // Game Over overlay
  const goOverlay = document.getElementById('gameOverOverlay');
  const goRawScore = document.getElementById('goRawScore');
  const goImageWrap = document.getElementById('goImageWrap');
  const judgeBot = document.getElementById('judgeBot');
  const judgeHuman = document.getElementById('judgeHuman');
  const judgeVerified = document.getElementById('judgeVerified');
  const goResult = document.getElementById('goResult');
  const goRestart = document.getElementById('goRestart');
  const goClose = document.getElementById('goClose');

  // canvas sizing
  let W = 1100, H = 700;
  function resize() {
    const ratio = 16 / 10;
    let w = window.innerWidth;
    let h = window.innerHeight;
    if (w / h > ratio) w = Math.floor(h * ratio);
    else h = Math.floor(w / ratio);
    canvas.width = w;
    canvas.height = h;
    W = canvas.width; H = canvas.height;
    // keep paddle size responsive
    resetPaddle();
    if (bricks.length) createLevel(level); // recalc bricks
  }
  window.addEventListener('resize', resize);
  resize();

  // Game state
  let running = false;
  let paused = false;
  let score = 0;
  let lives = 3;
  let level = 1;

  // Paddle
  const paddle = { w: Math.max(80, W * 0.14), h: 14, x: 0, y: 0, speed: 0, maxSpeed: 18 };
  function resetPaddle() {
    paddle.w = Math.max(70, W * 0.14);
    paddle.h = 14;
    paddle.x = (W - paddle.w) / 2;
    paddle.y = H - 60;
    paddle.speed = 0;
  }

  // Ball class
  class Ball {
    constructor(x, y, vx = 0, vy = 0, r = 9, color = '#fff') {
      this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.r = r; this.color = color;
      this.stuck = true;
    }
    launch() {
      if (this.stuck) {
        const angle = -Math.PI / 4 - Math.random() * Math.PI / 6;
        const speed = 6 + Math.random() * 2 + (level - 1) * 0.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.stuck = false;
      }
    }
  }
  let balls = [];
  function createBall(stickToPaddle = true) {
    const b = new Ball(paddle.x + paddle.w / 2, paddle.y - 12, 0, 0, 9);
    b.stuck = stickToPaddle;
    balls.push(b);
  }

  // Bricks
  let bricks = [];
  const BRICK_PADDING = 8;
  function createLevel(n) {
    bricks = [];
    const rows = Math.min(7, 3 + n);
    const cols = Math.min(14, 6 + Math.floor(n / 2));
    const brickAreaW = W * 0.9;
    const offsetX = (W - brickAreaW) / 2;
    const brickW = (brickAreaW - (cols + 1) * BRICK_PADDING) / cols;
    const brickH = Math.max(18, Math.min(36, W * 0.03));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + BRICK_PADDING + c * (brickW + BRICK_PADDING);
        const y = 80 + r * (brickH + BRICK_PADDING);
        const hp = 1 + Math.floor((r + n) / 3);
        bricks.push({ x, y, w: brickW, h: brickH, hp, maxHp: hp, alive: true, id: `r${r}c${c}` });
      }
    }
  }

  // Power-ups
  const powerUps = [];
  const powerKinds = ['expand', 'slow', 'multiball', 'extraLife'];
  function spawnPower(x, y) {
    if (Math.random() < 0.22) {
      const kind = powerKinds[Math.floor(Math.random() * powerKinds.length)];
      powerUps.push({ x, y, vy: 1.6, kind, w: 18, h: 18 });
    }
  }

  // input
  let pointerX = null;
  let leftDown = false, rightDown = false;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') leftDown = true;
    if (e.key === 'ArrowRight' || e.key === 'd') rightDown = true;
    if (e.key === ' ' || e.key === 'Spacebar') {
      balls.forEach(b => b.launch());
      if (!running) startGame();
    }
    if (e.key === 'p') togglePause();
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') leftDown = false;
    if (e.key === 'ArrowRight' || e.key === 'd') rightDown = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = (e.clientX - rect.left) * (canvas.width / rect.width);
  });
  canvas.addEventListener('mouseleave', () => pointerX = null);
  canvas.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    pointerX = (t.clientX - rect.left) * (canvas.width / rect.width);
  }, { passive: true });
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    balls.forEach(b => b.launch());
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    pointerX = (t.clientX - rect.left) * (canvas.width / rect.width);
  }, { passive: false });

  // small beep
  function beep(freq = 440, time = 0.05, vol = 0.06) {
    if (!soundToggle.checked) return;
    try {
      const audioCtx = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + time);
    } catch (e) {}
  }

  // --- Image management (upload / localStorage) ---
  const IMG_KEYS = {
    paddle: 'bb_img_paddle',
    ball: 'bb_img_ball',
    brick: 'bb_img_brick',
    bg: 'bb_img_bg',
    gameOver: 'bb_img_gameover'
  };
  const IMAGES = { paddle: null, ball: null, brick: null, bg: null, gameOver: null };

  function dataURLFromFile(file, cb) {
    const r = new FileReader();
    r.onload = () => cb(r.result);
    r.readAsDataURL(file);
  }

  function saveImageKey(key, dataURL) {
    try { localStorage.setItem(key, dataURL); } catch (e) { /* storage may fail */ }
  }
  function clearImageKey(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
  function loadImageFromKey(key, cb) {
    const data = localStorage.getItem(key);
    if (!data) return cb(null);
    const img = new Image();
    img.onload = () => cb(img);
    img.onerror = () => cb(null);
    img.src = data;
  }

  function loadAllImages() {
    loadImageFromKey(IMG_KEYS.paddle, (img) => IMAGES.paddle = img);
    loadImageFromKey(IMG_KEYS.ball, (img) => IMAGES.ball = img);
    loadImageFromKey(IMG_KEYS.brick, (img) => IMAGES.brick = img);
    loadImageFromKey(IMG_KEYS.bg, (img) => IMAGES.bg = img);
    loadImageFromKey(IMG_KEYS.gameOver, (img) => IMAGES.gameOver = img);
    updateGoImagePreview();
  }

  function setImageFromInput(inputEl, keyName, storageKey) {
    const f = inputEl.files && inputEl.files[0];
    if (!f) return;
    dataURLFromFile(f, (dataUrl) => {
      const img = new Image();
      img.onload = () => {
        IMAGES[keyName] = img;
        saveImageKey(storageKey, dataUrl);
        updateGoImagePreview();
      };
      img.onerror = () => { IMAGES[keyName] = null; };
      img.src = dataUrl;
    });
    inputEl.value = '';
  }

  paddleImageInput.addEventListener('change', () => setImageFromInput(paddleImageInput, 'paddle', IMG_KEYS.paddle));
  ballImageInput.addEventListener('change', () => setImageFromInput(ballImageInput, 'ball', IMG_KEYS.ball));
  brickImageInput.addEventListener('change', () => setImageFromInput(brickImageInput, 'brick', IMG_KEYS.brick));
  bgImageInput.addEventListener('change', () => setImageFromInput(bgImageInput, 'bg', IMG_KEYS.bg));
  gameOverImageInput.addEventListener('change', () => setImageFromInput(gameOverImageInput, 'gameOver', IMG_KEYS.gameOver));

  clearPaddle.addEventListener('click', () => { IMAGES.paddle = null; clearImageKey(IMG_KEYS.paddle); updateGoImagePreview(); });
  clearBall.addEventListener('click', () => { IMAGES.ball = null; clearImageKey(IMG_KEYS.ball); updateGoImagePreview(); });
  clearBrick.addEventListener('click', () => { IMAGES.brick = null; clearImageKey(IMG_KEYS.brick); updateGoImagePreview(); });
  clearBg.addEventListener('click', () => { IMAGES.bg = null; clearImageKey(IMG_KEYS.bg); updateGoImagePreview(); });
  clearGameOver.addEventListener('click', () => { IMAGES.gameOver = null; clearImageKey(IMG_KEYS.gameOver); updateGoImagePreview(); });

  function updateGoImagePreview() {
    // show preview in Game Over overlay area
    goImageWrap.innerHTML = '';
    if (IMAGES.gameOver) {
      const imgEl = document.createElement('img');
      imgEl.src = IMAGES.gameOver.src;
      goImageWrap.appendChild(imgEl);
    } else {
      const p = document.createElement('div');
      p.className = 'go-image-placeholder';
      p.textContent = 'No image';
      goImageWrap.appendChild(p);
    }
  }

  // load saved images at start
  loadAllImages();

  // --- game loop / update / render (draw images if present) ---
  let last = 0;
  function loop(ts) {
    if (!running) return;
    const dt = Math.min(1 / 30, (ts - last) / 1000 || 0);
    last = ts;
    if (!paused) update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    // paddle movement
    if (pointerX != null) {
      paddle.x = Math.max(0, Math.min(W - paddle.w, pointerX - paddle.w / 2));
    } else {
      if (leftDown) paddle.x -= paddle.maxSpeed;
      if (rightDown) paddle.x += paddle.maxSpeed;
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
    }

    // balls physics
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (b.stuck) { b.x = paddle.x + paddle.w / 2; b.y = paddle.y - b.r - 2; continue; }
      b.x += b.vx; b.y += b.vy;

      // walls
      if (b.x - b.r <= 0) { b.x = b.r; b.vx *= -1; beep(600,0.02); }
      if (b.x + b.r >= W) { b.x = W - b.r; b.vx *= -1; beep(600,0.02); }
      if (b.y - b.r <= 0) { b.y = b.r; b.vy *= -1; beep(700,0.02); }

      // paddle collision
      if (b.y + b.r >= paddle.y && b.y + b.r <= paddle.y + paddle.h && b.x >= paddle.x && b.x <= paddle.x + paddle.w && b.vy > 0) {
        const rel = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        const angle = rel * Math.PI / 3;
        const speed = Math.hypot(b.vx, b.vy);
        b.vx = Math.sin(angle) * speed;
        b.vy = -Math.abs(Math.cos(angle) * speed);
        b.y = paddle.y - b.r - 1;
        beep(900,0.02);
      }

      // brick collision
      for (const br of bricks) {
        if (!br.alive) continue;
        if (b.x + b.r > br.x && b.x - b.r < br.x + br.w && b.y + b.r > br.y && b.y - b.r < br.y + br.h) {
          const overlapLeft = (b.x + b.r) - br.x;
          const overlapRight = (br.x + br.w) - (b.x - b.r);
          const overlapTop = (b.y + b.r) - br.y;
          const overlapBottom = (br.y + br.h) - (b.y - b.r);
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
          if (minOverlap === overlapLeft) b.vx = -Math.abs(b.vx);
          else if (minOverlap === overlapRight) b.vx = Math.abs(b.vx);
          else b.vy *= -1;
          br.hp--;
          if (br.hp <= 0) { br.alive = false; score += 100; spawnPower(br.x + br.w/2, br.y + br.h/2); beep(1200,0.03,0.09); }
          else { score += 35; beep(1100,0.02); }
          break;
        }
      }

      // bottom
      if (b.y - b.r > H) {
        balls.splice(i, 1);
      }
    }

    // check lost ball
    if (balls.length === 0) {
      lives--;
      if (lives <= 0) {
        running = false;
        showGameOver(score);
        beep(220,0.3,0.16);
        return;
      } else {
        createBall(true);
      }
    }

    // power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const p = powerUps[i];
      p.y += p.vy;
      if (p.y > H) { powerUps.splice(i, 1); continue; }
      if (p.x > paddle.x && p.x < paddle.x + paddle.w && p.y + p.h / 2 >= paddle.y && p.y - p.h / 2 <= paddle.y + paddle.h) {
        applyPower(p.kind);
        powerUps.splice(i, 1);
        beep(1800,0.04,0.08);
      }
    }

    // level cleared
    if (bricks.every(b => !b.alive)) {
      level++;
      levelEl.textContent = level;
      balls.forEach(b => b.stuck = true);
      resetPaddle();
      createLevel(level);
      balls = [];
      createBall(true);
    }

    scoreEl.textContent = score;
    livesEl.textContent = lives;
    levelEl.textContent = level;
  }

  function applyPower(kind) {
    if (kind === 'expand') { paddle.w = Math.min(paddle.w * 1.5, W * 0.5); }
    else if (kind === 'slow') { balls.forEach(b => { b.vx *= 0.7; b.vy *= 0.7; }); }
    else if (kind === 'multiball') {
      const copies = [];
      for (const b of balls) {
        const nb = new Ball(b.x, b.y, -b.vx * 0.9, b.vy, b.r, b.color); nb.stuck = false; copies.push(nb);
      }
      balls.push(...copies);
    } else if (kind === 'extraLife') { lives++; }
  }

  // --- rendering: draw images if available, otherwise shapes/placeholders ---
  function render() {
    // background
    if (IMAGES.bg) {
      // draw background image filling canvas
      ctx.drawImage(IMAGES.bg, 0, 0, W, H);
    } else {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#07101a';
      ctx.fillRect(0, 0, W, H);
    }

    // bricks
    for (const br of bricks) {
      if (!br.alive) continue;
      if (IMAGES.brick) {
        ctx.drawImage(IMAGES.brick, br.x, br.y, br.w, br.h);
      } else {
        const t = br.hp / br.maxHp;
        const grad = ctx.createLinearGradient(br.x, br.y, br.x + br.w, br.y + br.h);
        grad.addColorStop(0, interpolate('#ff6b6b', '#9ad8d3', 1 - t));
        grad.addColorStop(1, interpolate('#ffd166', '#f7c59f', t));
        roundRect(ctx, br.x, br.y, br.w, br.h, 6);
        ctx.fillStyle = grad; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.stroke();
      }
    }

    // paddle
    if (IMAGES.paddle) {
      ctx.drawImage(IMAGES.paddle, paddle.x, paddle.y, paddle.w, paddle.h);
    } else {
      roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 8);
      ctx.fillStyle = '#9ccfff'; ctx.fill();
    }

    // balls
    for (const b of balls) {
      if (IMAGES.ball) {
        // draw image centered on ball radius*2
        ctx.drawImage(IMAGES.ball, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      } else {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.stroke();
      }
    }

    // powerups
    for (const p of powerUps) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#083344'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.kind[0].toUpperCase(), 0, 0);
      ctx.restore();
    }

    // paused overlay
    if (paused) {
      ctx.fillStyle = 'rgba(2,6,12,0.45)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e6eef6'; ctx.font = '36px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Paused', W / 2, H / 2);
    }
  }

  // utilities
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function lerp(a,b,t){return a+(b-a)*t}
  function hexToRgb(hex){ const h=hex.replace('#',''); const bigint=parseInt(h,16); return [(bigint>>16)&255,(bigint>>8)&255, bigint&255]; }
  function rgbToHex(r,g,b){return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}
  function interpolate(a,b,t){ const A=hexToRgb(a),B=hexToRgb(b); return rgbToHex(Math.round(lerp(A[0],B[0],t)),Math.round(lerp(A[1],B[1],t)),Math.round(lerp(A[2],B[2],t))); }

  // --- Game Over overlay / judgement logic ---
  function showGameOver(finalScore) {
    goRawScore.textContent = finalScore;
    updateGoImagePreview();
    goResult.classList.add('hidden');
    goOverlay.classList.remove('hidden');
    goOverlay.setAttribute('aria-hidden', 'false');
  }

  function hideGameOver() {
    goOverlay.classList.add('hidden');
    goOverlay.setAttribute('aria-hidden', 'true');
  }

  // judgement implementations: simple deterministic rules with explanation
  function judgeBot(raw) {
    // Bot uses an algorithmic normalization: penalize high scores slightly, returns integer
    const judged = Math.max(0, Math.round(raw * 0.92)); // algorithmic modifier
    return { judged, reason: `Bot applied algorithmic normalization (×0.92).` };
  }
  function judgeHuman(raw) {
    // Human judge: subjective slight boost or penalty (+/- up to 6%)
    const adj = (Math.random() * 0.12) - 0.06; // -6%..+6%
    const judged = Math.max(0, Math.round(raw * (1 + adj)));
    const sign = adj >= 0 ? `+${Math.round(adj*100)}%` : `${Math.round(adj*100)}%`;
    return { judged, reason: `Human reviewer adjusted score (${sign}).` };
  }
  function judgeVerified(raw) {
    // Verified human gives more favorable weight and explanation
    const judged = Math.max(0, Math.round(raw * 1.08)); // +8%
    return { judged, reason: `Verified Human uplift applied (+8%).` };
  }

  judgeBot.addEventListener('click', () => {
    const raw = parseInt(goRawScore.textContent, 10) || 0;
    const r = judgeBot(raw);
    showJudgement(r);
  });
  judgeHuman.addEventListener('click', () => {
    const raw = parseInt(goRawScore.textContent, 10) || 0;
    const r = judgeHuman(raw);
    showJudgement(r);
  });
  judgeVerified.addEventListener('click', () => {
    const raw = parseInt(goRawScore.textContent, 10) || 0;
    const r = judgeVerified(raw);
    showJudgement(r);
  });

  function showJudgement({ judged, reason }) {
    goResult.classList.remove('hidden');
    goResult.innerHTML = `<strong>Judged Score:</strong> ${judged}<br/><span style="color:#9aa8b6;font-size:12px">${reason}</span>`;
  }

  goRestart.addEventListener('click', () => {
    hideGameOver();
    startGame();
  });
  goClose.addEventListener('click', () => {
    hideGameOver();
  });

  // controls
  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);
  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  }

  function startGame() {
    running = true; paused = false; score = 0; lives = 3; level = 1;
    resetPaddle(); createLevel(level); balls = []; createBall(true); powerUps.length = 0;
    last = performance.now();
    requestAnimationFrame(loop);
  }

  // initial setup
  resetPaddle(); createLevel(level); balls = []; createBall(true);

  // expose for debugging
  window.startBreakout = startGame;

  // small guidance to user: show overlay when not running? (we won't auto-start)
})();