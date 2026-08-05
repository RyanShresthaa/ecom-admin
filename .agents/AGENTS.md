# Project Rules

## Responsive Design Guidelines (Large Screens / Desktop)
For `lg` screen sizes and above (`lg:`):
- Use `vw` units for text sizes (e.g., `lg:text-[0.75vw]`, `lg:text-[0.85vw]`, `lg:text-[2.4vw]`, `lg:text-[3.2vw]`), paddings, margins, gaps, button dimensions, and rounded borders.
- **Do NOT** constrain main containers or text blocks with fixed `max-w-*` classes (such as `max-w-4xl`, `max-w-6xl`, `max-w-7xl`, `max-w-xl`, `container-custom`, etc.).
- Use `w-full lg:max-w-none` and fluid padding `px-4 sm:px-8 lg:px-[5vw]` on outer section containers so elements scale fluidly across wide viewports and zoom levels without shrinking into narrow boxes.
