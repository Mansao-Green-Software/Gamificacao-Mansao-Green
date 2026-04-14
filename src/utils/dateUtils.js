const TZ = "America/Sao_Paulo";

/**
 * Formata uma data para exibição no fuso de Brasília.
 * @param {string|Date} date
 * @param {"datetime"|"date"|"time"} mode
 */
export function formatBRT(date, mode = "datetime") {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";

  const opts =
    mode === "date"
      ? { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }
      : mode === "time"
      ? { hour: "2-digit", minute: "2-digit", timeZone: TZ }
      : { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ };

  return d.toLocaleString("pt-BR", opts);
}

/**
 * Retorna um objeto Date representando "agora" em Brasília como se fosse local.
 * Útil para comparações de dia/semana/mês no fuso correto.
 */
export function nowBRT() {
  const now = new Date();
  // Converte para string no TZ e cria novo Date "ingênuo"
  const str = now.toLocaleString("sv-SE", { timeZone: TZ }); // "YYYY-MM-DD HH:MM:SS"
  return new Date(str);
}

/**
 * Retorna a string "YYYY-MM-DD" do dia atual em Brasília.
 */
export function todayBRT() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
}