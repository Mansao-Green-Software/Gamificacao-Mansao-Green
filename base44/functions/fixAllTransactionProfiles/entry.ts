import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.list();
    const allTransactions = await base44.asServiceRole.entities.PointTransaction.list();

    const fixed = [];
    const alreadyCorrect = [];

    for (const tx of allTransactions) {
      // Encontrar o perfil correto pelo employee_name
      const profile = profiles.find(p => p.full_name === tx.employee_name);
      
      if (!profile) {
        // Não conseguiu encontrar perfil pelo nome, pula
        continue;
      }

      const correctEmployeeId = profile.user_id || profile.id;

      // Se o employee_id já está correto, pula
      if (tx.employee_id === correctEmployeeId) {
        alreadyCorrect.push({
          transaction_id: tx.id,
          employee: tx.employee_name,
          employee_id: correctEmployeeId
        });
        continue;
      }

      // Atualizar a transação com o ID correto
      await base44.asServiceRole.entities.PointTransaction.update(tx.id, {
        employee_id: correctEmployeeId
      });

      fixed.push({
        transaction_id: tx.id,
        employee: tx.employee_name,
        old_employee_id: tx.employee_id,
        new_employee_id: correctEmployeeId,
        mission: tx.mission_title || tx.description,
        points: tx.points
      });
    }

    return Response.json({
      success: true,
      total_transactions: allTransactions.length,
      fixed_transactions: fixed.length,
      already_correct: alreadyCorrect.length,
      fixed_details: fixed
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});