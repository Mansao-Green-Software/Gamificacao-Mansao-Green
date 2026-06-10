const TZ = "America/Sao_Paulo";

/**
 * Formata uma data para exibição no fuso de Brasília.
 * @param {string|Date} date
 * @param {"datetime"|"date"|"time"} mode
 */
function parseUTC(date) {
  if (!date) return null;
  if (date instanceof Date) return date;
  const s = String(date);
  // Data pura sem hora (ex: "2026-04-01") → meia-noite UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(s + "T00:00:00Z");
  }
  // Datetime sem fuso → assume UTC
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && !/[Z+\-]\d{2}:?\d{2}$/.test(s) && !s.endsWith("Z")) {
    return new Date(s + "Z");
  }
  return new Date(s);
}

export function formatBRT(date, mode = "datetime") {
  if (!date) return "—";
  const d = parseUTC(date);
  if (!d || isNaN(d.getTime())) return "—";

  const opts =
    mode === "date"
      ? { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }
      : mode === "time"
      ? { hour: "2-digit", minute: "2-digit", timeZone: TZ }
      : { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ };

  return new Intl.DateTimeFormat("pt-BR", opts).format(d);
}

/**
 * Retorna um objeto Date com os componentes de tempo no fuso de Brasília.
 * Útil para comparações de dia/semana/mês no fuso correto.
 */
export function nowBRT() {
  return dateToBRT(new Date());
}

/**
 * Converte qualquer Date para um Date "ingênuo" com os componentes de Brasília.
 */
export function dateToBRT(date) {
  const d = parseUTC(date);
  if (!d || isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d);

  const get = (type) => parts.find(p => p.type === type)?.value;
  return new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour").replace("24","00")}:${get("minute")}:${get("second")}`
  );
}