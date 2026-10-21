// The context verdict is the heart of the team prototype. These cases pin every supported state.
import { describe, expect, it } from "vitest";
import { contextFingerprint, contextVerdict } from "../src/context.js";

const h = (n: number) => n.toString(16).padStart(64, "0");
const base = h(0);
const upstream = h(1);
const further = h(2);
const later = h(3);

describe("contextVerdict", () => {
  it("normalizes BOM and CRLF before hashing", () => {
    expect(contextFingerprint("hello\n")).toBe(contextFingerprint("\uFEFFhello\r\n"));
  });

  it("passes an unchanged dependency", () => {
    expect(contextVerdict({ base, local: base, target: base, recorded: base })).toEqual({ status: "ok", reason: "local content is recorded" });
  });

  it("passes an intentional local change before merge", () => {
    expect(contextVerdict({ base, local: further, target: base, recorded: further })).toEqual({
      status: "ok",
      reason: "local content is recorded",
    });
  });

  it("flags an incoming upstream change before integration", () => {
    expect(contextVerdict({ base, local: base, target: upstream, recorded: base, acknowledged: base })).toEqual({
      status: "reassess",
      reason: "incoming upstream change",
    });
  });

  it("still requires reassessment after integration when the snapshot is stale", () => {
    expect(contextVerdict({ base, local: upstream, target: upstream, recorded: base, acknowledged: base })).toEqual({
      status: "reassess",
      reason: "upstream changed since the last acknowledgment",
    });
  });

  it("passes after the upstream version is acknowledged and recorded", () => {
    expect(contextVerdict({ base, local: upstream, target: upstream, recorded: upstream, acknowledged: upstream })).toEqual({
      status: "ok",
      reason: "integrated and recorded",
    });
  });

  it("passes a deliberate further edit after acknowledging upstream", () => {
    expect(contextVerdict({ base, local: further, target: upstream, recorded: further, acknowledged: upstream })).toEqual({
      status: "ok",
      reason: "deliberate local resolution after acknowledging upstream",
    });
  });

  it("requires reassessment for an unrecorded local edit even after an acknowledgment", () => {
    expect(contextVerdict({ base, local: further, target: upstream, recorded: upstream, acknowledged: upstream })).toEqual({
      status: "reassess",
      reason: "local content changed without reassessment",
    });
  });

  it("requires reassessment when upstream changes again after an acknowledgment", () => {
    expect(contextVerdict({ base, local: further, target: later, recorded: further, acknowledged: upstream })).toEqual({
      status: "reassess",
      reason: "upstream changed since the last acknowledgment",
    });
  });

  it("does not let a revert to the original baseline hide a change since the acknowledgment", () => {
    expect(contextVerdict({ base, local: further, target: base, recorded: further, acknowledged: upstream })).toEqual({
      status: "reassess",
      reason: "upstream changed since the last acknowledgment",
    });
  });

  it("handles a dependency added after the task base", () => {
    expect(contextVerdict({ base: null, local: further, target: null, recorded: further, acknowledged: null })).toEqual({
      status: "ok",
      reason: "local content is recorded",
    });
  });

  it("handles a dependency deleted upstream, including a deliberate keep", () => {
    expect(contextVerdict({ base, local: base, target: null, recorded: base, acknowledged: base })).toEqual({
      status: "reassess",
      reason: "incoming upstream change",
    });
    expect(contextVerdict({ base, local: base, target: null, recorded: base, acknowledged: null })).toEqual({
      status: "ok",
      reason: "deliberate local resolution after acknowledging upstream",
    });
  });

  it("fails missing metadata before comparing", () => {
    expect(contextVerdict({ local: base, target: base, recorded: base }).status).toBe("fail");
    expect(contextVerdict({ base, local: base, target: base }).status).toBe("fail");
    expect(contextVerdict({ base, local: base, target: base, recorded: base }).status).toBe("ok");
    expect(contextVerdict({ base, target: base, recorded: base }).status).toBe("fail");
    expect(contextVerdict({ base, local: base, recorded: base }).status).toBe("fail");
  });
});
