import Matter from 'matter-js';

const RandomValue = Math.random;

// ═══════════════════════════════════════════════════════════════
//  Interfaces
// ═══════════════════════════════════════════════════════════════

interface ICarrotBody extends Matter.Body {
  circleRadius: number;
}

interface ICarrot {
  body: ICarrotBody;
  glyph: string;
  hue: number;
  id: string;
}

interface IParticle {
  hue: number;
  life: number;
  maxLife: number;
  size: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

interface IFloatingText {
  hue: number;
  life: number;
  maxLife: number;
  size: number;
  text: string;
  vy: number;
  x: number;
  y: number;
}

interface IGravityWell {
  life: number;
  maxLife: number;
  strength: number;
  x: number;
  y: number;
}

type SpawnPattern = 'single' | 'rain' | 'fountain' | 'spiral' | 'firework' | 'follow';

// ═══════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════

const CARROT_RADIUS = 18;
const CARROT_MAX = 500;
const START_Y = -150;
const PADDING = 20;
const CARROT_SIZE = 4;
const BOUNDS_BOUNCE = 0.85;
const FONT_FAMILY = '"Pretendard", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
const CARROT_FLAGS = { ACTIVE: 1 } as const;
const ANGLE_PRECISION = 360;
const TWO_PI = Math.PI * 2;

const PARTICLE_MAX = 300;
const TRAIL_LENGTH = 6;
const COMBO_TIMEOUT = 800;
/** 클릭 연출 지속 시간(단위 개수). 스케일 펄스 10, 무지개 25 (×50ms) */
const CLICK_EFFECT_SCALE_UNITS = 10;
const CLICK_EFFECT_RAINBOW_UNITS = 25;
const CLICK_EFFECT_UNIT_MS = 50;
const SHAKE_DURATION = 300;
const ATTRACT_RADIUS = 250;
const ATTRACT_FORCE = 0.003;
const DEFAULT_GLYPH = '🥕';

// ═══════════════════════════════════════════════════════════════
//  Trig Lookup Tables & Body Pool
// ═══════════════════════════════════════════════════════════════

const SIN_TABLE: number[] = [];
const COS_TABLE: number[] = [];
const BODY_POOL: ICarrotBody[] = [];

for (let i = 0; i < ANGLE_PRECISION; i++) {
  const rad = (i * TWO_PI) / ANGLE_PRECISION;
  SIN_TABLE[i] = Math.sin(rad);
  COS_TABLE[i] = Math.cos(rad);
}

// ═══════════════════════════════════════════════════════════════
//  Typed Arrays
// ═══════════════════════════════════════════════════════════════

const flags = new Uint8Array(CARROT_MAX);
const clickCounts = new Uint8Array(CARROT_MAX);
const lastClickTimes = new Float64Array(CARROT_MAX);

// ═══════════════════════════════════════════════════════════════
//  Module State
// ═══════════════════════════════════════════════════════════════

let engine: Matter.Engine | null = null;
let world: Matter.World | null = null;
let bodies: (ICarrot | null)[] = new Array(CARROT_MAX).fill(null);
let count = 0;
let frameId: number | null = null;
let isInitialized = false;
let eventDelegationSetup = false;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let lastUpdateTime = 0;
let mousePosition = { x: 0, y: 0 };
let isResizing = false;
let ground: Matter.Body | null = null;
let leftWall: Matter.Body | null = null;
let rightWall: Matter.Body | null = null;
let dragConstraint: Matter.Constraint | null = null;
let dragStartPos = { x: 0, y: 0 };
let isDragging = false;
let suppressNextClick = false;
let carrotInvokeCount = 0;

// Particles & Effects
const particles: IParticle[] = [];
const floatingTexts: IFloatingText[] = [];
const gravityWells: IGravityWell[] = [];
const trails: { x: number; y: number; angle: number }[][] = [];
for (let i = 0; i < CARROT_MAX; i++) trails.push([]);

const isActiveCarrot = (carrot: ICarrot | null, index: number): carrot is ICarrot => Boolean(carrot && flags[index] & CARROT_FLAGS.ACTIVE);

// Glyph cache (per-glyph OffscreenCanvas)
const glyphCanvasMap = new Map<string, OffscreenCanvas>();

// Per-carrot combo (best single carrot combo for stats)
let maxCombo = 0;

// Screen shake
let shakeIntensity = 0;
let shakeStartTime = 0;

// Gravity
let gravityX = 0;
let gravityY = 0.8;

// Interaction
let isShiftHeld = false;
let isAltHeld = false;
let isFrozen = false;

// Spawn pattern
let currentPattern: SpawnPattern = 'single';
let patternInterval: number | null = null;
let spiralAngle = 0;

// Stats & Help
let showStats = false;
let showHelp = false;
let fps = 0;
let frameCounter = 0;
let fpsLastUpdate = 0;

const HELP_BOX_W = 300;
const HELP_SHORTCUTS_COUNT = 14;
const HELP_BOX_H = HELP_SHORTCUTS_COUNT * 24 + 56;
const HELP_POSITION_KEY = 'carrotHelpPosition';

let helpBoxOffsetX = 0;
let helpBoxOffsetY = 0;
let isDraggingHelp = false;
let helpDragStartClientX = 0;
let helpDragStartClientY = 0;
let helpDragStartOffsetX = 0;
let helpDragStartOffsetY = 0;

const loadHelpPosition = (): void => {
  try {
    const raw = localStorage.getItem(HELP_POSITION_KEY);
    if (raw) {
      const { x, y } = JSON.parse(raw) as { x: number; y: number };
      helpBoxOffsetX = Number.isFinite(x) ? x : 0;
      helpBoxOffsetY = Number.isFinite(y) ? y : 0;
    }
  } catch {
    // ignore
  }
  clampHelpPosition();
};

const saveHelpPosition = (): void => {
  try {
    localStorage.setItem(HELP_POSITION_KEY, JSON.stringify({ x: helpBoxOffsetX, y: helpBoxOffsetY }));
  } catch {
    // ignore
  }
};

const getHelpBoxBounds = (): { boxX: number; boxY: number; boxW: number; boxH: number } => {
  const { width, height } = getCanvasSize();
  return {
    boxX: (width - HELP_BOX_W) / 2 + helpBoxOffsetX,
    boxY: (height - HELP_BOX_H) / 2 + helpBoxOffsetY,
    boxW: HELP_BOX_W,
    boxH: HELP_BOX_H,
  };
};

const isPointInHelpBox = (clientX: number, clientY: number): boolean => {
  const { boxX, boxY, boxW, boxH } = getHelpBoxBounds();
  return clientX >= boxX && clientX <= boxX + boxW && clientY >= boxY && clientY <= boxY + boxH;
};

/** 숏컷 창이 화면 밖으로 나가지 않도록 오프셋 클램프 */
const clampHelpPosition = (): void => {
  const { width, height } = getCanvasSize();
  const maxOffsetX = (width - HELP_BOX_W) / 2;
  const maxOffsetY = (height - HELP_BOX_H) / 2;
  helpBoxOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, helpBoxOffsetX));
  helpBoxOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, helpBoxOffsetY));
};

// ═══════════════════════════════════════════════════════════════
//  Utility Functions
// ═══════════════════════════════════════════════════════════════

const fastFloor = (x: number) => Math.trunc(x);
const trigLookup = (angle: number, table: number[]): number => {
  let index = fastFloor(((angle % TWO_PI) * ANGLE_PRECISION) / TWO_PI);
  if (index < 0) index += ANGLE_PRECISION;
  return table[index];
};
const fastSin = (angle: number) => trigLookup(angle, SIN_TABLE);
const fastCos = (angle: number) => trigLookup(angle, COS_TABLE);
const getCanvasSize = () => ({ width: window.innerWidth, height: window.innerHeight });
const isInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && Boolean(target.closest('a, button, input, select, textarea, [contenteditable="true"]'));

const setupCanvasContext = (context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => {
  context.imageSmoothingEnabled = false;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `700 ${CARROT_SIZE}rem ${FONT_FAMILY}`;
};

const drawRoundRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r);
  c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h);
  c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r);
  c.arcTo(x, y, x + r, y, r);
  c.closePath();
};

function debounce<T extends (...args: Array<unknown>) => void>(func: T, wait: number) {
  let timeout: number | undefined;
  return function (...args: Parameters<T>) {
    if (timeout !== undefined) clearTimeout(timeout);
    timeout = globalThis.window.setTimeout(() => func(...args), wait);
  };
}

// ═══════════════════════════════════════════════════════════════
//  Glyph Cache System
// ═══════════════════════════════════════════════════════════════

const getGlyphCanvas = (glyph: string): OffscreenCanvas | null => {
  const cached = glyphCanvasMap.get(glyph);
  if (cached) return cached;
  const remInPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  const size = CARROT_SIZE * remInPx * 8;
  const oc = new OffscreenCanvas(size, size);
  const octx = oc.getContext('2d');
  if (!octx) return null;
  setupCanvasContext(octx);
  octx.fillText(glyph, size / 2, size / 2);
  glyphCanvasMap.set(glyph, oc);
  return oc;
};

const refreshGlyphCache = (): void => {
  for (const [glyph, oc] of glyphCanvasMap) {
    const octx = oc.getContext('2d');
    if (octx) {
      octx.clearRect(0, 0, oc.width, oc.height);
      setupCanvasContext(octx);
      octx.fillText(glyph, oc.width / 2, oc.height / 2);
    }
  }
};

// ═══════════════════════════════════════════════════════════════
//  Particle System
// ═══════════════════════════════════════════════════════════════

const spawnParticle = (x: number, y: number, vx: number, vy: number, hue: number, size = 3, life = 60): void => {
  if (particles.length >= PARTICLE_MAX) particles.shift();
  particles.push({ x, y, vx, vy, life, maxLife: life, size, hue });
};

const spawnExplosionParticles = (x: number, y: number, n = 25): void => {
  for (let i = 0; i < n; i++) {
    const angle = RandomValue() * TWO_PI;
    const speed = 1 + RandomValue() * 6;
    spawnParticle(x, y, fastCos(angle) * speed, fastSin(angle) * speed, RandomValue() * 360, 2 + RandomValue() * 4, 40 + RandomValue() * 40);
  }
};

const spawnClickParticles = (x: number, y: number, hue: number): void => {
  for (let i = 0; i < 6; i++) {
    const angle = RandomValue() * TWO_PI;
    const speed = 1 + RandomValue() * 3;
    spawnParticle(x, y, fastCos(angle) * speed, fastSin(angle) * speed, hue, 2, 25);
  }
};

const updateParticles = (): void => {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.vx *= 0.98;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
};

const renderParticles = (): void => {
  if (!ctx) return;
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsl(${p.hue}, 100%, 60%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, TWO_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

// ═══════════════════════════════════════════════════════════════
//  Floating Text System
// ═══════════════════════════════════════════════════════════════

const spawnFloatingText = (x: number, y: number, text: string, size = 20): void => {
  if (floatingTexts.length > 30) floatingTexts.shift();
  floatingTexts.push({ x, y, vy: -2.5, text, life: 70, maxLife: 70, hue: (performance.now() / 3) % 360, size });
};

const updateFloatingTexts = (): void => {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.vy *= 0.97;
    ft.life--;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
};

const renderFloatingTexts = (): void => {
  if (!ctx) return;
  ctx.save();
  for (const ft of floatingTexts) {
    const alpha = ft.life / ft.maxLife;
    const scale = 0.8 + (1 - alpha) * 0.4;
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${ft.size * scale}px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = `hsl(${ft.hue}, 100%, 65%)`;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.restore();
};

// ═══════════════════════════════════════════════════════════════
//  Trail System
// ═══════════════════════════════════════════════════════════════

const updateTrails = (): void => {
  for (let i = 0; i < count; i++) {
    const carrot = bodies[i];
    if (!carrot || !(flags[i] & CARROT_FLAGS.ACTIVE)) {
      trails[i].length = 0;
      continue;
    }
    const trail = trails[i];
    const { x, y } = carrot.body.position;
    trail.push({ x, y, angle: carrot.body.angle });
    if (trail.length > TRAIL_LENGTH) trail.shift();
  }
};

const renderTrails = (): void => {
  if (!ctx) return;
  for (let i = 0; i < count; i++) {
    const carrot = bodies[i];
    if (!carrot || !(flags[i] & CARROT_FLAGS.ACTIVE)) continue;
    const trail = trails[i];
    if (trail.length < 2) continue;
    const speed = Math.hypot(carrot.body.velocity.x, carrot.body.velocity.y);
    if (speed < 1.5) continue;
    const glyphCanvas = getGlyphCanvas(carrot.glyph);
    if (!glyphCanvas) continue;
    const scale = carrot.body.circleRadius / CARROT_RADIUS;
    const w = glyphCanvas.width * scale;
    const h = glyphCanvas.height * scale;
    for (let j = 0; j < trail.length - 1; j++) {
      const alpha = ((j + 1) / trail.length) * 0.12 * Math.min(speed / 5, 1);
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(trail[j].x, trail[j].y);
      ctx.rotate(trail[j].angle);
      ctx.drawImage(glyphCanvas, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
};

// ═══════════════════════════════════════════════════════════════
//  Screen Shake
// ═══════════════════════════════════════════════════════════════

const triggerShake = (intensity = 10): void => {
  shakeIntensity = intensity;
  shakeStartTime = performance.now();
};

const getShakeOffset = (): { x: number; y: number } => {
  if (shakeIntensity <= 0) return { x: 0, y: 0 };
  const elapsed = performance.now() - shakeStartTime;
  if (elapsed > SHAKE_DURATION) {
    shakeIntensity = 0;
    return { x: 0, y: 0 };
  }
  const decay = 1 - elapsed / SHAKE_DURATION;
  return {
    x: (RandomValue() - 0.5) * shakeIntensity * decay * 2,
    y: (RandomValue() - 0.5) * shakeIntensity * decay * 2,
  };
};

// ═══════════════════════════════════════════════════════════════
//  Gravity Wells (Ctrl+Click)
// ═══════════════════════════════════════════════════════════════

const createGravityWell = (x: number, y: number): void => {
  gravityWells.push({ x, y, strength: 0.005, life: 180, maxLife: 180 });
};

const updateGravityWells = (): void => {
  for (let w = gravityWells.length - 1; w >= 0; w--) {
    const well = gravityWells[w];
    well.life--;
    if (well.life <= 0) {
      gravityWells.splice(w, 1);
      continue;
    }
    const decay = well.life / well.maxLife;
    for (let i = 0; i < count; i++) {
      const carrot = bodies[i];
      if (!carrot || !(flags[i] & CARROT_FLAGS.ACTIVE)) continue;
      const body = carrot.body;
      const dx = well.x - body.position.x;
      const dy = well.y - body.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 5 && dist < 300) {
        const force = well.strength * decay * (1 - dist / 300);
        Matter.Body.applyForce(body, body.position, { x: (dx / dist) * force, y: (dy / dist) * force });
        Matter.Sleeping.set(body, false);
      }
    }
  }
};

const renderGravityWells = (): void => {
  if (!ctx) return;
  for (const well of gravityWells) {
    const alpha = (well.life / well.maxLife) * 0.4;
    const pulse = 1 + Math.sin(performance.now() / 100) * 0.1;
    const baseRadius = 25 + (1 - well.life / well.maxLife) * 20;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    for (let r = 1; r >= 0.2; r -= 0.3) {
      ctx.beginPath();
      ctx.arc(well.x, well.y, baseRadius * r * pulse, 0, TWO_PI);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
};

// ═══════════════════════════════════════════════════════════════
//  Carrot Management
// ═══════════════════════════════════════════════════════════════

const getInactiveBodyIndex = (): number => {
  for (let i = 0; i < CARROT_MAX; i++) {
    if (!bodies[i]) return i;
    if (!(flags[i] & CARROT_FLAGS.ACTIVE)) return i;
  }
  return -1;
};

const removeCarrotFast = (index: number): void => {
  const carrot = bodies[index];
  if (!carrot) return;
  flags[index] = 0;
  bodies[index] = null;
  clickCounts[index] = 0;
  trails[index].length = 0;
  Matter.Body.setPosition(carrot.body, { x: 0, y: -1000 });
  Matter.Sleeping.set(carrot.body, true);
  if (index === count - 1) while (count > 0 && !bodies[count - 1]) count--;
};

const createCarrot = (x: number, options?: { y?: number; velocity?: { x: number; y: number }; angularVelocity?: number }): ICarrot | null => {
  if (!engine || !world) throw new Error('Matter.js engine or world not initialized');
  let index = getInactiveBodyIndex();
  if (index === -1) {
    index = 0;
    removeCarrotFast(index);
  }

  const body = BODY_POOL[index];
  if (body.circleRadius !== CARROT_RADIUS) {
    const scaleFactor = CARROT_RADIUS / body.circleRadius;
    Matter.Body.scale(body, scaleFactor, scaleFactor);
    body.circleRadius = CARROT_RADIUS;
  }

  const startY = options?.y ?? START_Y;
  const velocity = options?.velocity ?? {
    x: (RandomValue() - 0.5) * 2,
    y: 0.12 + RandomValue() * 0.3,
  };
  const angularVelocity = options?.angularVelocity ?? (RandomValue() - 0.5) * 0.4;

  Matter.Body.setPosition(body, { x, y: startY });
  Matter.Body.setVelocity(body, velocity);
  Matter.Body.setAngularVelocity(body, angularVelocity);
  Matter.Sleeping.set(body, false);
  if (!world.bodies.includes(body)) Matter.World.add(world, body);

  const glyph = DEFAULT_GLYPH;
  const hue = RandomValue() * 360;
  const id = `c${index}_${Date.now()}`;
  const carrot: ICarrot = { id, body, glyph, hue };

  bodies[index] = carrot;
  flags[index] = CARROT_FLAGS.ACTIVE;
  clickCounts[index] = 0;
  lastClickTimes[index] = 0;
  trails[index].length = 0;

  if (index >= count) count = index + 1;
  if (!frameId) startUpdateLoop();
  return carrot;
};

const explodeCarrot = (index: number): void => {
  const originalCarrot = bodies[index];
  if (!originalCarrot) return;

  const combo = clickCounts[index];
  if (combo > maxCombo) maxCombo = combo;
  const { x, y } = originalCarrot.body.position;
  removeCarrotFast(index);

  spawnExplosionParticles(x, y, 30);
  triggerShake(12);
  spawnFloatingText(x, y - 50, '💥 BOOM!', 28);

  const splitCount = Math.max(combo, 1);
  for (let i = 0; i < splitCount; i++) {
    const angle = RandomValue() * TWO_PI;
    const explosionForce = 16 + RandomValue() * 20;
    const velocity = { x: fastCos(angle) * explosionForce, y: fastSin(angle) * explosionForce };
    createCarrot(x, { y, velocity });
  }
};

/** 당근별 콤보: 10회 이상 클릭된 당근이 0.8초 동안 미클릭이면 폭발 */
const checkCarrotExplosions = (): void => {
  const now = performance.now();
  for (let i = 0; i < count; i++) {
    if (!bodies[i] || !(flags[i] & CARROT_FLAGS.ACTIVE)) continue;
    if (clickCounts[i] < 10) continue;
    const lastClick = lastClickTimes[i];
    if (lastClick <= 0) continue;
    if (now - lastClick > COMBO_TIMEOUT) explodeCarrot(i);
  }
};

// ═══════════════════════════════════════════════════════════════
//  Physics Bounds
// ═══════════════════════════════════════════════════════════════

const enforceHorizontalBounds = (body: ICarrotBody, width: number): boolean => {
  const r = body.circleRadius;
  const pos = body.position;
  const vel = body.velocity;
  if (pos.x < -r - PADDING && vel.x < 0) {
    Matter.Body.setPosition(body, { x: r + PADDING, y: pos.y });
    Matter.Body.setVelocity(body, { x: Math.abs(vel.x) * BOUNDS_BOUNCE, y: vel.y });
    return true;
  }
  if (pos.x > width + r + PADDING && vel.x > 0) {
    Matter.Body.setPosition(body, { x: width - r - PADDING, y: pos.y });
    Matter.Body.setVelocity(body, { x: -Math.abs(vel.x) * BOUNDS_BOUNCE, y: vel.y });
    return true;
  }
  return false;
};

const enforceVerticalBounds = (body: ICarrotBody, height: number): boolean => {
  const r = body.circleRadius;
  const pos = body.position;
  const vel = body.velocity;
  if (pos.y > height + r + PADDING && vel.y > 0) {
    Matter.Body.setPosition(body, { x: pos.x, y: height - r - PADDING });
    Matter.Body.setVelocity(body, { x: vel.x, y: -Math.abs(vel.y) * BOUNDS_BOUNCE });
    return true;
  }
  if (pos.y < -r - PADDING && vel.y < 0) {
    Matter.Body.setPosition(body, { x: pos.x, y: r + PADDING });
    Matter.Body.setVelocity(body, { x: vel.x, y: Math.abs(vel.y) * BOUNDS_BOUNCE });
    return true;
  }
  return false;
};

const enforceBounds = (): void => {
  const { width, height } = getCanvasSize();
  for (let i = 0; i < count; i++) {
    const carrot = bodies[i];
    if (!carrot || !(flags[i] & CARROT_FLAGS.ACTIVE)) continue;
    const body = carrot.body;
    const corrected = enforceHorizontalBounds(body, width) || enforceVerticalBounds(body, height);
    if (corrected) Matter.Sleeping.set(body, false);
  }
};

const createPhysicsBounds = (): void => {
  if (!world) return;
  const { width, height } = getCanvasSize();

  if (ground) Matter.World.remove(world, ground);
  if (leftWall) Matter.World.remove(world, leftWall);
  if (rightWall) Matter.World.remove(world, rightWall);

  ground = Matter.Bodies.rectangle(width / 2, height + PADDING / 2, width + PADDING * 2, 30, { isStatic: true });
  leftWall = Matter.Bodies.rectangle(-PADDING / 2, height / 2, PADDING, height + PADDING * 2, { isStatic: true });
  rightWall = Matter.Bodies.rectangle(width + PADDING / 2, height / 2, PADDING, height + PADDING * 2, { isStatic: true });

  Matter.World.add(world, [ground, leftWall, rightWall]);
};

// ═══════════════════════════════════════════════════════════════
//  Mouse Force (Shift = attract, Alt = repel)
// ═══════════════════════════════════════════════════════════════

const applyMouseForce = (): void => {
  if (!isShiftHeld && !isAltHeld) return;
  const mult = isShiftHeld ? 1 : -1;
  for (let i = 0; i < count; i++) {
    const carrot = bodies[i];
    if (!carrot || !(flags[i] & CARROT_FLAGS.ACTIVE)) continue;
    const body = carrot.body;
    const dx = mousePosition.x - body.position.x;
    const dy = mousePosition.y - body.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist < ATTRACT_RADIUS && dist > 1) {
      const force = ATTRACT_FORCE * mult * (1 - dist / ATTRACT_RADIUS);
      Matter.Body.applyForce(body, body.position, { x: (dx / dist) * force, y: (dy / dist) * force });
      Matter.Sleeping.set(body, false);
    }
  }
};

const setGravityDirection = (x: number, y: number): void => {
  if (!engine) return;
  gravityX = x;
  gravityY = y;
  engine.gravity.x = x;
  engine.gravity.y = y;
  for (let i = 0; i < count; i++) {
    const carrot = bodies[i];
    if (carrot && flags[i] & CARROT_FLAGS.ACTIVE) Matter.Sleeping.set(carrot.body, false);
  }
  spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `Gravity (${x.toFixed(1)}, ${y.toFixed(1)})`, 18);
};

// ═══════════════════════════════════════════════════════════════
//  Spawn Patterns
// ═══════════════════════════════════════════════════════════════

const spawnWithPattern = (): void => {
  const { width, height } = getCanvasSize();
  switch (currentPattern) {
    case 'rain':
      createCarrot(RandomValue() * (width - PADDING * 2) + PADDING);
      break;
    case 'fountain': {
      const angle = -Math.PI / 2 + (RandomValue() - 0.5) * 1.2;
      const speed = 12 + RandomValue() * 12;
      createCarrot(width / 2, { y: height - 50, velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed } });
      break;
    }
    case 'spiral': {
      spiralAngle += 0.3;
      const r = 80 + RandomValue() * 80;
      createCarrot(width / 2 + Math.cos(spiralAngle) * r, {
        y: height / 2 + Math.sin(spiralAngle) * r,
        velocity: { x: Math.cos(spiralAngle + Math.PI / 2) * 3, y: Math.sin(spiralAngle + Math.PI / 2) * 3 },
      });
      break;
    }
    case 'firework': {
      const fx = width * 0.25 + RandomValue() * width * 0.5;
      const fy = height * 0.2 + RandomValue() * height * 0.3;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TWO_PI;
        const spd = 3 + RandomValue() * 3;
        createCarrot(fx, { y: fy, velocity: { x: Math.cos(a) * spd, y: Math.sin(a) * spd } });
      }
      spawnExplosionParticles(fx, fy, 15);
      break;
    }
    case 'follow': {
      const jitter = 15;
      const fx = mousePosition.x + (RandomValue() - 0.5) * jitter;
      const fy = mousePosition.y + (RandomValue() - 0.5) * jitter;
      createCarrot(fx, { y: fy });
      break;
    }
    default:
      createCarrot(RandomValue() * (width - PADDING * 2) + PADDING);
  }
};

const getPatternDisplayName = (pattern: SpawnPattern): string => (pattern === 'single' ? 'DEFAULT' : pattern.toUpperCase());

const startPattern = (pattern: SpawnPattern): void => {
  stopPattern();
  currentPattern = pattern;
  spawnFloatingText(window.innerWidth / 2, 80, `Pattern: ${getPatternDisplayName(pattern)}`, 20);
  if (pattern === 'single') return;
  let interval: number;
  if (pattern === 'firework') interval = 600;
  else if (pattern === 'rain') interval = 80;
  else interval = 120;
  patternInterval = globalThis.window.setInterval(spawnWithPattern, interval);
};

const stopPattern = (): void => {
  if (patternInterval !== null) {
    clearInterval(patternInterval);
    patternInterval = null;
  }
  currentPattern = 'single';
};

const burstSpawn = (n: number): void => {
  const { width } = getCanvasSize();
  for (let i = 0; i < n; i++) createCarrot(RandomValue() * (width - PADDING * 2) + PADDING);
};

// ═══════════════════════════════════════════════════════════════
//  Freeze Toggle
// ═══════════════════════════════════════════════════════════════

const freezeAll = (): void => {
  isFrozen = true;
  for (let i = 0; i < count; i++) {
    const carrot = bodies[i];
    if (carrot && flags[i] & CARROT_FLAGS.ACTIVE) Matter.Sleeping.set(carrot.body, true);
  }
  spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, '❄️ FROZEN', 32);
};

const unfreezeAll = (): void => {
  isFrozen = false;
  for (let i = 0; i < count; i++) {
    const carrot = bodies[i];
    if (carrot && flags[i] & CARROT_FLAGS.ACTIVE) Matter.Sleeping.set(carrot.body, false);
  }
  spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, '🔥 UNFROZEN', 32);
};

// ═══════════════════════════════════════════════════════════════
//  Clear / Pause / Reset
// ═══════════════════════════════════════════════════════════════

const clearAllCarrots = (): void => {
  if (world && dragConstraint) {
    Matter.World.remove(world, dragConstraint);
    dragConstraint = null;
  }
  isDragging = false;
  for (let i = 0; i < count; i++) if (bodies[i]) removeCarrotFast(i);
  count = 0;
  particles.length = 0;
  floatingTexts.length = 0;
  gravityWells.length = 0;
  maxCombo = 0;
  isFrozen = false;
  if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

const pauseAllCarrots = (): void => {
  for (let i = 0; i < count; i++) {
    const carrot = bodies[i];
    if (!carrot || !(flags[i] & CARROT_FLAGS.ACTIVE)) continue;
    Matter.Sleeping.set(carrot.body, true);
  }
};

const resetCarrotsToTop = (): void => {
  const { width } = getCanvasSize();
  const centerX = width / 2;
  for (let i = 0; i < count; i++) {
    const carrot = bodies[i];
    if (!carrot || !(flags[i] & CARROT_FLAGS.ACTIVE)) continue;
    Matter.Body.setPosition(carrot.body, { x: centerX + (RandomValue() - 0.5) * 100, y: START_Y - RandomValue() * 100 });
    const angle = RandomValue() * TWO_PI;
    const speed = 1.5 + RandomValue() * 2;
    Matter.Body.setVelocity(carrot.body, { x: fastCos(angle) * speed, y: 0.18 + RandomValue() * 0.42 });
    Matter.Body.setAngularVelocity(carrot.body, (RandomValue() - 0.5) * 0.4);
    Matter.Sleeping.set(carrot.body, false);
  }
};

// ═══════════════════════════════════════════════════════════════
//  Rendering
// ═══════════════════════════════════════════════════════════════

const renderCarrot = (index: number): void => {
  if (!ctx) return;
  const carrot = bodies[index];
  if (!carrot) return;
  const glyphCanvas = getGlyphCanvas(carrot.glyph);
  if (!glyphCanvas) return;

  const { body } = carrot;
  const { x, y } = body.position;
  const { angle } = body;
  const scale = body.circleRadius / CARROT_RADIUS;
  const w = glyphCanvas.width * scale;
  const h = glyphCanvas.height * scale;

  ctx.save();
  ctx.translate(x, y);

  // 20콤보 이상: 당근 떨림
  const combo = clickCounts[index];
  if (combo >= 20) {
    const intensity = Math.min((combo - 20) * 0.4 + 2, 12);
    ctx.translate((RandomValue() - 0.5) * intensity * 2, (RandomValue() - 0.5) * intensity * 2);
  }

  ctx.rotate(angle);

  const timeSinceClick = performance.now() - lastClickTimes[index];
  const scaleEffectMs = CLICK_EFFECT_SCALE_UNITS * CLICK_EFFECT_UNIT_MS;
  const rainbowEffectMs = CLICK_EFFECT_RAINBOW_UNITS * CLICK_EFFECT_UNIT_MS;
  const inScaleEffect = timeSinceClick > 0 && timeSinceClick < scaleEffectMs;
  const inRainbowEffect = timeSinceClick > 0 && timeSinceClick < rainbowEffectMs;

  const rainbowHue = (carrot.hue + performance.now() * 0.08) % 360;
  if (inRainbowEffect) {
    ctx.shadowColor = `hsl(${rainbowHue}, 100%, 60%)`;
    ctx.shadowBlur = 35 * scale;
  }

  const drawScale = inScaleEffect ? 1 + 0.15 * Math.sin((timeSinceClick / scaleEffectMs) * Math.PI) : 1;
  const dw = w * drawScale;
  const dh = h * drawScale;
  ctx.drawImage(glyphCanvas, -dw / 2, -dh / 2, dw, dh);

  // 30콤보 이상: 당근 상시 무지개색
  if (combo >= 30) {
    ctx.save();
    ctx.globalCompositeOperation = 'hue';
    const comboHue = (performance.now() * 0.3 + carrot.hue) % 360;
    const comboAlpha = Math.min((combo - 30) * 0.03 + 0.4, 0.8);
    ctx.fillStyle = `hsla(${comboHue}, 100%, 55%, ${comboAlpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, dw / 2, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  if (inRainbowEffect) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const glowRadius = body.circleRadius * scale * 0.6;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
    grad.addColorStop(0, `hsla(${rainbowHue}, 100%, 60%, 0.3)`);
    grad.addColorStop(1, `hsla(${rainbowHue}, 100%, 60%, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
};

const renderAllCarrots = (): void => {
  if (!ctx || count === 0) return;
  for (let i = count - 1; i >= 0; i--) {
    if (!bodies[i] || !(flags[i] & CARROT_FLAGS.ACTIVE)) continue;
    renderCarrot(i);
  }
};

const getMaxActiveCarrotCombo = (): number => {
  let max = 0;
  for (let i = 0; i < count; i++) if (bodies[i] && flags[i] & CARROT_FLAGS.ACTIVE && clickCounts[i] > max) max = clickCounts[i];

  return max;
};

const renderComboVignette = (): void => {
  const maxActiveCombo = getMaxActiveCarrotCombo();
  if (!ctx || !canvas || maxActiveCombo < 2) return;
  const intensity = Math.min((maxActiveCombo - 1) / 15, 1);
  const hue = (performance.now() / 5) % 360;
  const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.3, canvas.width / 2, canvas.height / 2, canvas.height * 0.8);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, ${intensity * 0.12})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

const renderStats = (): void => {
  const context = ctx;
  if (!context || !showStats) return;
  const activeCount = bodies.reduce((n, c, i) => n + (c && flags[i] & CARROT_FLAGS.ACTIVE ? 1 : 0), 0);
  const maxActiveCombo = getMaxActiveCarrotCombo();
  const lines = [
    `FPS: ${fps}`,
    `Carrots: ${activeCount}`,
    `Particles: ${particles.length}`,
    `Carrot combo: ${maxActiveCombo} (Best: ${maxCombo})`,
    `Pattern: ${getPatternDisplayName(currentPattern)}`,
    `Gravity: (${gravityX.toFixed(1)}, ${gravityY.toFixed(1)})`,
    `Frozen: ${isFrozen ? 'YES' : 'NO'}`,
  ];
  context.save();
  drawRoundRect(context, 10, 10, 220, lines.length * 20 + 20, 8);
  context.fillStyle = 'rgba(0,0,0,0.65)';
  context.fill();
  context.fillStyle = '#0f0';
  context.font = '12px monospace';
  context.textAlign = 'left';
  context.textBaseline = 'top';
  lines.forEach((line, i) => context.fillText(line, 20, 20 + i * 20));
  context.restore();
};

const HELP_SHORTCUTS: [string, string][] = [
  ['ESC', 'Clear all & stop'],
  ['H', 'Toggle this help'],
  ['S', 'Toggle stats'],
  ['G', 'Flip gravity'],
  ['0', 'Zero gravity'],
  ['←↑→↓', 'Tilt gravity'],
  ['F', 'Freeze / unfreeze'],
  ['SPACE', 'Burst spawn (x20)'],
  ['1-6', 'Spawn patterns'],
  ['Shift+Move', 'Attract carrots'],
  ['Alt+Move', 'Repel carrots'],
  ['Ctrl+Click', 'Create gravity well'],
  ['Click x10', 'Boom!'],
];

const renderHelp = (): void => {
  const context = ctx;
  if (!context || !showHelp) return;
  clampHelpPosition();
  const { width, height } = getCanvasSize();
  const boxX = (width - HELP_BOX_W) / 2 + helpBoxOffsetX;
  const boxY = (height - HELP_BOX_H) / 2 + helpBoxOffsetY;
  context.save();
  drawRoundRect(context, boxX, boxY, HELP_BOX_W, HELP_BOX_H, 12);
  context.fillStyle = 'rgba(0,0,0,0.8)';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.2)';
  context.lineWidth = 1;
  context.stroke();
  context.fillStyle = '#fff';
  context.font = `700 16px ${FONT_FAMILY}`;
  context.textAlign = 'center';
  context.textBaseline = 'top';
  context.fillText('Carrot Shortcuts', boxX + HELP_BOX_W / 2, boxY + 14);
  context.font = '13px monospace';
  context.textAlign = 'left';
  HELP_SHORTCUTS.forEach(([key, desc], i) => {
    const y = boxY + 46 + i * 24;
    context.fillStyle = '#ffa500';
    context.fillText(key, boxX + 18, y);
    context.fillStyle = '#ddd';
    context.fillText(desc, boxX + 120, y);
  });
  context.restore();
};

// ═══════════════════════════════════════════════════════════════
//  Cursor Style
// ═══════════════════════════════════════════════════════════════

const updateCursorStyle = (): void => {
  if (isDraggingHelp) {
    document.body.style.cursor = 'grabbing';
    return;
  }
  if (showHelp && isPointInHelpBox(mousePosition.x, mousePosition.y)) {
    document.body.style.cursor = 'grab';
    return;
  }
  if (!world) return;
  if (dragConstraint) {
    document.body.style.cursor = 'grabbing';
    return;
  }
  const activeBodies = bodies.filter(isActiveCarrot).map((c) => c.body);
  if (activeBodies.length === 0) {
    document.body.style.cursor = 'default';
    return;
  }
  const hoveredBodies = Matter.Query.point(activeBodies, mousePosition);
  document.body.style.cursor = hoveredBodies.length > 0 ? 'grab' : 'default';
};

// ═══════════════════════════════════════════════════════════════
//  Event Handlers
// ═══════════════════════════════════════════════════════════════

const applyCarrotClick = (carrotIndex: number, mp: { x: number; y: number }): void => {
  const carrot = bodies[carrotIndex];
  if (!carrot) return;
  clickCounts[carrotIndex]++;
  lastClickTimes[carrotIndex] = performance.now();
  const combo = clickCounts[carrotIndex];
  spawnClickParticles(mp.x, mp.y, carrot.hue);

  if (combo >= 2) {
    const size = Math.min(16 + combo * 2, 48);
    spawnFloatingText(mp.x, mp.y - 40, `${combo}x COMBO!`, size);
  }

  const scaleFactor = 1.05;
  Matter.Body.scale(carrot.body, scaleFactor, scaleFactor);
  carrot.body.circleRadius *= scaleFactor;
};

const handleDocumentClick = (event: MouseEvent): void => {
  if (isInteractiveTarget(event.target)) return;
  if (suppressNextClick || isDragging) {
    suppressNextClick = false;
    return;
  }
  if (!world || !isInitialized) return;
  if (showHelp && isPointInHelpBox(event.clientX, event.clientY)) return;

  const mp = { x: event.clientX, y: event.clientY };
  const activeBodies = bodies.filter(isActiveCarrot).map((c) => c.body);

  if (event.ctrlKey && activeBodies.length > 0) {
    createGravityWell(mp.x, mp.y);
    return;
  }

  if (activeBodies.length === 0) return;
  const clickedBodies = Matter.Query.point(activeBodies, mp);
  if (clickedBodies.length === 0) return;

  const clickedBody = clickedBodies[0] as ICarrotBody;
  const carrotIndex = bodies.findIndex((c) => c?.body === clickedBody);
  if (carrotIndex === -1) return;
  applyCarrotClick(carrotIndex, mp);
};

const handleMouseMove = (event: MouseEvent) => {
  mousePosition = { x: event.clientX, y: event.clientY };
  if (isDraggingHelp) {
    helpBoxOffsetX = helpDragStartOffsetX + (event.clientX - helpDragStartClientX);
    helpBoxOffsetY = helpDragStartOffsetY + (event.clientY - helpDragStartClientY);
    clampHelpPosition();
    return;
  }
  if (dragConstraint) {
    const { width, height } = getCanvasSize();
    const clampedX = Math.max(PADDING, Math.min(mousePosition.x, width - PADDING));
    const clampedY = Math.max(PADDING, Math.min(mousePosition.y, height - PADDING));
    dragConstraint.pointB.x = clampedX;
    dragConstraint.pointB.y = clampedY;
    if (!isDragging) {
      const dx = mousePosition.x - dragStartPos.x;
      const dy = mousePosition.y - dragStartPos.y;
      if (Math.hypot(dx, dy) > 5) {
        isDragging = true;
        document.body.style.userSelect = 'none';
      }
    }
  }
};

const handleMouseDown = (event: MouseEvent): void => {
  if (isInteractiveTarget(event.target)) return;
  if (!world || !isInitialized) return;
  dragStartPos = { x: event.clientX, y: event.clientY };

  if (showHelp && isPointInHelpBox(event.clientX, event.clientY)) {
    isDraggingHelp = true;
    helpDragStartClientX = event.clientX;
    helpDragStartClientY = event.clientY;
    helpDragStartOffsetX = helpBoxOffsetX;
    helpDragStartOffsetY = helpBoxOffsetY;
    event.preventDefault();
    return;
  }

  const activeBodies = bodies.filter(isActiveCarrot).map((c) => c.body);
  if (activeBodies.length === 0) return;
  const downPoint = { x: event.clientX, y: event.clientY };
  const clickedBodies = Matter.Query.point(activeBodies, downPoint);
  if (clickedBodies.length === 0) return;
  const clickedBody = clickedBodies[0] as ICarrotBody;
  const carrotIndex = bodies.findIndex((c) => c?.body === clickedBody);
  if (carrotIndex === -1) return;
  isDragging = false;

  const { width, height } = getCanvasSize();
  const clampedX = Math.max(PADDING, Math.min(downPoint.x, width - PADDING));
  const clampedY = Math.max(PADDING, Math.min(downPoint.y, height - PADDING));

  dragConstraint = Matter.Constraint.create({
    bodyA: clickedBody,
    pointB: { x: clampedX, y: clampedY },
    stiffness: 0.2,
    damping: 0.15,
    length: 0,
  });
  Matter.Sleeping.set(clickedBody, false);
  Matter.World.add(world, dragConstraint);
  event.preventDefault();
};

const handleMouseUp = (): void => {
  if (isDraggingHelp) {
    isDraggingHelp = false;
    saveHelpPosition();
    suppressNextClick = true;
    setTimeout(() => {
      suppressNextClick = false;
    }, 50);
    document.body.style.userSelect = '';
    return;
  }
  if (world && dragConstraint) {
    Matter.World.remove(world, dragConstraint);
    dragConstraint = null;
  }
  if (isDragging) {
    suppressNextClick = true;
    setTimeout(() => {
      suppressNextClick = false;
    }, 50);
  }
  isDragging = false;
  document.body.style.userSelect = '';
};

const handleKeyDown = (e: KeyboardEvent): void => {
  if (isInteractiveTarget(e.target)) return;
  if (!isInitialized || count === 0) {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isShiftHeld = true;
    if (e.code === 'AltLeft' || e.code === 'AltRight') {
      isAltHeld = true;
      e.preventDefault();
    }
    return;
  }

  switch (e.code) {
    case 'Escape':
      clearAllCarrots();
      stopPattern();
      e.preventDefault();
      break;
    case 'KeyH':
      showHelp = !showHelp;
      break;
    case 'KeyS':
      showStats = !showStats;
      break;
    case 'KeyG':
      setGravityDirection(gravityX, -gravityY);
      break;
    case 'Digit0':
      setGravityDirection(0, 0);
      break;
    case 'KeyF':
      if (isFrozen) unfreezeAll();
      else freezeAll();
      break;
    case 'Space':
      e.preventDefault();
      burstSpawn(20);
      break;
    case 'ArrowLeft':
      setGravityDirection(gravityX - 0.2, gravityY);
      e.preventDefault();
      break;
    case 'ArrowRight':
      setGravityDirection(gravityX + 0.2, gravityY);
      e.preventDefault();
      break;
    case 'ArrowUp':
      setGravityDirection(gravityX, gravityY - 0.2);
      e.preventDefault();
      break;
    case 'ArrowDown':
      setGravityDirection(gravityX, gravityY + 0.2);
      e.preventDefault();
      break;
    case 'Digit1':
      startPattern('single');
      break;
    case 'Digit2':
      startPattern('rain');
      break;
    case 'Digit3':
      startPattern('fountain');
      break;
    case 'Digit4':
      startPattern('spiral');
      break;
    case 'Digit5':
      startPattern('firework');
      break;
    case 'Digit6':
      startPattern('follow');
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      isShiftHeld = true;
      break;
    case 'AltLeft':
    case 'AltRight':
      isAltHeld = true;
      e.preventDefault();
      break;
  }
};

const handleKeyUp = (e: KeyboardEvent): void => {
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') isShiftHeld = false;
  if (e.code === 'AltLeft' || e.code === 'AltRight') isAltHeld = false;
};

const handleTouchStart = (event: TouchEvent): void => {
  if (isInteractiveTarget(event.target)) return;
  if (event.touches.length > 0) {
    const t = event.touches[0];
    handleMouseDown({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => event.preventDefault() } as MouseEvent);
  }
};

const handleTouchMove = (event: TouchEvent): void => {
  if (event.touches.length > 0) {
    const t = event.touches[0];
    handleMouseMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
  }
};

const handleTouchEnd = (): void => {
  handleMouseUp();
};

// ═══════════════════════════════════════════════════════════════
//  Main Loop
// ═══════════════════════════════════════════════════════════════

const loop = (time: number): void => {
  if (isResizing) {
    frameId = requestAnimationFrame(loop);
    return;
  }

  // FPS tracking
  frameCounter++;
  if (time - fpsLastUpdate >= 1000) {
    fps = frameCounter;
    frameCounter = 0;
    fpsLastUpdate = time;
  }

  const delta = Math.min(time - lastUpdateTime, 16);
  if (engine && !isFrozen) Matter.Engine.update(engine, delta);

  if (!isFrozen) {
    enforceBounds();
    applyMouseForce();
    updateGravityWells();
    updateTrails();
  }

  updateParticles();
  updateFloatingTexts();
  checkCarrotExplosions();

  // Render
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const shake = getShakeOffset();
    const hasShake = shake.x !== 0 || shake.y !== 0;
    if (hasShake) {
      ctx.save();
      ctx.translate(shake.x, shake.y);
    }

    renderComboVignette();
    renderTrails();
    renderAllCarrots();
    renderParticles();
    renderGravityWells();

    if (hasShake) ctx.restore();

    renderFloatingTexts();
    renderStats();
    renderHelp();
  }

  updateCursorStyle();
  lastUpdateTime = time;

  const hasActivity = count > 0 || particles.length > 0 || floatingTexts.length > 0 || gravityWells.length > 0;
  if (hasActivity) {
    frameId = requestAnimationFrame(loop);
  } else {
    frameId = null;
    if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
};

const startUpdateLoop = (): void => {
  if (!frameId) {
    lastUpdateTime = performance.now();
    frameId = requestAnimationFrame(loop);
  }
};

// ═══════════════════════════════════════════════════════════════
//  Canvas & Engine Initialization
// ═══════════════════════════════════════════════════════════════

const initCanvas = (): void => {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:1001;background:transparent;';
  const { width, height } = getCanvasSize();
  canvas.width = width;
  canvas.height = height;
  ctx = canvas.getContext('2d');
  if (ctx) setupCanvasContext(ctx);
  document.body.appendChild(canvas);

  getGlyphCanvas('🥕');
  document.fonts?.ready?.then(() => refreshGlyphCache());
};

const initBodyPool = (): void => {
  if (BODY_POOL.length > 0) return;
  for (let i = 0; i < CARROT_MAX; i++) {
    const body = Matter.Bodies.circle(0, -1000, CARROT_RADIUS, {
      restitution: 0.55,
      friction: 0.2,
      density: 0.001,
      frictionAir: 0.006,
      isSleeping: true,
    }) as ICarrotBody;
    body.circleRadius = CARROT_RADIUS;
    BODY_POOL.push(body);
  }
};

const handleResize = (): void => {
  if (!canvas || !ctx) return;
  isResizing = true;
  pauseAllCarrots();
  const { width, height } = getCanvasSize();
  canvas.width = width;
  canvas.height = height;
  setupCanvasContext(ctx);
  createPhysicsBounds();
  setTimeout(() => {
    resetCarrotsToTop();
    isResizing = false;
  }, 200);
};

const initPhysicsEngine = (): void => {
  if (isInitialized) return;
  initCanvas();
  window.addEventListener('resize', debounce(handleResize, 200));
  engine = Matter.Engine.create({
    enableSleeping: true,
    constraintIterations: 1,
    positionIterations: 3,
    velocityIterations: 2,
  });
  world = engine.world;
  engine.gravity.y = 0.8;
  createPhysicsBounds();
  initBodyPool();

  // Collision events: spawn bounce particles
  Matter.Events.on(engine, 'collisionStart', (event) => {
    let pCount = 0;
    for (const pair of event.pairs) {
      if (pCount >= 5) break;
      const midX = (pair.bodyA.position.x + pair.bodyB.position.x) / 2;
      const midY = (pair.bodyA.position.y + pair.bodyB.position.y) / 2;
      spawnParticle(midX, midY, (RandomValue() - 0.5) * 2, -RandomValue() * 2, RandomValue() * 360, 1.5, 15);
      pCount++;
    }
  });

  startUpdateLoop();
  isInitialized = true;
};

// ═══════════════════════════════════════════════════════════════
//  Event Delegation Setup
// ═══════════════════════════════════════════════════════════════

const setupEventDelegation = (): void => {
  if (eventDelegationSetup) return;
  loadHelpPosition();
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
  eventDelegationSetup = true;
};

// ═══════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════

export const Carrot = (): void => {
  carrotInvokeCount += 1;
  if (!isInitialized) {
    initPhysicsEngine();
    setupEventDelegation();
  }
  showHelp = true;
  const { width } = getCanvasSize();
  if (width > 0) {
    const startX = RandomValue() * (width - PADDING * 2) + PADDING;
    createCarrot(startX);
  }
};

// ═══════════════════════════════════════════════════════════════
//  Cleanup
// ═══════════════════════════════════════════════════════════════

const cleanup = (): void => {
  if (frameId) cancelAnimationFrame(frameId);
  frameId = null;
  stopPattern();
  if (engine) Matter.Engine.clear(engine);
  if (world && dragConstraint) {
    Matter.World.remove(world, dragConstraint);
    dragConstraint = null;
  }
  engine = null;
  world = null;
  count = 0;
  carrotInvokeCount = 0;
  maxCombo = 0;
  isFrozen = false;
  particles.length = 0;
  floatingTexts.length = 0;
  gravityWells.length = 0;
  glyphCanvasMap.clear();
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mousedown', handleMouseDown);
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);
  if (canvas) canvas.remove();
  canvas = null;
  ctx = null;
  isInitialized = false;
  eventDelegationSetup = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  window.removeEventListener('resize', debounce(handleResize, 200));
};

if (globalThis.window !== undefined) globalThis.window.addEventListener('beforeunload', cleanup);
