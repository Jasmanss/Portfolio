// The hero's light: slow plumes pouring down from the top on the right, printed as a 1-bit dither in the accent
// colour. While the site loads, random blocks switch on with the progress, and under the cursor a lens breaks the
// light down into the characters it is made of.
export default /* glsl */ `
// How much light reaches a point: plumes pouring down from the top edge, with dark gaps between them. They lean
// to the right so the tagline at the top left stays on black.
float light(vec2 frag) {
  vec2 uv = frag / uRes;
  vec2 p = vec2(uv.x * uRes.x / uRes.y, uv.y);
  float t = uTime * 0.09;
  vec2 q = vec2(fbm(p * 0.85 + vec2(0.0, t)), fbm(p * 0.85 + vec2(5.2, -t * 0.8)));
  float n = fbm(p * 1.05 + q * 2.2 + vec2(t * 0.6, -t * 1.3));
  float edge = 1.0 - uLight * 0.78;
  float k = smoothstep(edge, edge + 0.7, uv.y + (n - 0.5) * 0.8);
  k *= smoothstep(0.22, 0.74, n) * 1.15 * rightSide(frag, n - 0.5);
  return clamp(k * uLight, 0.0, 1.0);
}

// The accent, lifted towards white where the light is hottest.
vec3 lift(float by) { return mix(uAccent, vec3(1.0), by); }
vec3 hot(float k) { return mix(uAccent * 0.85, lift(0.2), smoothstep(0.75, 1.0, k)); }

// The light plus the loader: while the site loads, random blocks switch on at random strengths.
float lum(vec2 p) {
  float k = light(p);
  if (uBoot > 0.0) {
    vec2 b = floor(p / (16.0 * uDpr));
    float on = step(hash(b + 3.7), uLoad) * step(0.45, hash(b + 5.3));
    k = max(k, on * uBoot * (0.3 + 0.7 * hash(b + 9.1)));
  }
  return k;
}

// The lens: under the cursor the light breaks down into the characters it is made of.
vec3 lens(vec2 frag, vec3 col) {
  float r = 130.0 * uDpr * uCursor;
  float inLens = r > 0.0 ? 1.0 - smoothstep(r * 0.55, r, length(frag - mouseGL())) : 0.0;
  if (inLens <= 0.0) return col;
  vec2 cell = floor(frag / uCell);
  float kc = light((cell + 0.5) * uCell);
  inLens *= smoothstep(0.02, 0.2, kc);
  float g = 1.0 + floor(clamp(kc * 1.35, 0.0, 0.999) * 9.0);
  vec2 f = fract(frag / uCell);
  float a = texture2D(uGlyphs, vec2((g + f.x) / 10.0, 1.0 - f.y)).a;
  vec3 ink = mix(vec3(0.3), hot(kc), smoothstep(0.03, 0.3, kc));
  return mix(col, mix(col * 0.25, ink, a), inLens);
}

// The dither: the light printed as single pixels through an 8x8 Bayer matrix, like a 1-bit screen.
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer8(vec2 a) { return bayer2(0.25 * a) * 0.0625 + bayer2(0.5 * a) * 0.25 + bayer2(a); }
vec3 dither(vec2 frag) {
  float size = 3.0 * uDpr;
  vec2 px = floor(frag / size);
  float k = lum((px + 0.5) * size);
  float b = bayer8(px);
  float on = step(b + 0.02, min(k * 1.15, 0.8));
  float peak = step(b, (k - 0.6) * 2.4);
  return mix(BG, mix(uAccent * 0.8, lift(0.2), peak), on);
}
`
