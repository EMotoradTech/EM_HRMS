import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { normalizeStructuredJD, parseFreeTextJD } from "../services/jdParser";
import { parseResumeFile } from "../services/resumeParser";
import { rankCandidates } from "../services/rankingService";
import { getShortlistSender } from "../services/senderService";
import { fetchCandidatesForJD, NaukriApiNotAvailableError } from "../services/naukriClient";
import { JDRequirements } from "../types";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const jobDescriptionsRouter = Router();

// Create a JD either from structured fields or from rawText (parsed heuristically).
jobDescriptionsRouter.post("/", async (req, res) => {
  const { title, rawText, ...structured } = req.body ?? {};
  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "title is required" });
  }

  let requirements: JDRequirements;
  if (rawText && typeof rawText === "string" && Object.keys(structured).length === 0) {
    requirements = parseFreeTextJD(title, rawText);
  } else {
    requirements = normalizeStructuredJD({ title, rawText, ...structured });
  }

  const jd = await prisma.jobDescription.create({
    data: {
      title: requirements.title,
      rawText: requirements.rawText,
      requiredSkills: requirements.requiredSkills,
      preferredSkills: requirements.preferredSkills,
      minExperienceYears: requirements.minExperienceYears,
      maxExperienceYears: requirements.maxExperienceYears,
      requiredQualifications: requirements.requiredQualifications,
      keywords: requirements.keywords,
    },
  });

  res.status(201).json(jd);
});

jobDescriptionsRouter.get("/:id", async (req, res) => {
  const jd = await prisma.jobDescription.findUnique({ where: { id: req.params.id } });
  if (!jd) return res.status(404).json({ error: "Job description not found" });
  res.json(jd);
});

// Fallback candidate-sourcing path (see src/services/naukriClient.ts for why
// this is the baseline rather than an automatic Naukri pull).
jobDescriptionsRouter.post(
  "/:id/candidates/upload",
  upload.array("resumes", 50),
  async (req, res) => {
    const jd = await prisma.jobDescription.findUnique({ where: { id: req.params.id } });
    if (!jd) return res.status(404).json({ error: "Job description not found" });

    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) {
      return res.status(400).json({ error: "Upload at least one resume file (PDF/DOCX)" });
    }

    const jdRequirements: JDRequirements = {
      title: jd.title,
      requiredSkills: jd.requiredSkills,
      preferredSkills: jd.preferredSkills,
      minExperienceYears: jd.minExperienceYears ?? undefined,
      maxExperienceYears: jd.maxExperienceYears ?? undefined,
      requiredQualifications: jd.requiredQualifications,
      keywords: jd.keywords,
    };

    const parsedCandidates = await Promise.all(
      files.map(async (file) => {
        const fields = await parseResumeFile(file.buffer, file.mimetype);
        return { file, fields };
      })
    );

    const ranked = rankCandidates(
      jdRequirements,
      parsedCandidates.map((c) => c.fields)
    );

    const created = await Promise.all(
      ranked.map((entry, i) =>
        prisma.candidateProfile.create({
          data: {
            jdId: jd.id,
            name: entry.candidate.name,
            email: entry.candidate.email,
            phone: entry.candidate.phone,
            sourceFileName: parsedCandidates[i].file.originalname,
            rawText: entry.candidate.rawText,
            extractedSkills: entry.candidate.extractedSkills,
            totalExperienceYears: entry.candidate.totalExperienceYears,
            qualifications: entry.candidate.qualifications,
            score: entry.breakdown.totalScore,
            scoreBreakdown: entry.breakdown as any,
            rank: entry.rank,
          },
        })
      )
    );

    res.status(201).json({ jdId: jd.id, candidatesCreated: created.length });
  }
);

// Naukri auto-pull path — disabled until access is validated (see naukriClient.ts).
jobDescriptionsRouter.post("/:id/candidates/pull-from-naukri", async (req, res) => {
  try {
    await fetchCandidatesForJD(req.params.id);
  } catch (err) {
    if (err instanceof NaukriApiNotAvailableError) {
      return res.status(501).json({ error: err.message });
    }
    throw err;
  }
});

jobDescriptionsRouter.get("/:id/shortlist", async (req, res) => {
  const jd = await prisma.jobDescription.findUnique({ where: { id: req.params.id } });
  if (!jd) return res.status(404).json({ error: "Job description not found" });

  const candidates = await prisma.candidateProfile.findMany({
    where: { jdId: jd.id },
    orderBy: { rank: "asc" },
  });

  res.json({ jd, candidates });
});

jobDescriptionsRouter.post("/:id/shortlist/send", async (req, res) => {
  const { to } = req.body ?? {};
  if (!Array.isArray(to) || to.length === 0) {
    return res.status(400).json({ error: "to (array of stakeholder emails) is required" });
  }

  const jd = await prisma.jobDescription.findUnique({ where: { id: req.params.id } });
  if (!jd) return res.status(404).json({ error: "Job description not found" });

  const candidates = await prisma.candidateProfile.findMany({
    where: { jdId: jd.id },
    orderBy: { rank: "asc" },
  });

  const body = candidates
    .map((c) => `#${c.rank} ${c.name ?? "Unknown"} — score ${c.score} — ${c.sourceFileName}`)
    .join("\n");

  const result = await getShortlistSender().send(to, `Shortlist: ${jd.title}`, body);

  await prisma.shortlistSend.create({
    data: {
      jdId: jd.id,
      sentTo: to,
      payload: { candidateIds: candidates.map((c) => c.id) },
    },
  });

  res.json(result);
});
