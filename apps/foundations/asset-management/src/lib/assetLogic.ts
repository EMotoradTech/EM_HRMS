/**
 * Pure issue/return state logic. DB-free so the two rules the brief calls
 * out explicitly — "issuing an already-issued asset is rejected" and
 * "returning an asset updates its status correctly" — are directly
 * unit-testable.
 */

export type AssetStatus = "IN_STOCK" | "ISSUED" | "RETURNED" | "LOST";

export interface AssetState {
  id: string;
  type: string;
  identifier: string;
  status: AssetStatus;
  issuedTo?: string;
}

export class AssetStateError extends Error {}

export function issueAsset(asset: AssetState, employeeEmail: string): AssetState {
  if (asset.status === "ISSUED") {
    throw new AssetStateError(
      `Asset ${asset.identifier} is already issued to ${asset.issuedTo}.`
    );
  }
  if (asset.status === "LOST") {
    throw new AssetStateError(`Asset ${asset.identifier} is marked lost and cannot be issued.`);
  }
  return { ...asset, status: "ISSUED", issuedTo: employeeEmail };
}

export function returnAsset(asset: AssetState): AssetState {
  if (asset.status !== "ISSUED") {
    throw new AssetStateError(
      `Asset ${asset.identifier} is not currently issued (status: ${asset.status}), so it can't be returned.`
    );
  }
  return { ...asset, status: "RETURNED", issuedTo: undefined };
}

export function markLost(asset: AssetState): AssetState {
  if (asset.status === "RETURNED") {
    throw new AssetStateError(
      `Asset ${asset.identifier} was already returned and cannot be marked lost.`
    );
  }
  return { ...asset, status: "LOST" };
}
