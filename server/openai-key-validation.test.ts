/**
 * Teste de validação da chave OPENAI_API_KEY e do modelo GPT-4.1
 *
 * Este teste verifica:
 * 1. A variável OPENAI_API_KEY está configurada no ambiente
 * 2. A chave é válida e aceita pela API da OpenAI
 * 3. O modelo gpt-4.1 está acessível com a chave fornecida
 * 4. A resposta retorna no formato esperado pelo invokeLLM
 */
import { describe, it, expect } from "vitest";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

describe("OpenAI API Key Validation", () => {
  it("deve ter OPENAI_API_KEY configurada no ambiente", () => {
    const key = process.env.OPENAI_API_KEY;
    expect(key, "OPENAI_API_KEY não está configurada").toBeTruthy();
    expect(key?.startsWith("sk-"), "OPENAI_API_KEY deve começar com 'sk-'").toBe(true);
  });

  it("deve conseguir chamar o modelo gpt-4.1 com sucesso", async () => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OPENAI_API_KEY não configurada — configure via webdev_request_secrets");
    }

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: "Você é um assistente de compliance tributário brasileiro. Responda de forma muito breve.",
          },
          {
            role: "user",
            content: "Qual é a sigla do Imposto sobre Bens e Serviços criado pela Reforma Tributária brasileira?",
          },
        ],
        max_tokens: 50,
      }),
    });

    expect(response.ok, `API retornou erro: ${response.status} ${response.statusText}`).toBe(true);

    const data = await response.json() as {
      id: string;
      model: string;
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: { total_tokens: number };
    };

    // Verifica estrutura da resposta
    expect(data.id).toBeTruthy();
    expect(data.model).toContain("gpt-4");
    expect(data.choices).toHaveLength(1);
    expect(data.choices[0].message.content).toBeTruthy();
    expect(data.choices[0].finish_reason).toBe("stop");

    // Verifica que a resposta contém "IBS" (resposta correta)
    const answer = data.choices[0].message.content.toUpperCase();
    expect(answer, `Resposta inesperada: "${data.choices[0].message.content}"`).toContain("IBS");

    console.log(`✅ GPT-4.1 respondeu: "${data.choices[0].message.content}"`);
    console.log(`   Tokens usados: ${data.usage?.total_tokens}`);
    console.log(`   Modelo retornado: ${data.model}`);
  }, 30_000); // timeout de 30s para chamada real à API
});
