import { describe, expect, it } from "vitest";
import { CsvError, detectDelimiter, parseCsv, toDataset } from "@/lib/analysis/csv";
import { chiSquarePValue, crosstab, describe as desc, fPValue, frequencies, groupMeans, histogram, inferType, parseNumber, quantile, duplicateRows } from "@/lib/analysis/stats";

describe("CSV", () => {
  it("détecte le séparateur et gère guillemets, retours à la ligne et BOM", () => {
    const t = '﻿nom;commentaire;age\n"Diop, A";"ligne 1\nligne 2";34\nFall;"dit ""oui""";\n';
    expect(detectDelimiter(t)).toBe(";");
    expect(parseCsv(t)).toEqual([["nom", "commentaire", "age"], ["Diop, A", "ligne 1\nligne 2", "34"], ["Fall", 'dit "oui"', ""]]);
  });
  it("rend les en-têtes uniques, complète les lignes courtes, refuse les lignes trop longues", () => {
    const d = toDataset("a,a,\n1,2,3\n4\n");
    expect(d.headers).toEqual(["a", "a_2", "colonne_3"]);
    expect(d.rows[1]).toEqual(["4", "", ""]);
    expect(d.padded).toBe(1);
    expect(() => toDataset("a,b\n1,2,3\n")).toThrow(CsvError);
    expect(() => toDataset("a,b\n")).toThrow(CsvError);
    expect(() => parseCsv('a\n"x')).toThrow(CsvError);
  });
});

describe("types et valeurs", () => {
  it("lit les nombres au format français", () => {
    expect(parseNumber("1 234,5")).toBe(1234.5);
    expect(parseNumber("12.5")).toBe(12.5);
    expect(parseNumber("12 ans")).toBeNull();
  });
  it("infère les types", () => {
    expect(inferType(["1", "2", "NA", "3,5"])).toBe("number");
    expect(inferType(["2026-01-02", "03/02/2026"])).toBe("date");
    expect(inferType(["F", "H", "F", "F", "H", "F", "H", "F", "F", "H", "F"])).toBe("categorical");
    expect(inferType(["", "NA"])).toBe("empty");
  });
});

describe("statistiques descriptives", () => {
  it("quantiles type 7 et écart-type corrigé", () => {
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    const d = desc(["2", "4", "4", "4", "5", "5", "7", "9", "", "abc"]);
    expect(d.n).toBe(8);
    expect(d.missing).toBe(1);
    expect(d.invalid).toBe(1);
    expect(d.mean).toBe(5);
    expect(d.sd).toBeCloseTo(2.138, 3);
  });
  it("fréquences en % des réponses valides, histogramme couvrant toutes les valeurs, doublons", () => {
    const f = frequencies(["F", "H", "F", "", "F"]);
    expect(f.missing).toBe(1);
    expect(f.rows[0]).toEqual({ value: "F", count: 3, pct: 75 });
    expect(histogram(["1", "2", "3", "10"]).reduce((s, b) => s + b.count, 0)).toBe(4);
    expect(duplicateRows([["a", "1"], ["a ", "1"], ["b", "1"]])).toBe(1);
  });
});

describe("tests statistiques", () => {
  it("lois du khi² et de Fisher (valeurs critiques à 5 %)", () => {
    expect(chiSquarePValue(3.841459, 1)).toBeCloseTo(0.05, 4);
    expect(chiSquarePValue(5.991465, 2)).toBeCloseTo(0.05, 4);
    expect(chiSquarePValue(18.307038, 10)).toBeCloseTo(0.05, 4);
    expect(fPValue(4.964603, 1, 10)).toBeCloseTo(0.05, 4);
    expect(fPValue(3.885294, 2, 12)).toBeCloseTo(0.05, 4);
  });
  it("tableau croisé : khi², ddl, V de Cramér, conditions", () => {
    const a = [...Array(10).fill("x"), ...Array(20).fill("x"), ...Array(30).fill("y"), ...Array(40).fill("y"), "y"];
    const b = [...Array(10).fill("p"), ...Array(20).fill("q"), ...Array(30).fill("p"), ...Array(40).fill("q"), ""];
    const t = crosstab(a, b);
    if (t.tooMany) throw new Error();
    expect(t.n).toBe(100);
    expect(t.excluded).toBe(1);
    expect(t.chi2).toBeCloseTo(0.7937, 4);
    expect(t.df).toBe(1);
    expect(t.p).toBeCloseTo(0.373, 3);
    expect(t.conditionsMet).toBe(true);
    const small = crosstab(["a", "a", "b"], ["x", "y", "y"]);
    expect(!small.tooMany && small.conditionsMet).toBe(false);
  });
  it("ANOVA à un facteur", () => {
    const g = groupMeans(["1", "2", "3", "4", "5", "6", "x"], ["A", "A", "A", "B", "B", "B", "B"]);
    if (g.tooMany) throw new Error();
    expect(g.excluded).toBe(1);
    expect(g.f).toBeCloseTo(13.5, 6);
    expect(g.p).toBeCloseTo(0.0213, 3);
    expect(g.etaSquared).toBeCloseTo(13.5 / 17.5, 6);
  });
});
