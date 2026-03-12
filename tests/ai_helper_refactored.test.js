const { classifyIntent, generateVectorDataForSearch, generateVectorDataForAddProduct } = require('../helpers/ai_helper');
const { GoogleGenerativeAI } = require('@google/generative-ai');

jest.mock('@google/generative-ai');

describe('AI Helper Refactored Tests', () => {
  let mockGenerateContent;
  let mockEmbedContent;
  let mockGetGenerativeModel;

  beforeEach(() => {
    mockGenerateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({
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

    const mockModel = {
      generateContent: mockGenerateContent,
      embedContent: mockEmbedContent
    };

    mockGetGenerativeModel = jest.fn().mockReturnValue(mockModel);

    GoogleGenerativeAI.prototype.getGenerativeModel = mockGetGenerativeModel;
    
    // Ensure the constructor returns an object with getGenerativeModel
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel
    }));
  });

  test('classifyIntent returns correct structure', async () => {
    const result = await classifyIntent("find a laptop");

    expect(result).toHaveProperty('is_product_search', true);
    expect(result).toHaveProperty('search_query', 'laptop');
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
