import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.role === 'admin';
    const isManager = user.role === 'manager' || user.role === 'supervisor' || user.role === 'director';
    
    if (!isAdmin && !isManager) {
      return Response.json({ error: 'Forbidden: Only admins and managers can sync data' }, { status: 403 });
    }

    const sheetId = Deno.env.get('GAMIFICATION_SHEET_ID');
    if (!sheetId) {
      return Response.json({ error: 'Sheet ID not configured' }, { status: 500 });
    }

    // Get connection to Google Sheets
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    // Fetch transactions and employee data
    const [transactions, employees] = await Promise.all([
      base44.asServiceRole.entities.PointTransaction.list('-created_date', 1000),
      base44.asServiceRole.entities.EmployeeProfile.list(null, 1000)
    ]);

    // Prepare data for sheet
    const data = transactions.map(t => [
      t.employee_name || '',
      t.sector || '',
      t.points || 0,
      t.type || 'manual',
      t.mission_title || t.description || '',
      t.awarded_by_name || '',
      new Date(t.created_date).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' })
    ]);

    // Get today's date for sheet naming
    const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' });
    const sheetName = `Pontos ${today}`;

    // Prepare the request to Google Sheets API
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'${sheetName}'!A1`;

    const headers = [['Colaborador', 'Setor', 'Pontos', 'Tipo', 'Missão/Descrição', 'Atribuído por', 'Data']];
    
    const response = await fetch(sheetsUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [...headers, ...data],
        majorDimension: 'ROWS'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Google Sheets API error:', error);
      return Response.json({ error: 'Failed to sync to sheet', details: error }, { status: 500 });
    }

    const result = await response.json();

    return Response.json({
      status: 'success',
      message: `Synced ${data.length} transactions to sheet`,
      sheetName,
      rowsUpdated: result.updates?.updatedRows || 0
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});