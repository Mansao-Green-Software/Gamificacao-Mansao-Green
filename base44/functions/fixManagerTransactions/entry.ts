import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const profiles = await base44.asServiceRole.entities.EmployeeProfile.list();
  const managerIds = new Set(
    profiles
      .filter(p => p.role === 'manager' || p.role === 'admin')
      .map(p => p.user_id || p.id)
      .filter(Boolean)
  );

  const transactions = await base44.asServiceRole.entities.PointTransaction.list('-created_date', 5000);
  const requests = await base44.asServiceRole.entities.MissionRequest.list('-created_date', 5000);

  let txFixed = 0;
  let reqFixed = 0;

  for (const tx of transactions) {
    if (managerIds.has(tx.employee_id) && tx.sector !== 'Gerência') {
      await base44.asServiceRole.entities.PointTransaction.update(tx.id, { sector: 'Gerência' });
      txFixed++;
    }
  }

  for (const r of requests) {
    if (managerIds.has(r.employee_id) && r.sector !== 'Gerência') {
      await base44.asServiceRole.entities.MissionRequest.update(r.id, { sector: 'Gerência' });
      reqFixed++;
    }
  }

  return Response.json({ success: true, txFixed, reqFixed });
});