import { describe, expect, it } from "vitest";
import {
  formatStoryAge,
  isStoryRefActive,
  storyMessageLabel,
} from "@/components/aluno/comunidade/story-types";
import { buildAudioPath, formatAudioTime, microfoneErro, pickAudioMime } from "@/lib/comunidade-audio";

const base = {
  remetente_id: "ana",
  destinatario_id: "bia",
  story_id: "s1",
  story_autor_id: "bia",
  story_origem: "post",
  story_expira_em: "2026-11-23T10:00:00Z",
  texto: "Boa!",
  emoji: null,
};

describe("rótulo da resposta ao story no Direct", () => {
  it("quem respondeu vê 'Você respondeu ao story'", () => {
    expect(storyMessageLabel(base, "ana")).toBe("Você respondeu ao story");
  });
  it("o dono do story vê 'Respondeu ao seu story'", () => {
    expect(storyMessageLabel(base, "bia")).toBe("Respondeu ao seu story");
  });
  it("curtida/emoji sem texto vira reação", () => {
    expect(storyMessageLabel({ ...base, texto: null, emoji: "❤️" }, "bia")).toBe("Reagiu ao seu story");
  });
  it("mensagem sem story não tem rótulo", () => {
    expect(
      storyMessageLabel({ ...base, story_id: null, story_origem: null, story_autor_id: null }, "ana")
    ).toBeNull();
  });
});

describe("story citado no Direct", () => {
  const agora = new Date("2026-11-22T16:00:00Z");
  it("abre enquanto não expirou", () => {
    expect(isStoryRefActive(base, agora)).toBe(true);
  });
  it("fica indisponível depois de expirar", () => {
    expect(isStoryRefActive({ ...base, story_expira_em: "2026-11-22T15:59:00Z" }, agora)).toBe(false);
  });
  it("fica indisponível se o story foi apagado", () => {
    expect(isStoryRefActive({ ...base, story_id: null }, agora)).toBe(false);
  });
});

describe("tempo do story no cabeçalho", () => {
  const agora = new Date("2026-11-22T16:00:00Z");
  it("mostra minutos como no Instagram", () => {
    expect(formatStoryAge("2026-11-22T15:21:00Z", agora)).toBe("39 min");
  });
  it("mostra horas depois de 60 min", () => {
    expect(formatStoryAge("2026-11-22T11:00:00Z", agora)).toBe("5 h");
  });
});

describe("áudio do Direct", () => {
  it("salva no tenant e na pasta de quem enviou", () => {
    expect(buildAudioPath("t1", "u1", "abc", "audio/webm;codecs=opus")).toBe("t1/u1/abc.webm");
    expect(buildAudioPath("t1", "u1", "abc", "audio/mp4")).toBe("t1/u1/abc.m4a");
  });
  it("prefere formato que toca no iPhone e no Android", () => {
    expect(pickAudioMime(() => true)).toBe("audio/mp4");
    expect(pickAudioMime((t) => t.startsWith("audio/webm"))).toBe("audio/webm;codecs=opus");
  });
  it("formata a duração", () => {
    expect(formatAudioTime(75)).toBe("1:15");
  });
  it("explica permissão negada", () => {
    expect(microfoneErro({ name: "NotAllowedError" })).toMatch(/Permissão do microfone negada/);
  });
});
