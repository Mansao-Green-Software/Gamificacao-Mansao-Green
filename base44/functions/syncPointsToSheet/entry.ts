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

    // Get today's date in BRT timezone
    const today = new Date();
    const brazilDate = new Date(today.toLocaleString('pt-BR', { timeZone: 'America/Bahia' }));
    const todayString = brazilDate.toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' });

    // Calculate daily totals by employee
    const dailyTotals = {};
    transactions.forEach(t => {
      const txDate = new Date(t.created_date).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' });
      if (txDate === todayString) {
        const empName = t.employee_name || 'Desconhecido';
        if (!dailyTotals[empName]) {
          dailyTotals[empName] = 0;
        }
        dailyTotals[empName] += t.points || 0;
      }
    });

    const dailyData = Object.entries(dailyTotals).map(([name, total]) => [
      name,
      total
    ]);

    // Group transactions by sector
    const transactionsBySector = {};
    transactions.forEach(t => {
      const sector = t.sector || 'Sem Setor';
      if (!transactionsBySector[sector]) {
        transactionsBySector[sector] = [];
      }
      transactionsBySector[sector].push([
        t.employee_name || '',
        t.sector || '',
        t.points || 0,
        t.type || 'manual',
        t.mission_title || t.description || '',
        t.awarded_by_name || '',
        new Date(t.created_date).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' })
      ]);
    });

    const headers = [['Colaborador', 'Setor', 'Pontos', 'Tipo', 'Missão/Descrição', 'Atribuído por', 'Data']];
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`;
    const sectors = Object.keys(transactionsBySector);

    // Step 1: Get current sheets first to know which exist
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
    const metadataResponse = await fetch(metadataUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const metadata = await metadataResponse.json();
    
    const sheetIdMap = {};
    const existingTitles = new Set();
    metadata.sheets?.forEach(sheet => {
      sheetIdMap[sheet.properties.title] = sheet.properties.sheetId;
      existingTitles.add(sheet.properties.title);
    });

    // Create requests: rename first sheet + create missing sector sheets
    const createSheetRequests = [
      // Rename first sheet (sheetId 0) to "Totais Diários" if not already
      ...(!existingTitles.has("Totais Diários") ? [{
        updateSheetProperties: {
          properties: {
            sheetId: 0,
            title: "Totais Diários"
          },
          fields: "title"
        }
      }] : []),
      // Create sheets for sectors that don't exist
      ...sectors.filter(s => !existingTitles.has(s)).map(sector => ({
        addSheet: {
          properties: {
            title: sector.substring(0, 31)
          }
        }
      }))
    ];

    if (createSheetRequests.length > 0) {
      const createResponse = await fetch(sheetsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests: createSheetRequests })
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        console.error('Failed to create sheets:', error);
      }
      
      // Refresh metadata after creating sheets
      const refreshMetadata = await fetch(metadataUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const refreshedData = await refreshMetadata.json();
      refreshedData.sheets?.forEach(sheet => {
        sheetIdMap[sheet.properties.title] = sheet.properties.sheetId;
      });
    }



    // Step 3: Populate data - first sheet with daily totals, then sectors
    const dailyHeaders = [['Colaborador', `Pontos do Dia (${todayString})`]];
    const dailySheetId = sheetIdMap['Totais Diários'] !== undefined ? sheetIdMap['Totais Diários'] : 0;
    const updateRequests = [
      // First request: daily totals on "Totais Diários" sheet
      {
        updateCells: {
          range: {
            sheetId: dailySheetId,
            startRowIndex: 0,
            startColumnIndex: 0
          },
          rows: [
            ...dailyHeaders,
            ...dailyData.sort((a, b) => b[1] - a[1]) // Sort by points descending
          ].map(row => ({
            values: row.map(val => ({
              userEnteredValue: {
                stringValue: String(val)
              }
            }))
          })),
          fields: 'userEnteredValue'
        }
      },
      // Then populate sector sheets
      ...sectors.map(sector => {
        const sheetId = sheetIdMap[sector] !== undefined ? sheetIdMap[sector] : 0;
        return {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              startColumnIndex: 0
            },
            rows: [
              ...headers,
              ...transactionsBySector[sector]
            ].map(row => ({
              values: row.map(val => ({
                userEnteredValue: {
                  stringValue: String(val)
                }
              }))
            })),
            fields: 'userEnteredValue'
          }
        };
      })
    ];

    const response = await fetch(sheetsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: updateRequests })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Google Sheets API error:', error);
      return Response.json({ error: 'Failed to sync to sheet', details: error }, { status: 500 });
    }

    const result = await response.json();

    return Response.json({
      status: 'success',
      message: `Synced ${transactions.length} transactions to ${Object.keys(transactionsBySector).length} sheets (by sector)`,
      sectors: Object.keys(transactionsBySector),
      rowsUpdated: result.replies?.length || 0
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});