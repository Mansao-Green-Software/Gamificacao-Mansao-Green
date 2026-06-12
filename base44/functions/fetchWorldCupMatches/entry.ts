import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Usa a API pública football-data.org (gratuita para Copa do Mundo)
    const API_KEY = Deno.env.get("FOOTBALL_API_KEY");
    const headers = API_KEY ? { 'X-Auth-Token': API_KEY } : {};

    // Copa do Mundo 2026 - competition code WC
    const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches', { headers });

    if (!response.ok) {
      // Fallback: retorna lista de jogos de exemplo para teste
      return Response.json({ 
        matches: [],
        error: `API retornou ${response.status}. Configure FOOTBALL_API_KEY para acessar dados reais.`
      });
    }

    const data = await response.json();
    const matches = (data.matches || []).map(m => ({
      match_id: String(m.id),
      home_team: m.homeTeam?.shortName || m.homeTeam?.name || 'TBD',
      away_team: m.awayTeam?.shortName || m.awayTeam?.name || 'TBD',
      home_flag: m.homeTeam?.crest || '',
      away_flag: m.awayTeam?.crest || '',
      match_date: m.utcDate,
      stage: m.stage || m.group || 'Grupo',
      status: m.status === 'FINISHED' ? 'finalizado' : m.status === 'IN_PLAY' ? 'em_andamento' : 'agendado',
      home_score: m.score?.fullTime?.home ?? null,
      away_score: m.score?.fullTime?.away ?? null,
    }));

    return Response.json({ matches });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});