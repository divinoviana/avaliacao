import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question } from "../types";

export const generateWrittenExamQuestions = async (
  subject: string, 
  bimester: string, 
  difficulty: string,
  topics?: string
): Promise<Question[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contentFocus = topics 
    ? `Foque EXCLUSIVAMENTE nestes tópicos definidos pelo professor: "${topics}".` 
    : `Aborde o currículo padrão do "${bimester}".`;

  // Prompt optimized for ENEM Style Multiple Choice
  const prompt = `
    Atue como um elaborador sênior de questões do INEP (ENEM).
    Gere 5 questões de múltipla escolha sobre: "${subject}".
    ${contentFocus}
    Nível: ${difficulty}.

    Estilo das questões (Modelo ENEM/TRI):
    1. Cada questão DEVE ter um Texto Base (citação, notícia, gráfico descrito ou trecho de livro).
    2. O enunciado deve exigir interpretação do texto base e conhecimento do conteúdo.
    3. Forneça 5 alternativas (A, B, C, D, E).
    4. Indique o índice da resposta correta (0 a 4).

    Retorne APENAS o JSON.
  `;

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER },
        text: { 
          type: Type.STRING, 
          description: "O texto completo: Texto Base + Enunciado da Pergunta." 
        },
        type: { type: Type.STRING, enum: ['multiple_choice'] },
        options: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Lista de 5 alternativas de resposta."
        },
        correctIndex: {
          type: Type.INTEGER,
          description: "O índice (0-4) da alternativa correta."
        },
        explanation: {
          type: Type.STRING,
          description: "Breve explicação do porquê a resposta está correta."
        }
      },
      required: ['id', 'text', 'type', 'options', 'correctIndex', 'explanation']
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "Você é um banco de questões dinâmico do ENEM. Gere questões inéditas a cada chamada."
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as Question[];
  } catch (error) {
    console.error("Failed to generate questions", error);
    throw error;
  }
};

// No longer needed for grading MCQs locally, but kept for Oral Exam or essay fallback
export const evaluateWrittenExam = async (subject: string, bimester: string, questions: Question[], answers: {questionId: number, answer: string}[]) => {
   // Legacy function kept for compatibility if needed later, 
   // but MCQ grading is now done client-side for determinism.
   return { grade: 0, feedback: "N/A" };
}