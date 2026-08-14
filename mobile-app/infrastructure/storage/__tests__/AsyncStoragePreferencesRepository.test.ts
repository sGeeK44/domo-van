import { beforeEach, describe, expect, it } from "vitest";
// The Map-backed stub the vitest alias substitutes for the native store.
import { __store } from "@/__mocks__/async-storage";
import { AsyncStoragePreferencesRepository } from "@/infrastructure/storage/AsyncStoragePreferencesRepository";

describe("AsyncStoragePreferencesRepository", () => {
  let repository: AsyncStoragePreferencesRepository;

  beforeEach(() => {
    __store.clear();
    repository = new AsyncStoragePreferencesRepository();
  });

  it("reads nothing out of an empty store", async () => {
    expect(await repository.load()).toEqual({});
  });

  it("reads back what it wrote", async () => {
    await repository.save({ themeMode: "light", language: "en" });

    expect(await repository.load()).toEqual({
      themeMode: "light",
      language: "en",
    });
  });

  it("leaves the other key untouched on a partial save", async () => {
    await repository.save({ themeMode: "dark", language: "en" });
    await repository.save({ themeMode: "light" });

    expect(await repository.load()).toEqual({
      themeMode: "light",
      language: "en",
    });
  });

  it("ignores a stored value it does not recognise", async () => {
    __store.set("preferences.themeMode", "sepia");
    __store.set("preferences.language", "de");

    expect(await repository.load()).toEqual({});
  });

  it("writes under the documented keys", async () => {
    await repository.save({ themeMode: "auto", language: "fr" });

    expect([...__store]).toEqual([
      ["preferences.themeMode", "auto"],
      ["preferences.language", "fr"],
    ]);
  });
});
