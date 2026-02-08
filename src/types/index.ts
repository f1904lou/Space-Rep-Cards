export type CardType = "factual" | "conceptual" | "procedural" | "salience";


export interface Source {
  id: string;
  title: string;
  content: string;
  created_at: number;
  tags?: string[];
}

export interface Card {
  id: string;
  source_id?: string;
  type: CardType;
  topic: string;
  question: string;
  answer: string;
  source_quote: string;
  inference: boolean;
  created_at: number;
  provider?: string;
  model?: string;
}
