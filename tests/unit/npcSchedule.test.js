import { describe, test, expect } from 'bun:test';
import {
  weekdayIndex,
  tripStatus,
  workOfDay,
  resolvePresence,
} from '../../public/scripts/npcs/npcSchedule.js';

const H = (h, m = 0) => h * 60 + m;

/** Agenda do John (a mesma que vai pro npcJohn). */
const JOHN = {
  base: { from: H(6, 30), until: H(19) },
  weekly: { 0: 'engineering', 2: 'security', 4: 'engineering' },
  shifts: {
    engineering: { from: H(10) },
    security: { until: H(18) },
    airforce: { allDay: true },
  },
  trip: { work: 'airforce', lengthDays: 3, intervals: [18, 34, 12, 27] },
};

describe('dia da semana', () => {
  // Bate com weather.getWeekday(): (day - 1) % 7, e weekdays[0] = 'Segunda'.
  test('dia 1 é segunda', () => {
    expect(weekdayIndex(1)).toBe(0);
    expect(weekdayIndex(8)).toBe(0);
    expect(weekdayIndex(3)).toBe(2); // quarta
  });
});

describe('semana fixa', () => {
  test('segunda e sexta são engenharia, quarta é segurança', () => {
    expect(workOfDay(JOHN, 1)).toBe('engineering'); // seg
    expect(workOfDay(JOHN, 3)).toBe('security');    // qua
    expect(workOfDay(JOHN, 5)).toBe('engineering'); // sex
  });

  test('terça, quinta e fim de semana são livres', () => {
    for (const dia of [2, 4, 6, 7]) expect(workOfDay(JOHN, dia)).toBeNull();
  });
});

describe('viagem longa', () => {
  // Determinístico: sortear exigiria persistir o resultado, senão recarregar
  // o save re-rolaria o dado e o NPC teleportaria pra dentro/fora do mundo.
  test('o mesmo dia dá sempre o mesmo resultado', () => {
    for (const dia of [1, 19, 20, 21, 57, 300]) {
      expect(tripStatus(JOHN.trip, dia)).toEqual(tripStatus(JOHN.trip, dia));
    }
  });

  test('primeira viagem começa depois do primeiro intervalo e dura 3 dias', () => {
    expect(tripStatus(JOHN.trip, 18).inTrip).toBe(false); // ainda em casa
    expect(tripStatus(JOHN.trip, 19).inTrip).toBe(true);
    expect(tripStatus(JOHN.trip, 20).inTrip).toBe(true);
    expect(tripStatus(JOHN.trip, 21).inTrip).toBe(true);
    expect(tripStatus(JOHN.trip, 22).inTrip).toBe(false);
  });

  test('sabe o último dia fora (pra dizer quando volta)', () => {
    expect(tripStatus(JOHN.trip, 19).endsOnDay).toBe(21);
    expect(tripStatus(JOHN.trip, 21).endsOnDay).toBe(21);
  });

  test('o intervalo entre viagens varia — não é ritmo fixo', () => {
    const inicios = [];
    for (let dia = 1; dia <= 200; dia++) {
      const hoje = tripStatus(JOHN.trip, dia).inTrip;
      const ontem = dia > 1 && tripStatus(JOHN.trip, dia - 1).inTrip;
      if (hoje && !ontem) inicios.push(dia);
    }
    const gaps = inicios.slice(1).map((d, i) => d - inicios[i]);
    expect(new Set(gaps).size).toBeGreaterThan(1); // ritmo irregular
  });

  test('viagem manda no dia inteiro, mesmo caindo num dia de trabalho fixo', () => {
    expect(workOfDay(JOHN, 19)).toBe('airforce');
  });
});

describe('presença ao longo do dia', () => {
  test('dia livre: fora de madrugada, dentro de dia, fora de noite', () => {
    expect(resolvePresence(JOHN, 2, H(5)).present).toBe(false);
    expect(resolvePresence(JOHN, 2, H(12)).present).toBe(true);
    expect(resolvePresence(JOHN, 2, H(20)).present).toBe(false);
  });

  test('dia de engenharia: só aparece às 10h', () => {
    expect(resolvePresence(JOHN, 1, H(8)).present).toBe(false);
    expect(resolvePresence(JOHN, 1, H(10)).present).toBe(true);
  });

  test('dia de segurança: some às 18h', () => {
    expect(resolvePresence(JOHN, 3, H(17, 59)).present).toBe(true);
    expect(resolvePresence(JOHN, 3, H(18)).present).toBe(false);
  });

  // O ponto central do desenho: o jogador vai à cidade no meio do dia, então
  // a agenda encolhe as pontas e nunca fura o miolo.
  test('sempre presente entre 10h e 18h, em qualquer dia sem viagem', () => {
    for (let dia = 1; dia <= 14; dia++) {
      if (tripStatus(JOHN.trip, dia).inTrip) continue;
      for (const hora of [10, 12, 15, 17]) {
        expect({ dia, hora, ok: resolvePresence(JOHN, dia, H(hora)).present })
          .toEqual({ dia, hora, ok: true });
      }
    }
  });

  test('em viagem, fora o dia inteiro', () => {
    for (const hora of [7, 12, 18]) {
      expect(resolvePresence(JOHN, 19, H(hora)).present).toBe(false);
    }
  });

  test('distingue ausência por trabalho de ausência por noite', () => {
    expect(resolvePresence(JOHN, 1, H(8)).reason).toBe('work');   // engenharia
    expect(resolvePresence(JOHN, 2, H(5)).reason).toBe('night');  // dia livre
    expect(resolvePresence(JOHN, 19, H(12)).reason).toBe('work'); // viagem
  });

  test('informa quando ele volta', () => {
    expect(resolvePresence(JOHN, 1, H(8)).returnsAtMinutes).toBe(H(10));
    expect(resolvePresence(JOHN, 19, H(12)).returnsOnDay).toBe(22); // volta após a viagem
  });
});
