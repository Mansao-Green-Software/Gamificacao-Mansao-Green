import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['admin', 'manager', 'supervisor', 'director'];
  if (!allowedRoles.includes(user.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...data } = body;

  if (!id) {
    return Response.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  const updated = await base44.asServiceRole.entities.Mission.update(id, data);
  return Response.json(updated);
});