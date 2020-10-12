class Petri2 {
  private backgroundColor: string;
  public canvas = document.createElement('canvas');
  public ctx = this.canvas.getContext('2d');
  public readonly squiggles:Squiggle2[] = [];
  constructor(readonly size:number = 400) {
    const scale = window.devicePixelRatio || 1;
    this.canvas.width = size * scale;
    this.canvas.height = size * scale;
    this.canvas.style.width = size + "px";
    this.canvas.style.height = size + "px";
    this.ctx.scale(scale, scale);
    const rp = () => {
      const cx = size / 2;
      const cy = cx;
      const r = 0;
      const t = Math.random() * Math.PI * 2;
      return new Point2(cx + Math.cos(t) * r, cy + Math.sin(t) * r);
    }

    const hue = h => (h < 0 ? h + 360 : h > 360 ? h - 360 : h);
    const bgHue = Math.random() * 360;
    const bgLightness = 20 + Math.random() * 60;
    this.backgroundColor = `hsl(${bgHue},65%,${bgLightness}%)`;
    for (let i = 0; i < 2; i++) {
      this.squiggles.push(
        new Squiggle2(rp(), 12, size * 0.4, 1.4, {
          color: `hsla(${hue(bgHue + 100)}, 70%,60%,0.82)`,
          lineWidth: size * 0.24,
          lineJoin: "bevel",
          lineCap: "butt"
        })
      )
    }
    // round splat
    for (let i = 0; i < 3; i++) {
      this.squiggles.push(
        new Squiggle2(rp(), 80, size * 0.03, 0.5, {
          color: `hsla(${hue(bgHue + 90)}, 70%,60%,0.42)`,
          blendMode: "darken",
          lineWidth: size * 0.24,
          lineJoin: "bevel",
          lineCap: "round"
        })
      )
    }
    // Dashed lines.
    for (let i = 0; i < 2; i++) {
      this.squiggles.push(
        new Squiggle2(rp(), 60, size * 0.1, 0.8, {
          color: `hsla(${hue(bgHue + 130)},60%,60%,0.8)`,
          lineWidth: size * 0.015,
          lineDash: [size * 0.03, size * 0.06],
          lineCap: "round"
        })
      );
    }
    ["overlay", "darken"].forEach(blendMode => {
      const s = size * 0.03;
      this.squiggles.push(
        new Squiggle2(rp(), 100, s * 2, 1.0, {
          color: `hsla(${hue(bgHue + 190)},60%,50%,0.8)`,
          blendMode: blendMode,
          lineWidth: size * 0.008,
          lineDash: [s, s * 2]
        })
      );
    });
  }

  public updateAndRender() {
    this.ctx.clearRect(0,0,this.size, this.size);
    this.ctx.save();

    this.ctx.beginPath();
    this.ctx.arc(this.size/2, this.size/2, this.size/2, 0, Math.PI*2);
    this.ctx.clip();
    this.ctx.fillStyle= this.backgroundColor;
    this.ctx.fillRect(0,0, this.size, this.size);

    this.squiggles.forEach(s => {
      s.update();
      s.render(this.ctx);
    });

    this.ctx.restore();
  }
}

interface StrokeStyle2 {
  color: string;
  blendMode?: string;
  lineWidth: number;
  lineDash?: number[];
  lineJoin?: CanvasLineJoin;
  lineCap?: CanvasLineCap;
}

class Point2 {
  constructor(public x:number = 0, public y: number = 0) {}
}

class Particle2 extends Point2 {  
  public restitution:number = 0.25;
  public fixed:boolean = false;
  public fx:number = 0;
  public fy:number = 0;
  public vx:number = 0;
  public vy:number = 0;
  public ox:number = 0;
  public oy:number = 0;
  constructor(
    public x:number = 0,
    public y:number = 0,
    public mass:number = 1
  ) {
    super(x,y);
  }
}

 class Spring2 {
   constructor(
     public readonly a:Particle2,
     public readonly b:Particle2,
     public restLength:number = 100,
     public stiffness:number = 1.0,
   ) {}
 }

class Squiggle2 {
  public readonly particles:Particle2[] = [];
  public readonly springs:Spring2[] = [];
  constructor(
    origin: Point2,
    public readonly segmentCount:number,
    public readonly segmentLength:number,
    public readonly jitter:number,
    public readonly style:StrokeStyle2
  ) {
    let {x,y} = origin;
    let op:Particle2;
    let t:number = Math.random() * Math.PI * 2;
    for (let i = 0; i < segmentCount; i ++) {
      const p = new Particle2(x, y);
      this.particles.push(p);
      if (op) {
        this.springs.push(new Spring2(op, p, segmentLength));
      }
      t += (Math.random() * Math.PI) * jitter;
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
      // not using euler because 
      // vohill formula?
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

const container2 = document.getElementById('app');
const size2 = 250;
const spacing2 = 24;
const cols2 = Math.min(4, Math.floor(window.innerWidth / (size2 + spacing2)));
const rows2 = Math.min(4, Math.floor(window.innerHeight / (size2 + spacing2)));
const total2 = cols2 * rows2;
const dishes2: Petri2[] = [];

container2.style.cssText = `
  display: grid;
  grid-template-columns: repeat(${cols2}, 1fr);
  gap: ${spacing2}px;
`;

const createPetri2 = () => {
  const p = new Petri2(size2);
  p.canvas.onclick = () => {
    changePetri2(p);
  };
  return p;
}

const changePetri2 = p => {
  const index = dishes2.indexOf(p);
  if (index !== -1) {
    // Petri can be found
    const newPetri = createPetri2();
    container2.insertBefore(newPetri.canvas, p.canvas);
    container2.removeChild(p.canvas);
    dishes2.splice(index, 1, newPetri);
    p.canvas.onclick = null;
  }
}

for (let i = 0; i < total2; i++) {
  const p = createPetri2();
  container2.appendChild(p.canvas);
  dishes2.push(p);
}

const update2 = () => {
  requestAnimationFrame(update2);
  dishes2.forEach(d => d.updateAndRender());
};

update2();