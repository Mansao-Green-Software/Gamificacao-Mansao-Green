import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { employee_email } = body;

  if (!employee_email) {
    return Response.json({ error: 'employee_email é obrigatório' }, { status: 400 });
  }

  try {
    // Get employee profile
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.filter({});
    const profile = profiles.find(p => p.email === employee_email);
    
    if (!profile) {
      return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    const correctEmployeeId = profile.user_id || profile.id;

    // Get all transactions
    const allTransactions = await base44.asServiceRole.entities.PointTransaction.list();
    
    // Find all transactions with different IDs but same employee name
    const duplicateIds = new Set();
    const txsByName = {};
    
    allTransactions.forEach(tx => {
      if (tx.employee_name === profile.full_name || tx.employee_id === profile.user_id || tx.employee_id === profile.id) {
        if (tx.employee_id !== correctEmployeeId) {
          duplicateIds.add(tx.employee_id);
        }
        if (!txsByName[tx.employee_name]) txsByName[tx.employee_name] = [];
        txsByName[tx.employee_name].push(tx);
      }
    });

    // Update all transactions to use correct employee_id
    const updatedCount = [];
    for (const oldId of duplicateIds) {
      const txsToUpdate = allTransactions.filter(tx => tx.employee_id === oldId && tx.employee_name === profile.full_name);
      
      for (const tx of txsToUpdate) {
        await base44.asServiceRole.entities.PointTransaction.update(tx.id, {
          employee_id: correctEmployeeId
        });
        updatedCount.push({
          transaction_id: tx.id,
          old_employee_id: oldId,
          new_employee_id: correctEmployeeId,
          mission: tx.mission_title || tx.description
        });
      }
    }

    return Response.json({
      success: true,
      employee: profile.full_name,
      correct_employee_id: correctEmployeeId,
      duplicate_ids_found: Array.from(duplicateIds),
      updated_transactions: updatedCount.length,
      updated_details: updatedCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});