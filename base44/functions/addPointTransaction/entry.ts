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
  const { employee_id, employee_name, sector, points, type, description, mission_id, mission_title, awarded_by_name } = body;

  if (!employee_id || points === undefined || points === null) {
    return Response.json({ error: 'employee_id e points são obrigatórios' }, { status: 400 });
  }

  if (points > MAX_POINTS) {
    return Response.json({ error: `O limite máximo de pontos por tarefa é ${MAX_POINTS} pts.` }, { status: 400 });
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
  });

  return Response.json(tx);
});