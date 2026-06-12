import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const API_KEY = Deno.env.get("FOOTBALL_API_KEY");
    if (!API_KEY) {
      return Response.json({ error: 'FOOTBALL_API_KEY não configurada' }, { status: 400 });
    }

    // Copa do Mundo 2026 - league id 1, season 2026
    const response = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026', {
      headers: {
        'x-apisports-key': API_KEY
      }
    });

    if (!response.ok) {
      return Response.json({ error: `API retornou ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const fixtures = data.response || [];

    const matches = fixtures.map(f => ({
      match_id: String(f.fixture.id),
      home_team: f.teams.home.name,
      away_team: f.teams.away.name,
      home_flag: f.teams.home.logo || '',
      away_flag: f.teams.away.logo || '',
      match_date: f.fixture.date,
      stage: f.league.round || 'Grupo',
      status: f.fixture.status.short === 'FT' || f.fixture.status.short === 'AET' || f.fixture.status.short === 'PEN'
        ? 'finalizado'
        : f.fixture.status.short === '1H' || f.fixture.status.short === '2H' || f.fixture.status.short === 'HT' || f.fixture.status.short === 'ET'
          ? 'em_andamento'
          : 'agendado',
      home_score: f.goals.home ?? null,
      away_score: f.goals.away ?? null,
    }));

    return Response.json({ matches, total: matches.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});