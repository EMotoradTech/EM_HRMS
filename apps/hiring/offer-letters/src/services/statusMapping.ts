import { DocumentStatus, OfferStatus } from "../types";

// Maps the document-engine's document lifecycle onto this app's candidate
// pipeline status (offer generated → pending approval → sent → signed →
// onboarding-ready), per the hiring brief. SIGNED and ONBOARDING_READY are
// reported together: nothing else in this app's scope needs to happen
// between "engine confirms signature" and "ready to hand off to onboarding".
export function mapDocumentStatusToOfferStatuses(status: DocumentStatus): OfferStatus[] {
  switch (status) {
    case "DRAFT":
      return ["OFFER_GENERATED"];
    case "PENDING_APPROVAL":
      return ["PENDING_APPROVAL"];
    case "APPROVED":
      return ["APPROVED"];
    case "REJECTED":
      return ["REJECTED"];
    case "SENT":
      return ["SENT"];
    case "SIGNED":
      return ["SIGNED", "ONBOARDING_READY"];
  }
}
