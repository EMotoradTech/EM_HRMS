/**
 * eSign capture, behind one interface so Keka's eSign module can be
 * swapped in once its API entitlement is confirmed (see
 * docs/PROGRAM-OVERVIEW.md), without changing callers.
 */

export interface SignatureCapture {
  signerName: string;
  ipAddress?: string;
  provider: string;
}

export interface ESignProvider {
  capture(input: { signerName: string; ipAddress?: string }): Promise<SignatureCapture>;
}

/**
 * Standalone fallback: records name + timestamp + IP as the signature
 * evidence. Used until Keka's eSign API (or another real eSign provider)
 * is confirmed accessible and wired in behind this same interface.
 */
export class StandaloneESignProvider implements ESignProvider {
  async capture(input: { signerName: string; ipAddress?: string }): Promise<SignatureCapture> {
    return {
      signerName: input.signerName,
      ipAddress: input.ipAddress,
      provider: "standalone",
    };
  }
}

/**
 * Placeholder for Keka's eSign module. Not implemented until Keka API
 * entitlement + eSign module availability is confirmed (Phase 0.3 in
 * HR-AUTOMATION-PLAN.md). Throws so a misconfiguration fails loudly
 * instead of silently falling back.
 */
export class KekaESignProvider implements ESignProvider {
  async capture(_input: { signerName: string; ipAddress?: string }): Promise<SignatureCapture> {
    throw new Error(
      "KekaESignProvider is not yet implemented — confirm Keka eSign API " +
        "entitlement first, then implement this against Keka's real endpoint."
    );
  }
}

export function getESignProvider(providerName: string | undefined): ESignProvider {
  if (providerName === "keka") return new KekaESignProvider();
  return new StandaloneESignProvider();
}
