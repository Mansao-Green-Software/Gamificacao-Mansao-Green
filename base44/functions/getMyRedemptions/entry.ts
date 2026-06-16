import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [all, profiles] = await Promise.all([
      base44.asServiceRole.entities.RewardRedemption.list("-created_date", 500),
      base44.asServiceRole.entities.EmployeeProfile.list(null, 500),
    ]);

    const profile = profiles.find(p => p.user_id === user.id || p.email === user.email);

    const mine = all.filter(r =>
      r.employee_id === user.id ||
      (profile && (r.employee_id === profile.id || r.employee_id === profile.user_id)) ||
      r.employee_name === (profile?.full_name || user.full_name) ||
      r.created_by_id === user.id
    );

    return Response.json({ redemptions: mine });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});