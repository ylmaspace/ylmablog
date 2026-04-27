export function applyCamera(ctx, targetX, targetY, centerX = 360, centerY = 260) {
  ctx.translate(-targetX + centerX, -targetY + centerY);
}
