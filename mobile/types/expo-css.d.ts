// Committed type declarations for Expo's ambient modules.
//
// `mobile/expo-env.d.ts` is intentionally git-ignored (Expo regenerates it on
// `expo start` / `expo prebuild`) and only contains:
//     /// <reference types="expo/types" />
// Because it never reaches a clean checkout, `tsc --noEmit` (e.g. in CI) would
// otherwise fail on CSS/asset imports such as `./x.module.css` and
// `@/global.css`. This committed reference keeps a fresh clone type-checkable
// while the generated `expo-env.d.ts` remains ignored, exactly as before.
/// <reference types="expo/types" />
