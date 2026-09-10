import {
  initiateExit,
  markDocumentsGenerated,
  markApprovalsCleared,
  markSent,
  markSigned,
  completeExit,
  ExitStateError,
  ExitBlockedError,
} from "../src/lib/exitEngine";

function signedCase() {
  let exitCase = initiateExit({
    id: "exit-1",
    employeeEmail: "asha@emotorad.com",
    designation: "Software Engineer",
    lastWorkingDay: "2026-10-15",
  });
  exitCase = markDocumentsGenerated(exitCase, "doc-1");
  exitCase = markApprovalsCleared(exitCase);
  exitCase = markSent(exitCase);
  exitCase = markSigned(exitCase);
  return exitCase;
}

describe("exit status progression", () => {
  it("moves through the full sequence in order", () => {
    const exitCase = signedCase();
    expect(exitCase.status).toBe("SIGNED");
  });

  it("rejects skipping a step", () => {
    const initiated = initiateExit({
      id: "exit-2",
      employeeEmail: "x@emotorad.com",
      designation: "Analyst",
      lastWorkingDay: "2026-10-15",
    });
    expect(() => markApprovalsCleared(initiated)).toThrow(ExitStateError);
  });
});

describe("completeExit — the unreturned-assets blocker", () => {
  it("is blocked, not silently completed, when assets are outstanding", () => {
    const exitCase = signedCase();
    expect(() => completeExit(exitCase, ["LAP-042"])).toThrow(ExitBlockedError);

    try {
      completeExit(exitCase, ["LAP-042", "ID-007"]);
      fail("expected ExitBlockedError");
    } catch (err) {
      expect(err).toBeInstanceOf(ExitBlockedError);
      expect((err as ExitBlockedError).blockers).toEqual([
        "asset LAP-042 not yet returned",
        "asset ID-007 not yet returned",
      ]);
    }
  });

  it("completes cleanly once no assets are outstanding", () => {
    const exitCase = signedCase();
    const completed = completeExit(exitCase, []);
    expect(completed.status).toBe("COMPLETE");
  });

  it("refuses to complete a case that hasn't reached SIGNED yet, regardless of assets", () => {
    const notYetSigned = markDocumentsGenerated(
      initiateExit({
        id: "exit-3",
        employeeEmail: "y@emotorad.com",
        designation: "Analyst",
        lastWorkingDay: "2026-10-15",
      }),
      "doc-2"
    );
    expect(() => completeExit(notYetSigned, [])).toThrow(ExitStateError);
  });
});
