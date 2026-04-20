import { describe, it, expect } from "vitest";
import { fileMatchesAccept, mimeMatches } from "../file-accept";

describe("fileMatchesAccept", () => {
  it("matches on exact MIME", () => {
    expect(fileMatchesAccept("image/png", "image/png", "a.png")).toBe(true);
    expect(fileMatchesAccept("image/png", "image/jpeg", "a.jpg")).toBe(false);
  });

  it("matches on MIME wildcards", () => {
    expect(fileMatchesAccept("image/*", "image/png", "a.png")).toBe(true);
    expect(fileMatchesAccept("image/*", "video/mp4", "a.mp4")).toBe(false);
  });

  it("matches on filename extensions", () => {
    expect(fileMatchesAccept(".pdf", "application/pdf", "a.pdf")).toBe(true);
    expect(fileMatchesAccept(".pdf", "application/pdf", "a.txt")).toBe(false);
  });

  it("matches mixed MIME + extension lists", () => {
    expect(fileMatchesAccept("image/*,.pdf", "application/pdf", "a.pdf")).toBe(true);
    expect(fileMatchesAccept("image/*,.pdf", "image/png", "a.png")).toBe(true);
    expect(fileMatchesAccept("image/*,.pdf", "text/plain", "a.txt")).toBe(false);
  });

  it("is case-insensitive on filename extensions", () => {
    expect(fileMatchesAccept(".PDF", "application/pdf", "a.pdf")).toBe(true);
    expect(fileMatchesAccept(".pdf", "application/pdf", "a.PDF")).toBe(true);
  });

  it("treats */* and * as match-anything", () => {
    expect(fileMatchesAccept("*/*", "anything/goes", "a.bin")).toBe(true);
    expect(fileMatchesAccept("*", "anything/goes", "a.bin")).toBe(true);
  });

  it("returns true for empty accept strings (no constraint)", () => {
    expect(fileMatchesAccept("", "image/png", "a.png")).toBe(true);
    expect(fileMatchesAccept("   ", "image/png", "a.png")).toBe(true);
  });
});

describe("mimeMatches", () => {
  it("matches exact MIME", () => {
    expect(mimeMatches("image/png", "image/png")).toBe(true);
  });

  it("matches MIME wildcards", () => {
    expect(mimeMatches("image/png", "image/*")).toBe(true);
    expect(mimeMatches("video/mp4", "image/*")).toBe(false);
  });

  it("ignores bare-extension entries (no filename context)", () => {
    expect(mimeMatches("application/pdf", ".pdf")).toBe(false);
    expect(mimeMatches("image/png", ".heic,image/*")).toBe(true);
  });

  it("allows */* and *", () => {
    expect(mimeMatches("anything/goes", "*/*")).toBe(true);
  });
});
