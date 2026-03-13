jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(),
  TaskType: { RETRIEVAL_QUERY: 'RETRIEVAL_QUERY', RETRIEVAL_DOCUMENT: 'RETRIEVAL_DOCUMENT' },
}));

describe('Vector Conversion System Tests', () => {
  let ai_helper;
  let GoogleGenerativeAI;
  let mockEmbedContent;
  let mockGetGenerativeModel;

  beforeEach(() => {
    jest.resetModules();
    ({ GoogleGenerativeAI } = require('@google/generative-ai'));

    mockEmbedContent = jest.fn().mockResolvedValue({
      embedding: { values: new Array(768).fill(0.1) }
    });

    mockGetGenerativeModel = jest.fn(({ model }) => {
      if (model === 'gemini-embedding-001') {
        return { embedContent: mockEmbedContent };
      }
      return { generateContent: jest.fn().mockResolvedValue({ response: { text: () => '' } }) };
    });

    GoogleGenerativeAI.mockImplementation(() => ({ getGenerativeModel: mockGetGenerativeModel }));

    ai_helper = require('../helpers/ai_helper');
  });

  test('Vector generation with all fields', async () => {
    const productInfo = {
      name: 'iPhone 15 Pro',
      description: 'The latest iPhone with titanium body.',
      categoryName: 'Smartphones',
      price: 999,
      genderAgeCategory: 'unisex',
      colors: ['Natural Titanium', 'Blue Titanium'],
      sizes: ['128GB', '256GB']
    };

    const result = await ai_helper.generateVectorDataForAddProduct(productInfo);

    expect(result).not.toBeNull();
    expect(result.vector_data).toHaveLength(768);
    expect(mockEmbedContent).toHaveBeenCalled();

    const callArgs = mockEmbedContent.mock.calls[0][0].content.parts[0].text;
    expect(callArgs).toContain('Name: iPhone 15 Pro');
    expect(callArgs).toContain('Description: The latest iPhone with titanium body');
    expect(callArgs).toContain('Category: Smartphones');
    expect(callArgs).toContain('Price: 999');
    expect(callArgs).toContain('Target Audience: unisex');
    expect(callArgs).toContain('Colors: Natural Titanium, Blue Titanium');
    expect(callArgs).toContain('Sizes: 128GB, 256GB');
  });

  test('Edge case: Empty fields', async () => {
    const productInfo = {
      name: 'Empty Product',
      description: '',
      categoryName: '',
      price: 0
    };

    const result = await ai_helper.generateVectorDataForAddProduct(productInfo);

    expect(result).not.toBeNull();
    expect(result.vector_data).toHaveLength(768);
    const callArgs = mockEmbedContent.mock.calls[0][0].content.parts[0].text;
    expect(callArgs).toContain('Name: Empty Product');
    expect(callArgs).not.toContain('Description:');
    expect(callArgs).not.toContain('Category:');
  });

  test('Edge case: Special characters', async () => {
    const productInfo = {
      name: 'Spec!@#$%^&*()_+ial Product',
      description: 'Description with \n new lines and \t tabs.'
    };

    const result = await ai_helper.generateVectorDataForAddProduct(productInfo);

    expect(result).not.toBeNull();
    expect(result.vector_data).toHaveLength(768);
    const callArgs = mockEmbedContent.mock.calls[0][0].content.parts[0].text;
    expect(callArgs).toContain('Spec!@#$%^&*()_+ial Product');
  });

  test('Edge case: Multilingual content', async () => {
    const productInfo = {
      name: 'မြန်မာ ထုတ်ကုန်',
      description: 'Japanese: 日本の製品, Chinese: 中国产品'
    };

    const result = await ai_helper.generateVectorDataForAddProduct(productInfo);

    expect(result).not.toBeNull();
    expect(result.vector_data).toHaveLength(768);
    const callArgs = mockEmbedContent.mock.calls[0][0].content.parts[0].text;
    expect(callArgs).toContain('မြန်မာ ထုတ်ကုန်');
    expect(callArgs).toContain('日本の製品');
  });

  test('Performance benchmark: Conversion speed', async () => {
    const productInfo = {
      name: 'Performance Test Product',
      description: 'A product for performance benchmarking.'
    };

    const start = Date.now();
    await ai_helper.generateVectorDataForAddProduct(productInfo);
    const end = Date.now();

    const duration = end - start;
    console.log(`Vector conversion took ${duration}ms`);
    
    expect(duration).toBeLessThan(100); 
  });

  test('Data integrity: Handles null input', async () => {
    const result = await ai_helper.generateVectorDataForAddProduct(null);
    expect(result).toBeNull();
  });
});
