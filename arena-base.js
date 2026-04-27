export class ArenaBase {
  constructor(id, name) { this.id = id; this.name = name; }
  init() {}
  input() {}
  update() {}
  evaluate() { return { stability: 0 }; }
  render() {}
}
