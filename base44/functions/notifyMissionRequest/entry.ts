import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { data, old_data, event } = body;

    if (event?.type !== 'update') return Response.json({ ok: true });

    const newStatus = data?.status;
    const oldStatus = old_data?.status;

    if (!newStatus || newStatus === oldStatus) return Response.json({ ok: true });
    if (newStatus !== 'aprovado' && newStatus !== 'rejeitado') return Response.json({ ok: true });

    // Busca o user_id do colaborador via perfil
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.list();
    const profile = profiles.find(p => p.user_id === data.employee_id || p.id === data.employee_id);
    const targetUserId = profile?.user_id || data.employee_id;

    if (!targetUserId) return Response.json({ ok: true });

    let title, message, type;

    if (newStatus === 'aprovado') {
      title = `Missão aprovada! +${data.mission_points} pts 🎉`;
      message = `Sua solicitação para a missão "${data.mission_title}" foi aprovada${data.approved_by_name ? ` por ${data.approved_by_name}` : ""}. Os pontos foram adicionados ao seu saldo!`;
      type = 'missao';
    } else {
      title = `Solicitação recusada`;
      message = `Sua solicitação para a missão "${data.mission_title}" foi recusada${data.notes ? `. Motivo: ${data.notes}` : "."}`;
      type = 'missao';
    }

    await base44.asServiceRole.entities.Notification.create({
      user_id: targetUserId,
      title,
      message,
      type,
      is_read: false,
      link_page: 'Missions',
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});