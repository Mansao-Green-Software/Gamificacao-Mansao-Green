import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const txs = await base44.asServiceRole.entities.PointTransaction.list("created_date", 10000);

    // Transações ainda com o ID antigo do perfil (não o user_id)
    const toFix = txs.filter(t => t.employee_id === "69b8604d9fddd4c8c74abb7f");

    let updated = 0;
    const errors = [];

    for (const t of toFix) {
        try {
            await base44.asServiceRole.entities.PointTransaction.update(t.id, {
                employee_id: "69b86569b16d0ab1138cb756",
                employee_name: "Cauã"
            });
            updated++;
            await new Promise(r => setTimeout(r, 400));
        } catch (e) {
            errors.push({ id: t.id, error: e.message });
        }
    }

    return Response.json({ total: toFix.length, updated, errors });
});