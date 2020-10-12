interface StrokeStyle {
  color: string;
  blendMode?: string;
  lineWidth: number;
  lineDash?: number[];
  lineJoin?: CanvasLineJoin;
  lineCap?: CanvasLineCap;
}

class Point {
  constructor(public x: number = 0, public y: number = 0) {}
}

class Particle extends Point {
  public restitution: number = 0.25;
  public fixed: boolean = false;
  public fx: number = 0;
  public fy: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public ox: number = 0;
  public oy: number = 0;
  constructor(
    public x: number = 0,
    public y: number = 0,
    public mass: number = 1
  ) {
    super(x, y);
  }
}

class Spring {
  constructor(
    public readonly a: Particle,
    public readonly b: Particle,
    public restLength: number = 100,
    public stiffness: number = 1.0
  ) {}
}

class Squiggle {
  public readonly particles: Particle[] = [];
  public readonly springs: Spring[] = [];
  constructor(
    origin: Point,
    public readonly segmentCount: number,
    public readonly segmentLength: number,
    public readonly jitter: number,
    public readonly style: StrokeStyle
  ) {
    let { x, y } = origin;
    let op: Particle;
    let t: number = Math.random() * Math.PI * 2;
    for (let i = 0; i < segmentCount; i++) {
      const p = new Particle(x, y);
      this.particles.push(p);
      if (op) {
        this.springs.push(new Spring(op, p, segmentLength));
      }
      t += (Math.random() - 0.5) * Math.PI * jitter;
      x += Math.cos(t) * segmentLength;
      y += Math.sin(t) * segmentLength;
      op = p;
    }
  }
  public update() {
    const dt = 1 / 60; // TODO:
    const dtSq = dt * dt;
    const drag = 0.995;
    const offset = 800;
    this.particles.forEach(p => {
      if (Math.random() < 0.05) {
        p.fx += (Math.random() - 0.5) * offset;
        p.fy += (Math.random() - 0.5) * offset;
      }
    });
    this.particles.forEach(p => {
      p.ox = p.ox || p.x;
      p.oy = p.oy || p.y;
      p.vx = (p.x - p.ox) * drag + (p.fx / p.mass) * dtSq;
      p.vy = (p.y - p.oy) * drag + (p.fy / p.mass) * dtSq;
      p.ox = p.x;
      p.oy = p.y;
      p.x += p.vx;
      p.y += p.vy;
      p.fx = 0;
      p.fy = 0;
    });
    this.springs.forEach(({ a, b, restLength, stiffness }) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1e-10;
      let f = ((d - restLength) / (d * (a.mass + b.mass))) * stiffness;
      if (!a.fixed && !b.fixed) f *= 0.5;
      if (!a.fixed) {
        const m = f / a.mass;
        a.x += dx * m;
        a.y += dy * m;
      }
      if (!b.fixed) {
        const m = -f / b.mass;
        b.x += dx * m;
        b.y += dy * m;
      }
    });
  }
  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = this.style.color;
    ctx.lineCap = this.style.lineCap || "butt";
    ctx.lineJoin = this.style.lineJoin || "bevel";
    ctx.lineWidth = this.style.lineWidth;
    if (this.style.lineDash) {
      ctx.setLineDash(this.style.lineDash);
      ctx.lineDashOffset = performance.now() * 0.01;
    }
    if (this.style.blendMode) {
      ctx.globalCompositeOperation = this.style.blendMode;
    }
    ctx.beginPath();
    this.particles.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
    ctx.restore();
  }
}

class Petri {
  private backgroundColor: string;
  public readonly canvas = document.createElement("canvas");
  public readonly ctx = this.canvas.getContext("2d");
  public readonly squiggles: Squiggle[] = [];
  constructor(public readonly size: number = 400) {
    const scale = window.devicePixelRatio || 1;
    this.canvas.width = size * scale;
    this.canvas.height = size * scale;
    this.canvas.style.width = size + "px";
    this.canvas.style.height = size + "px";
    this.ctx.scale(scale, scale);
    const rp = () => {
      const cx = size / 2;
      const cy = cx;
      const r = 0; //Math.random() * size * 0.5;
      const t = Math.random() * Math.PI * 2;
      return new Point(cx + Math.cos(t) * r, cy + Math.sin(t) * r);
    };
    const hue = h => (h < 0 ? h + 360 : h > 360 ? h - 360 : h);
    const bgHue = Math.random() * 360;
    const bgLightness = 20 + Math.random() * 60;
    this.backgroundColor = `hsl(${bgHue},65%,${bgLightness}%)`;
    // Large shapes.
    for (let i = 0; i < 4; i++) {
      this.squiggles.push(
        new Squiggle(rp(), 12, size * 0.26, 1.4, {
          color: `hsla(${hue(bgHue + 50)},70%,60%,0.85)`,
          lineWidth: size * 0.3,
          lineJoin: "bevel",
          lineCap: "butt"
        })
      );
    }
    // Thin long lines.
    for (let i = 0; i < 2; i++) {
      const f = i + 1;
      this.squiggles.push(
        new Squiggle(rp(), 80, size * 0.025 * f, 0.5, {
          color: `hsla(${hue(bgHue + 120)},60%,60%,0.4)`,
          blendMode: "darken",
          lineWidth: size * 0.025 * f,
          lineJoin: "bevel",
          lineCap: "round"
        })
      );
    }
    // Dashed lines.
    for (let i = 0; i < 2; i++) {
      this.squiggles.push(
        new Squiggle(rp(), 60, size * 0.1, 0.8, {
          color: `hsla(${hue(bgHue + 130)},60%,60%,0.8)`,
          lineWidth: size * 0.015,
          lineDash: [size * 0.03, size * 0.06],
          lineJoin: "round",
          lineCap: "round"
        })
      );
    }
    ["overlay", "darken"].forEach(blendMode => {
      const s = size * 0.025;
      this.squiggles.push(
        new Squiggle(rp(), 80, s, 1.0, {
          color: `hsla(${hue(bgHue + 90)},60%,50%,0.8)`,
          blendMode: blendMode,
          lineWidth: size * 0.005,
          lineDash: [s, s * 2]
        })
      );
    });
  }
  public updateAndRender() {
    this.ctx.clearRect(0, 0, this.size, this.size);
    this.ctx.save();

    this.ctx.beginPath();
    this.ctx.arc(this.size / 2, this.size / 2, this.size / 2, 0, Math.PI * 2);
    this.ctx.clip();

    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.size, this.size);

    this.squiggles.forEach(s => {
      s.update();
      s.render(this.ctx);
    });

    this.ctx.restore();
  }
}

const container = document.getElementById("app");

const dishes: Petri[] = [];

const size = 250;
const spacing = 24;
const cols = Math.min(4, Math.floor(window.innerWidth / (size + spacing)));
const rows = Math.min(4, Math.floor(window.innerHeight / (size + spacing)));
const total = cols * rows;

container.style.cssText = `
  display: grid;
  grid-template-columns: repeat(${cols}, 1fr);
  gap: ${spacing}px;
`;

const CHANGE_INTERVAL = 8000;
let timeout: number = -1;

const changeRandomPetri = () => {
  const index = Math.floor(Math.random() * dishes.length);
  changePetri(dishes[index]);
  scheduleChange();
};

const scheduleChange = () => {
  clearTimeout(timeout);
  timeout = setTimeout(changeRandomPetri, CHANGE_INTERVAL);
};

const createPetri = () => {
  const p = new Petri(size);
  p.canvas.onclick = () => {
    scheduleChange();
    changePetri(p);
  };
  return p;
};

for (let i = 0; i < total; i++) {
  const p = createPetri();
  container.appendChild(p.canvas);
  dishes.push(p);
}

const changePetri = p => {
  const index = dishes.indexOf(p);
  if (index !== -1) {
    const np = createPetri();
    container.insertBefore(np.canvas, p.canvas);
    container.removeChild(p.canvas);
    dishes.splice(index, 1, np);
    p.canvas.onclick = null;
  }
};

const update = () => {
  requestAnimationFrame(update);
  dishes.forEach(d => d.updateAndRender());
};

update();
scheduleChange();
