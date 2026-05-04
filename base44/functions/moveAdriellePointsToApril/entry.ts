import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Buscar transações de Adrielle Miranda de hoje (2026-05-04)
  const allTxs = await base44.asServiceRole.entities.PointTransaction.list();
  
  const today = new Date('2026-05-04');
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const adrielleTxsToday = allTxs.filter(t => {
    const created = new Date(t.created_date);
    created.setHours(0, 0, 0, 0);
    return created.getTime() === today.getTime() && 
           (t.employee_name?.toLowerCase().includes('adrielle') || 
            t.employee_name?.toLowerCase().includes('miranda'));
  });

  if (adrielleTxsToday.length === 0) {
    return Response.json({ message: 'Nenhuma pontuação de Adrielle Miranda encontrada hoje' });
  }

  // Mover para 30 de abril
  const aprilDate = '2026-04-30T00:00:00Z';
  const updated = [];

  for (const tx of adrielleTxsToday) {
    await base44.asServiceRole.entities.PointTransaction.update(tx.id, {
      transaction_date: aprilDate
    });
    updated.push(tx.id);
  }

  return Response.json({
    message: `${updated.length} pontuação(ões) de Adrielle Miranda movida(s) para 30 de abril`,
    count: updated.length,
    ids: updated
  });
});