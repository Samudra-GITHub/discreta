/**
 * Shader source for the page "sculptures": glossy, iridescent 3D forms rendered by raymarching
 * signed distance functions in a single fragment shader. There is no 3D library; the whole
 * renderer is this file plus SculptureCanvas.tsx.
 *
 * One program is built per shape, with the shape chosen by a #define so the GPU only compiles
 * and runs the code for the form on screen. The look follows the reference video: a pale
 * lavender-white world, a reflective body whose colour shifts between violet, electric
 * purple, magenta, pink and cyan with the viewing angle (thin-film iridescence), a soft
 * specular highlight, rim light, ambient occlusion and a faint contact shadow.
 */

export type SculptureShape =
  | 'dashboard'
  | 'logic'
  | 'sets'
  | 'combinatorics'
  | 'graphs'
  | 'algebra'
  | 'frequency'
  | 'journey'
  | 'theory'
  | 'orb'

const SHAPE_ID: Record<SculptureShape, number> = {
  dashboard: 0,
  logic: 1,
  sets: 2,
  combinatorics: 3,
  graphs: 4,
  algebra: 5,
  frequency: 6,
  journey: 7,
  theory: 8,
  orb: 9,
}

/** Camera zoom per shape: larger numbers show more of the scene (a smaller object). */
const ZOOM: Record<SculptureShape, string> = {
  dashboard: '0.74',
  logic: '0.8',
  sets: '0.7',
  combinatorics: '0.82',
  graphs: '0.74',
  algebra: '0.78',
  frequency: '0.84',
  journey: '0.9',
  theory: '0.84',
  orb: '0.74',
}

export const VERTEX_SOURCE = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const COMMON = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float sdBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b + vec3(r); return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float sdTorus(vec3 p, vec2 t) { return length(vec2(length(p.xz) - t.x, p.y)) - t.y; }
float sdCap(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
vec2 un(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
`

/** Distance functions. Each returns vec2(distance, material); materials are listed in `shade`. */
const MAPS: Record<SculptureShape, string> = {
  // A fluid, lobed ring that swallows two orbiting blobs: the abstract focal sculpture.
  dashboard: `
vec2 map(vec3 p) {
  p.xz *= rot(uTime * 0.28);
  p.yz *= rot(1.05 + 0.12 * sin(uTime * 0.45));
  float a = atan(p.z, p.x);
  float R = 0.66 + 0.09 * sin(a * 3.0 + uTime * 0.9);
  float r = 0.19 + 0.06 * sin(a * 2.0 - uTime * 0.7) + 0.02 * sin(a * 5.0 + uTime);
  float d = length(vec2(length(p.xz) - R, p.y * (1.0 + 0.45 * sin(a * 2.0 + uTime * 0.5)))) - r;
  vec3 s1 = vec3(0.58 * cos(uTime * 0.6 + 1.0), 0.3 * sin(uTime * 0.8), 0.58 * sin(uTime * 0.6 + 1.0));
  d = smin(d, length(p - s1) - 0.17, 0.22);
  return vec2(d, 0.0);
}`,

  // An AND gate, extruded and rounded, with two input pegs and an output peg.
  logic: `
vec2 map(vec3 p) {
  p.xz *= rot(0.5 * sin(uTime * 0.35) - 0.3);
  p.yz *= rot(0.22);
  vec2 q = p.xy;
  vec2 b = abs(q - vec2(-0.27, 0.0)) - vec2(0.27, 0.42);
  float box2 = length(max(b, 0.0)) + min(max(b.x, b.y), 0.0);
  float d2 = min(box2, length(q) - 0.42);
  vec2 w = vec2(d2 + 0.12, abs(p.z) - 0.04);
  float gate = min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - 0.12;
  float pegs = sdCap(p, vec3(-0.5, 0.2, 0.0), vec3(-0.92, 0.2, 0.0), 0.05);
  pegs = min(pegs, sdCap(p, vec3(-0.5, -0.2, 0.0), vec3(-0.92, -0.2, 0.0), 0.05));
  pegs = min(pegs, sdCap(p, vec3(0.4, 0.0, 0.0), vec3(0.84, 0.0, 0.0), 0.05));
  float d = smin(gate, pegs, 0.06);
  float ends = min(min(length(p - vec3(-1.0, 0.2, 0.0)), length(p - vec3(-1.0, -0.2, 0.0))), length(p - vec3(0.94, 0.0, 0.0))) - 0.1;
  vec2 res = vec2(d, 0.0);
  return un(res, vec2(ends, 2.0));
}`,

  // Three interlocked rings in a Venn arrangement.
  sets: `
vec2 map(vec3 p) {
  p.xz *= rot(0.45 * sin(uTime * 0.4));
  p.yz *= rot(0.12 * sin(uTime * 0.3));
  vec3 a = p - vec3(-0.3, 0.17, 0.0);
  vec3 b = p - vec3(0.3, 0.17, 0.0);
  vec3 c = p - vec3(0.0, -0.35, 0.0);
  vec2 r1 = vec2(sdTorus(vec3(a.x, a.z, a.y), vec2(0.52, 0.055)), 4.0);
  vec2 r2 = vec2(sdTorus(vec3(b.x, b.z, b.y), vec2(0.52, 0.055)), 1.0);
  vec2 r3 = vec2(sdTorus(vec3(c.x, c.z, c.y), vec2(0.52, 0.055)), 2.0);
  return un(un(r1, r2), r3);
}`,

  // Three layers; on each layer the same three spheres stand in a different order.
  combinatorics: `
vec2 map(vec3 p) {
  p.xz *= rot(0.5 * sin(uTime * 0.35) - 0.35);
  p.yz *= rot(0.16);
  vec2 res = vec2(1e5, 0.0);
  for (int i = 0; i < 3; i++) {
    float fy = 0.62 - float(i) * 0.62;
    res = un(res, vec2(sdBox(p - vec3(0.0, fy - 0.15, 0.0), vec3(0.82, 0.035, 0.26), 0.03), 3.0));
    for (int j = 0; j < 3; j++) {
      float slot = mod(float(j + i), 3.0);
      float fx = -0.5 + slot * 0.5;
      float m = j == 0 ? 4.0 : (j == 1 ? 1.0 : 2.0);
      res = un(res, vec2(length(p - vec3(fx, fy, 0.0)) - 0.14, m));
    }
  }
  return res;
}`,

  // A small graph in space: six spheres joined by rods, one path emphasised.
  graphs: `
vec2 map(vec3 p) {
  p.xz *= rot(uTime * 0.3);
  p.yz *= rot(0.25);
  vec3 n0 = vec3(-0.8, 0.1, 0.0);
  vec3 n1 = vec3(-0.35, 0.62, 0.3);
  vec3 n2 = vec3(0.3, 0.55, -0.25);
  vec3 n3 = vec3(0.8, 0.0, 0.15);
  vec3 n4 = vec3(0.25, -0.6, 0.3);
  vec3 n5 = vec3(-0.4, -0.55, -0.2);
  float e = sdCap(p, n0, n1, 0.03);
  e = min(e, sdCap(p, n1, n2, 0.03));
  e = min(e, sdCap(p, n2, n3, 0.03));
  e = min(e, sdCap(p, n3, n4, 0.03));
  e = min(e, sdCap(p, n4, n5, 0.03));
  e = min(e, sdCap(p, n5, n0, 0.03));
  e = min(e, sdCap(p, n1, n4, 0.03));
  e = min(e, sdCap(p, n2, n5, 0.03));
  vec2 res = vec2(e, 3.0);
  float hi = min(min(length(p - n0), length(p - n1)), min(length(p - n4), length(p - n3))) - 0.2;
  float lo = min(length(p - n2), length(p - n5)) - 0.15;
  res = un(res, vec2(hi, 0.0));
  return un(res, vec2(lo, 4.0));
}`,

  // The integers modulo 26 as a ring of beads, with 0 and 3 emphasised.
  algebra: `
vec2 map(vec3 p) {
  p.xz *= rot(uTime * 0.22);
  p.yz *= rot(0.95);
  float sector = 6.28318 / 26.0;
  float a = atan(p.z, p.x);
  float idx = floor(a / sector + 0.5);
  float aa = idx * sector;
  float k = mod(idx + 26.0, 26.0);
  vec3 bead = vec3(cos(aa), 0.0, sin(aa)) * 0.82;
  bool big = k < 0.5 || abs(k - 3.0) < 0.5;
  float rb = big ? 0.115 : 0.062;
  vec2 res = vec2(length(p - bead) - rb, big ? 1.0 : 0.0);
  res = un(res, vec2(sdTorus(p, vec2(0.82, 0.016)), 3.0));
  float disc = sdBox(p, vec3(0.5, 0.03, 0.5), 0.03);
  disc = max(disc, length(p.xz) - 0.52);
  return un(res, vec2(disc, 3.0));
}`,

  // Bars for the twelve most common English letters, in rank order (ETAOINSHRDLU).
  frequency: `
float letterFrequency(float i) {
  if (i < 0.5) return 12.7;
  if (i < 1.5) return 9.1;
  if (i < 2.5) return 8.2;
  if (i < 3.5) return 7.5;
  if (i < 4.5) return 7.0;
  if (i < 5.5) return 6.7;
  if (i < 6.5) return 6.3;
  if (i < 7.5) return 6.1;
  if (i < 8.5) return 6.0;
  if (i < 9.5) return 4.3;
  if (i < 10.5) return 4.0;
  return 2.8;
}
vec2 map(vec3 p) {
  p.xz *= rot(0.4 * sin(uTime * 0.35) - 0.45);
  p.yz *= rot(0.2);
  float gx = (p.x + 0.97) / 0.176;
  vec2 res = vec2(1e5, 0.0);
  for (int o = -1; o <= 1; o++) {
    float i = clamp(floor(gx + 0.5) + float(o), 0.0, 11.0);
    float h = letterFrequency(i) / 12.7 * 0.95;
    vec3 c = vec3(-0.97 + i * 0.176, -0.5 + h * 0.5, 0.0);
    res = un(res, vec2(sdBox(p - c, vec3(0.062, h * 0.5, 0.11), 0.05), i < 0.5 ? 1.0 : 0.0));
  }
  float base = sdBox(p - vec3(0.0, -0.56, 0.0), vec3(1.12, 0.03, 0.26), 0.03);
  return un(res, vec2(base, 3.0));
}`,

  // Alice and Bob joined by an arc, with a floating glass card carrying the message.
  journey: `
vec2 map(vec3 p) {
  p.xz *= rot(0.3 * sin(uTime * 0.4));
  p.y -= 0.04 * sin(uTime * 0.7);
  vec2 res = vec2(length(p - vec3(-0.85, -0.12, 0.0)) - 0.26, 2.0);
  res = un(res, vec2(length(p - vec3(0.85, -0.12, 0.0)) - 0.26, 4.0));
  float tube = 1e5;
  for (int i = 0; i < 8; i++) {
    float t0 = float(i) / 8.0;
    float t1 = float(i + 1) / 8.0;
    vec3 a = vec3(mix(-0.85, 0.85, t0), -0.12 + 0.5 * sin(3.14159 * t0), 0.0);
    vec3 b = vec3(mix(-0.85, 0.85, t1), -0.12 + 0.5 * sin(3.14159 * t1), 0.0);
    tube = min(tube, sdCap(p, a, b, 0.04));
  }
  res = un(res, vec2(tube, 0.0));
  vec3 q = p - vec3(0.0, 0.62, 0.0);
  q.xy *= rot(0.12 * sin(uTime * 0.6));
  res = un(res, vec2(sdBox(q, vec3(0.3, 0.19, 0.02), 0.03), 3.0));
  return res;
}`,

  // Stacked proof slabs with a small sphere on top.
  theory: `
vec2 map(vec3 p) {
  p.xz *= rot(0.4 * sin(uTime * 0.35) - 0.3);
  p.yz *= rot(0.2);
  vec2 res = vec2(sdBox(p - vec3(-0.12, -0.42, 0.0), vec3(0.72, 0.07, 0.42), 0.05), 0.0);
  res = un(res, vec2(sdBox(p - vec3(0.0, 0.0, 0.0), vec3(0.72, 0.07, 0.42), 0.05), 3.0));
  res = un(res, vec2(sdBox(p - vec3(0.12, 0.42, 0.0), vec3(0.72, 0.07, 0.42), 0.05), 0.0));
  res = un(res, vec2(length(p - vec3(0.45, 0.78 + 0.03 * sin(uTime), 0.0)) - 0.14, 1.0));
  return res;
}`,

  // A single fluid sphere.
  orb: `
vec2 map(vec3 p) {
  p.xz *= rot(uTime * 0.3);
  float d = length(p) - 0.62 + 0.06 * sin(4.0 * p.x + uTime) * sin(4.0 * p.y - uTime * 0.7) * sin(4.0 * p.z + uTime * 0.5);
  return vec2(d, 0.0);
}`,
}

const SHADING = `
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0012, -0.0012);
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x);
}

float occlusion(vec3 p, vec3 n) {
  float o = 0.0;
  float s = 1.0;
  for (int i = 1; i <= 4; i++) {
    float h = 0.045 * float(i);
    o += (h - map(p + n * h).x) * s;
    s *= 0.62;
  }
  return clamp(1.0 - 2.4 * o, 0.0, 1.0);
}

// Materials: 0 iridescent body, 1 magenta-leaning highlight, 2 mint tint, 3 glass, 4 blue tint.
vec3 shade(vec3 p, vec3 n, vec3 rd, float id) {
  vec3 L = normalize(vec3(-0.55, 0.8, 0.65));
  float wrap = 0.5 + 0.5 * dot(n, L);
  float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.2);
  vec3 r = reflect(rd, n);

  float t = 0.32 * n.y + 0.28 * n.x + 0.9 * fres + 0.08 * sin(uTime * 0.4)
          + 0.34 * p.x + 0.26 * p.y + 0.12 * sin(p.x * 3.2 + p.y * 2.4 + uTime * 0.3);
  if (id > 0.5 && id < 1.5) t += 0.2;
  vec3 irid = vec3(0.56, 0.4, 0.82) + vec3(0.42, 0.4, 0.3) * cos(6.28318 * (vec3(1.0, 0.9, 0.7) * t + vec3(0.0, 0.25, 0.55)));
  if (id > 1.5 && id < 2.5) irid = mix(irid, vec3(0.30, 0.92, 0.86), 0.7);
  if (id > 2.5 && id < 3.5) irid = mix(irid, vec3(0.95, 0.94, 1.0), 0.5);
  if (id > 3.5) irid = mix(irid, vec3(0.42, 0.62, 0.96), 0.55);

  vec3 env = mix(vec3(0.96, 0.93, 1.0), vec3(0.99, 0.8, 0.9), clamp(0.5 - 0.5 * r.y, 0.0, 1.0));
  env = mix(env, vec3(0.55, 0.85, 0.95), 0.35 * pow(clamp(r.x * 0.8 + 0.2, 0.0, 1.0), 2.0));

  float occ = occlusion(p, n);
  vec3 col = irid * (0.4 + 0.6 * wrap) * (0.55 + 0.45 * occ);
  col = mix(col, env, 0.16 + 0.5 * fres);
  col += vec3(1.0) * pow(clamp(dot(r, L), 0.0, 1.0), 48.0) * 0.85;
  col += vec3(0.95, 0.7, 1.0) * pow(fres, 3.0) * 0.35;
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 ro = vec3(0.0, 0.0, 3.2);
  vec3 rd = normalize(vec3(uv * ZOOM, -1.0));

  float t = 0.0;
  float dmin = 1e9;
  float tmin = 0.0;
  float id = 0.0;
  bool hit = false;
  for (int i = 0; i < 84; i++) {
    vec2 h = map(ro + rd * t);
    if (h.x < dmin) { dmin = h.x; tmin = t; id = h.y; }
    if (h.x < 0.0012) { hit = true; break; }
    t += h.x * 0.9;
    if (t > 7.0) break;
  }

  float px = ZOOM / uRes.y * tmin;
  float cover = hit ? 1.0 : 1.0 - smoothstep(0.0, px * 1.5, dmin);

  vec3 color = vec3(0.0);
  float alpha = 0.0;
  if (cover > 0.001) {
    vec3 p = ro + rd * (hit ? t : tmin);
    vec3 n = calcNormal(p);
    color = shade(p, n, rd, id);
    alpha = cover;
    if (id > 2.5 && id < 3.5) alpha *= 0.66;
  }

  // Soft contact shadow on an invisible floor, so the form seems to float above the page.
  vec2 sp = (uv - vec2(0.0, -0.3)) * vec2(2.6, 7.5);
  float shadow = exp(-dot(sp, sp) * 2.4) * 0.2;
  vec3 shadowColor = vec3(0.27, 0.23, 0.58);

  vec3 premult = color * alpha + shadowColor * shadow * (1.0 - alpha);
  float outA = alpha + shadow * (1.0 - alpha);
  premult += (hash(gl_FragCoord.xy) - 0.5) / 255.0 * outA;
  gl_FragColor = vec4(premult, outA);
}
`

/** Fragment shader source for one shape. */
export function fragmentSource(shape: SculptureShape): string {
  return `#define SHAPE ${SHAPE_ID[shape]}
#define ZOOM ${ZOOM[shape]}
${COMMON}
${MAPS[shape]}
${SHADING}`
}
