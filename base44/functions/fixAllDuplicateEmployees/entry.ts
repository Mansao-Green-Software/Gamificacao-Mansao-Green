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

    const consolidatedEmployees = [];
    const totalUpdated = [];

    // Para cada perfil, encontrar todas as transações com IDs duplicados
    for (const profile of profiles) {
      const correctEmployeeId = profile.user_id || profile.id;
      
      // Encontrar todas as transações com mesmo nome mas IDs diferentes
      const txsWithSameName = allTransactions.filter(tx => 
        tx.employee_name === profile.full_name || 
        tx.employee_id === profile.user_id || 
        tx.employee_id === profile.id
      );

      const uniqueIds = new Set(txsWithSameName.map(tx => tx.employee_id));
      
      if (uniqueIds.size > 1) {
        // Colaborador duplicado encontrado
        const duplicateIds = Array.from(uniqueIds).filter(id => id !== correctEmployeeId);
        
        let totalTxsForEmployee = 0;
        let totalPointsForEmployee = 0;

        for (const oldId of duplicateIds) {
          const txsToUpdate = allTransactions.filter(tx => 
            tx.employee_id === oldId && 
            tx.employee_name === profile.full_name
          );
          
          totalTxsForEmployee += txsToUpdate.length;
          totalPointsForEmployee += txsToUpdate.reduce((s, tx) => s + (tx.points || 0), 0);

          for (const tx of txsToUpdate) {
            await base44.asServiceRole.entities.PointTransaction.update(tx.id, {
              employee_id: correctEmployeeId
            });
            
            totalUpdated.push({
              employee: profile.full_name,
              transaction_id: tx.id,
              old_id: oldId,
              new_id: correctEmployeeId,
              mission: tx.mission_title || tx.description,
              points: tx.points
            });
          }
        }

        consolidatedEmployees.push({
          employee: profile.full_name,
          correct_id: correctEmployeeId,
          duplicate_ids: duplicateIds,
          transactions_fixed: totalTxsForEmployee,
          total_points: totalPointsForEmployee
        });
      }
    }

    return Response.json({
      success: true,
      total_employees_consolidated: consolidatedEmployees.length,
      total_transactions_fixed: totalUpdated.length,
      consolidated: consolidatedEmployees,
      transactions_updated: totalUpdated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});