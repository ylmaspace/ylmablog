export function createNetworkClient(io, token, handlers = {}) {
  const socket = io({ auth: { token } });
  Object.entries(handlers).forEach(([event, fn]) => socket.on(event, fn));
  return socket;
}
