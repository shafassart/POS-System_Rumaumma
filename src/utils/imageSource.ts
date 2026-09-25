export const isImageSource = (value: string): boolean =>
  value.startsWith("data:image/") || /^https?:\/\//i.test(value);
