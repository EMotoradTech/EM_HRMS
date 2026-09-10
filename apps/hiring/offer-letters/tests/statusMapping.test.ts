import { mapDocumentStatusToOfferStatuses } from "../src/services/statusMapping";

describe("mapDocumentStatusToOfferStatuses", () => {
  it("maps each document-engine status to the matching offer pipeline status", () => {
    expect(mapDocumentStatusToOfferStatuses("DRAFT")).toEqual(["OFFER_GENERATED"]);
    expect(mapDocumentStatusToOfferStatuses("PENDING_APPROVAL")).toEqual(["PENDING_APPROVAL"]);
    expect(mapDocumentStatusToOfferStatuses("APPROVED")).toEqual(["APPROVED"]);
    expect(mapDocumentStatusToOfferStatuses("REJECTED")).toEqual(["REJECTED"]);
    expect(mapDocumentStatusToOfferStatuses("SENT")).toEqual(["SENT"]);
  });

  it("marks the candidate onboarding-ready as soon as the document is signed", () => {
    expect(mapDocumentStatusToOfferStatuses("SIGNED")).toEqual(["SIGNED", "ONBOARDING_READY"]);
  });
});
