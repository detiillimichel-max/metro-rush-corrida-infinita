(function(){
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreSpan = document.getElementById('scoreValue');
    const speedSpan = document.getElementById('speedValue');
    const restartBtn = document.getElementById('restartButton');
    const statusDiv = document.getElementById('gameStatus');

    let width = 800;
    let height = 500;
    let laneWidth = 110;
    let lanes = 3;
    let playerLane = 1;

    let lanePositions = [];
    let player = { x: 0, y: 0, width: 42, height: 52, isJumping: false, jumpYOffset: 0, targetX: 0 };
    let normalY = 0;

    let coins = [];
    let trains = [];
    let obstacles = [];
    let score = 0;
    let gameRunning = true;
    let frame = 0;
    let spawnCounter = 0;
    let speed = 6;
    let baseSpeed = 6;

    let leftPressed = false;
    let rightPressed = false;
    let jumpRequest = false;
    let jumpCooldown = false;
    let particles = [];
    let bgOffset = 0;
    let cityBuildings = [];

    function initLanes(){
        lanePositions = [];
        let startX = (width - (laneWidth * lanes)) / 2;
        for(let i=0; i<lanes; i++){
            lanePositions.push(startX + i * laneWidth + laneWidth/2);
        }
        normalY = height - 95;
        player.y = normalY;
        player.jumpYOffset = 0;
        player.isJumping = false;
        player.targetX = lanePositions[playerLane] - player.width/2;
        player.x = player.targetX;
    }

    function initCity(){
        cityBuildings = [];
        for(let i=0;i<20;i++){
            cityBuildings.push({
                x: i*50,
                w: 30 + Math.random()*20,
                h: 80 + Math.random()*120,
                windows: Math.floor(Math.random()*3)
            });
        }
    }

    function resizeCanvas(){
        // Canvas responsivo
        let containerW = canvas.parentElement.clientWidth - 32;
        let scale = Math.min(containerW / 800, 1);
        canvas.style.width = (800 * scale) + 'px';
        canvas.style.height = (500 * scale) + 'px';

        canvas.width = width;
        canvas.height = height;
        initLanes();
        initCity();
    }

    function spawnCoin(){
        let lane = Math.floor(Math.random() * lanes);
        let xPos = lanePositions - 12; // CORRIGIDO
        // Não spawnar perto do player no início
        if(frame < 60) return;
        coins.push({
            x: width + 50, // Spawna fora da tela
            y: height - 80,
            width: 26,
            height: 26,
            lane: lane,
            collected: false,
            rotation: 0
        });
    }

    function spawnTrain(){
        let lane = Math.floor(Math.random() * lanes);
        // Evita spawnar 2 trens na mesma lane
        if(trains.some(t => t.lane === lane && t.x > width - 200)) return;

        let xPos = lanePositions - 32; // CORRIGIDO
        trains.push({
            x: width + 50, // Spawna fora da tela
            y: height - 85,
            width: 64,
            height: 65,
            lane: lane
        });
    }

    function spawnObstacle(){
        let lane = Math.floor(Math.random() * lanes);
        let xPos = lanePositions - 20;
        obstacles.push({
            x: width + 50,
            y: height - 60,
            width: 40,
            height: 30,
            lane: lane
        });
    }

    function updateDifficulty(){
        let newSpeed = baseSpeed + Math.floor(score / 300) * 0.8;
        if(newSpeed > 16) newSpeed = 16;
        speed = newSpeed;
        speedSpan.innerText = speed.toFixed(1);
    }

    function addParticle(x,y, color, size = 5){
        for(let i=0;i<6;i++){
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5)*5,
                vy: (Math.random() - 0.5)*5 - 3,
                life: 1,
                size: size + Math.random()*4,
                color: color
            });
        }
    }

    function updateGame(){
        if(!gameRunning) return;
        bgOffset += speed * 0.5;

        if(jumpRequest &&!player.isJumping &&!jumpCooldown){
            player.isJumping = true;
            player.jumpYOffset = 0;
            jumpCooldown = true;
            setTimeout(() => { jumpCooldown = false; }, 250);
            jumpRequest = false;
        }

        if(player.isJumping){
            if(player.jumpYOffset < 35){
                player.jumpYOffset += 3.5;
                player.y = normalY - player.jumpYOffset;
            } else {
                player.isJumping = false;
                player.jumpYOffset = 0;
                player.y = normalY;
            }
        } else {
            player.y = normalY;
        }

        // Movimento suave entre lanes
        let newLane = playerLane;
        if(leftPressed) newLane--;
        if(rightPressed) newLane++;
        if(newLane >=0 && newLane < lanes){
            if(newLane!== playerLane){
                playerLane = newLane;
                player.targetX = lanePositions[playerLane] - player.width/2;
            }
        }
        // Interpolação suave
        player.x += (player.targetX - player.x) * 0.2;

        // Reset dos botões pra evitar travamento
        leftPressed = false;
        rightPressed = false;

        // Moedas
        for(let i=0; i<coins.length; i++){
            let coin = coins[i];
            coin.x -= speed;
            coin.rotation += 0.1;
            let colX = (player.x < coin.x+coin.width && player.x+player.width > coin.x);
            let colY = (player.y+player.height-8 > coin.y && player.y+12 < coin.y+coin.height);
            if(colX && colY &&!coin.collected){
                coin.collected = true;
                score += 10;
                scoreSpan.innerText = Math.floor(score);
                addParticle(coin.x+13, coin.y+13, "#FFD966", 6);
                updateDifficulty();
            }
        }
        coins = coins.filter(c =>!c.collected && c.x + c.width > -50);

        // Trens
        for(let i=0; i<trains.length; i++){
            let train = trains[i];
            train.x -= speed;
            let collideX = (player.x+5 < train.x+train.width-5 && player.x+player.width-5 > train.x+5);
            let collideY = (player.y+player.height-12 > train.y+5 && player.y+18 < train.y+train.height-5);
            if(collideX && collideY){
                if(player.isJumping && player.jumpYOffset > 20){
                    addParticle(train.x+32, train.y+20, "#FFA07A", 8);
                    trains.splice(i,1);
                    i--;
                    score += 50;
                    scoreSpan.innerText = Math.floor(score);
                    continue;
                } else {
                    gameRunning = false;
                    statusDiv.innerHTML = '<i data-lucide="skull"></i> GAME OVER! Pressione CORRER';
                    lucide.createIcons();
                    addParticle(player.x+21, player.y+26, "#ff3d00", 10);
                    return;
                }
            }
        }
        trains = trains.filter(t => t.x + t.width > -50);

        // Obstáculos baixos - tem que pular
        for(let i=0; i<obstacles.length; i++){
            let obs = obstacles[i];
            obs.x -= speed;
            let collideX = (player.x+5 < obs.x+obs.width-5 && player.x+player.width-5 > obs.x+5);
            let collideY = (player.y+player.height-5 > obs.y && player.y+18 < obs.y+obs.height);
            if(collideX && collideY &&!player.isJumping){
                gameRunning = false;
                statusDiv.innerHTML = '<i data-lucide="skull"></i> BATEU! Pressione CORRER';
                lucide.createIcons();
                addParticle(player.x+21, player.y+26, "#ff3d00", 10);
                return;
            }
        }
        obstacles = obstacles.filter(o => o.x + o.width > -50);

        // Spawn
        spawnCounter++;
        let coinRate = Math.max(15, 30 - Math.floor(score/200));
        if(spawnCounter > coinRate){
            spawnCoin();
            spawnCounter = 0;
            if(Math.random()<0.5 && gameRunning){
                spawnTrain();
            }
            if(Math.random()<0.3 && gameRunning){
                spawnObstacle();
            }
        }

        // Partículas
        for(let i=0;i<particles.length;i++){
            particles[i].x += particles[i].vx;
            particles[i].y += particles[i].vy;
            particles[i].life -= 0.02;
            particles[i].vy += 0.15;
            particles[i].size *= 0.98;
        }
        particles = particles.filter(p => p.life > 0 && p.y < height+50);

        if(frame % 60 === 0 && gameRunning){
            score += 1;
            scoreSpan.innerText = Math.floor(score);
            updateDifficulty();
        }
        frame++;
    }

    function drawBackground(){
        // Céu gradiente animado
        const gradSky = ctx.createLinearGradient(0,0,0,height);
        gradSky.addColorStop(0,"#0d4e8a");
        gradSky.addColorStop(0.7,"#1a3a5f");
        gradSky.addColorStop(1,"#0a1f3e");
        ctx.fillStyle = gradSky;
        ctx.fillRect(0,0,width,height);

        // Estrelas
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        for(let i=0;i<50;i++){
            let x = (i*37 + frame*0.1) % width;
            let y = (i*71) % (height*0.6);
            ctx.fillRect(x, y, 1, 1);
        }

        // Cidade parallax
        ctx.fillStyle = "#021c2c";
        for(let b of cityBuildings){
            let x = b.x - (bgOffset * 0.3) % (width + 50);
            if(x < -50) x += width + 50;
            ctx.fillRect(x, height-130-b.h, b.w, b.h);
            // Janelas piscando
            ctx.fillStyle = "#ffeb3b";
            for(let w=0; w<b.windows; w++){
                if(Math.sin(frame*0.05 + b.x + w) > 0) {
                    ctx.fillRect(x+5, height-130-b.h+15+w*20, 6, 6);
                    ctx.fillRect(x+b.w-11, height-130-b.h+25+w*20, 6, 6);
                }
            }
            ctx.fillStyle = "#021c2c";
        }

        // Chão
        ctx.fillStyle = "#0a2847";
        ctx.fillRect(0, height-50, width, 50);

        // Trilhos com dormentes animados
        for(let i=0;i<lanes;i++){
            let railX = lanePositions[i] - laneWidth/2;
            // Base do trilho
            ctx.fillStyle = "#1a2f4a";
            ctx.fillRect(railX-10, height-65, laneWidth+20, 15);
            // Linhas metálicas
            ctx.fillStyle = "#4a5b6e";
            ctx.fillRect(railX-4, height-62, 4, 10);
            ctx.fillRect(railX+laneWidth, height-62, 4, 10);
            // Dormentes
            ctx.fillStyle = "#8b5a2b";
            for(let d=0;d<12;d++){
                let dorX = railX + (d*25) - (bgOffset%25);
                ctx.fillRect(dorX, height-58, 15, 6);
            }
        }
    }

    function drawPlayer(){
        let pX = player.x;
        let pY = player.y;
        // Sombra no chão
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(pX+21, normalY+48, 20, 6, 0, 0, Math.PI*2);
        ctx.fill();

        // Glow
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 25;
        // Corpo
        ctx.fillStyle = "#3c9eff";
        ctx.beginPath();
        ctx.roundRect(pX, pY, player.width, player.height, 14);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Boné
        ctx.fillStyle = "#ffbc3c";
        ctx.beginPath();
        ctx.roundRect(pX+6, pY-10, 30, 14, 8);
        ctx.fill();
        ctx.fillStyle = "#d4491c";
        ctx.beginPath();
        ctx.rect(pX+10, pY-4, 32, 12);
        ctx.fill();
        // Rosto
        ctx.fillStyle = "#ffdbac";
        ctx.beginPath();
        ctx.arc(pX+21, pY+15, 12, 0, Math.PI*2);
        ctx.fill();
        // Olho
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(pX+28, pY+14, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(pX+30, pY+13, 1.5, 0, Math.PI*2);
        ctx.fill();
        // Tênis
        ctx.fillStyle = "#ff6e4a";
        ctx.beginPath();
        ctx.roundRect(pX+4, pY+42, 14, 10, 5);
        ctx.rect(pX+24, pY+42, 14, 10);
        ctx.fill();
    }

    function drawCoin(coin){
        let cx = coin.x;
        let cy = coin.y;
        ctx.save();
        ctx.translate(cx+13, cy+13);
        ctx.rotate(coin.rotation);
        ctx.shadowColor = "#FFD700";
        ctx.shadowBlur = 30;
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#FFA500";
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 18px monospace";
        ctx.fillText("★", -7, 6);
        ctx.restore();
    }

    function drawTrain(t){
        let tX = t.x;
        let tY = t.y;
        // Corpo
        ctx.fillStyle = "#6b3e2e";
        ctx.fillRect(tX, tY, t.width, t.height-6);
        // Teto
        ctx.fillStyle = "#8b5a2b";
        ctx.fillRect(tX+4, tY-12, t.width-8, 14);
        // Janelas
        ctx.fillStyle = "#e6b422";
        ctx.shadowColor = "#e6b422";
        ctx.shadowBlur = 10;
        ctx.fillRect(tX+8, tY+10, 10, 20);
        ctx.fillRect(tX+t.width-18, tY+10, 10, 20);
        ctx.shadowBlur = 0;
        // Porta
        ctx.fillStyle = "#363636";
        ctx.fillRect(tX+24, tY+28, 16, 22);
        // Luz frontal
        ctx.fillStyle = "#ff0000";
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(tX+5, tY+5, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function drawObstacle(obs){
        let oX = obs.x;
        let oY = obs.y;
        ctx.fillStyle = "#c0392b";
        ctx.shadowColor = "#c0392b";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.roundRect(oX, oY, obs.width, obs.height, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Listras
        ctx.fillStyle = "#f1c40f";
        ctx.fillRect(oX+5, oY+5, obs.width-10, 4);
        ctx.fillRect(oX+5, oY+15, obs.width-10, 4);
    }

    function drawParticles(){
        for(let p of particles){
            ctx.globalAlpha = p.life * 0.9;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }
    }

    function drawUItext(){
        ctx.font = "bold 36px 'Orbitron'";
        ctx.fillStyle = "white";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "black";
        if(!gameRunning){
            ctx.fillStyle = "#ffaa66";
            ctx.shadowColor = "#ff6a3d";
            ctx.shadowBlur = 30;
            ctx.textAlign = "center";
            ctx.fillText("GAME OVER", width/2, 80);
            ctx.textAlign = "left";
        }
        ctx.shadowBlur = 0;
    }

    function render(){
        drawBackground();
        for(let o of obstacles) drawObstacle(o);
        for(let t of trains) drawTrain(t);
        for(let c of coins) drawCoin(c);
        drawPlayer();
        drawParticles();
        drawUItext();
    }

    function gameLoop(){
        updateGame();
        render();
        requestAnimationFrame(gameLoop);
    }

    function handleKeyDown(e){
        const key = e.key;
        if(key === 'ArrowLeft'){ leftPressed = true; e.preventDefault();}
        else if(key === 'ArrowRight'){ rightPressed = true; e.preventDefault();}
        else if(key === 'ArrowUp' || key === ' '){
            if(gameRunning){
                jumpRequest = true;
            }
            e.preventDefault();
        }
    }

    function handleKeyUp(e){
        const key = e.key;
        if(key === 'ArrowLeft') leftPressed = false;
        if(key === 'ArrowRight') rightPressed = false;
    }

    let touchStartX = 0;
    let touchStartY = 0;
    function handleTouchStart(e){
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        touchStartX = touch.clientX - rect.left;
        touchStartY = touch.clientY - rect.top;
    }

    function handleTouchMove(e){
        e.preventDefault();
        if(!gameRunning) return;
    }

    function handleTouchEnd(e){
        e.preventDefault();
        if(!gameRunning) return;

        const rect = canvas.getBoundingClientRect();
        const touch = e.changedTouches[0];
        let endX = touch.clientX - rect.left;
        let endY = touch.clientY - rect.top;

        let diffX = endX - touchStartX;
        let diffY = endY - touchStartY;

        // Swipe horizontal
        if(Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30){
            if(diffX > 0 && playerLane < lanes-1){
                rightPressed = true;
            } else if(diffX < 0 && playerLane > 0){
                leftPressed = true;
            }
        }
        // Swipe pra cima ou toque simples = pular
        else if(diffY < -30 || Math.abs(diffX) < 10){
            jumpRequest = true;
        }
    }

    function resetGame(){
        gameRunning = true;
        score = 0;
        frame = 0;
        speed = baseSpeed;
        scoreSpan.innerText = "0";
        speedSpan.innerText = speed.toFixed(1);
        coins = [];
        trains = [];
        obstacles = [];
        particles = [];
        playerLane = 1;
        player.isJumping = false;
        player.jumpYOffset = 0;
        player.y = normalY;
        leftPressed = false;
        rightPressed = false;
        jumpRequest = false;
        jumpCooldown = false;
        spawnCounter = 0;
        statusDiv.innerHTML = '<i data-lucide="hand"></i> Deslize ou use setas | Pegue moedas e evite trens!';
        lucide.createIcons();
        player.x = lanePositions[playerLane] - player.width/2;
        player.targetX = player.x;
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
    });

    function bindEvents(){
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        canvas.addEventListener('touchstart', handleTouchStart, {passive: false});
        canvas.addEventListener('touchmove', handleTouchMove, {passive: false});
        canvas.addEventListener('touchend', handleTouchEnd);
        // Desktop: clique = pular
        canvas.addEventListener('mousedown', (e) => {
            if(gameRunning) jumpRequest = true;
            e.preventDefault();
        });
    }

    function startGame(){
        resizeCanvas();
        bindEvents();
        resetGame();
        gameLoop();
    }

    restartBtn.addEventListener('click', () => {
        resetGame();
    });

    startGame();
})();

if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x+r, y);
        this.lineTo(x+w-r, y);
        this.quadraticCurveTo(x+w, y, x+w, y+r);
        this.lineTo(x+w, y+h-r);
        this.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        this.lineTo(x+r, y+h);
        this.quadraticCurveTo(x, y+h, x, y+h-r);
        this.lineTo(x, y+r);
        this.quadraticCurveTo(x, y, x+r, y);
        this.closePath();
        return this;
    };
                       }
