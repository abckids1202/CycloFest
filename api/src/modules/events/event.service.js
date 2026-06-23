import { databaseConfigured } from "../../database/pool.js";
import { currentEvent } from "../../event-data.js";
import { findCurrentEvent } from "./event.repository.js";

const supportedLanguages = new Set(["id", "en"]);

function selectLanguage(requestedLanguage, event) {
  if (supportedLanguages.has(requestedLanguage)) return requestedLanguage;
  return event.defaultLanguage ?? "id";
}

function localizeEvent(event, requestedLanguage) {
  const language = selectLanguage(requestedLanguage, event);
  const translation =
    event.translations?.[language] ??
    event.translations?.[event.defaultLanguage] ??
    {};

  function localizeItems(items = []) {
    return items.map((item) => {
      const itemTranslation =
        item.translations?.[language] ??
        item.translations?.[event.defaultLanguage] ??
        {};

      return {
        ...item,
        ...itemTranslation,
        translations: undefined
      };
    });
  }

  return {
    language,
    data: {
      ...event,
      ...translation,
      language,
      translations: undefined,
      categories: localizeItems(event.categories),
      schedule: localizeItems(event.schedule),
      checkpoints: localizeItems(event.checkpoints),
      venues: localizeItems(event.venues),
      activities: localizeItems(event.activities),
      sponsors: localizeItems(event.sponsors)
    }
  };
}

export async function getCurrentEvent(requestedLanguage) {
  if (!databaseConfigured) {
    return { ...localizeEvent(currentEvent, requestedLanguage), source: "static" };
  }

  const event = await findCurrentEvent();
  if (!event) {
    const error = new Error("No published event was found.");
    error.statusCode = 404;
    throw error;
  }

  return { ...localizeEvent(event, requestedLanguage), source: "postgres" };
}