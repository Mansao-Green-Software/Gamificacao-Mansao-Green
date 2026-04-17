import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, current, target } = body;

    if (!name || current === undefined || target === undefined) {
      return Response.json({ error: 'Missing required fields: name, current, target' }, { status: 400 });
    }

    const employees = await base44.asServiceRole.entities.EmployeeProfile.list();
    const employee = employees.find(e => 
      e.full_name?.toLowerCase() === name.toLowerCase()
    );

    if (!employee) {
      return Response.json({ status: 'not_found', message: `Employee ${name} not found` });
    }

    const pointsDiff = target - current;

    const transaction = await base44.asServiceRole.entities.PointTransaction.create({
      employee_id: employee.user_id || employee.id,
      employee_name: employee.full_name,
      sector: employee.sector || 'Administrativo',
      points: pointsDiff,
      type: 'manual',
      description: `Correção de pontuação: ${current} → ${target}`,
      awarded_by_name: 'Sistema',
    });

    return Response.json({
      status: 'success',
      employee_name: employee.full_name,
      added_points: pointsDiff,
      transaction_id: transaction.id
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});