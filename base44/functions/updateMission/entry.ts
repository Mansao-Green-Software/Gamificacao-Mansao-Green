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

  // Create - only admin
  if (!id) {
    if (user.role !== 'admin') {
      return Response.json({ error: 'Only admins can create missions' }, { status: 403 });
    }
    const created = await base44.asServiceRole.entities.Mission.create(data);
    return Response.json(created);
  }

  // Update
  const updated = await base44.asServiceRole.entities.Mission.update(id, data);
  return Response.json(updated);
});