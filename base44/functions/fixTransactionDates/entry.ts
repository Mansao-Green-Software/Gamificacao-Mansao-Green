import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Busca todas as transações
    const allTxs = await base44.asServiceRole.entities.PointTransaction.list('-created_date', 5000);

    // Filtra as criadas hoje (01/05/2026) no fuso de Brasília
    const today = '2026-05-01';
    const targetDate = '2026-04-30T03:00:00.000Z'; // 30/04/2026 00:00 BRT = 03:00 UTC

    const todayTxs = allTxs.filter(t => {
      if (!t.created_date) return false;
      const d = new Date(t.created_date);
      // Converte para BRT (UTC-3)
      const brtDate = new Date(d.getTime() - 3 * 60 * 60 * 1000);
      const dateStr = brtDate.toISOString().slice(0, 10);
      return dateStr === today;
    });

    if (todayTxs.length === 0) {
      return Response.json({ message: 'Nenhuma transação encontrada para hoje.', count: 0 });
    }

    // Atualiza a created_date para 30/04/2026 03:00 UTC (= 00:00 BRT)
    const results = await Promise.all(
      todayTxs.map(t =>
        base44.asServiceRole.entities.PointTransaction.update(t.id, {
          created_date: targetDate
        })
      )
    );

    return Response.json({
      message: `${results.length} transação(ões) atualizadas para 30/04/2026.`,
      count: results.length,
      ids: todayTxs.map(t => t.id)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});