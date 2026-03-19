import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const tx = body.data;

    if (!tx || !tx.employee_id) {
      return Response.json({ ok: true, skipped: "no employee data" });
    }

    // Find employee profile to get email
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.list();
    const profile = profiles.find(p => p.user_id === tx.employee_id || p.id === tx.employee_id);

    if (!profile?.email) {
      return Response.json({ ok: true, skipped: "no email found" });
    }

    const isPositive = tx.points >= 0;
    const pointsLabel = isPositive ? `+${tx.points}` : `${tx.points}`;
    const emoji = isPositive ? "🎉" : "⚠️";
    const reason = tx.description || tx.mission_title || "Pontuação manual";
    const awardedBy = tx.awarded_by_name || "Sistema";

    const subject = isPositive
      ? `${emoji} Você recebeu ${pointsLabel} pontos na Mansão Green!`
      : `${emoji} Seus pontos foram atualizados: ${pointsLabel}`;

    const body_html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #111827; color: #fff; border-radius: 12px; overflow: hidden;">
        <div style="background: #22c55e; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">${emoji} Mansão Green</h1>
          <p style="margin: 4px 0 0; color: #dcfce7; font-size: 14px;">Sistema de Gamificação</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="color: #d1d5db; font-size: 15px; margin: 0 0 8px;">Olá, <strong style="color: #fff;">${profile.full_name}</strong>!</p>
          <p style="color: #d1d5db; font-size: 15px; margin: 0 0 24px;">
            ${isPositive ? "Você acaba de receber uma nova pontuação:" : "Sua pontuação foi atualizada:"}
          </p>

          <div style="background: #1f2937; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 42px; font-weight: bold; margin: 0; color: ${isPositive ? '#4ade80' : '#f87171'};">${pointsLabel}</p>
            <p style="color: #9ca3af; margin: 4px 0 0; font-size: 13px;">pontos</p>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #9ca3af; font-size: 13px; padding: 6px 0;">Motivo</td>
              <td style="color: #fff; font-size: 13px; text-align: right; padding: 6px 0;">${reason}</td>
            </tr>
            ${tx.sector ? `
            <tr>
              <td style="color: #9ca3af; font-size: 13px; padding: 6px 0;">Setor</td>
              <td style="color: #fff; font-size: 13px; text-align: right; padding: 6px 0;">${tx.sector}</td>
            </tr>` : ''}
            <tr>
              <td style="color: #9ca3af; font-size: 13px; padding: 6px 0;">Atribuído por</td>
              <td style="color: #fff; font-size: 13px; text-align: right; padding: 6px 0;">${awardedBy}</td>
            </tr>
          </table>

          <p style="margin-top: 24px; color: #6b7280; font-size: 12px; text-align: center;">
            Acesse a plataforma para ver seu ranking e histórico completo.
          </p>
        </div>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: profile.email,
      subject,
      body: body_html,
    });

    return Response.json({ ok: true, sent_to: profile.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});