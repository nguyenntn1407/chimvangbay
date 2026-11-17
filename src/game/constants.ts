export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type DifficultyMode = 'easy' | 'normal' | 'fast';

export interface DifficultyConfig {
  id: DifficultyMode;
  label: string;
  pipeSpeed: number; // px per second
  pipeGap: number; // vertical opening px
  pipeSpawnInterval: number; // seconds
  gravity: number; // px/s^2
  jumpVelocity: number; // px/s (negative = upward)
}

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 640;
export const GROUND_HEIGHT = 96;
export const PLAYABLE_HEIGHT = GAME_HEIGHT - GROUND_HEIGHT;

export const BIRD_X = 128;
export const BIRD_RADIUS = 16; // forgiving hitbox radius

export const PIPE_WIDTH = 68;
export const PIPE_CAP_HEIGHT = 26;
export const PIPE_CAP_OVERHANG = 5;
export const MIN_PIPE_TOP = 64;
export const MAX_PIPE_BOTTOM_MARGIN = 64;

export const DIFFICULTIES: Record<DifficultyMode, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Dễ',
    pipeSpeed: 155,
    pipeGap: 168,
    pipeSpawnInterval: 1.75,
    gravity: 1180,
    jumpVelocity: -395,
  },
  normal: {
    id: 'normal',
    label: 'Chuẩn',
    pipeSpeed: 185,
    pipeGap: 146,
    pipeSpawnInterval: 1.48,
    gravity: 1360,
    jumpVelocity: -425,
  },
  fast: {
    id: 'fast',
    label: 'Nhanh',
    pipeSpeed: 225,
    pipeGap: 132,
    pipeSpawnInterval: 1.24,
    gravity: 1560,
    jumpVelocity: -450,
  },
};

export interface Pipe {
  x: number;
  topHeight: number;
  gap: number;
  passed: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
}
