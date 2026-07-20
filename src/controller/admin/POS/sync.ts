import { Request, Response } from "express";
import { SuccessResponse } from "../../../utils/response";
import { getSyncModel } from "../../../models/schema/admin/POS/sync";
import { BadRequest } from "../../../Errors";
import { ChangeLogModel } from "../../../models/schema/admin/POS/ChangeLog";

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
  const { changes, clientId } = req.body as { changes: IncomingChange[], clientId: string };

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
          originClientId: clientId, 
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
          { upsert: true, new: true, originClientId: clientId }
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

export const pullChangeLog = async (req: Request, res: Response) => {
  const { since, clientId } = req.query;

  if (!clientId) {                          
    throw new BadRequest("clientId is required");
  }

  let sinceDate: Date;
  if (since) {
    const parsed = new Date(since as string);
    if (isNaN(parsed.getTime())) {
      throw new BadRequest('Invalid "since" parameter – must be an ISO date string');
    }
    sinceDate = parsed;
  } else {
    sinceDate = new Date(0);
  }

  // Query: find documents in ChangeLog created after sinceDate
  const query: any = {
    createdAt: { $gt: sinceDate },
    originClientId: { $ne: clientId },
  };

  const logs = await ChangeLogModel.find(query)
    .sort({ createdAt: 1 })
    .lean();

  // Map to the same structure expected by the client!
  const changes = logs.map((log: any) => ({
    table_name: log.table_name,
    op: log.op,
    record_id: String(log.record_id),
    data: log.op === "delete" ? undefined : serializeRow(log.payload || {}),
  }));
  console.log(changes);
  SuccessResponse(res, {
    changes,
    serverTime: new Date().toISOString(),
  });
};