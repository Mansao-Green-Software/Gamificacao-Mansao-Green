import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_NAMES = ["kevinathy", "Marina Carvalho", "Marina ", "Marina"];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const allTxs = (await base44.asServiceRole.entities.PointTransaction.list(null, 2000)).filter(t => t.type === 'manual');

  const toDelete = allTxs.filter(t => !ADMIN_NAMES.includes(t.awarded_by_name));

  // Delete in parallel batches of 10
  let deleted = 0;
  const BATCH = 10;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH);
    await Promise.all(batch.map(tx => base44.asServiceRole.entities.PointTransaction.delete(tx.id)));
    deleted += batch.length;
  }

  return Response.json({ deleted, total: allTxs.length, toDeleteCount: toDelete.length });
});