// STATUS: unvalidated. Per docs/briefs/person-b-hiring.md, the first task for
// this app was to confirm whether the company's Naukri recruiter account
// exposes a self-serve API/export (Naukri RMS, "Talent Cloud", or similar)
// for pulling candidate profiles against a JD. That check requires logging
// into the actual Naukri recruiter account, which this build could not do.
//
// Until someone with account access confirms one way or the other, this app
// only supports the fallback path: HR exports resumes from Naukri manually
// and bulk-uploads them via POST /job-descriptions/:id/candidates/upload.
//
// If/when API access is confirmed, implement fetchCandidatesForJD() below
// against the real endpoint and wire it into a new route
// (POST /job-descriptions/:id/candidates/pull-from-naukri), following the
// same CandidateFields shape the upload path already produces.

export class NaukriApiNotAvailableError extends Error {
  constructor() {
    super(
      "Naukri API access has not been validated for this account. See src/services/naukriClient.ts " +
        "and docs/briefs/person-b-hiring.md for the required validation step. Use the bulk-upload " +
        "endpoint instead."
    );
    this.name = "NaukriApiNotAvailableError";
  }
}

export async function fetchCandidatesForJD(_jdId: string): Promise<never> {
  throw new NaukriApiNotAvailableError();
}
