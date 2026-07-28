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
  op: "insert" | "update" | "delete" | "upsert";
  payload: string | null;
  created_at: string;
}

interface FieldOp {
  op: "set" | "inc";
  value: any;
}

function sanitizeFieldValue(
  Model: any,
  field: string,
  value: any,
): { include: boolean; value: any } {
  if (value !== null) return { include: true, value };

  const path = Model.schema?.path?.(field);
  if (!path) return { include: false, value: undefined }; // unknown field, drop it

  if (path.instance === "String") {
    return { include: true, value: "" };
  }
  // Number/Date/Boolean/etc: no safe empty stand-in -> drop the key
  return { include: false, value: undefined };
}

export const bootstrapTable = async (req: Request, res: Response) => {
  // unchanged from your current file
  const { table } = req.params;
  const { cursor } = req.query;

  const Model = getSyncModel(table);

  const query: any = {};
  if (cursor) query._id = { $gt: cursor };

  const rows = await Model.find(query).sort({ _id: 1 }).limit(PAGE_SIZE).lean();
  const totalCount = await Model.countDocuments();

  const nextCursor =
    rows.length === PAGE_SIZE ? String(rows[rows.length - 1]._id) : null;

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

async function applyArrayPatch(
  Model: any,
  recordId: string,
  field: string,
  patch: any,
) {
  if (patch.updated?.length) {
    for (const { _id, deltas, set } of patch.updated) {
      const update: Record<string, any> = {};
      if (deltas && Object.keys(deltas).length) {
        update.$inc = {};
        for (const [k, v] of Object.entries(deltas))
          update.$inc[`${field}.$[elem].${k}`] = v as number;
      }
      if (set && Object.keys(set).length) {
        update.$set = {};
        for (const [k, v] of Object.entries(set))
          update.$set[`${field}.$[elem].${k}`] = v;
      }
      if (Object.keys(update).length) {
        await Model.updateOne({ _id: recordId }, update, {
          arrayFilters: [{ "elem._id": _id }],
        });
      }
    }
  }
  if (patch.removed?.length) {
    await Model.updateOne(
      { _id: recordId },
      { $pull: { [field]: { _id: { $in: patch.removed } } } },
    );
  }
  if (patch.added?.length) {
    await Model.updateOne(
      { _id: recordId },
      { $push: { [field]: { $each: patch.added } } },
    );
  }
}

export const pushChanges = async (req: Request, res: Response) => {
  const { changes, clientId } = req.body as {
    changes: IncomingChange[];
    clientId: string;
  };

  if (!Array.isArray(changes) || changes.length === 0) {
    return SuccessResponse(res, { applied: [], failed: [] });
  }

  const applied: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  for (const change of changes) {
    try {
      // Idempotency fast-path: if we've already recorded this exact client change, don't reapply.
      const already = await ChangeLogModel.exists({
        sourceChangeId: change.id,
      });
      if (already) {
        applied.push(change.id);
        continue;
      }

      const Model = getSyncModel(change.table_name);

      if (change.op === "delete") {
        await Model.findByIdAndDelete(change.record_id, {
          syncMeta: { originClientId: clientId, sourceChangeId: change.id },
        });
      } else if (change.op === "insert") {
        const data = JSON.parse(change.payload as string);
        const { id, ...rest } = data;

        const setDoc: Record<string, any> = {};
        for (const [field, value] of Object.entries(rest)) {
          const { include, value: safeValue } = sanitizeFieldValue(
            Model,
            field,
            value,
          );
          if (include) setDoc[field] = safeValue;
        }

        await Model.findByIdAndUpdate(
          change.record_id,
          { $set: setDoc },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            syncMeta: {
              op: "insert",
              originClientId: clientId,
              sourceChangeId: change.id,
            },
          },
        );
      } else if (change.op === "update") {
        const parsed = JSON.parse(change.payload as string) as {
          fields?: Record<string, any>;
        };
        const fields = parsed.fields ?? {};

        const setDoc: Record<string, any> = {};
        const incDoc: Record<string, number> = {};
        const arrayPatches: { field: string; patch: any }[] = [];

        for (const [field, fieldOp] of Object.entries(fields)) {
          if (fieldOp.op === "arrayPatch") {
            arrayPatches.push({ field, patch: fieldOp });
            continue;
          }
          if (fieldOp.op === "inc") {
            if (typeof fieldOp.value === "number" && fieldOp.value !== 0)
              incDoc[field] = fieldOp.value;
            continue;
          }
          const { include, value: safeValue } = sanitizeFieldValue(
            Model,
            field,
            fieldOp.value,
          );
          if (include) setDoc[field] = safeValue;
        }

        setDoc.updatedAt = new Date();

        const update: Record<string, any> = {};
        if (Object.keys(setDoc).length) update.$set = setDoc;
        if (Object.keys(incDoc).length) update.$inc = incDoc;

        const doc = await Model.findByIdAndUpdate(change.record_id, update, {
          upsert: false,
          new: true,
          syncMeta: {
            op: "update",
            fields,
            originClientId: clientId,
            sourceChangeId: change.id,
          },
        });

        if (!doc)
          throw new Error(
            `Update target ${change.record_id} not found on server`,
          );

        for (const { field, patch } of arrayPatches) {
          await applyArrayPatch(Model, change.record_id, field, patch);
        }
      } else if (change.op === "upsert") {
        // Legacy path — old client build, full-row payload, no field diff.
        const data = JSON.parse(change.payload as string);
        const { id, ...rest } = data;

        // preserve old row-level last-write-wins behavior for legacy clients only
        const existing = (await Model.findById(change.record_id).lean()) as any;
        if (existing && existing.updatedAt && rest.updatedAt) {
          if (new Date(existing.updatedAt) > new Date(rest.updatedAt)) {
            applied.push(change.id);
            continue;
          }
        }

        const setDoc: Record<string, any> = {};
        for (const [field, value] of Object.entries(rest)) {
          const { include, value: safeValue } = sanitizeFieldValue(
            Model,
            field,
            value,
          );
          if (include) setDoc[field] = safeValue;
        }

        await Model.findByIdAndUpdate(
          change.record_id,
          { $set: setDoc },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            syncMeta: {
              op: "insert",
              originClientId: clientId,
              sourceChangeId: change.id,
            },
          },
        );
      } else {
        throw new Error(`Unknown op "${change.op}"`);
      }
    } catch (err: any) {
      console.error(`Push failed for change ${change.id}:`, err);
      failed.push({
        id: change.id,
        reason:
          process.env.NODE_ENV === "development"
            ? err.stack || err.message
            : err.message,
      });
    }
  }

  console.log(
    `Push results: ${applied.length} applied, ${failed.length} failed`,
  );
  if (failed.length > 0) {
    console.error("Failed changes:", failed);
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
      throw new BadRequest(
        'Invalid "since" parameter – must be an ISO date string',
      );
    }
    sinceDate = parsed;
  } else {
    sinceDate = new Date(0);
  }

  const query: any = {
    createdAt: { $gt: sinceDate },
    originClientId: { $ne: clientId },
  };

  const logs = await ChangeLogModel.find(query).sort({ createdAt: 1 }).lean();

  const changes = logs.map((log: any) => {
    if (log.op === "delete") {
      return {
        table_name: log.table_name,
        op: log.op,
        record_id: String(log.record_id),
      };
    }

    if (log.op === "update") {
      return {
        table_name: log.table_name,
        op: log.op,
        record_id: String(log.record_id),
        data: log.payload, // already { fields: {...}, updatedAt } — pass through as-is
      };
    }

    // "insert" (and any lingering legacy "upsert" rows from before Step 1's migration note)
    return {
      table_name: log.table_name,
      op: "insert",
      record_id: String(log.record_id),
      data: serializeRow(log.payload || {}),
    };
  });

  SuccessResponse(res, {
    changes,
    serverTime: new Date().toISOString(),
  });
};
