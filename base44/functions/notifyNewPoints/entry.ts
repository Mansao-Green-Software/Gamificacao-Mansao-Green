import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { data, event } = body;

    if (event?.type !== 'create') return Response.json({ ok: true });

    const points = data?.points || 0;

    // Só notifica pontos positivos e que não sejam resgates
    if (points <= 0 || data?.description?.startsWith("Resgate:")) return Response.json({ ok: true });

    const profiles = await base44.asServiceRole.entities.EmployeeProfile.list();
    const profile = profiles.find(p => p.user_id === data.employee_id || p.id === data.employee_id);
    const targetUserId = profile?.user_id || data.employee_id;

    if (!targetUserId) return Response.json({ ok: true });

    const reason = data.mission_title || data.description || "Pontuação manual";
    const isMission = !!data.mission_title;

    await base44.asServiceRole.entities.Notification.create({
      user_id: targetUserId,
      title: isMission ? `Missão concluída! +${points} pts` : `+${points} pontos recebidos`,
      message: isMission
        ? `Você ganhou ${points} pontos pela missão "${reason}". Continue assim!`
        : `Você recebeu ${points} pontos. Motivo: ${reason}`,
      type: isMission ? "missao" : "pontuacao",
      is_read: false,
      link_page: "Dashboard",
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});