import { Router } from "express";
import { prisma } from "../lib/prisma";
import { startOfferForCandidate } from "../services/offerService";

export const candidatesRouter = Router();

// Kick off the offer flow for a candidate marked "selected".
candidatesRouter.post("/", async (req, res) => {
  const { name, email, role, ctc, joiningDate, approvalChain } = req.body ?? {};
  if (!name || !email || !role) {
    return res.status(400).json({ error: "name, email, and role are required" });
  }
  if (!Array.isArray(approvalChain) || approvalChain.length === 0) {
    return res.status(400).json({ error: "approvalChain (non-empty array) is required" });
  }

  const candidate = await startOfferForCandidate({ name, email, role, ctc, joiningDate, approvalChain });
  res.status(201).json(candidate);
});

// Status view: which candidates are where in the offer pipeline.
candidatesRouter.get("/", async (_req, res) => {
  const candidates = await prisma.offerCandidate.findMany({ orderBy: { createdAt: "desc" } });
  res.json(candidates);
});

candidatesRouter.get("/:id", async (req, res) => {
  const candidate = await prisma.offerCandidate.findUnique({ where: { id: req.params.id } });
  if (!candidate) return res.status(404).json({ error: "Candidate not found" });
  res.json(candidate);
});
