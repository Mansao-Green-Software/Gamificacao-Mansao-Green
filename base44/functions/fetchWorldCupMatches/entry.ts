import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const API_KEY = Deno.env.get("FOOTBALL_DATA_API_KEY");
    if (!API_KEY) {
      return Response.json({ error: 'FOOTBALL_DATA_API_KEY não configurada' }, { status: 400 });
    }

    // Copa do Mundo 2026 - football-data.org competition id 2000
    const response = await fetch('https://api.football-data.org/v4/competitions/2000/matches', {
      headers: { 'X-Auth-Token': API_KEY }
    });

    if (!response.ok) {
      const text = await response.text();
      return Response.json({ error: `API retornou ${response.status}: ${text}` }, { status: 500 });
    }

    const data = await response.json();
    const fixtures = data.matches || [];

    const mapStatus = (s) => {
      if (s === 'FINISHED') return 'finalizado';
      if (s === 'IN_PLAY' || s === 'PAUSED') return 'em_andamento';
      return 'agendado';
    };

    const matches = fixtures.map(f => ({
      match_id: String(f.id),
      home_team: f.homeTeam.name,
      away_team: f.awayTeam.name,
      home_flag: f.homeTeam.crest || '',
      away_flag: f.awayTeam.crest || '',
      match_date: f.utcDate,
      stage: f.stage || f.group || 'Grupo',
      status: mapStatus(f.status),
      home_score: f.score?.fullTime?.home ?? null,
      away_score: f.score?.fullTime?.away ?? null,
    }));

    return Response.json({ matches, total: matches.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});