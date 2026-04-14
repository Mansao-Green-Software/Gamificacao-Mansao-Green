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
  const d = new Date(date);
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