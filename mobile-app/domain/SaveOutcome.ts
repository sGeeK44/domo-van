/** What one write came back as: `unreachable` never left the phone, `timedOut` got no answer. */
export type WriteOutcome =
  | { status: "applied" }
  | { status: "rejected"; code: string }
  | { status: "timedOut" }
  | { status: "unreachable" };

export const APPLIED: WriteOutcome = Object.freeze({ status: "applied" });
export const TIMED_OUT: WriteOutcome = Object.freeze({ status: "timedOut" });
export const UNREACHABLE: WriteOutcome = Object.freeze({
  status: "unreachable",
});

export type RejectedWrite = { status: "rejected"; code: string };

export function rejectedWrite(code: string): RejectedWrite {
  return { status: "rejected", code };
}

/** Both modules answer identity on their admin channel; only the owner tells the fields apart. */
export type IdentityOwner = "water" | "heater";

/** Which field a failed write belongs to; the dictionary owns the wording. */
export type SaveFieldKey =
  | `${IdentityOwner}.identity`
  | "water.cleanTank"
  | "water.greyTank"
  | "water.valve"
  | `heater.pid.zone${1 | 2 | 3 | 4}`;

export type SaveFailure = { field: SaveFieldKey; outcome: WriteOutcome };

export type SaveOutcome =
  | { status: "applied" }
  | { status: "failed"; failures: readonly SaveFailure[] };

export type FieldWrite = {
  field: SaveFieldKey;
  write: () => Promise<WriteOutcome>;
};

/** Writes every field before reporting: a save stopped halfway leaves a state the form cannot describe. */
export async function saveFields(
  writes: readonly FieldWrite[],
): Promise<SaveOutcome> {
  const results = await Promise.all(writes.map(attempt));
  const failures = results.filter(
    ({ outcome }) => outcome.status !== "applied",
  );
  if (failures.length === 0) return { status: "applied" };
  return { status: "failed", failures };
}

async function attempt({ field, write }: FieldWrite): Promise<SaveFailure> {
  return { field, outcome: await write() };
}
