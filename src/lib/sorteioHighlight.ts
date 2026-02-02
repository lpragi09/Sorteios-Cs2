export const HIGHLIGHT_OPTIONS = [
  {
    key: "yellow",
    label: "Amarelo",
    pill: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
    dot: "bg-yellow-500",
  },
  {
    key: "green",
    label: "Verde",
    pill: "bg-green-500/15 text-green-300 border-green-500/25",
    dot: "bg-green-500",
  },
  {
    key: "blue",
    label: "Azul",
    pill: "bg-blue-500/15 text-blue-300 border-blue-500/25",
    dot: "bg-blue-500",
  },
  {
    key: "purple",
    label: "Roxo",
    pill: "bg-purple-500/15 text-purple-300 border-purple-500/25",
    dot: "bg-purple-500",
  },
  {
    key: "red",
    label: "Vermelho",
    pill: "bg-red-500/15 text-red-300 border-red-500/25",
    dot: "bg-red-500",
  },
  {
    key: "orange",
    label: "Laranja",
    pill: "bg-orange-500/15 text-orange-300 border-orange-500/25",
    dot: "bg-orange-500",
  },
  {
    key: "pink",
    label: "Rosa",
    pill: "bg-pink-500/15 text-pink-300 border-pink-500/25",
    dot: "bg-pink-500",
  },
] as const;

export type HighlightColorKey = (typeof HIGHLIGHT_OPTIONS)[number]["key"];

export function getHighlightOption(key?: string | null) {
  return (
    HIGHLIGHT_OPTIONS.find((o) => o.key === key) ??
    HIGHLIGHT_OPTIONS[0]
  );
}

