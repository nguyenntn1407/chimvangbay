import {
  Cloud,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_HEIGHT,
  PIPE_CAP_HEIGHT,
  PIPE_CAP_OVERHANG,
  PIPE_WIDTH,
  PLAYABLE_HEIGHT,
  Particle,
  Pipe,
} from './constants';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  birdX: number;
  birdY: number;
  birdRotation: number; // radians
  wingPhase: number;
  isDead: boolean;
  pipes: Pipe[];
  clouds: Cloud[];
  particles: Particle[];
  groundOffset: number;
  skylineOffset: number;
  flashAlpha: number;
}

export function drawGameFrame(rc: RenderContext) {
  const { ctx } = rc;

  // 1. Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, PLAYABLE_HEIGHT);
  skyGrad.addColorStop(0, '#38BDF8');
  skyGrad.addColorStop(0.62, '#7DD3FC');
  skyGrad.addColorStop(1, '#E0F2FE');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, GAME_WIDTH, PLAYABLE_HEIGHT);

  // Soft sun glow
  const sunGrad = ctx.createRadialGradient(GAME_WIDTH - 86, 84, 8, GAME_WIDTH - 86, 84, 96);
  sunGrad.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
  sunGrad.addColorStop(0.35, 'rgba(254, 240, 138, 0.35)');
  sunGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(GAME_WIDTH - 86, 84, 96, 0, Math.PI * 2);
  ctx.fill();

  // 2. Fluffy vector clouds
  for (const cloud of rc.clouds) {
    drawCloud(ctx, cloud.x, cloud.y, cloud.scale);
  }

  // 3. Distant skyline & soft rolling hills
  drawDistantScenery(ctx, rc.skylineOffset);

  // 4. Pipes
  for (const pipe of rc.pipes) {
    drawPipePair(ctx, pipe);
  }

  // 5. Particles (feathers / air puffs)
  for (const p of rc.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 6. Scrolling Ground
  drawGround(ctx, rc.groundOffset);

  // 7. Yellow Bird (drawn on top of ground edge cleanly)
  drawYellowBird(ctx, rc.birdX, rc.birdY, rc.birdRotation, rc.wingPhase, rc.isDead);

  // 8. Collision Flash Overlay
  if (rc.flashAlpha > 0.01) {
    ctx.fillStyle = `rgba(255, 255, 255, ${rc.flashAlpha})`;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.arc(22, -6, 26, 0, Math.PI * 2);
  ctx.arc(48, -2, 21, 0, Math.PI * 2);
  ctx.arc(64, 6, 15, 0, Math.PI * 2);
  ctx.arc(-18, 6, 15, 0, Math.PI * 2);
  ctx.rect(-18, 4, 82, 17);
  ctx.fill();

  ctx.restore();
}

function drawDistantScenery(ctx: CanvasRenderingContext2D, offset: number) {
  const tileWidth = 240;
  const baseY = PLAYABLE_HEIGHT;

  // Far soft city silhouettes
  ctx.fillStyle = 'rgba(186, 230, 253, 0.72)';
  const buildings = [
    { x: 10, w: 34, h: 88 },
    { x: 50, w: 44, h: 120 },
    { x: 102, w: 28, h: 74 },
    { x: 138, w: 48, h: 105 },
    { x: 194, w: 36, h: 82 },
  ];

  for (let repeat = -1; repeat <= Math.ceil(GAME_WIDTH / tileWidth) + 1; repeat++) {
    const originX = repeat * tileWidth - (offset % tileWidth);
    for (const b of buildings) {
      ctx.fillRect(originX + b.x, baseY - b.h, b.w, b.h);
    }
  }

  // Midground lush mint hills
  const hillTile = 160;
  ctx.fillStyle = '#A7F3D0';
  for (let repeat = -1; repeat <= Math.ceil(GAME_WIDTH / hillTile) + 1; repeat++) {
    const ox = repeat * hillTile - ((offset * 1.45) % hillTile);
    ctx.beginPath();
    ctx.arc(ox + 44, baseY + 6, 56, Math.PI, 0);
    ctx.arc(ox + 124, baseY + 8, 48, Math.PI, 0);
    ctx.lineTo(ox + hillTile + 20, baseY);
    ctx.lineTo(ox - 20, baseY);
    ctx.closePath();
    ctx.fill();
  }

  // Crisp bush hedge silhouette
  const bushTile = 120;
  ctx.fillStyle = '#6EE7B7';
  for (let repeat = -1; repeat <= Math.ceil(GAME_WIDTH / bushTile) + 1; repeat++) {
    const ox = repeat * bushTile - ((offset * 1.9) % bushTile);
    ctx.beginPath();
    ctx.arc(ox + 20, baseY + 2, 24, Math.PI, 0);
    ctx.arc(ox + 52, baseY + 2, 30, Math.PI, 0);
    ctx.arc(ox + 88, baseY + 2, 22, Math.PI, 0);
    ctx.lineTo(ox + bushTile, baseY);
    ctx.lineTo(ox, baseY);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPipePair(ctx: CanvasRenderingContext2D, pipe: Pipe) {
  const { x, topHeight, gap } = pipe;
  const bottomY = topHeight + gap;
  const bottomHeight = PLAYABLE_HEIGHT - bottomY;

  // Top pipe shaft
  if (topHeight > PIPE_CAP_HEIGHT) {
    drawPipeSegment(ctx, x, 0, PIPE_WIDTH, topHeight - PIPE_CAP_HEIGHT);
  }
  // Top pipe cap
  drawPipeSegment(
    ctx,
    x - PIPE_CAP_OVERHANG,
    topHeight - PIPE_CAP_HEIGHT,
    PIPE_WIDTH + PIPE_CAP_OVERHANG * 2,
    PIPE_CAP_HEIGHT,
    true
  );

  // Bottom pipe cap
  drawPipeSegment(
    ctx,
    x - PIPE_CAP_OVERHANG,
    bottomY,
    PIPE_WIDTH + PIPE_CAP_OVERHANG * 2,
    PIPE_CAP_HEIGHT,
    true
  );
  // Bottom pipe shaft
  if (bottomHeight > PIPE_CAP_HEIGHT) {
    drawPipeSegment(
      ctx,
      x,
      bottomY + PIPE_CAP_HEIGHT,
      PIPE_WIDTH,
      bottomHeight - PIPE_CAP_HEIGHT
    );
  }
}

function drawPipeSegment(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isCap = false
) {
  if (h <= 0) return;

  // Base vibrant emerald fill
  ctx.fillStyle = '#22C55E';
  ctx.fillRect(x, y, w, h);

  // Left bright specular band
  ctx.fillStyle = '#86EFAC';
  ctx.fillRect(x + 7, y, 10, h);
  ctx.fillStyle = '#4ADE80';
  ctx.fillRect(x + 19, y, 5, h);

  // Right shadow band
  ctx.fillStyle = '#16A34A';
  ctx.fillRect(x + w - 16, y, 8, h);
  ctx.fillStyle = '#15803D';
  ctx.fillRect(x + w - 8, y, 8, h);

  // Subtle top/bottom lip shadow for cap
  if (isCap) {
    ctx.fillStyle = 'rgba(20, 83, 45, 0.14)';
    ctx.fillRect(x, y + h - 4, w, 4);
  }

  // Crisp dark outline
  ctx.strokeStyle = '#14532D';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawGround(ctx: CanvasRenderingContext2D, offset: number) {
  const y = PLAYABLE_HEIGHT;

  // Sandy earth base
  ctx.fillStyle = '#F3D08A';
  ctx.fillRect(0, y, GAME_WIDTH, GROUND_HEIGHT);

  // Subtle lower earth tone
  ctx.fillStyle = '#E5B968';
  ctx.fillRect(0, y + 32, GAME_WIDTH, GROUND_HEIGHT - 32);

  // Lush grass strip on top
  const grassHeight = 20;
  ctx.fillStyle = '#65A30D';
  ctx.fillRect(0, y, GAME_WIDTH, grassHeight);

  // Bright grass highlight line
  ctx.fillStyle = '#84CC16';
  ctx.fillRect(0, y + 2, GAME_WIDTH, 6);

  // Scrolling diagonal chevron stripes inside grass strip
  const stripeStep = 28;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y + 4, GAME_WIDTH, grassHeight - 6);
  ctx.clip();

  ctx.fillStyle = '#4D7C0F';
  const shift = offset % stripeStep;
  for (let sx = -stripeStep; sx < GAME_WIDTH + stripeStep; sx += stripeStep) {
    ctx.beginPath();
    ctx.moveTo(sx - shift, y + grassHeight);
    ctx.lineTo(sx - shift + 10, y + 4);
    ctx.lineTo(sx - shift + 18, y + 4);
    ctx.lineTo(sx - shift + 8, y + grassHeight);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Crisp top border & grass-to-earth divider
  ctx.fillStyle = '#365314';
  ctx.fillRect(0, y, GAME_WIDTH, 2.5);
  ctx.fillStyle = '#B45309';
  ctx.fillRect(0, y + grassHeight, GAME_WIDTH, 2.5);
}

function drawYellowBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  wingPhase: number,
  isDead: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Tail feathers (left)
  ctx.fillStyle = '#EAB308';
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.lineTo(-26, -7);
  ctx.lineTo(-23, 0);
  ctx.lineTo(-27, 5);
  ctx.lineTo(-15, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Main rounded bird body (bright golden yellow)
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Warm cream-yellow belly highlight
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 15, 0, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.ellipse(2, 7, 16, 10, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // Soft golden crown highlight
  ctx.fillStyle = '#FDE047';
  ctx.beginPath();
  ctx.ellipse(-2, -10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body crisp outline
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 16, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle rosy cheek
  ctx.fillStyle = 'rgba(251, 113, 133, 0.45)';
  ctx.beginPath();
  ctx.ellipse(6, 5, 4, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Expressive eye
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(8, -5, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1E293B';
  ctx.stroke();

  if (isDead) {
    // Comical X eye when crashed
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(5.8, -7.2);
    ctx.lineTo(10.2, -2.8);
    ctx.moveTo(10.2, -7.2);
    ctx.lineTo(5.8, -2.8);
    ctx.stroke();
  } else {
    // Crisp dark pupil + white catchlight
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(9.8, -5, 2.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(10.8, -6.2, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Two-part orange beak
  // Upper beak
  ctx.fillStyle = '#F97316';
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(14, -2);
  ctx.quadraticCurveTo(26, -2, 26, 2);
  ctx.lineTo(14, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lower beak
  ctx.fillStyle = '#EA580C';
  ctx.beginPath();
  ctx.moveTo(14, 3);
  ctx.lineTo(24, 3);
  ctx.quadraticCurveTo(23, 8, 14, 7.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Animated flapping wing
  const wingOffsetY = Math.sin(wingPhase) * 4.5;
  const wingTilt = Math.sin(wingPhase) * 0.42;

  ctx.save();
  ctx.translate(-5, 2 + wingOffsetY * 0.45);
  ctx.rotate(wingTilt);

  ctx.fillStyle = '#FEF9C3';
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 10.5, 6.8, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Wing feather shading
  ctx.fillStyle = '#FDE047';
  ctx.beginPath();
  ctx.ellipse(-1, 1.5, 7, 3.2, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}
