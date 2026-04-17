import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const corrections = [
      { name: 'Lavínia Andrade', current: 250, target: 1100 },
      { name: 'Maria Clara', current: 375, target: 1355 }
    ];

    const results = [];

    for (const correction of corrections) {
      const employees = await base44.asServiceRole.entities.EmployeeProfile.list();
      const employee = employees.find(e => 
        e.full_name?.toLowerCase() === correction.name.toLowerCase()
      );

      if (!employee) {
        results.push({ name: correction.name, status: 'not_found' });
        continue;
      }

      const pointsDiff = correction.target - correction.current;

      const transaction = await base44.asServiceRole.entities.PointTransaction.create({
        employee_id: employee.user_id || employee.id,
        employee_name: employee.full_name,
        sector: 'Financeiro',
        points: pointsDiff,
        type: 'manual',
        description: `Correção de pontuação: ${correction.current} → ${correction.target}`,
        awarded_by_name: 'Sistema',
      });

      results.push({ 
        name: correction.name, 
        status: 'success', 
        added_points: pointsDiff,
        transaction_id: transaction.id 
      });
    }

    return Response.json({ 
      message: 'Pontuação corrigida',
      corrections: results 
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});