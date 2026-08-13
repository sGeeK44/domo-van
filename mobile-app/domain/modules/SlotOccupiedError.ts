import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";

export class SlotOccupiedError extends Error {
  constructor(readonly key: ModuleKey) {
    super(`Module slot "${key}" already holds a pairing`);
    this.name = "SlotOccupiedError";
  }
}
