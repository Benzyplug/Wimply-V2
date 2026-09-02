export interface GameSlide<T = unknown> {
  content: T;
  delay: number;
}

export function buildGameSlides<T>(slides: GameSlide<T>[]): GameSlide<T>[] {
  return slides.map((slide) => ({ ...slide, delay: Math.max(0, slide.delay) }));
}

export async function playGameSlides<T>(
  slides: GameSlide<T>[],
  edit: (content: T) => Promise<void>,
  options: { stopOnError?: boolean } = {}
): Promise<void> {
  const sequence = buildGameSlides(slides);
  for (let index = 0; index < sequence.length; index += 1) {
    const slide = sequence[index];
    try {
      await edit(slide.content);
    } catch (error) {
      if (options.stopOnError ?? true) throw error;
    }
    if (slide.delay > 0 && index < sequence.length - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, slide.delay));
    }
  }
}
