/**
 * Expo Config Plugin — adds PDF intent-filter directly to AndroidManifest.xml.
 * This bypasses any Expo parsing quirks with the app.json intentFilters field.
 */
const { withAndroidManifest } = require("@expo/config-plugins");

function addPdfIntentFilter(androidManifest) {
  const { manifest } = androidManifest;
  const app = manifest.application?.[0];
  if (!app || !Array.isArray(app.activity)) return androidManifest;

  // Find MainActivity (handles both .MainActivity and fully-qualified names)
  const mainActivity = app.activity.find((a) => {
    const name = a.$?.["android:name"] ?? "";
    return name === ".MainActivity" || name.endsWith(".MainActivity");
  });

  if (!mainActivity) {
    console.warn("[withPdfIntentFilter] MainActivity not found in AndroidManifest");
    return androidManifest;
  }

  // Android 12+ requires android:exported="true" on any activity with intent-filters
  mainActivity.$["android:exported"] = "true";

  if (!Array.isArray(mainActivity["intent-filter"])) {
    mainActivity["intent-filter"] = [];
  }

  // Remove any previous PDF VIEW filter (idempotent re-runs)
  mainActivity["intent-filter"] = mainActivity["intent-filter"].filter((f) => {
    const isView = f.action?.some(
      (a) => a.$?.["android:name"] === "android.intent.action.VIEW"
    );
    const isPdf = f.data?.some(
      (d) => d.$?.["android:mimeType"] === "application/pdf"
    );
    return !(isView && isPdf);
  });

  // Add the PDF intent-filter with explicit URI schemes
  // Using separate <data> elements so Android matches file://, content://, http://, https://
  mainActivity["intent-filter"].push({
    action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
    category: [
      { $: { "android:name": "android.intent.category.DEFAULT" } },
      { $: { "android:name": "android.intent.category.BROWSABLE" } },
    ],
    data: [
      {
        $: {
          "android:scheme": "file",
          "android:mimeType": "application/pdf",
        },
      },
      {
        $: {
          "android:scheme": "content",
          "android:mimeType": "application/pdf",
        },
      },
      {
        $: {
          "android:scheme": "http",
          "android:mimeType": "application/pdf",
        },
      },
      {
        $: {
          "android:scheme": "https",
          "android:mimeType": "application/pdf",
        },
      },
    ],
  });

  console.log("[withPdfIntentFilter] PDF intent-filter added to MainActivity");
  return androidManifest;
}

module.exports = function withPdfIntentFilter(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults = addPdfIntentFilter(config.modResults);
    return config;
  });
};
