import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (service role) or admin user calls
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAuthorized = true;
    } catch {
      // Called from scheduled automation (no user context) — allow
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const sheetId = Deno.env.get('GAMIFICATION_SHEET_ID');

    if (!sheetId) {
      return Response.json({ error: 'GAMIFICATION_SHEET_ID not set' }, { status: 500 });
    }

    // Fetch all data
    const [transactions, profiles] = await Promise.all([
      base44.asServiceRole.entities.PointTransaction.list('-created_date', 2000),
      base44.asServiceRole.entities.EmployeeProfile.list(),
    ]);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const dateLabel = today.toLocaleDateString('pt-BR');

    // Build profile map
    const profileMap = {};
    profiles.forEach(p => {
      profileMap[p.user_id || p.id] = p;
    });

    // Compute total points per employee (all time)
    const totalPoints = {};
    transactions.forEach(t => {
      const id = t.employee_id;
      totalPoints[id] = (totalPoints[id] || 0) + (t.points || 0);
    });

    // Compute today's points
    const todayPoints = {};
    const employeeSector = {};
    const employeeName = {};
    transactions.forEach(t => {
      const txDate = new Date(t.created_date).toISOString().slice(0, 10);
      if (txDate === todayStr) {
        const id = t.employee_id;
        todayPoints[id] = (todayPoints[id] || 0) + (t.points || 0);
        employeeSector[id] = t.sector;
        employeeName[id] = t.employee_name;
      }
    });

    // Build rows for employees with activity today
    const rows = Object.keys(todayPoints).map(id => {
      const profile = profileMap[id];
      const name = profile?.full_name || employeeName[id] || id;
      const sector = profile?.sector || employeeSector[id] || '';
      const ptdToday = todayPoints[id] || 0;
      const ptdTotal = totalPoints[id] || 0;
      return [dateLabel, name, sector, ptdToday, ptdTotal];
    }).sort((a, b) => b[3] - a[3]); // sort by today's points desc

    if (rows.length === 0) {
      return Response.json({ message: 'No transactions today, nothing to log.' });
    }

    // Ensure header row exists — check current sheet data
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:A1`;
    const getResp = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const getData = await getResp.json();
    const hasHeader = getData.values && getData.values[0]?.[0] === 'Data';

    // If no header, prepend it
    const valuesToAppend = hasHeader
      ? rows
      : [['Data', 'Colaborador', 'Setor', 'Pontos Hoje', 'Total Pontos'], ...rows];

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:E:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const appendResp = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: valuesToAppend }),
    });

    if (!appendResp.ok) {
      const err = await appendResp.text();
      return Response.json({ error: 'Sheets API error', details: err }, { status: 500 });
    }

    const result = await appendResp.json();
    return Response.json({
      success: true,
      date: todayStr,
      rowsLogged: rows.length,
      updatedRange: result.updates?.updatedRange,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});