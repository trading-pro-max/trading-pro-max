export const ib = null as any;

export async function connectIB() {
  return { ok: true, broker: "IBKR_STUB" };
}

export async function connectIBKR() {
  return connectIB();
}

export async function placeOrder(payload: any = {}) {
  return {
    ok: true,
    status: "SIMULATED",
    order: payload,
  };
}

export default ib;
