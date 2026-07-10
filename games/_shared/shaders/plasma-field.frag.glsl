// Reference copy — runtime version is inlined in ogh-shader-bg.js
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
  float vig = smoothstep(1.15, 0.2, length(p));
  vec2 gv = floor(gl_FragCoord.xy * 0.08);
  float stars = step(0.997, hash(gv + floor(u_time * 0.5)));
  stars *= 0.55 + 0.45 * sin(u_time * 6.0 + hash(gv) * 20.0);
  vec3 cA = vec3(0.02, 0.03, 0.08);
  vec3 cB = vec3(0.08, 0.45, 0.65);
  vec3 cC = vec3(0.55, 0.15, 0.45);
  vec3 col = mix(cA, cB, v * 0.55 * vig);
  col = mix(col, cC, smoothstep(0.55, 1.0, v) * 0.35 * vig);
  col += stars * vec3(0.7, 0.85, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
