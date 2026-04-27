export function spawnThrusterParticles(arr, x, y, angle, count = 5) {
  for (let i = 0; i < count; i++) arr.push({ x: x - Math.cos(angle) * (8 + i * 2), y: y - Math.sin(angle) * (8 + i * 2), life: 0.5 });
}
