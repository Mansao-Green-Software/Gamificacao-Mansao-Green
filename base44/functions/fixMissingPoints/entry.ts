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

    const employee_id = profile.user_id || profile.id;

    // Get all approved mission requests for this employee
    const requests = await base44.asServiceRole.entities.MissionRequest.filter({
      employee_id: employee_id,
      status: "aprovado"
    });

    // Get all existing point transactions for this employee
    const transactions = await base44.asServiceRole.entities.PointTransaction.list();
    const existingTxs = transactions.filter(t => t.employee_id === employee_id);

    // Find requests without corresponding transaction
    const missingRequests = requests.filter(req => 
      !existingTxs.some(tx => 
        tx.mission_id === req.mission_id && 
        tx.mission_title === req.mission_title &&
        new Date(tx.created_date).toDateString() === new Date(req.updated_date || req.created_date).toDateString()
      )
    );

    // Create missing transactions
    const createdTxs = [];
    for (const req of missingRequests) {
      const tx = await base44.asServiceRole.entities.PointTransaction.create({
        employee_id: employee_id,
        employee_name: profile.full_name,
        sector: req.sector || profile.sector,
        points: req.mission_points,
        type: "mission",
        mission_id: req.mission_id,
        mission_title: req.mission_title,
        description: `Missão aprovada: ${req.mission_title}`,
        awarded_by_name: req.approved_by_name || "Sistema",
      });
      createdTxs.push(tx);
    }

    return Response.json({
      success: true,
      employee: profile.full_name,
      employee_id: employee_id,
      created_transactions: createdTxs.length,
      total_points: createdTxs.reduce((s, t) => s + t.points, 0),
      transactions: createdTxs
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});