import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Busca resgates usando service role (bypassa RLS) e filtra pelo user
    const all = await base44.asServiceRole.entities.RewardRedemption.list("-created_date", 500);

    const mine = all.filter(r =>
      r.employee_id === user.id ||
      r.created_by === user.email ||
      r.created_by_id === user.id
    );

    return Response.json({ redemptions: mine });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});