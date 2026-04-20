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

    const statusMessages = {
      aprovado: { title: "Resgate aprovado! 🎉", message: `Seu resgate de "${data.reward_title}" foi aprovado e está sendo processado.`, type: "resgate" },
      entregue: { title: "Prêmio entregue! 🏆", message: `Seu prêmio "${data.reward_title}" foi entregue. Aproveite!`, type: "resgate" },
      cancelado: { title: "Resgate cancelado", message: `Seu resgate de "${data.reward_title}" (${data.points_spent} pts) foi cancelado.`, type: "resgate" },
    };

    const notif = statusMessages[newStatus];
    if (!notif) return Response.json({ ok: true });

    // Busca o user_id do colaborador
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.list();
    const profile = profiles.find(p => p.user_id === data.employee_id || p.id === data.employee_id);
    const targetUserId = profile?.user_id || data.employee_id;

    await base44.asServiceRole.entities.Notification.create({
      user_id: targetUserId,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      is_read: false,
      link_page: "GreenShop",
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});