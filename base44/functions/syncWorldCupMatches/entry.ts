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
      return Response.json({ error: `API error: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const fixtures = data.response || [];

    // Buscar jogos já cadastrados
    const existing = await base44.asServiceRole.entities.BolaoMatch.list();
    const existingMap = {};
    existing.forEach(m => { existingMap[m.match_id] = m; });

    let created = 0, updated = 0;

    for (const f of fixtures) {
      const statusShort = f.fixture.status.short;
      const status = statusShort === 'FT' || statusShort === 'AET' || statusShort === 'PEN'
        ? 'finalizado'
        : statusShort === '1H' || statusShort === '2H' || statusShort === 'HT' || statusShort === 'ET'
          ? 'em_andamento'
          : 'agendado';

      const matchData = {
        match_id: String(f.fixture.id),
        home_team: f.teams.home.name,
        away_team: f.teams.away.name,
        home_flag: f.teams.home.logo || '',
        away_flag: f.teams.away.logo || '',
        match_date: f.fixture.date,
        stage: f.league.round || 'Grupo',
        status,
        home_score: f.goals.home ?? null,
        away_score: f.goals.away ?? null,
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