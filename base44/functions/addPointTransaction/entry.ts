import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_POINTS = 300;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['admin', 'manager', 'supervisor', 'director'];
  if (!allowedRoles.includes(user.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  let { employee_id, employee_name, sector, points, type, description, mission_id, mission_title, awarded_by_name, transaction_date } = body;

  if (!employee_id || points === undefined || points === null) {
    return Response.json({ error: 'employee_id e points são obrigatórios' }, { status: 400 });
  }

  // Limite de 300 pts apenas para pontos positivos (tarefas/prêmios)
  if (points > 0 && points > MAX_POINTS) {
    return Response.json({ error: `O limite máximo de pontos por tarefa é ${MAX_POINTS} pts.` }, { status: 400 });
  }

  // Normalizar employee_id para sempre usar user_id ou id do perfil
  try {
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.list();
    const profile = profiles.find(p => 
      p.user_id === employee_id || 
      p.id === employee_id ||
      p.full_name === employee_name
    );
    
    if (profile) {
      employee_id = profile.user_id || profile.id;
      employee_name = profile.full_name || employee_name;
      if (!sector) sector = profile.sector;
    }
  } catch (e) {
    // Se não conseguir normalizar, continua com os valores originais
  }

  const tx = await base44.asServiceRole.entities.PointTransaction.create({
    employee_id,
    employee_name,
    sector,
    points,
    type: type || 'manual',
    description,
    mission_id,
    mission_title,
    awarded_by_name,
    transaction_date: transaction_date || new Date().toISOString(),
  });

  return Response.json(tx);
});