import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Get all approved mission requests
    const requests = await base44.asServiceRole.entities.MissionRequest.filter({ status: "aprovado" });
    
    // Get all employee profiles
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.filter({});
    
    // Get all existing point transactions
    const allTransactions = await base44.asServiceRole.entities.PointTransaction.list();

    const createdTxs = [];
    const skippedTxs = [];

    for (const req of requests) {
      // Find the correct employee profile
      const profile = profiles.find(p => 
        p.user_id === req.employee_id || 
        p.id === req.employee_id ||
        p.email?.toLowerCase() === req.employee_name?.toLowerCase()
      );

      if (!profile) {
        skippedTxs.push({ request_id: req.id, reason: 'Perfil não encontrado' });
        continue;
      }

      const correctEmployeeId = profile.user_id || profile.id;

      // Check if transaction already exists for this request
      const txExists = allTransactions.some(tx =>
        tx.employee_id === correctEmployeeId &&
        tx.mission_id === req.mission_id &&
        tx.mission_title === req.mission_title
      );

      if (txExists) {
        skippedTxs.push({ request_id: req.id, reason: 'Transação já existe' });
        continue;
      }

      // Create the point transaction with correct employee ID
      const tx = await base44.asServiceRole.entities.PointTransaction.create({
        employee_id: correctEmployeeId,
        employee_name: profile.full_name,
        sector: req.sector || profile.sector,
        points: req.mission_points,
        type: "mission",
        mission_id: req.mission_id,
        mission_title: req.mission_title,
        description: `Missão aprovada: ${req.mission_title}`,
        awarded_by_name: req.approved_by_name || "Sistema",
      });
      
      createdTxs.push({
        request_id: req.id,
        employee: profile.full_name,
        employee_id: correctEmployeeId,
        mission: req.mission_title,
        points: req.mission_points,
        transaction_id: tx.id
      });
    }

    return Response.json({
      success: true,
      total_requests: requests.length,
      created_transactions: createdTxs.length,
      skipped: skippedTxs.length,
      total_points_added: createdTxs.reduce((s, t) => s + t.points, 0),
      created: createdTxs,
      skipped_details: skippedTxs
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});