import { PrismaClient } from "@prisma/client";
import { AssetState, issueAsset, returnAsset, markLost, AssetStateError } from "../lib/assetLogic";

function toState(record: {
  id: string;
  type: string;
  identifier: string;
  status: string;
  issuances: { employeeEmail: string; returnedAt: Date | null }[];
}): AssetState {
  const openIssuance = record.issuances.find((i) => i.returnedAt === null);
  return {
    id: record.id,
    type: record.type,
    identifier: record.identifier,
    status: record.status as AssetState["status"],
    issuedTo: openIssuance?.employeeEmail,
  };
}

export class AssetService {
  constructor(private prisma: PrismaClient) {}

  async createAsset(input: { type: string; identifier: string }) {
    return this.prisma.asset.create({ data: input });
  }

  async issue(assetId: string, employeeEmail: string) {
    const record = await this.prisma.asset.findUniqueOrThrow({
      where: { id: assetId },
      include: { issuances: true },
    });
    const updated = issueAsset(toState(record), employeeEmail);

    await this.prisma.$transaction([
      this.prisma.asset.update({ where: { id: assetId }, data: { status: "ISSUED" } }),
      this.prisma.issuanceRecord.create({
        data: { assetId, employeeEmail },
      }),
    ]);
    return updated;
  }

  async returnAsset(assetId: string) {
    const record = await this.prisma.asset.findUniqueOrThrow({
      where: { id: assetId },
      include: { issuances: true },
    });
    const updated = returnAsset(toState(record));

    const openIssuance = record.issuances.find(
      (i: (typeof record.issuances)[number]) => i.returnedAt === null
    );
    await this.prisma.$transaction([
      this.prisma.asset.update({ where: { id: assetId }, data: { status: "RETURNED" } }),
      ...(openIssuance
        ? [
            this.prisma.issuanceRecord.update({
              where: { id: openIssuance.id },
              data: { returnedAt: new Date() },
            }),
          ]
        : []),
    ]);
    return updated;
  }

  async markLost(assetId: string) {
    const record = await this.prisma.asset.findUniqueOrThrow({
      where: { id: assetId },
      include: { issuances: true },
    });
    const updated = markLost(toState(record));
    await this.prisma.asset.update({ where: { id: assetId }, data: { status: "LOST" } });
    return updated;
  }

  /** All assets currently issued to a given employee (used by exit-formalities). */
  async assetsIssuedTo(employeeEmail: string) {
    return this.prisma.asset.findMany({
      where: { status: "ISSUED", issuances: { some: { employeeEmail, returnedAt: null } } },
    });
  }

  /** All assets never returned (currently outstanding), company-wide. */
  async assetsNeverReturned() {
    return this.prisma.asset.findMany({ where: { status: "ISSUED" } });
  }

  /** Every asset, most recent first — for an admin/list view. */
  async listAll() {
    return this.prisma.asset.findMany({
      orderBy: { createdAt: "desc" },
      include: { issuances: true },
    });
  }
}

export { AssetStateError };
