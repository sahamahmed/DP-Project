import { IMessageGate, MessageGateContext } from './message-gate.interface';

/**
 * Abstract base for all gates.
 * Handles the next-gate linking so concrete gates only implement check().
 */
export abstract class AbstractMessageGate implements IMessageGate {
  private nextGate: IMessageGate | null = null;

  setNext(gate: IMessageGate): IMessageGate {
    this.nextGate = gate;
    return gate; // allows chaining: gateA.setNext(gateB).setNext(gateC)
  }

  async handle(ctx: MessageGateContext): Promise<boolean> {
    const shouldContinue = await this.check(ctx);
    if (!shouldContinue) return false;
    if (this.nextGate) return this.nextGate.handle(ctx);
    return true; // end of chain — all gates passed
  }

  /** Return true to continue the chain, false to stop. */
  protected abstract check(ctx: MessageGateContext): Promise<boolean>;
}
