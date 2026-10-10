export default function Loading() {
  // Navigation overlay is handled by NavigationLoader in the root layout.
  // Keep this empty so route suspense does not push a logo into page content.
  return null;
}
