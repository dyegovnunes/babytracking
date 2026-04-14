/**
 * Public API for the Tracker feature.
 *
 * Currently consumed only by App.tsx, which imports TrackerPage
 * directly (eagerly — TrackerPage is the first-paint route and must
 * not go through lazy loading).
 *
 * This feature has no exported hooks or helpers yet — everything
 * lives inside the feature. It exists to establish the feature
 * boundary and make it obvious where tracker/home code lives.
 */

export {}
