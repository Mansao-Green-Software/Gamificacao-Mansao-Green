import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { employee_email, mission_title } = body;

  if (!employee_email || !mission_title) {
    return Response.json({ error: 'employee_email e mission_title são obrigatórios' }, { status: 400 });
  }

  try {
    // Get employee profile
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.filter({});
    const profile = profiles.find(p => p.email === employee_email);
    
    if (!profile) {
      return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    const employee_id = profile.user_id || profile.id;

    // Get the mission
    const missions = await base44.asServiceRole.entities.Mission.filter({ is_active: true });
    const mission = missions.find(m => m.title === mission_title);
    
    if (!mission) {
      return Response.json({ error: 'Missão não encontrada' }, { status: 404 });
    }

    // Get the approved request
    const requests = await base44.asServiceRole.entities.MissionRequest.filter({});
    const request = requests.find(r => 
      r.employee_id === employee_id && 
      r.mission_id === mission.id && 
      r.status === 'aprovado'
    );

    if (!request) {
      return Response.json({ error: 'Solicitação aprovada não encontrada para este colaborador' }, { status: 404 });
    }

    // Create the point transaction
    const tx = await base44.asServiceRole.entities.PointTransaction.create({
      employee_id: employee_id,
      employee_name: profile.full_name,
      sector: request.sector || profile.sector,
      points: request.mission_points,
      type: "mission",
      mission_id: mission.id,
      mission_title: mission.title,
      description: `Missão aprovada: ${mission.title}`,
      awarded_by_name: request.approved_by_name || "Sistema",
    });

    return Response.json({
      success: true,
      message: `Pontos adicionados com sucesso para ${profile.full_name}`,
      transaction: tx
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});