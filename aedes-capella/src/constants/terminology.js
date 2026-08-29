/*
 * The user-visible name for one number, defined once.
 *
 * `candidates` in the database is the count of LIVE_ACCEPT rows: the S3's
 * decisions that its Aedes gate and the three-of-five rule both passed. That
 * one number had grown five names across ten screens ("Possible Aedes aegypti
 * matches", "Possible mosquitoes", "Likely Aedes Mosquito", "possible
 * matches", "candidates"), and two of them claimed more than the measurement
 * supports: grouped Aedes precision is 16.67 percent, so this is a signal the
 * sensor matched, not a confirmed mosquito and not a confirmed species.
 *
 * Imported rather than retyped so the next screen cannot invent a sixth name.
 * The caveat travels with the term for the same reason: a count shown without
 * it reads as a confirmed finding.
 *
 * "Candidate" survives in column names, variable names and tests. It must not
 * appear in any string a reader sees.
 */
export const DETECTION_TERM = Object.freeze({
  plural: 'Possible Aedes detections',
  singular: 'Possible Aedes detection',
  /* For map popups and chart axes, where the full phrase wraps. */
  short: 'Possible Aedes',
  /*
   * Mid-sentence forms, spelled out rather than derived with toLowerCase:
   * Aedes is a genus name and keeps its capital wherever it appears.
   */
  inlinePlural: 'possible Aedes detections',
  inlineSingular: 'possible Aedes detection',
  caveat: 'Sounds the sensor matched to Aedes. Not checked by a person.',
});

/*
 * The overline and table-header style is uppercase, and CSS text-transform is
 * not available inside a chart's <text> node or a popup built by hand. Doing
 * the case change here keeps one spelling in the source.
 */
export const DETECTION_TERM_UPPER = Object.freeze({
  plural: DETECTION_TERM.plural.toUpperCase(),
  short: DETECTION_TERM.short.toUpperCase(),
});
