import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { user_id, title, message, type, link_page } = await req.json();

    if (!user_id || !title || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const notification = await base44.asServiceRole.entities.Notification.create({
      user_id,
      title,
      message,
      type: type || 'geral',
      is_read: false,
      link_page: link_page || null,
    });

    return Response.json({ notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});