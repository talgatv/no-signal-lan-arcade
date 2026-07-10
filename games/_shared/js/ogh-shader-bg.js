/**
 * Fullscreen WebGL background — reusable neon field.
 * Gracefully no-ops if WebGL unavailable.
 *
 * const bg = OGHShaderBg.mount(canvas);
 * bg.setPalette(0); // 0 comet cyan/pink, 1 green, 2 amber
 * requestAnimationFrame loop calls bg.frame(tSec) OR bg.start() auto-rAF
 */
const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Compact plasma / starfield hybrid — one shader, palette via uniform
const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_palette;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);

  float t = u_time * 0.15;
  float v = 0.0;
  vec2 q = p;
  for (int i = 0; i < 4; i++) {
    float fi = float(i + 1);
    q = mat2(0.8, -0.6, 0.6, 0.8) * q;
    v += sin(q.x * (3.0 + fi) + t * fi + sin(q.y * 4.0 - t)) / fi;
  }
  v = v * 0.5 + 0.5;

  // soft vignette
  float vig = smoothstep(1.15, 0.2, length(p));

  // sparse twinkles
  vec2 gv = floor(gl_FragCoord.xy * 0.08);
  float stars = step(0.997, hash(gv + floor(u_time * 0.5)));
  stars *= 0.55 + 0.45 * sin(u_time * 6.0 + hash(gv) * 20.0);

  vec3 cA, cB, cC;
  if (u_palette < 0.5) {
    cA = vec3(0.02, 0.03, 0.08);
    cB = vec3(0.08, 0.45, 0.65);
    cC = vec3(0.55, 0.15, 0.45);
  } else if (u_palette < 1.5) {
    cA = vec3(0.02, 0.06, 0.04);
    cB = vec3(0.1, 0.55, 0.35);
    cC = vec3(0.2, 0.35, 0.15);
  } else {
    cA = vec3(0.06, 0.03, 0.02);
    cB = vec3(0.65, 0.35, 0.08);
    cC = vec3(0.45, 0.12, 0.08);
  }

  vec3 col = mix(cA, cB, v * 0.55 * vig);
  col = mix(col, cC, smoothstep(0.55, 1.0, v) * 0.35 * vig);
  col += stars * vec3(0.7, 0.85, 1.0);
  col += 0.03 * vig;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[OGHShaderBg]', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export const OGHShaderBg = {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ palette?: number }} [opts]
   */
  mount(canvas, opts = {}) {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
    if (!gl) {
      canvas.style.background = '#07080f';
      return {
        frame() {},
        start() {},
        stop() {},
        setPalette() {},
        resize() {},
        ok: false,
      };
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uPal = gl.getUniformLocation(prog, 'u_palette');

    let palette = opts.palette ?? 0;
    let raf = 0;
    let running = false;
    const t0 = performance.now();

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }

    function frame(tSec) {
      resize();
      gl.uniform1f(uTime, tSec);
      gl.uniform1f(uPal, palette);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function loop() {
      if (!running) return;
      frame((performance.now() - t0) / 1000);
      raf = requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', resize);

    return {
      ok: true,
      frame,
      setPalette(n) { palette = n; },
      resize,
      start() {
        if (running) return;
        running = true;
        loop();
      },
      stop() {
        running = false;
        cancelAnimationFrame(raf);
      },
    };
  },
};
