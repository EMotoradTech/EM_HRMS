import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { computeOverallStatus } from "../services/statusEngine";
import { getStakeholderNotifier } from "../services/notifier";
import { CheckType, DEFAULT_CHECK_TYPES } from "../types";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const candidatesRouter = Router();

// Create a candidate entering BGV, with the set of checks that apply to them.
candidatesRouter.post("/", async (req, res) => {
  const { name, email, stakeholderEmail, checkTypes } = req.body ?? {};
  if (!name || !email) {
    return res.status(400).json({ error: "name and email are required" });
  }

  const types: CheckType[] =
    Array.isArray(checkTypes) && checkTypes.length > 0 ? checkTypes : DEFAULT_CHECK_TYPES;

  const candidate = await prisma.bgvCandidate.create({
    data: {
      name,
      email,
      stakeholderEmail,
      checks: {
        create: types.map((type) => ({ type })),
      },
    },
    include: { checks: true },
  });

  res.status(201).json(candidate);
});

// Dashboard: all candidates currently in BGV and their status per check.
candidatesRouter.get("/", async (_req, res) => {
  const candidates = await prisma.bgvCandidate.findMany({
    include: { checks: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(candidates);
});

candidatesRouter.get("/:id", async (req, res) => {
  const candidate = await prisma.bgvCandidate.findUnique({
    where: { id: req.params.id },
    include: { checks: true, documents: true },
  });
  if (!candidate) return res.status(404).json({ error: "Candidate not found" });
  res.json(candidate);
});

// Upload a document for one of the candidate's check types.
candidatesRouter.post("/:id/documents", upload.single("document"), async (req, res) => {
  const { checkType } = req.body ?? {};
  if (!req.file) return res.status(400).json({ error: "document file is required" });
  if (!checkType) return res.status(400).json({ error: "checkType is required" });

  const candidate = await prisma.bgvCandidate.findUnique({ where: { id: req.params.id } });
  if (!candidate) return res.status(404).json({ error: "Candidate not found" });

  const document = await prisma.bgvDocument.create({
    data: {
      candidateId: candidate.id,
      checkType,
      fileName: req.file.originalname,
    },
  });

  res.status(201).json(document);
});

// Update one check's status (pending / in-progress / verified / flagged / failed).
// Recomputes and persists the candidate's overall status; notifies the
// stakeholder once every check is verified.
candidatesRouter.patch("/:id/checks/:type", async (req, res) => {
  const { status, notes } = req.body ?? {};
  const validStatuses = ["PENDING", "IN_PROGRESS", "VERIFIED", "FLAGGED", "FAILED"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${validStatuses.join(", ")}` });
  }

  const candidate = await prisma.bgvCandidate.findUnique({
    where: { id: req.params.id },
    include: { checks: true },
  });
  if (!candidate) return res.status(404).json({ error: "Candidate not found" });

  await prisma.bgvCheck.update({
    where: { candidateId_type: { candidateId: candidate.id, type: req.params.type as CheckType } },
    data: { status, notes },
  });

  const updatedChecks = await prisma.bgvCheck.findMany({ where: { candidateId: candidate.id } });
  const overallStatus = computeOverallStatus(updatedChecks);

  const updatedCandidate = await prisma.bgvCandidate.update({
    where: { id: candidate.id },
    data: { overallStatus },
    include: { checks: true },
  });

  const wasAlreadyComplete = candidate.overallStatus === "COMPLETE";
  if (overallStatus === "COMPLETE" && !wasAlreadyComplete && candidate.stakeholderEmail) {
    await getStakeholderNotifier().notify(
      candidate.stakeholderEmail,
      `BGV complete: ${candidate.name}`,
      `All background verification checks for ${candidate.name} are now verified.`
    );
  }

  res.json(updatedCandidate);
});
