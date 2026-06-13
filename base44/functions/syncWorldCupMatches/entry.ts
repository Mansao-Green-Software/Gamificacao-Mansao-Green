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
      return Response.json({ error: `API error ${response.status}: ${text}` }, { status: 500 });
    }

    const data = await response.json();
    const fixtures = data.matches || [];

    const mapStatus = (s) => {
      if (s === 'FINISHED') return 'finalizado';
      if (s === 'IN_PLAY' || s === 'PAUSED') return 'em_andamento';
      return 'agendado';
    };

    // Buscar jogos já cadastrados
    const existing = await base44.asServiceRole.entities.BolaoMatch.list();
    const existingMap = {};
    existing.forEach(m => { existingMap[m.match_id] = m; });

    let created = 0, updated = 0;

    for (const f of fixtures) {
      // Pular jogos sem times definidos ainda (fases eliminatórias futuras)
      if (!f.homeTeam?.name || !f.awayTeam?.name) continue;

      const matchData = {
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
      };

      if (existingMap[matchData.match_id]) {
        await base44.asServiceRole.entities.BolaoMatch.update(existingMap[matchData.match_id].id, matchData);
        updated++;
      } else {
        await base44.asServiceRole.entities.BolaoMatch.create(matchData);
        created++;
      }
    }

    // Calcular pontos dos palpites para jogos finalizados
    const allMatches = await base44.asServiceRole.entities.BolaoMatch.filter({ status: 'finalizado' });
    for (const match of allMatches) {
      if (match.home_score === null || match.home_score === undefined) continue;
      const guesses = await base44.asServiceRole.entities.BolaoGuess.filter({ match_id: match.id, result_computed: false });
      for (const guess of guesses) {
        let pts = 0;
        const homeOk = guess.home_guess === match.home_score;
        const awayOk = guess.away_guess === match.away_score;
        if (homeOk && awayOk) {
          pts = 5;
        } else {
          const guessWinner = guess.home_guess > guess.away_guess ? 'home' : guess.home_guess < guess.away_guess ? 'away' : 'draw';
          const actualWinner = match.home_score > match.away_score ? 'home' : match.home_score < match.away_score ? 'away' : 'draw';
          if (guessWinner === actualWinner && actualWinner !== 'draw') {
            pts = 2;
          }
        }
        await base44.asServiceRole.entities.BolaoGuess.update(guess.id, { points_earned: pts, result_computed: true });
      }
    }

    return Response.json({ created, updated, message: `Sincronizados ${created + updated} jogos` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});