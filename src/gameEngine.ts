import { Theme, Avatar } from './types';
import { audio } from './audio';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  theme: Theme = 'default';
  avatar: Avatar = 'mario';
  
  player = { 
    y: 0, 
    yVel: 0, 
    w: 45, 
    h: 65, 
    scale: 1, 
    targetScale: 1, 
    frame: 0,
    isDying: false,
    deathY: 0,
    deathYVel: 0
  };

  obstacles: any[] = [];
  decorations: any[] = [];
  particles: any[] = [];
  burgers: any[] = []; // Delicious hamburger collectibles spawned in the air
  
  bgScroll = 0;
  speedMultiplier = 1;
  targetSpeedMultiplier = 1;

  cameraShake = 0;
  dayTime = 0;
  windStreaks: { x: number; y: number; r: number; speed: number }[] = [];
  themeLeaves: { x: number; y: number; s: number; vy: number; vx: number; r: number; rotSpeed: number }[] = [];

  lastTime = 0;
  animationFrameId: number = 0;
  isPaused = false;

  // Flags for auto mechanics
  disableNextJump = false;
  playerFlicker = 0;
  burgerSpawnTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.player.y = this.canvas.height - 110;

    // Wind streaks
    for(let i = 0; i < 15; i++) {
        this.windStreaks.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * 300 + 50,
            r: Math.random() * 60 + 20,
            speed: Math.random() * 200 + 400
        });
    }

    // Interactive flying leaves
    for(let i = 0; i < 20; i++) {
        this.themeLeaves.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            s: Math.random() * 8 + 4,
            vy: Math.random() * 50 + 50,
            vx: Math.random() * -30 - 10,
            r: Math.random() * Math.PI,
            rotSpeed: Math.random() * 2 - 1
        });
    }

    this.spawnInitialDecorations();
  }

  spawnInitialDecorations() {
      const cw = window.innerWidth;
      for (let i = 0; i < 6; i++) {
          const types = ['bush', 'qblock', 'brick', 'mushroom'];
          const type = types[i % types.length];
          this.decorations.push({
              x: (cw / 5) * i + Math.random() * 80,
              y: 0, 
              type: type,
              scale: 1.0
          });
      }
  }

  resize() {
      if (this.canvas.parentElement) {
          const pr = window.devicePixelRatio || 1;
          const rect = this.canvas.parentElement.getBoundingClientRect();
          this.canvas.width = rect.width * pr;
          this.canvas.height = rect.height * pr;
          this.canvas.style.width = `${rect.width}px`;
          this.canvas.style.height = `${rect.height}px`;
          this.ctx.scale(pr, pr);
      }
  }

  onResize = () => {
      this.resize();
  }

  start() {
    this.resize();
    window.addEventListener('resize', this.onResize);
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    window.removeEventListener('remove', this.onResize);
    cancelAnimationFrame(this.animationFrameId);
  }

  setPaused(p: boolean) {
      this.isPaused = p;
  }

  setAvatar(avatar: Avatar) {
      this.avatar = avatar;
  }

  loop = (time: number) => {
    this.animationFrameId = requestAnimationFrame(this.loop);
    
    if (this.isPaused) {
       this.lastTime = time;
       return;
    }

    const dt = Math.min((time - this.lastTime) / 1000, 0.1); 
    this.lastTime = time;

    this.update(dt);
    this.draw();
  }

  triggerCorrect() {
      this.player.targetScale = 1.35;
      this.cameraShake = 12;
      this.disableNextJump = false; // re-enable autojumps instantly
      audio.playCorrect();
      
      // Star/Coin bursting elements
      for(let i=0; i<60; i++) {
          const colorVal = Math.floor(Math.random() * 50) + 40; // Gold sparkles
          this.particles.push({
              x: 100 + this.player.w/2,
              y: this.player.y + this.player.h/2,
              vx: (Math.random() - 0.5) * 800,
              vy: (Math.random() - 1.25) * 850,
              color: `hsl(${colorVal}, 100%, 60%)`,
              size: Math.random() * 8 + 4,
              life: 1.2,
              alphaDecay: 0.85
          });
      }
      setTimeout(() => {
          this.player.targetScale = 1;
      }, 3000);
  }

  triggerWrong() {
      // Classic Mario out sound and dying jump kinematics
      this.disableNextJump = true;
      this.player.isDying = true;
      this.player.deathY = this.player.y;
      this.player.deathYVel = -550; // Mario's legendary jump up before falling off-screen
      
      audio.playWrong(); // synthesize retro Mario game-over fanfare

      // Slow down ground progression temporarily
      this.targetSpeedMultiplier = 0.2;

      // Reset Mario after feedback expires
      setTimeout(() => {
          this.player.isDying = false;
          this.player.yVel = 0;
          this.player.scale = 1;
          this.player.targetScale = 1;
          this.disableNextJump = false;
          this.targetSpeedMultiplier = 1.0;
          this.playerFlicker = 50; // Invincibility flicker
      }, 2000);
  }

  handleCollision() {
      // Triggered on actual pipes if they break auto jumps
      this.cameraShake = 22;
      this.player.isDying = true;
      this.player.deathY = this.player.y;
      this.player.deathYVel = -520;
      
      audio.playWrong();
      this.targetSpeedMultiplier = 0.25;

      // Burst heavy lava impact particles
      for(let i=0; i<35; i++) {
          this.particles.push({
              x: 100 + this.player.w/2,
              y: this.player.y + this.player.h/2,
              vx: (Math.random() - 0.5) * 600,
              vy: (Math.random() - 0.9) * 500,
              color: '#FF4D00',
              size: Math.random() * 9 + 4,
              life: 0.85,
              alphaDecay: 1.25
          });
      }

      setTimeout(() => {
          this.player.isDying = false;
          this.player.scale = 1;
          this.player.targetScale = 1;
          this.player.yVel = 0;
          this.targetSpeedMultiplier = 1.0;
          this.playerFlicker = 40;
      }, 2000);
  }

  setTheme(theme: Theme) {
      this.theme = theme;
  }

  update(dt: number) {
      this.speedMultiplier += (this.targetSpeedMultiplier - this.speedMultiplier) * dt * 5;
      const baseSpeed = 320 * this.speedMultiplier;
      this.bgScroll += baseSpeed * dt;
      this.dayTime += dt * 0.05;

      const cw = this.canvas.width / (window.devicePixelRatio || 1);
      const ch = this.canvas.height / (window.devicePixelRatio || 1);
      const groundY = ch - 40;

      if (this.cameraShake > 0) {
          this.cameraShake = Math.max(0, this.cameraShake - dt * 45);
      }

      if (this.playerFlicker > 0) {
          this.playerFlicker = Math.max(0, this.playerFlicker - dt * 25);
      }

      // 1. Kinetic Death Physics (No ground contact, just falling)
      if (this.player.isDying) {
          this.player.deathYVel += 1650 * dt; // strong death gravity pulling down
          this.player.deathY += this.player.deathYVel * dt;
          
          // Still animate visual particles
          for (let i = this.particles.length - 1; i >= 0; i--) {
              let p = this.particles[i];
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.vy += 850 * dt; 
              p.life -= dt * p.alphaDecay;
              if (p.life <= 0) {
                  this.particles.splice(i, 1);
              }
          }
          
          // Scroll backgrounds and obstacle lists quietly
          for (let i = this.obstacles.length - 1; i >= 0; i--) {
              this.obstacles[i].x -= baseSpeed * dt;
              if (this.obstacles[i].x < -100) this.obstacles.splice(i, 1);
          }
          for (let i = this.decorations.length - 1; i >= 0; i--) {
              this.decorations[i].x -= baseSpeed * dt;
              if (this.decorations[i].x < -150) this.decorations.splice(i, 1);
          }
          for (let i = this.burgers.length - 1; i >= 0; i--) {
              this.burgers[i].x -= baseSpeed * dt;
              if (this.burgers[i].x < -100) this.burgers.splice(i, 1);
          }
          return; // Skip normal player running physics
      }

      // 2. Wind Atmosphere
      for (const st of this.windStreaks) {
          st.x -= st.speed * dt * this.speedMultiplier;
          if (st.x + st.r < 0) {
              st.x = cw + Math.random() * cw;
              st.y = Math.random() * (ch - 150) + 30;
          }
      }

      // Leaves drifts
      for (const leaf of this.themeLeaves) {
          leaf.y += leaf.vy * dt;
          leaf.x += (leaf.vx - baseSpeed * 0.2) * dt;
          leaf.r += leaf.rotSpeed * dt;
          if (leaf.y > ch + 20 || leaf.x < -20) {
              leaf.y = -20;
              leaf.x = Math.random() * cw * 1.5;
              leaf.s = Math.random() * 8 + 4;
          }
      }

      // Spawning random background items
      if (Math.random() < 0.02) {
          const lastDecoX = this.decorations.length > 0 ? this.decorations[this.decorations.length - 1].x : 0;
          if (cw - lastDecoX > 160) {
              const types = ['bush', 'qblock', 'brick', 'mushroom', 'cloud'];
              const type = types[Math.floor(Math.random() * types.length)];
              let y = groundY - 30;
              if (type === 'qblock' || type === 'brick') {
                  y = groundY - 110 - Math.random() * 60;
              } else if (type === 'cloud') {
                  y = 40 + Math.random() * 80;
              } else if (type === 'mushroom') {
                  y = groundY - 26;
              } else if (type === 'bush') {
                  y = groundY - 32;
              }
              this.decorations.push({
                  x: cw + 60,
                  y: y,
                  type: type,
                  scale: 0.9 + Math.random() * 0.2
              });
          }
      }

      // Procedural floating burger spawning! 🍔
      this.burgerSpawnTimer += dt;
      if (this.burgerSpawnTimer > 1.8) {
          this.burgerSpawnTimer = 0;
          // Spawn burgers at comfortable jump height in air
          const bY = groundY - 100 - Math.random() * 45;
          this.burgers.push({
              x: cw + 50,
              y: bY,
              w: 38,
              h: 30,
              waveOffset: Math.random() * Math.PI * 2,
              collected: false
          });
      }

      for (let i = this.decorations.length - 1; i >= 0; i--) {
          const speedFactor = this.decorations[i].type === 'cloud' ? 0.35 : 1.0;
          this.decorations[i].x -= baseSpeed * dt * speedFactor;
          if (this.decorations[i].x < -150) {
              this.decorations.splice(i, 1);
          }
      }

      // Spawning Pipes & Obstacles
      if (Math.random() < 0.012 * this.speedMultiplier) {
          const lastObstacleX = this.obstacles.length > 0 ? this.obstacles[this.obstacles.length - 1].x : 0;
          if (cw - lastObstacleX > 380) {
              const isPipe = Math.random() > 0.4;
              this.obstacles.push({
                  x: cw + 60,
                  w: isPipe ? 48 : 34,
                  h: isPipe ? 62 : 44,
                  jumped: false,
                  type: isPipe ? 'pipe' : 'brick',
                  plantHeight: 0,
                  plantPhase: Math.random() * Math.PI,
                  hitTriggered: false
              });
          }
      }

      // 3. Update smart burgers collectibles & collection checks
      const characterH = this.player.h * this.player.scale;
      const characterW = this.player.w * this.player.scale;

      for (let i = this.burgers.length - 1; i >= 0; i--) {
          const b = this.burgers[i];
          b.x -= baseSpeed * dt;
          b.waveOffset += dt * 4;

          const realY = b.y + Math.sin(b.waveOffset) * 5;

          // Auto detect and jump for flying burgers! 🍔
          const bDist = b.x - 100;
          const isGrounded = this.player.yVel === 0 && this.player.y >= groundY - characterH;
          if (!b.collected && bDist > 40 && bDist < 120 && isGrounded && !this.disableNextJump) {
              // Initiate beautiful automatic jump arc targeting the floating burger!
              this.player.yVel = -540; 
              audio.playJump();
          }

          // Collection check AABB
          const pLeft = 100;
          const pRight = 100 + characterW;
          const pTop = this.player.y;
          const pBottom = this.player.y + characterH;

          if (
              !b.collected &&
              pRight > b.x &&
              pLeft < b.x + b.w &&
              pBottom > realY &&
              pTop < realY + b.h
          ) {
              b.collected = true;
              audio.playCoin(); // Synthesize iconic Mario coin pickup sound
              
              // Spark gold coin star bursts!
              for (let j = 0; j < 15; j++) {
                  this.particles.push({
                      x: b.x + b.w/2,
                      y: realY + b.h/2,
                      vx: (Math.random() - 0.5) * 350,
                      vy: (Math.random() - 0.5) * 350,
                      color: '#F1C40F',
                      size: Math.random() * 6 + 3,
                      life: 0.8,
                      alphaDecay: 1.5
                  });
              }
          }

          if (b.x < -100) this.burgers.splice(i, 1);
      }

      // 4. Update Obstacles with smart auto leaps
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
          const obs = this.obstacles[i];
          obs.x -= baseSpeed * dt;

          const dist = obs.x - 100;

          if (obs.type === 'pipe') {
              obs.plantPhase += dt * 4.2;
              obs.plantHeight = (Math.sin(obs.plantPhase) + 1.0) * 16;
          }

          // Smart auto-jump scanning logic!
          const isGrounded = this.player.yVel === 0 && this.player.y >= groundY - characterH;
          if (!obs.jumped && dist > 0 && dist < 125 && isGrounded) {
              if (this.disableNextJump) {
                  // Jump disabled due to user error/timeout: Mario hits obstacle!
              } else {
                  this.player.yVel = -560; // optimal auto jump timing
                  obs.jumped = true;
                  audio.playJump();
              }
          }

          // Physical collisions
          const pLeft = 100;
          const pRight = 100 + characterW - 6;
          const pTop = this.player.y;
          const pBottom = this.player.y + characterH;

          const oLeft = obs.x;
          const oRight = obs.x + obs.w;
          const oTop = groundY - obs.h;

          if (
              pRight > oLeft &&
              pLeft < oRight &&
              pBottom > oTop &&
              pTop < groundY
          ) {
              if (this.disableNextJump && !obs.hitTriggered && !this.player.isDying && this.playerFlicker <= 0) {
                  obs.hitTriggered = true;
                  obs.jumped = true;
                  this.handleCollision();
              }
          }

          if (obs.x < -100) this.obstacles.splice(i, 1);
      }

      // Normal falling physics
      this.player.scale += (this.player.targetScale - this.player.scale) * dt * 3;
      this.player.yVel += 1650 * dt; 
      this.player.y += this.player.yVel * dt;

      const currentHAfter = this.player.h * this.player.scale;
      if (this.player.y > groundY - currentHAfter) {
          this.player.y = groundY - currentHAfter;
          this.player.yVel = 0;
      }

      // Steady runner frame acceleration
      this.player.frame += baseSpeed * dt * 0.055;

      // Particle physics
      for (let i = this.particles.length - 1; i >= 0; i--) {
          let p = this.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 850 * dt; 
          p.life -= dt * p.alphaDecay;
          if (p.life <= 0) {
              this.particles.splice(i, 1);
          }
      }
  }

  // ----------------------------------------------------
  // HIGH FIDELITY CHARACTER RENDERERS WITH JUMP GAITS & MOTION
  // ----------------------------------------------------

  private drawMario(pw: number, ph: number, yOff: number) {
      const isJumping = this.player.yVel !== 0;
      const runCycle = this.player.frame;

      // Body parameters
      const capColor = '#E52521';
      const skinColor = '#FDD3A6';
      const overallsColor = '#002FBE';

      // 1. BACK ARM (Swings opposite to Front Arm)
      this.ctx.save();
      this.ctx.fillStyle = capColor; // Red shirt arm sleeve
      const backArmAngle = isJumping ? -Math.PI / 2 : Math.cos(runCycle) * 0.7;
      this.ctx.translate(pw * 0.35, yOff + ph * 0.45);
      this.ctx.rotate(backArmAngle);
      this.ctx.fillRect(-pw * 0.08, 0, pw * 0.16, ph * 0.25);
      // Back fist (peach circle)
      this.ctx.fillStyle = skinColor;
      this.ctx.beginPath();
      this.ctx.arc(0, ph * 0.25, pw * 0.08, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      // 2. LEGS ASSEMBLY (Dynamic walking cycles / tucked jump posture)
      // Back Leg
      this.ctx.save();
      this.ctx.fillStyle = overallsColor;
      const backLegAngle = isJumping ? 0.3 : Math.sin(runCycle) * 0.6;
      this.ctx.translate(pw * 0.4, yOff + ph * 0.72);
      this.ctx.rotate(backLegAngle);
      this.ctx.fillRect(-pw * 0.1, 0, pw * 0.2, ph * 0.16);
      // Brown boot
      this.ctx.fillStyle = '#4B280A';
      this.ctx.fillRect(-pw * 0.12, ph * 0.12, pw * 0.24, ph * 0.08);
      this.ctx.restore();

      // Front Leg
      this.ctx.save();
      this.ctx.fillStyle = overallsColor;
      const frontLegAngle = isJumping ? -0.5 : -Math.sin(runCycle) * 0.6;
      this.ctx.translate(pw * 0.62, yOff + ph * 0.72);
      this.ctx.rotate(frontLegAngle);
      this.ctx.fillRect(-pw * 0.1, 0, pw * 0.2, ph * 0.16);
      // Brown boot
      this.ctx.fillStyle = '#4B280A';
      this.ctx.fillRect(-pw * 0.12, ph * 0.12, pw * 0.24, ph * 0.08);
      this.ctx.restore();

      // 3. OVERALLS BODY
      this.ctx.fillStyle = overallsColor;
      this.ctx.beginPath();
      if (this.ctx.roundRect) {
         this.ctx.roundRect(pw * 0.25, yOff + ph * 0.42, pw * 0.52, ph * 0.32, 6);
      } else {
         this.ctx.rect(pw * 0.25, yOff + ph * 0.42, pw * 0.52, ph * 0.32);
      }
      this.ctx.fill();

      // Torso shirt parts underneath overalls
      this.ctx.fillStyle = capColor;
      this.ctx.fillRect(pw * 0.33, yOff + ph * 0.38, pw * 0.35, ph * 0.08);

      // Gold buttons
      this.ctx.fillStyle = '#FCD116';
      this.ctx.beginPath();
      this.ctx.arc(pw * 0.38, yOff + ph * 0.52, pw * 0.05, 0, Math.PI * 2);
      this.ctx.arc(pw * 0.62, yOff + ph * 0.52, pw * 0.05, 0, Math.PI * 2);
      this.ctx.fill();

      // 4. FRONT ARM (The distinct fist swing or sky-reach when jumping)
      this.ctx.save();
      this.ctx.fillStyle = capColor;
      // When jumping, reach the front hand completely up to knock blocks!
      const frontArmAngle = isJumping ? Math.PI + 0.3 : -Math.cos(runCycle) * 0.7;
      this.ctx.translate(pw * 0.6, yOff + ph * 0.45);
      this.ctx.rotate(frontArmAngle);
      this.ctx.fillRect(-pw * 0.08, 0, pw * 0.16, ph * 0.25);
      // White glove / fist
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(0, ph * 0.25, pw * 0.09, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      // 5. THE HEAD (Cap, Visor, Face, Mustache, Nose)
      this.ctx.fillStyle = skinColor;
      this.ctx.beginPath();
      this.ctx.arc(pw * 0.52, yOff + ph * 0.28, pw * 0.26, 0, Math.PI * 2);
      this.ctx.fill();

      // Cap Dome
      this.ctx.fillStyle = capColor;
      this.ctx.beginPath();
      this.ctx.arc(pw * 0.52, yOff + ph * 0.15, pw * 0.3, Math.PI, 0);
      this.ctx.fill();
      // Cap visor peak
      this.ctx.fillRect(pw * 0.38, yOff + ph * 0.12, pw * 0.42, ph * 0.05);

      // Eye
      this.ctx.fillStyle = '#002080'; // blue iris
      this.ctx.beginPath();
      this.ctx.arc(pw * 0.62, yOff + ph * 0.24, pw * 0.06, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(pw * 0.64, yOff + ph * 0.22, pw * 0.025, 0, Math.PI * 2);
      this.ctx.fill();

      // Large cute pink nose
      this.ctx.fillStyle = '#FBB58D';
      this.ctx.beginPath();
      this.ctx.arc(pw * 0.76, yOff + ph * 0.3, pw * 0.12, 0, Math.PI * 2);
      this.ctx.fill();

      // Fluffy Black Mustache
      this.ctx.fillStyle = '#111';
      this.ctx.beginPath();
      this.ctx.ellipse(pw * 0.68, yOff + ph * 0.36, pw * 0.15, ph * 0.05, 0.08, 0, Math.PI * 2);
      this.ctx.fill();
  }

  private drawNinja(pw: number, ph: number, yOff: number) {
      const isJumping = this.player.yVel !== 0;
      const frame = this.player.frame;

      // Dark shadow suit base
      this.ctx.fillStyle = '#222';
      this.ctx.beginPath();
      if (this.ctx.roundRect) {
         this.ctx.roundRect(pw * 0.18, yOff + ph * 0.2, pw * 0.64, ph * 0.6, 12);
      } else {
         this.ctx.rect(pw * 0.18, yOff + ph * 0.2, pw * 0.64, ph * 0.6);
      }
      this.ctx.fill();

      // Dynamic legs
      this.ctx.fillStyle = '#222';
      const limbCycle = Math.sin(frame) * 0.6;
      this.ctx.fillRect(pw * 0.25, yOff + ph * 0.75, pw * 0.18, ph * 0.15 + (isJumping ? -3 : Math.sin(frame)*3));
      this.ctx.fillRect(pw * 0.55, yOff + ph * 0.75, pw * 0.18, ph * 0.15 + (isJumping ? -3 : -Math.sin(frame)*3));

      // Head band
      this.ctx.fillStyle = '#FF3D00';
      this.ctx.fillRect(pw * 0.15, yOff + ph * 0.12, pw * 0.7, ph * 0.1);

      // Flowing sash
      this.ctx.strokeStyle = '#FF3D00';
      this.ctx.lineWidth = 3.5;
      this.ctx.beginPath();
      this.ctx.moveTo(pw * 0.2, yOff + ph * 0.18);
      this.ctx.quadraticCurveTo(pw * -0.15, yOff + ph * 0.3 + Math.sin(frame)*4, pw * -0.32, yOff + ph * 0.18);
      this.ctx.stroke();

      // Glowing bright cyan cyan visor eyes
      this.ctx.fillStyle = '#00E5FF';
      this.ctx.fillRect(pw * 0.5, yOff + ph * 0.15, pw * 0.3, ph * 0.05);
  }

  private drawRobot(pw: number, ph: number, yOff: number) {
      const isJumping = this.player.yVel !== 0;
      const frame = this.player.frame;

      // Silver mech torso
      this.ctx.fillStyle = '#78909C';
      this.ctx.beginPath();
      if (this.ctx.roundRect) {
          this.ctx.roundRect(pw*0.2, yOff + ph*0.14, pw*0.6, ph*0.66, 8);
      } else {
          this.ctx.rect(pw*0.2, yOff + ph*0.14, pw*0.6, ph*0.66);
      }
      this.ctx.fill();

      // Pistons foot assembly
      this.ctx.fillStyle = '#37474F';
      const extend = isJumping ? 2 : Math.sin(frame) * 4;
      this.ctx.fillRect(pw*0.28, yOff + ph*0.78, pw*0.15, ph*0.1 + extend);
      this.ctx.fillRect(pw*0.58, yOff + ph*0.78, pw*0.15, ph*0.1 - extend);

      // Cyber ruby visor
      this.ctx.fillStyle = '#FF1744';
      this.ctx.fillRect(pw*0.34, yOff + ph*0.24, pw*0.35, ph*0.08);

      const glow = (Math.sin(this.lastTime / 150) + 1)/2 * 0.7 + 0.3;
      this.ctx.fillStyle = `rgba(0, 229, 255, ${glow})`;
      this.ctx.beginPath();
      this.ctx.arc(pw*0.5, yOff + ph*0.5, pw*0.12, 0, Math.PI*2);
      this.ctx.fill();
  }

  private drawAnimal(pw: number, ph: number, yOff: number) {
      const isJumping = this.player.yVel !== 0;
      const frame = this.player.frame;

      // Green dino cute body
      this.ctx.fillStyle = '#2E7D32';
      this.ctx.beginPath();
      if (this.ctx.roundRect) {
         this.ctx.roundRect(pw*0.15, yOff + ph*0.12, pw*0.7, ph*0.72, 14);
      } else {
         this.ctx.rect(pw*0.15, yOff + ph*0.12, pw*0.7, ph*0.72);
      }
      this.ctx.fill();

      // Yellow spots
      this.ctx.fillStyle = '#FFE082';
      this.ctx.beginPath();
      this.ctx.arc(pw*0.35, yOff + ph*0.4, 5, 0, Math.PI*2);
      this.ctx.arc(pw*0.42, yOff + ph*0.6, 4, 0, Math.PI*2);
      this.ctx.fill();

      const swing = isJumping ? 0 : Math.sin(frame) * 6;
      this.ctx.fillStyle = '#1B5E20';
      this.ctx.fillRect(pw*0.28, yOff + ph*0.8, pw*0.15, ph*0.08 + swing);
      this.ctx.fillRect(pw*0.58, yOff + ph*0.8, pw*0.15, ph*0.08 - swing);

      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(pw*0.65, yOff + ph*0.28, pw*0.08, 0, Math.PI*2);
      this.ctx.fill();
      this.ctx.fillStyle = '#FFF';
      this.ctx.beginPath();
      this.ctx.arc(pw*0.62, yOff + ph*0.24, pw*0.03, 0, Math.PI*2);
      this.ctx.fill();
  }

  // Draw Shocked posed player tumbling off-screen when answer dies
  private drawSplatDeath(pw: number, ph: number, dy: number) {
      this.ctx.save();
      this.ctx.translate(100 + pw/2, dy + ph/2);
      // Spin upside down in funny fashion as he falls!
      this.ctx.rotate(this.lastTime * 0.012);
      
      const themeColor = this.avatar === 'mario' ? '#E52521' : '#333';

      // Draw stunned face/cap oval
      this.ctx.fillStyle = themeColor;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, pw * 0.35, 0, Math.PI*2);
      this.ctx.fill();

      // Shocked Peach nose/face segment on top
      this.ctx.fillStyle = '#FDD3A6';
      this.ctx.beginPath();
      this.ctx.arc(0, 2, pw * 0.28, 0, Math.PI*2);
      this.ctx.fill();

      // Cartoon Dead eyes "X X"
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2.5;
      
      const drawX = (cx: number, cy: number, size: number) => {
          this.ctx.beginPath();
          this.ctx.moveTo(cx - size, cy - size);
          this.ctx.lineTo(cx + size, cy + size);
          this.ctx.moveTo(cx + size, cy - size);
          this.ctx.lineTo(cx - size, cy + size);
          this.ctx.stroke();
      };
      drawX(-8, -4, 4);
      drawX(8, -4, 4);

      // Dropping circles open mouth
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(0, 7, 5, 0, Math.PI*2);
      this.ctx.fill();

      this.ctx.restore();
  }

  // Draw customized gorgeous vector hamburgers 🍔
  private drawBurgerItem(b: any) {
      this.ctx.save();
      const realY = b.y + Math.sin(b.waveOffset) * 5;
      this.ctx.translate(b.x, realY);

      // Outline glows
      this.ctx.shadowColor = 'rgba(243, 156, 18, 0.4)';
      this.ctx.shadowBlur = 8;

      // 1. Bottom Bun
      this.ctx.fillStyle = '#D35400';
      this.ctx.beginPath();
      if (this.ctx.roundRect) {
          this.ctx.roundRect(0, b.h - 6, b.w, 6, 2);
      } else {
          this.ctx.rect(0, b.h - 6, b.w, 6);
      }
      this.ctx.fill();

      // 2. Meat Patty
      this.ctx.fillStyle = '#5D3A1A';
      this.ctx.beginPath();
      if (this.ctx.roundRect) {
          this.ctx.roundRect(2, b.h - 11, b.w - 4, 5, 2.5);
      } else {
          this.ctx.rect(2, b.h - 11, b.w - 4, 5);
      }
      this.ctx.fill();

      // 3. Cheese layer (Yellow triangle overhangs)
      this.ctx.fillStyle = '#F1C40F';
      this.ctx.beginPath();
      this.ctx.moveTo(4, b.h - 11);
      this.ctx.lineTo(b.w - 4, b.h - 11);
      this.ctx.lineTo(b.w/2, b.h - 7);
      this.ctx.closePath();
      this.ctx.fill();

      // 4. Tomato Slice / Lettuce Wave (Rich red & emerald green)
      this.ctx.fillStyle = '#2ECC71'; // Lettuce green
      this.ctx.fillRect(1, b.h - 14, b.w - 2, 3);
      this.ctx.fillStyle = '#E74C3C'; // Red tomato chunk
      this.ctx.fillRect(6, b.h - 14, 8, 3);
      this.ctx.fillRect(b.w - 14, b.h - 14, 8, 3);

      // 5. Rounded Top Bun
      const topBunGrad = this.ctx.createLinearGradient(0, 0, 0, b.h - 14);
      topBunGrad.addColorStop(0, '#E67E22');
      topBunGrad.addColorStop(1, '#D35400');
      this.ctx.fillStyle = topBunGrad;

      this.ctx.beginPath();
      this.ctx.arc(b.w / 2, b.h - 14, b.w / 2, Math.PI, 0);
      this.ctx.fill();

      // 6. Tiny white sesame seed dots on top cap bun
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(b.w * 0.3, b.h * 0.35, 1.8, 1.2);
      this.ctx.fillRect(b.w * 0.5, b.h * 0.28, 1.8, 1.2);
      this.ctx.fillRect(b.w * 0.7, b.h * 0.4, 1.8, 1.2);

      this.ctx.restore();
  }

  // Specialized rendering for classic retro block decorations
  private drawQBlock(cx: number, cy: number) {
      const size = 32;
      this.ctx.fillStyle = '#F5B041'; // Gold cube
      this.ctx.fillRect(cx - size/2, cy - size/2, size, size);
      
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2.2;
      this.ctx.strokeRect(cx - size/2, cy - size/2, size, size);

      this.ctx.fillStyle = '#FAD7A0';
      this.ctx.fillRect(cx - size/2 + 2, cy - size/2 + 2, size - 4, 3);
      this.ctx.fillRect(cx - size/2 + 2, cy - size/2 + 2, 3, size - 4);

      this.ctx.fillStyle = '#78281F'; // Screws
      this.ctx.fillRect(cx - size/2 + 3, cy - size/2 + 3, 2, 2);
      this.ctx.fillRect(cx + size/2 - 5, cy - size/2 + 3, 2, 2);
      this.ctx.fillRect(cx - size/2 + 3, cy + size/2 - 5, 2, 2);
      this.ctx.fillRect(cx + size/2 - 5, cy + size/2 - 5, 2, 2);

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 20px "Space Grotesk", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('?', cx, cy + 1);
  }

  private drawBrickBlock(cx: number, cy: number) {
      const size = 32;
      this.ctx.fillStyle = '#B03A2E';
      this.ctx.fillRect(cx - size/2, cy - size/2, size, size);
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2.2;
      this.ctx.strokeRect(cx - size/2, cy - size/2, size, size);

      this.ctx.strokeStyle = '#5D0D00';
      this.ctx.lineWidth = 1.8;
      this.ctx.beginPath();
      this.ctx.moveTo(cx - size/2, cy);
      this.ctx.lineTo(cx + size/2, cy);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(cx - size/4, cy - size/2);
      this.ctx.lineTo(cx - size/4, cy);
      this.ctx.moveTo(cx + size/4, cy);
      this.ctx.lineTo(cx + size/4, cy + size/2);
      this.ctx.stroke();
  }

  private drawMushroom(cx: number, cy: number) {
      this.ctx.fillStyle = '#FCF3CF';
      this.ctx.beginPath();
      if (this.ctx.roundRect) {
          this.ctx.roundRect(cx - 8, cy + 4, 16, 12, 4);
      } else {
          this.ctx.rect(cx - 8, cy + 4, 16, 12);
      }
      this.ctx.fill();

      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(cx - 4, cy + 6, 2, 4);
      this.ctx.fillRect(cx + 2, cy + 6, 2, 4);

      this.ctx.fillStyle = '#E74C3C';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy + 2, 14, Math.PI, 0);
      this.ctx.fill();

      this.ctx.fillStyle = '#FFF';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy - 4, 4, 0, Math.PI*2);
      this.ctx.arc(cx - 10, cy + 1, 3, 0, Math.PI*2);
      this.ctx.arc(cx + 10, cy + 1, 3, 0, Math.PI*2);
      this.ctx.fill();
  }

  private drawRollingBush(cx: number, cy: number) {
      this.ctx.fillStyle = '#229954';
      this.ctx.beginPath();
      this.ctx.arc(cx - 14, cy, 14, 0, Math.PI * 2);
      this.ctx.arc(cx + 14, cy, 14, 0, Math.PI * 2);
      this.ctx.arc(cx, cy - 10, 16, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#145A32';
      this.ctx.lineWidth = 1.8;
      this.ctx.beginPath();
      this.ctx.arc(cx - 14, cy, 14, Math.PI * 0.75, Math.PI * 1.5);
      this.ctx.arc(cx, cy - 10, 16, Math.PI * 1.0, 0);
      this.ctx.arc(cx + 14, cy, 14, Math.PI * 1.5, Math.PI * 0.25);
      this.ctx.stroke();
  }

  private drawPipeObstacle(obs: any, groundY: number) {
      const cx = obs.x;
      const cy = groundY;
      const w = obs.w;
      const h = obs.h;

      // Piranha carnivorous teeth plant peaking out of pipe
      if (obs.plantHeight > 0) {
          const pY = groundY - h - obs.plantHeight;
          this.ctx.save();
          this.ctx.translate(cx + w/2, pY + 12);

          this.ctx.strokeStyle = '#27AE60';
          this.ctx.lineWidth = 6.2;
          this.ctx.beginPath();
          this.ctx.moveTo(0, 0);
          this.ctx.lineTo(0, obs.plantHeight + 5);
          this.ctx.stroke();

          this.ctx.fillStyle = '#1E8449';
          this.ctx.beginPath();
          this.ctx.ellipse(-10, 10, 8, 4, -0.4, 0, Math.PI*2);
          this.ctx.ellipse(10, 10, 8, 4, 0.4, 0, Math.PI*2);
          this.ctx.fill();

          // Spotted red head
          this.ctx.fillStyle = '#C0392B';
          this.ctx.beginPath();
          this.ctx.arc(0, -6, 13, 0, Math.PI * 2);
          this.ctx.fill();

          // Mouth gaping open
          this.ctx.fillStyle = '#FFF';
          this.ctx.beginPath();
          this.ctx.moveTo(-11, -4);
          this.ctx.lineTo(11, -4);
          this.ctx.lineTo(0, 2);
          this.ctx.closePath();
          this.ctx.fill();

          this.ctx.fillStyle = '#111';
          this.ctx.beginPath();
          this.ctx.moveTo(-9, -4);
          this.ctx.lineTo(9, -4);
          this.ctx.lineTo(0, -1);
          this.ctx.closePath();
          this.ctx.fill();

          // teeth spikes
          this.ctx.fillStyle = '#FFF';
          this.ctx.beginPath();
          this.ctx.moveTo(-6, -4); this.ctx.lineTo(-4, -4); this.ctx.lineTo(-5, -1);
          this.ctx.moveTo(4, -4); this.ctx.lineTo(6, -4); this.ctx.lineTo(5, -1);
          this.ctx.moveTo(-2, -1); this.ctx.lineTo(0, -4); this.ctx.lineTo(2, -1);
          this.ctx.fill();

          this.ctx.fillStyle = '#FFF';
          this.ctx.beginPath();
          this.ctx.arc(-6, -11, 2.5, 0, Math.PI*2);
          this.ctx.arc(6, -11, 2.5, 0, Math.PI*2);
          this.ctx.arc(0, -14, 3, 0, Math.PI*2);
          this.ctx.fill();

          this.ctx.restore();
      }

      // Draw high-gloss pipe structure
      const pipeGrad = this.ctx.createLinearGradient(cx, cy - h, cx + w, cy - h);
      pipeGrad.addColorStop(0, '#1E8449');
      pipeGrad.addColorStop(0.3, '#A9DFBF');
      pipeGrad.addColorStop(0.7, '#27AE60');
      pipeGrad.addColorStop(1, '#0C3D1A');

      this.ctx.fillStyle = pipeGrad;
      this.ctx.fillRect(cx - 3, cy - h, w + 6, 16);
      
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2.2;
      this.ctx.strokeRect(cx - 3, cy - h, w + 6, 16);

      this.ctx.fillRect(cx, cy - h + 16, w, h - 16);
      this.ctx.strokeRect(cx, cy - h + 16, w, h - 16);
  }

  draw() {
      const cw = this.canvas.width / (window.devicePixelRatio || 1);
      const ch = this.canvas.height / (window.devicePixelRatio || 1);
      
      if (cw === 0 || ch === 0) return;

      this.ctx.save();
      if (this.cameraShake > 0) {
          const dx = (Math.random() - 0.5) * this.cameraShake;
          const dy = (Math.random() - 0.5) * this.cameraShake;
          this.ctx.translate(dx, dy);
      }

      // Sky gradients
      const grad = this.ctx.createLinearGradient(0, 0, 0, ch);
      if (this.theme === 'space') {
          grad.addColorStop(0, '#0F0C20');
          grad.addColorStop(0.6, '#15102A');
          grad.addColorStop(1, '#080512');
      } else if (this.theme === 'jungle') {
          grad.addColorStop(0, '#042204');
          grad.addColorStop(0.6, '#0B3F0B');
          grad.addColorStop(1, '#1E5A1E');
      } else {
          // Classic Nintendo Blue
          grad.addColorStop(0, '#5C93FF');
          grad.addColorStop(1, '#94B4FF');
      }
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, cw, ch);

      // Stars under space setting
      if (this.theme === 'space') {
          this.ctx.fillStyle = '#FFF';
          for(let i=0; i<80; i++) {
              let sx = (i * 187 - this.bgScroll * 0.08) % cw;
              if (sx < 0) sx += cw;
              let sy = (i * 261) % ch;
              this.ctx.globalAlpha = 0.3 + Math.sin(this.lastTime/600 + i)*0.7;
              this.ctx.fillRect(sx, sy, 1.8, 1.8);
          }
          this.ctx.globalAlpha = 1.0;
      }

      // Beautiful distant rolling mountains with visual outline trims on default setting
      if (this.theme === 'default') {
          this.ctx.fillStyle = '#4D9B38';
          for (let i = 0; i < 4; i++) {
              let mx = (i * 320 - this.bgScroll * 0.15) % (cw + 300);
              if (mx < -150) mx += cw + 300;
              this.ctx.beginPath();
              this.ctx.arc(mx, ch - 40, 80, Math.PI, 0);
              this.ctx.fill();

              this.ctx.strokeStyle = '#326723';
              this.ctx.lineWidth = 1.8;
              this.ctx.beginPath();
              this.ctx.arc(mx, ch - 40, 80, Math.PI * 1.15, Math.PI * 1.85);
              this.ctx.stroke();
          }
      }

      // Scrolled generic background objects (Bushes, clouds, etc)
      for (const dec of this.decorations) {
          if (dec.type === 'bush') {
              this.drawRollingBush(dec.x, dec.y);
          } else if (dec.type === 'qblock') {
              this.drawQBlock(dec.x, dec.y);
          } else if (dec.type === 'brick') {
              this.drawBrickBlock(dec.x, dec.y);
          } else if (dec.type === 'mushroom') {
              this.drawMushroom(dec.x, dec.y);
          } else if (dec.type === 'cloud') {
              this.ctx.save();
              this.ctx.translate(dec.x, dec.y);
              this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              this.ctx.beginPath();
              this.ctx.arc(-22, 0, 16, 0, Math.PI * 2);
              this.ctx.arc(22, 0, 16, 0, Math.PI * 2);
              this.ctx.arc(0, -9, 21, 0, Math.PI * 2);
              this.ctx.fill();

              // Cloud eyes!
              this.ctx.fillStyle = '#000';
              this.ctx.fillRect(-6, -4, 2, 8);
              this.ctx.fillRect(4, -4, 2, 8);
              this.ctx.restore();
          }
      }

      // Draw spawned flying burgers! 🍔
      for (const b of this.burgers) {
          if (!b.collected) {
              this.drawBurgerItem(b);
          }
      }

      // Soil ground layer
      const groundY = ch - 40;
      let soilColor = '#D35400'; 
      let grassColor = '#2ECC71';

      if (this.theme === 'space') {
          soilColor = '#2C3E50';
          grassColor = '#34495E';
      } else if (this.theme === 'jungle') {
          soilColor = '#4A235A';
          grassColor = '#196F3D';
      }

      this.ctx.fillStyle = soilColor;
      this.ctx.fillRect(0, groundY, cw, 40);

      this.ctx.fillStyle = grassColor;
      this.ctx.fillRect(0, groundY, cw, 6);

      // Section dirt block dividers inside the ground template
      this.ctx.fillStyle = '#000';
      this.ctx.globalAlpha = 0.22;
      for (let i = 0; i < cw; i += 32) {
          let lineX = (i - this.bgScroll) % cw;
          if (lineX < 0) lineX += cw;
          this.ctx.fillRect(lineX, groundY, 1.5, 40);
          this.ctx.fillRect(0, groundY + 16, cw, 1.5);
      }
      this.ctx.globalAlpha = 1.0;

      // Ground shadow of character
      if (!this.player.isDying) {
          const currentH = this.player.h * this.player.scale;
          const currentW = this.player.w * this.player.scale;
          const pShadowAlpha = Math.max(0.04, 0.55 - (groundY - (this.player.y + currentH)) / 100);
          this.ctx.fillStyle = `rgba(0, 0, 0, ${pShadowAlpha})`;
          this.ctx.beginPath();
          this.ctx.ellipse(100 + currentW/2, groundY - 2, currentW * 0.5, 4.5, 0, 0, Math.PI * 2);
          this.ctx.fill();
      }

      // Draw Green pipes / Obstacles
      for (const obs of this.obstacles) {
          if (obs.type === 'pipe') {
              this.drawPipeObstacle(obs, groundY);
          } else {
              const obsGrad = this.ctx.createLinearGradient(obs.x, groundY - obs.h, obs.x, groundY);
              obsGrad.addColorStop(0, '#CB4335');
              obsGrad.addColorStop(1, '#78281F');
              this.ctx.fillStyle = obsGrad;
              this.ctx.fillRect(obs.x, groundY - obs.h, obs.w, obs.h);
              this.ctx.strokeStyle = '#000';
              this.ctx.lineWidth = 2.0;
              this.ctx.strokeRect(obs.x, groundY - obs.h, obs.w, obs.h);
          }
      }

      // Draw Character Player
      const pw = this.player.w * this.player.scale;
      const ph = this.player.h * this.player.scale;

      if (this.player.isDying) {
          // Play ultimate stunned death sequence (flying and rotating off screen)
          this.drawSplatDeath(pw, ph, this.player.deathY);
      } else {
          // Normal running and jump gaits with invulnerability flaring
          const flickerCount = Math.floor(this.playerFlicker * 3) % 2;
          if (flickerCount === 0) {
              this.ctx.save();
              this.ctx.translate(100, this.player.y);
              
              this.ctx.shadowColor = this.avatar === 'mario' ? 'rgba(231, 76, 60, 0.45)' : 'rgba(0, 229, 255, 0.45)';
              this.ctx.shadowBlur = 10;

              let yOff = 0;
              if (this.player.yVel === 0) {
                  // subtle bobbing animation proportional to speed multiplier
                  yOff = Math.sin(this.player.frame) * 4.5 * this.player.scale;
              }

              if (this.avatar === 'mario') {
                  this.drawMario(pw, ph, yOff);
              } else if (this.avatar === 'ninja') {
                  this.drawNinja(pw, ph, yOff);
              } else if (this.avatar === 'robot') {
                  this.drawRobot(pw, ph, yOff);
              } else if (this.avatar === 'animal') {
                  this.drawAnimal(pw, ph, yOff);
              }

              this.ctx.restore();
          }
      }

      // Sparks and feedback particles
      for (const p of this.particles) {
          this.ctx.globalAlpha = Math.max(0, p.life);
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size || 5, 0, Math.PI*2);
          this.ctx.fill();
      }
      this.ctx.globalAlpha = 1.0;

      // Realistic Ambient Vignette Lighting (Darkening edges, retro depth contrast)
      const vignette = this.ctx.createRadialGradient(cw*0.5, ch*0.5, cw*0.4, cw*0.5, ch*0.5, cw*0.85);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
      this.ctx.fillStyle = vignette;
      this.ctx.fillRect(0, 0, cw, ch);

      this.ctx.restore();
  }
}
