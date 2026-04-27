export function renderHUD(ctx, lines = []) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(10, 10, 260, 20 + lines.length * 18);
  ctx.fillStyle = "#9fe8ff";
  lines.forEach((l, i) => ctx.fillText(l, 18, 30 + i * 18));
  ctx.restore();
}
