import { issueAsset, returnAsset, markLost, AssetStateError, AssetState } from "../src/lib/assetLogic";

function laptop(overrides: Partial<AssetState> = {}): AssetState {
  return {
    id: "asset-1",
    type: "laptop",
    identifier: "LAP-001",
    status: "IN_STOCK",
    ...overrides,
  };
}

describe("issueAsset", () => {
  it("issues an in-stock asset to an employee", () => {
    const issued = issueAsset(laptop(), "asha@emotorad.com");
    expect(issued.status).toBe("ISSUED");
    expect(issued.issuedTo).toBe("asha@emotorad.com");
  });

  it("rejects issuing an already-issued asset", () => {
    const already = laptop({ status: "ISSUED", issuedTo: "manish@emotorad.com" });
    expect(() => issueAsset(already, "asha@emotorad.com")).toThrow(AssetStateError);
  });

  it("rejects issuing a lost asset", () => {
    const lost = laptop({ status: "LOST" });
    expect(() => issueAsset(lost, "asha@emotorad.com")).toThrow(AssetStateError);
  });
});

describe("returnAsset", () => {
  it("updates status to RETURNED and clears issuedTo", () => {
    const issued = laptop({ status: "ISSUED", issuedTo: "asha@emotorad.com" });
    const returned = returnAsset(issued);
    expect(returned.status).toBe("RETURNED");
    expect(returned.issuedTo).toBeUndefined();
  });

  it("rejects returning an asset that isn't currently issued", () => {
    expect(() => returnAsset(laptop({ status: "IN_STOCK" }))).toThrow(AssetStateError);
    expect(() => returnAsset(laptop({ status: "RETURNED" }))).toThrow(AssetStateError);
  });
});

describe("markLost", () => {
  it("marks an issued asset lost", () => {
    const issued = laptop({ status: "ISSUED", issuedTo: "asha@emotorad.com" });
    expect(markLost(issued).status).toBe("LOST");
  });

  it("refuses to mark an already-returned asset as lost", () => {
    expect(() => markLost(laptop({ status: "RETURNED" }))).toThrow(AssetStateError);
  });
});
