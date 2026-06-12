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

    const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': API_KEY }
    });

    if (!response.ok) {
      return Response.json({ error: `API error: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const apiMatches = data.matches || [];

    // Buscar jogos já cadastrados
    const existing = await base44.asServiceRole.entities.BolaoMatch.list();
    const existingMap = {};
    existing.forEach(m => { existingMap[m.match_id] = m; });

    let created = 0, updated = 0;

    for (const m of apiMatches) {
      const matchData = {
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
    const finishedMatches = existing.filter(m => m.status === 'finalizado' && m.home_score !== null);
    for (const match of finishedMatches) {
      const guesses = await base44.asServiceRole.entities.BolaoGuess.filter({ match_id: match.id, result_computed: false });
      for (const guess of guesses) {
        let pts = 0;
        const homeOk = guess.home_guess === match.home_score;
        const awayOk = guess.away_guess === match.away_score;
        if (homeOk && awayOk) {
          pts = 5; // placar exato
        } else {
          const guessWinner = guess.home_guess > guess.away_guess ? 'home' : guess.home_guess < guess.away_guess ? 'away' : 'draw';
          const actualWinner = match.home_score > match.away_score ? 'home' : match.home_score < match.away_score ? 'away' : 'draw';
          if (guessWinner === actualWinner) {
            pts = actualWinner === 'draw' ? 1 : 2;
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