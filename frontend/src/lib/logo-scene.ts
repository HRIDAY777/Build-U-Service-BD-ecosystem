import * as THREE from "three";

export async function createLogoScene(canvas: HTMLCanvasElement) {
  const image = new Image();
  image.src = "/images/brand/u-service-logo.png";
  await image.decode();
  const sample = document.createElement("canvas");
  const w = 480,
    h = Math.round((w * image.height) / image.width);
  sample.width = w;
  sample.height = h;
  const ctx = sample.getContext("2d")!;
  ctx.drawImage(image, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) {
    const p = i * 4;
    mask[i] = Number(
      pixels[p + 3] > 100 &&
        pixels[p] > 60 &&
        pixels[p + 1] < pixels[p] * 0.85 &&
        pixels[p + 2] > pixels[p + 1] * 1.15,
    );
  }
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(960, 540, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#fbf6fc");
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 100);
  camera.position.z = 16;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x54215d, 2.8));
  const light = new THREE.DirectionalLight(0xffffff, 4);
  light.position.set(-3, 5, 8);
  scene.add(light);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xa2389c,
    metalness: 0.4,
    roughness: 0.25,
    clearcoat: 1,
    side: THREE.DoubleSide,
  });
  const root = new THREE.Group();
  scene.add(root);
  const seen = new Uint8Array(mask.length);
  const pieces: { mesh: THREE.Mesh; x: number; y: number; seed: number }[] = [];
  const unit = 8 / w;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    const queue = [start];
    seen[start] = 1;
    for (let k = 0; k < queue.length; k++) {
      const p = queue[k],
        x = p % w,
        y = Math.floor(p / w);
      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ]) {
        const n = ny * w + nx;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[n] && !seen[n]) {
          seen[n] = 1;
          queue.push(n);
        }
      }
    }
    if (queue.length < 5) continue;
    const xs = queue.map((p) => p % w),
      ys = queue.map((p) => Math.floor(p / w));
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2,
      cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const vertices: number[] = [];
    const quad = (a: number[], b: number[], c: number[], d: number[]) =>
      vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (const p of queue) {
      const x = p % w,
        y = Math.floor(p / w),
        l = (x - cx) * unit,
        r = l + unit,
        t = (cy - y) * unit,
        b = t - unit,
        z = 0.22;
      quad([l, b, z], [r, b, z], [r, t, z], [l, t, z]);
      quad([r, b, -z], [l, b, -z], [l, t, -z], [r, t, -z]);
      if (!x || !mask[p - 1])
        quad([l, b, -z], [l, b, z], [l, t, z], [l, t, -z]);
      if (x === w - 1 || !mask[p + 1])
        quad([r, b, z], [r, b, -z], [r, t, -z], [r, t, z]);
      if (!y || !mask[p - w])
        quad([l, t, z], [r, t, z], [r, t, -z], [l, t, -z]);
      if (y === h - 1 || !mask[p + w])
        quad([l, b, -z], [r, b, -z], [r, b, z], [l, b, z]);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    root.add(mesh);
    pieces.push({
      mesh,
      x: (cx - w / 2) * unit,
      y: (h / 2 - cy) * unit,
      seed: pieces.length,
    });
  }
  let frame = 0,
    elapsed = 0,
    last = performance.now(),
    paused = false,
    disposed = false,
    renderedTime = -1;
  const draw = (now: number) => {
    if (disposed) return;
    if (!paused)
      elapsed = Math.min(8, elapsed + Math.min((now - last) / 1000, 0.1));
    last = now;
    if (renderedTime === elapsed || document.hidden) {
      frame = requestAnimationFrame(draw);
      return;
    }
    renderedTime = elapsed;
    for (const { mesh, x, y, seed } of pieces) {
      const t = THREE.MathUtils.clamp(
          (elapsed - 0.4 - (seed % 7) * 0.1) / 2.8,
          0,
          1,
        ),
        spread = Math.pow(1 - t, 3);
      mesh.position.set(
        x + Math.sin(seed * 2.4) * 7 * spread,
        y + Math.cos(seed * 1.7) * 5 * spread,
        -8 * spread,
      );
      mesh.rotation.set(
        spread * ((seed % 3) - 1) * 2,
        spread * 3,
        spread * Math.sin(seed) * 2,
      );
    }
    const reveal = THREE.MathUtils.smoothstep(elapsed, 3, 6.5);
    root.rotation.y = -0.55 * (1 - reveal) + 0.18 * reveal;
    root.rotation.x = 0.12 * (1 - reveal);
    root.scale.setScalar(0.72 + 0.28 * reveal);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return {
    replay() {
      elapsed = 0;
      paused = false;
      last = performance.now();
    },
    pause(value: boolean) {
      paused = value;
    },
    finish() {
      elapsed = 8;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      pieces.forEach((p) => p.mesh.geometry.dispose());
      material.dispose();
      renderer.dispose();
    },
  };
}
