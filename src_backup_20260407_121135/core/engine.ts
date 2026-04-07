export class Engine {
  state = { status: "BOOTING", capital: 10000, positions: [] as any[] };
  start() { this.state.status = "RUNNING"; return this.state; }
  execute(signal:any){ return { ok:true, signal }; }
}
export const engine = new Engine();
