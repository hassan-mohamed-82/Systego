import { Request, Response } from "express";
import { SuccessResponse } from "../../../utils/response";
import { getSyncModel } from "../../../models/schema/admin/POS/sync";
import { BadRequest } from "../../../Errors";

const PAGE_SIZE = 500;
interface IncomingChange {
  id: string;         
  table_name: string;
  record_id: string;
  op: "upsert" | "delete";
  payload: string | null; 
  created_at: string;
}

export const bootstrapTable = async (req: Request, res: Response) => {
  const { table } = req.params;
  const { cursor } = req.query;

  const Model = getSyncModel(table);

  const query: any = {  };
  if (cursor) query._id = { $gt: cursor };

  const rows = await Model.find(query).sort({ _id: 1 }).limit(PAGE_SIZE).lean();
  const totalCount = await Model.countDocuments();
  
  const nextCursor = rows.length === PAGE_SIZE ? String(rows[rows.length - 1]._id) : null;

  SuccessResponse(res, {
    rows: rows.map(serializeRow),
    nextCursor,
    serverSnapshotAt: new Date().toISOString(),
    totalCount,
    loadedCount: rows.length,
  });
};

export const pullTable = async (req: Request, res: Response) => {
  const { table } = req.params;
  const { since } = req.query;

  const Model = getSyncModel(table);

  // Determine the "since" date safely
  let sinceDate: Date;
  if (since) {
    const parsed = new Date(since as string);
    if (isNaN(parsed.getTime())) {
      throw new BadRequest('Invalid "since" parameter – must be an ISO date string');
    }
    sinceDate = parsed;
  } else {
    // No since → fetch everything that has a valid updatedAt (epoch start)
    sinceDate = new Date(0);
  }

  // Query: find documents updated after the since date.
  // If you also want to include documents missing the updatedAt field,
  // use an $or. Otherwise, only docs with a valid updatedAt > sinceDate are returned.
  const rows = await Model.find({
    updatedAt: { $gt: sinceDate }
  })
    .sort({ updatedAt: 1 })   // ✅ sort by the same field used in query (updatedAt)
    .lean();

  const changes = rows.map((doc: any) => ({
    op: doc.deleted ? "delete" : "upsert",
    record_id: String(doc._id),
    data: doc.deleted ? undefined : serializeRow(doc),
  }));

  SuccessResponse(res, {
    changes,
    serverTime: new Date().toISOString(),
  });
};

function serializeRow(doc: any) {
  const { _id, __v, ...rest } = doc;
  return {
    id: String(_id),
    ...rest,
    updated_at: doc.updated_at?.toISOString?.() ?? doc.updated_at,
    created_at: doc.created_at?.toISOString?.() ?? doc.created_at,
  };
}

export const pushChanges = async (req: Request, res: Response) => {
  const { changes } = req.body as { changes: IncomingChange[] };

  if (!Array.isArray(changes) || changes.length === 0) {
    return SuccessResponse(res, { applied: [], failed: [] });
  }
  console.log(changes);
  
  const applied: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  for (const change of changes) {
    try {
      const Model = getSyncModel(change.table_name);

      if (change.op === "delete") {
        await Model.findByIdAndDelete(change.record_id, {
          updatedAt: new Date(),
        });
      } else {
        const data = JSON.parse(change.payload as string);
        const { id, ...rest } = data;

        // last-write-wins check against what's already on the server
        const existing = await Model.findById(change.record_id).lean() as any;
        if (existing && existing.updatedAt && rest.updatedAt) {
          if (new Date(existing.updatedAt) > new Date(rest.updatedAt)) {
            applied.push(change.id);
            continue;
          }
        }

        await Model.findByIdAndUpdate(
          change.record_id,
          { $set: rest },
          { upsert: true, new: true }
        );
      }

      applied.push(change.id);
    } catch (err: any) {
      // 🔍 Log the full error to the server console
      console.error(`Push failed for change ${change.id}:`, err);

      // Optionally include the stack trace in the client response (remove in production)
      failed.push({
        id: change.id,
        reason: process.env.NODE_ENV === 'development'
          ? (err.stack || err.message)
          : err.message,
      });
    }
  }

  console.log(`Push results: ${applied.length} applied, ${failed.length} failed`);
  if (failed.length > 0) {
    console.error('Failed changes:', failed);
  }

  SuccessResponse(res, { applied, failed });
};