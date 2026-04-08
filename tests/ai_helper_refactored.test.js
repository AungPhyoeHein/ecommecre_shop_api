jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(),
  TaskType: { RETRIEVAL_QUERY: 'RETRIEVAL_QUERY', RETRIEVAL_DOCUMENT: 'RETRIEVAL_DOCUMENT' },
}));

describe('AI Helper Refactored Tests', () => {
  let classifyIntent;
  let generateVectorDataForSearch;
  let generateVectorDataForAddProduct;
  let GoogleGenerativeAI;
  let mockGenerateContent;
  let mockEmbedContent;
  let mockGetGenerativeModel;

  beforeEach(() => {
    jest.resetModules();

    ({ GoogleGenerativeAI } = require('@google/generative-ai'));

    mockGenerateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          is_recommend_request: false,
          is_product_search: true,
          ask_about_us: false,
          telling_other_question: false,
          search_query: "laptop",
          response: "Searching for your items now..."
        })
      }
    });

    mockEmbedContent = jest.fn().mockResolvedValue({
      embedding: { values: new Array(768).fill(0.1) }
    });

    mockGetGenerativeModel = jest.fn(({ model }) => {
      if (model === 'gemini-embedding-001') {
        return { embedContent: mockEmbedContent };
      }
      return {
        generateContent: async (prompt) => {
          const promptText = typeof prompt === 'string' ? prompt : '';
          if (promptText.includes('Analyze the user input')) {
            return {
              response: {
                text: () =>
                  JSON.stringify({
                    is_recommend_request: false,
                    is_product_search: true,
                    ask_about_us: false,
                    telling_other_question: false,
                    search_query: 'laptop',
                  }),
              },
            };
          }

          if (promptText.includes('Return ONLY a JSON object')) {
            return { response: { text: () => JSON.stringify({ response: 'Searching for your items now...' }) } };
          }

          return mockGenerateContent(prompt);
        },
      };
    });

    GoogleGenerativeAI.mockImplementation(() => ({ getGenerativeModel: mockGetGenerativeModel }));

    ({ classifyIntent, generateVectorDataForSearch, generateVectorDataForAddProduct } = require('../helpers/ai_helper'));
  });

  test('classifyIntent returns correct structure', async () => {
    const result = await classifyIntent("find a laptop");

    expect(result).toHaveProperty('is_product_search', true);
    expect(result).toHaveProperty('search_query', 'laptop');
    expect(result).toHaveProperty('is_recommend_request');
    expect(result).toHaveProperty('response_text');
  });

  test('generateVectorDataForSearch returns vector data', async () => {
    const result = await generateVectorDataForSearch({ prompt: "laptop" });

    expect(result).not.toBeNull();
    expect(result.vector_data).toHaveLength(768);
  });

  test('generateVectorDataForAddProduct returns vector data', async () => {
    const productInfo = { name: "MacBook Pro", description: "Powerful laptop" };
    const result = await generateVectorDataForAddProduct(productInfo);

    expect(result).not.toBeNull();
    expect(result.vector_data).toHaveLength(768);
  });
});
