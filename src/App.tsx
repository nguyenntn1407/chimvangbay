import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { soundFX } from './audio/soundEffects';
import { MedalBadge } from './components/MedalBadge';
import { YellowBirdEmblem } from './components/YellowBirdEmblem';
import {
  BIRD_RADIUS,
  BIRD_X,
  Cloud,
  DIFFICULTIES,
  DifficultyMode,
  GAME_HEIGHT,
  GAME_WIDTH,
  GameState,
  MAX_PIPE_BOTTOM_MARGIN,
  MIN_PIPE_TOP,
  PIPE_WIDTH,
  PLAYABLE_HEIGHT,
  Particle,
  Pipe,
} from './game/constants';
import { drawGameFrame } from './game/renderer';

const BEST_SCORE_PREFIX = 'chim_vang_best_';

function loadBestScore(mode: DifficultyMode): number {
  try {
    const raw = localStorage.getItem(`${BEST_SCORE_PREFIX}${mode}`);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(mode: DifficultyMode, score: number) {
  try {
    localStorage.setItem(`${BEST_SCORE_PREFIX}${mode}`, String(score));
  } catch {
    // Ignore storage errors in private browsing
  }
}

function createInitialClouds(): Cloud[] {
  return [
    { x: 54, y: 92, scale: 0.9, speed: 16 },
    { x: 220, y: 148, scale: 0.68, speed: 11 },
    { x: 376, y: 78, scale: 1.05, speed: 20 },
    { x: 470, y: 180, scale: 0.75, speed: 13 },
  ];
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [difficulty, setDifficulty] = useState<DifficultyMode>('normal');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => loadBestScore('normal'));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [muted, setMuted] = useState(false);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });

  // Mutable simulation state inside ref for zero-jitter 60fps/120fps loop
  const simRef = useRef({
    state: 'TITLE_MENU' as GameState,
    difficulty: 'normal' as DifficultyMode,
    birdY: PLAYABLE_HEIGHT * 0.44,
    birdVy: 0,
    birdRotation: 0,
    wingPhase: 0,
    isDead: false,
    deadTimestamp: 0,
    pipes: [] as Pipe[],
    clouds: createInitialClouds(),
    particles: [] as Particle[],
    spawnTimer: 0,
    groundOffset: 0,
    skylineOffset: 0,
    flashAlpha: 0,
    shakeTime: 0,
    wasShaking: false,
    score: 0,
    bestScore: loadBestScore('normal'),
    idleClock: 0,
  });

  // Sync difficulty changes
  const handleSelectDifficulty = useCallback((nextMode: DifficultyMode) => {
    setDifficulty(nextMode);
    simRef.current.difficulty = nextMode;
    const saved = loadBestScore(nextMode);
    simRef.current.bestScore = saved;
    setBestScore(saved);

    // If currently on game over or paused, cleanly return to title menu with new preset
    if (simRef.current.state !== 'PLAYING') {
      simRef.current.state = 'TITLE_MENU';
      simRef.current.pipes = [];
      simRef.current.particles = [];
      simRef.current.birdY = PLAYABLE_HEIGHT * 0.44;
      simRef.current.birdVy = 0;
      simRef.current.birdRotation = 0;
      simRef.current.isDead = false;
      simRef.current.score = 0;
      setScore(0);
      setIsNewRecord(false);
      setGameState('TITLE_MENU');
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundFX.setMuted(next);
      return next;
    });
  }, []);

  const spawnFlapParticles = (x: number, y: number) => {
    const colors = ['#FEF9C3', '#FDE047', '#FFFFFF'];
    for (let i = 0; i < 5; i++) {
      simRef.current.particles.push({
        x: x - 12 + (Math.random() - 0.5) * 8,
        y: y + 4 + (Math.random() - 0.5) * 8,
        vx: -55 - Math.random() * 65,
        vy: 30 + (Math.random() - 0.5) * 70,
        radius: 2.2 + Math.random() * 2.5,
        alpha: 0.9,
        color: colors[i % colors.length],
        life: 0,
        maxLife: 0.34 + Math.random() * 0.16,
      });
    }
  };

  const resetForNewRun = useCallback((startImmediately: boolean) => {
    const sim = simRef.current;
    const cfg = DIFFICULTIES[sim.difficulty];

    sim.birdY = PLAYABLE_HEIGHT * 0.44;
    sim.birdVy = startImmediately ? cfg.jumpVelocity : 0;
    sim.birdRotation = startImmediately ? -0.42 : 0;
    sim.isDead = false;
    sim.deadTimestamp = 0;
    sim.pipes = [];
    sim.particles = [];
    sim.spawnTimer = cfg.pipeSpawnInterval * 0.45;
    sim.flashAlpha = 0;
    sim.shakeTime = 0;
    sim.score = 0;

    setScore(0);
    setIsNewRecord(false);

    if (startImmediately) {
      sim.state = 'PLAYING';
      setGameState('PLAYING');
      spawnFlapParticles(BIRD_X, sim.birdY);
      soundFX.playFlap();
    } else {
      sim.state = 'TITLE_MENU';
      setGameState('TITLE_MENU');
    }
  }, []);

  const flap = useCallback(() => {
    const sim = simRef.current;
    const cfg = DIFFICULTIES[sim.difficulty];

    if (sim.state === 'TITLE_MENU') {
      resetForNewRun(true);
      return;
    }

    if (sim.state === 'PAUSED') {
      sim.state = 'PLAYING';
      setGameState('PLAYING');
      return;
    }

    if (sim.state === 'GAME_OVER') {
      // Brief 350ms guard so accidental frantic clicks right at crash don't skip results
      if (performance.now() - sim.deadTimestamp > 350) {
        resetForNewRun(true);
      }
      return;
    }

    if (sim.state === 'PLAYING' && !sim.isDead) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      sim.birdVy = cfg.jumpVelocity;
      sim.birdRotation = -0.44;
      sim.wingPhase = 1.2;
      spawnFlapParticles(BIRD_X, sim.birdY);
      soundFX.playFlap();
    }
  }, [resetForNewRun]);

  const togglePause = useCallback(() => {
    const sim = simRef.current;
    if (sim.state === 'PLAYING' && !sim.isDead) {
      sim.state = 'PAUSED';
      setGameState('PAUSED');
    } else if (sim.state === 'PAUSED') {
      sim.state = 'PLAYING';
      setGameState('PLAYING');
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        flap();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        togglePause();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'Enter' && simRef.current.state === 'GAME_OVER') {
        e.preventDefault();
        if (performance.now() - simRef.current.deadTimestamp > 350) {
          resetForNewRun(true);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flap, togglePause, toggleMute, resetForNewRun]);

  // Main requestAnimationFrame loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configure high-DPI backing store
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = GAME_WIDTH * dpr;
    canvas.height = GAME_HEIGHT * dpr;

    let rafId = 0;
    let lastTime = performance.now();

    const triggerCrash = () => {
      const sim = simRef.current;
      if (sim.isDead) return;
      sim.isDead = true;
      sim.deadTimestamp = performance.now();
      sim.flashAlpha = 0.72;
      sim.shakeTime = 0.22;
      soundFX.playHit();

      if (sim.score > sim.bestScore) {
        sim.bestScore = sim.score;
        saveBestScore(sim.difficulty, sim.score);
        setBestScore(sim.score);
        setIsNewRecord(true);
      }

      sim.state = 'GAME_OVER';
      setGameState('GAME_OVER');
    };

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const sim = simRef.current;
      const cfg = DIFFICULTIES[sim.difficulty];

      // Update clouds always (except when paused)
      if (sim.state !== 'PAUSED') {
        for (const c of sim.clouds) {
          c.x -= c.speed * dt;
          if (c.x < -110) {
            c.x = GAME_WIDTH + 70;
            c.y = 58 + Math.random() * 145;
          }
        }
      }

      // Flash decay
      if (sim.flashAlpha > 0) {
        sim.flashAlpha = Math.max(0, sim.flashAlpha - dt * 3.2);
      }

      // Shake decay
      if (sim.shakeTime > 0) {
        sim.shakeTime = Math.max(0, sim.shakeTime - dt);
        sim.wasShaking = true;
        const mag = (sim.shakeTime / 0.22) * 7;
        setShakeOffset({
          x: (Math.random() - 0.5) * mag * 2,
          y: (Math.random() - 0.5) * mag * 2,
        });
      } else if (sim.wasShaking) {
        sim.wasShaking = false;
        setShakeOffset({ x: 0, y: 0 });
      }

      // Particles update
      if (sim.state !== 'PAUSED') {
        for (let i = sim.particles.length - 1; i >= 0; i--) {
          const p = sim.particles[i];
          p.life += dt;
          if (p.life >= p.maxLife) {
            sim.particles.splice(i, 1);
            continue;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.alpha = 1 - p.life / p.maxLife;
        }
      }

      if (sim.state === 'TITLE_MENU') {
        sim.idleClock += dt;
        sim.wingPhase += dt * 11;
        sim.birdY = PLAYABLE_HEIGHT * 0.44 + Math.sin(sim.idleClock * 3.4) * 9;
        sim.birdRotation = Math.sin(sim.idleClock * 3.4) * 0.06;
        sim.groundOffset += cfg.pipeSpeed * 0.55 * dt;
        sim.skylineOffset += cfg.pipeSpeed * 0.14 * dt;
      } else if (sim.state === 'PLAYING') {
        sim.wingPhase += dt * (sim.birdVy < 0 ? 18 : 10);
        sim.groundOffset += cfg.pipeSpeed * dt;
        sim.skylineOffset += cfg.pipeSpeed * 0.24 * dt;

        // Bird physics
        sim.birdVy += cfg.gravity * dt;
        sim.birdVy = Math.min(sim.birdVy, 680);
        sim.birdY += sim.birdVy * dt;

        // Prevent flying above screen ceiling cleanly
        if (sim.birdY < BIRD_RADIUS + 4) {
          sim.birdY = BIRD_RADIUS + 4;
          sim.birdVy = Math.max(0, sim.birdVy);
        }

        // Smooth pitch rotation based on vertical velocity
        const targetRot =
          sim.birdVy < 110
            ? -0.42
            : Math.min(Math.PI * 0.46, ((sim.birdVy - 110) / 480) * (Math.PI * 0.46));
        sim.birdRotation += (targetRot - sim.birdRotation) * Math.min(1, dt * 10);

        // Spawn pipes
        sim.spawnTimer += dt;
        if (sim.spawnTimer >= cfg.pipeSpawnInterval) {
          sim.spawnTimer = 0;
          const minTop = MIN_PIPE_TOP;
          const maxTop = PLAYABLE_HEIGHT - cfg.pipeGap - MAX_PIPE_BOTTOM_MARGIN;
          const topHeight = minTop + Math.random() * Math.max(20, maxTop - minTop);
          sim.pipes.push({
            x: GAME_WIDTH + 16,
            topHeight,
            gap: cfg.pipeGap,
            passed: false,
          });
        }

        // Move pipes & check scoring + collision
        for (let i = sim.pipes.length - 1; i >= 0; i--) {
          const pipe = sim.pipes[i];
          pipe.x -= cfg.pipeSpeed * dt;

          // Score check
          if (!pipe.passed && pipe.x + PIPE_WIDTH / 2 < BIRD_X) {
            pipe.passed = true;
            sim.score += 1;
            setScore(sim.score);
            soundFX.playScore(sim.score > 0 && sim.score % 10 === 0);
          }

          // Circle-vs-AABB collision with forgiving radius
          const hitRadius = BIRD_RADIUS - 2;
          const withinPipeX =
            BIRD_X + hitRadius > pipe.x && BIRD_X - hitRadius < pipe.x + PIPE_WIDTH;

          if (withinPipeX) {
            const hitsTop = sim.birdY - hitRadius < pipe.topHeight;
            const hitsBottom = sim.birdY + hitRadius > pipe.topHeight + pipe.gap;
            if (hitsTop || hitsBottom) {
              triggerCrash();
            }
          }

          // Remove off-screen pipes
          if (pipe.x + PIPE_WIDTH < -30) {
            sim.pipes.splice(i, 1);
          }
        }

        // Ground collision
        if (sim.birdY + BIRD_RADIUS >= PLAYABLE_HEIGHT) {
          sim.birdY = PLAYABLE_HEIGHT - BIRD_RADIUS;
          triggerCrash();
        }
      } else if (sim.state === 'GAME_OVER') {
        // Let the crashed bird fall smoothly onto the grass if hit mid-air
        if (sim.birdY + BIRD_RADIUS < PLAYABLE_HEIGHT) {
          sim.birdVy += 1500 * dt;
          sim.birdY = Math.min(PLAYABLE_HEIGHT - BIRD_RADIUS, sim.birdY + sim.birdVy * dt);
          sim.birdRotation = Math.min(Math.PI * 0.48, sim.birdRotation + dt * 5);
        }
      }

      // Render frame
      ctx.save();
      ctx.scale(dpr, dpr);
      drawGameFrame({
        ctx,
        birdX: BIRD_X,
        birdY: sim.birdY,
        birdRotation: sim.birdRotation,
        wingPhase: sim.wingPhase,
        isDead: sim.isDead,
        pipes: sim.pipes,
        clouds: sim.clouds,
        particles: sim.particles,
        groundOffset: sim.groundOffset,
        skylineOffset: sim.skylineOffset,
        flashAlpha: sim.flashAlpha,
      });
      ctx.restore();

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col bg-slate-100 text-slate-900 select-none">
      {/* Clean Single-Row Top Bar */}
      <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <YellowBirdEmblem size={30} />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              Chim Vàng
            </span>
          </div>

          {/* Difficulty Segmented Control */}
          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
            role="group"
            aria-label="Chọn tốc độ"
          >
            {(['easy', 'normal', 'fast'] as DifficultyMode[]).map((mode) => {
              const active = difficulty === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleSelectDifficulty(mode)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {DIFFICULTIES[mode].label}
                </button>
              );
            })}
          </div>

          {/* Utility Actions: Sound & Pause */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              title={muted ? 'Bật âm thanh (M)' : 'Tắt âm thanh (M)'}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
              <button
                type="button"
                onClick={togglePause}
                aria-label={gameState === 'PAUSED' ? 'Tiếp tục' : 'Tạm dừng'}
                title={gameState === 'PAUSED' ? 'Tiếp tục (P)' : 'Tạm dừng (P)'}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
              >
                {gameState === 'PAUSED' ? (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Tiếp tục</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Tạm dừng</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Centered Arcade Arena */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4 sm:py-6">
        <div
          className="relative w-full max-w-[460px] h-[min(76dvh,620px)] aspect-[3/4] rounded-2xl overflow-hidden shadow-xl border border-slate-300/80 bg-sky-300 touch-manipulation"
          style={{
            transform: `translate3d(${shakeOffset.x}px, ${shakeOffset.y}px, 0)`,
          }}
        >
          {/* Interactive Game Canvas */}
          <canvas
            ref={canvasRef}
            onPointerDown={(e) => {
              e.preventDefault();
              flap();
            }}
            className="block w-full h-full cursor-pointer touch-none"
            aria-label="Màn hình trò chơi Chim Vàng"
          />

          {/* Live Score HUD during Playing */}
          {gameState === 'PLAYING' && (
            <div className="pointer-events-none absolute top-5 inset-x-0 flex justify-center">
              <span
                className="font-display font-extrabold text-5xl text-white tracking-tight tabular-nums"
                style={{
                  textShadow:
                    '0 3px 0 #0F172A, -2px -2px 0 #0F172A, 2px -2px 0 #0F172A, -2px 2px 0 #0F172A, 2px 2px 0 #0F172A',
                }}
              >
                {score}
              </span>
            </div>
          )}

          {/* TITLE MENU OVERLAY */}
          {gameState === 'TITLE_MENU' && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between py-10 px-6">
              <div className="text-center mt-2">
                <h1
                  className="font-display text-4xl sm:text-[42px] font-extrabold tracking-tight text-white leading-tight"
                  style={{
                    textShadow:
                      '0 3px 0 #0F172A, -2px -2px 0 #0F172A, 2px -2px 0 #0F172A, -2px 2px 0 #0F172A, 2px 2px 0 #0F172A',
                  }}
                >
                  Chim Vàng
                </h1>
                <p className="mt-2 text-sm font-semibold text-slate-900 bg-white/85 backdrop-blur-xs px-3.5 py-1 rounded-lg inline-block shadow-xs">
                  Kỷ lục ({DIFFICULTIES[difficulty].label}):{' '}
                  <span className="font-mono-score font-bold">{bestScore}</span>
                </p>
              </div>

              <div className="pointer-events-auto flex flex-col items-center gap-3 mb-14">
                <button
                  type="button"
                  onClick={() => resetForNewRun(true)}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 text-slate-950 font-display font-bold text-lg shadow-md border-2 border-slate-900 transition-all cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                >
                  <Play className="w-5 h-5 fill-slate-950" />
                  <span>Bắt Đầu Chơi</span>
                </button>
                <p className="text-xs sm:text-sm font-medium text-slate-900 bg-white/85 px-3 py-1.5 rounded-lg text-center shadow-xs">
                  Nhấn phím <kbd className="font-mono-score font-bold">Space</kbd>,{' '}
                  <kbd className="font-mono-score font-bold">↑</kbd> hoặc chạm màn hình để bay
                </p>
              </div>
            </div>
          )}

          {/* PAUSED OVERLAY */}
          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] flex items-center justify-center p-6">
              <div className="w-full max-w-xs bg-white rounded-2xl p-6 shadow-xl border border-slate-200 text-center">
                <h2 className="font-display text-2xl font-bold text-slate-900">Tạm Dừng</h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  Điểm hiện tại: <span className="font-mono-score font-bold text-slate-900">{score}</span>
                </p>

                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={togglePause}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm border border-slate-900 transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Tiếp Tục</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => resetForNewRun(false)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Về Màn Hình Chính</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GAME OVER OVERLAY */}
          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-slate-950/35 flex items-center justify-center p-5">
              <div className="w-full max-w-xs bg-white rounded-2xl p-6 shadow-xl border-2 border-slate-900">
                <div className="text-center">
                  <h2 className="font-display text-2xl font-extrabold text-slate-900">
                    Kết Thúc
                  </h2>
                  {isNewRecord && (
                    <p className="mt-1 text-xs font-bold text-amber-600">
                      Kỷ lục mới ở chế độ {DIFFICULTIES[difficulty].label}!
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 py-4 border-y border-slate-200">
                  <div className="flex-1 flex justify-center">
                    <MedalBadge score={score} />
                  </div>

                  <div className="flex-1 flex flex-col gap-3 text-right">
                    <div>
                      <div className="text-xs font-medium text-slate-500">Điểm</div>
                      <div className="font-mono-score text-2xl font-bold text-slate-900">
                        {score}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500">Kỷ lục</div>
                      <div className="font-mono-score text-xl font-bold text-slate-900">
                        {bestScore}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => resetForNewRun(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 text-slate-950 font-display font-bold text-base border-2 border-slate-900 transition-all cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Chơi Lại</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quiet Single-Line Control Hint Below Canvas */}
        <p className="mt-3 text-xs text-slate-500 text-center">
          Chế độ {DIFFICULTIES[difficulty].label}
          <span aria-hidden="true" className="mx-2">·</span>
          Kỷ lục: <span className="font-mono-score font-semibold text-slate-700">{bestScore}</span>
          <span aria-hidden="true" className="mx-2">·</span>
          Phím tắt: Space để bay, P tạm dừng, M tắt tiếng
        </p>
      </main>
    </div>
  );
}
