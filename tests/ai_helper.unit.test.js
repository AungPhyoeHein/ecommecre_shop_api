const loadAiHelper = ({
  classificationText,
  chatText,
  embedValues,
  finalResponseText,
  notFoundText,
  productFoundText,
  throwOnClassification,
  throwOnChat,
  throwOnEmbed,
  throwOnFinal,
  throwOnNotFound,
  throwOnProductFound,
}) => {
  jest.resetModules();

  const GoogleGenerativeAI = function () {};
  GoogleGenerativeAI.prototype.getGenerativeModel = ({ model }) => {
    if (model === 'gemini-embedding-001') {
      return {
        embedContent: async () => {
          if (throwOnEmbed) throw throwOnEmbed;
          return {
            embedding: {
              values: embedValues ?? new Array(768).fill(0.123),
            },
          };
        },
      };
    }

    return {
      generateContent: async (prompt) => {
        const promptText = typeof prompt === 'string' ? prompt : '';
        const isClassification = promptText.includes('Analyze the user input');
        const isChat = promptText.includes('Return ONLY a JSON object');
        const isFinal = promptText.includes('Context:') && promptText.includes('User Question:');
        const isNotFound = promptText.includes("couldn't find in our records");
        const isProductFound = promptText.includes('We found the following products that match their search.');

        if (isClassification) {
          if (throwOnClassification) throw throwOnClassification;
          return { response: { text: () => classificationText } };
        }

        if (isFinal) {
          if (throwOnFinal) throw throwOnFinal;
          return { response: { text: () => finalResponseText ?? ' final answer ' } };
        }

        if (isNotFound) {
          if (throwOnNotFound) throw throwOnNotFound;
          return { response: { text: () => notFoundText ?? ' not found ' } };
        }

        if (isProductFound) {
          if (throwOnProductFound) throw throwOnProductFound;
          return { response: { text: () => productFoundText ?? ' products found ' } };
        }

        if (isChat) {
          if (throwOnChat) throw throwOnChat;
          return { response: { text: () => chatText } };
        }

        return { response: { text: () => '' } };
      },
    };
  };

  jest.doMock('@google/generative-ai', () => ({
    GoogleGenerativeAI,
    TaskType: { RETRIEVAL_QUERY: 'RETRIEVAL_QUERY', RETRIEVAL_DOCUMENT: 'RETRIEVAL_DOCUMENT' },
  }));
  return require('../helpers/ai_helper');
};

describe('ai_helper unit tests', () => {
  test('classifyIntent: parses intent and response_text', async () => {
    const ai_helper = loadAiHelper({
      classificationText: '```json{"is_recommend_request":false,"is_product_search":true,"ask_about_us":false,"telling_other_question":false,"search_query":"macbook"}```',
      chatText: '```json{"response":"Searching now"} ```',
    });

    const result = await ai_helper.classifyIntent('find macbook');
    expect(result.is_product_search).toBe(true);
    expect(result.ask_about_us).toBe(false);
    expect(result.telling_other_question).toBe(false);
    expect(result.is_recommend_request).toBe(false);
    expect(result.search_query).toBe('macbook');
    expect(result.response_text).toBe('Searching now');
  });

  test('classifyIntent: invalid JSON returns fallback structure', async () => {
    const ai_helper = loadAiHelper({
      classificationText: 'not-json',
      chatText: 'not-json',
    });

    const result = await ai_helper.classifyIntent('x');
    expect(result.is_product_search).toBe(false);
    expect(result.ask_about_us).toBe(false);
    expect(result.telling_other_question).toBe(true);
    expect(result.is_recommend_request).toBe(false);
    expect(typeof result.response_text).toBe('string');
  });

  test('generateVectorDataForSearch: returns embedding values', async () => {
    const ai_helper = loadAiHelper({
      embedValues: new Array(768).fill(0.1),
      classificationText: '',
      chatText: '',
    });

    const result = await ai_helper.generateVectorDataForSearch({ prompt: 'macbook' });
    expect(result.vector_data).toHaveLength(768);
  });

  test('generateVectorDataForSearch: missing prompt returns null', async () => {
    const ai_helper = loadAiHelper({ classificationText: '', chatText: '' });
    const result = await ai_helper.generateVectorDataForSearch({ prompt: '' });
    expect(result).toBeNull();
  });

  test('generateFinalResponse: trims and returns AI response', async () => {
    const ai_helper = loadAiHelper({
      classificationText: '',
      chatText: '',
      finalResponseText: '  Answer with spaces  ',
    });

    const result = await ai_helper.generateFinalResponse({ userPrompt: 'Q', context: 'C' });
    expect(result).toBe('Answer with spaces');
  });

  test('generateFinalResponse: handles errors with fallback message', async () => {
    const ai_helper = loadAiHelper({
      throwOnFinal: new Error('final error'),
      classificationText: '',
      chatText: '',
    });

    const result = await ai_helper.generateFinalResponse({ userPrompt: 'Q', context: 'C' });
    expect(result).toContain("I'm sorry");
  });

  test('generateNotFoundResponse: trims and returns response', async () => {
    const ai_helper = loadAiHelper({
      classificationText: '',
      chatText: '',
      notFoundText: '  Not available  ',
    });

    const result = await ai_helper.generateNotFoundResponse({ userPrompt: 'x', type: 'products' });
    expect(result).toBe('Not available');
  });

  test('generateNotFoundResponse: errors return fallback message', async () => {
    const ai_helper = loadAiHelper({
      classificationText: '',
      chatText: '',
      throwOnNotFound: new Error('boom'),
    });

    const result = await ai_helper.generateNotFoundResponse({ userPrompt: 'x', type: 'products' });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('generateProductFoundResponse: trims and returns response', async () => {
    const ai_helper = loadAiHelper({
      classificationText: '',
      chatText: '',
      productFoundText: '  Great picks  ',
    });

    const result = await ai_helper.generateProductFoundResponse({
      userPrompt: 'x',
      products: [{ name: 'P', price: 1, description: 'd', sizes: ['S'] }],
    });
    expect(result).toBe('Great picks');
  });

  test('generateProductFoundResponse: errors return fallback message', async () => {
    const ai_helper = loadAiHelper({
      classificationText: '',
      chatText: '',
      throwOnProductFound: new Error('boom'),
    });

    const result = await ai_helper.generateProductFoundResponse({
      userPrompt: 'x',
      products: [{ name: 'P', price: 1, description: 'd', sizes: ['S'] }],
    });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('generateVectorDataForAddProduct: null input returns null', async () => {
    const ai_helper = loadAiHelper({ classificationText: '', chatText: '' });
    const result = await ai_helper.generateVectorDataForAddProduct(null);
    expect(result).toBeNull();
  });

  test('generateVectorDataForAddProduct: includes only non-empty fields', async () => {
    const embedSpy = jest.fn();

    jest.resetModules();
    const GoogleGenerativeAI = function () {};
    GoogleGenerativeAI.prototype.getGenerativeModel = ({ model }) => {
      if (model === 'gemini-embedding-001') {
        return {
          embedContent: async (payload) => {
            embedSpy(payload);
            return { embedding: { values: new Array(768).fill(0.33) } };
          },
        };
      }
      return { generateContent: async () => ({ response: { text: () => '' } }) };
    };
    jest.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI,
      TaskType: { RETRIEVAL_QUERY: 'RETRIEVAL_QUERY', RETRIEVAL_DOCUMENT: 'RETRIEVAL_DOCUMENT' },
    }));
    const ai_helper = require('../helpers/ai_helper');

    const result = await ai_helper.generateVectorDataForAddProduct({
      name: 'Product',
      description: '',
      categoryName: 'Cat',
      price: 10,
      colors: [],
      sizes: ['S'],
    });

    expect(result.vector_data).toHaveLength(768);
    const embeddedText = embedSpy.mock.calls[0][0].content.parts[0].text;
    expect(embeddedText).toContain('Name: Product');
    expect(embeddedText).toContain('Category: Cat');
    expect(embeddedText).toContain('Price: 10');
    expect(embeddedText).toContain('Sizes: S');
    expect(embeddedText).not.toContain('Description:');
    expect(embeddedText).not.toContain('Colors:');
  });

  test('generateVectorDataForAddProduct: empty object returns empty vector', async () => {
    const embedSpy = jest.fn();

    jest.resetModules();
    const GoogleGenerativeAI = function () {};
    GoogleGenerativeAI.prototype.getGenerativeModel = ({ model }) => {
      if (model === 'gemini-embedding-001') {
        return { embedContent: async (payload) => embedSpy(payload) };
      }
      return { generateContent: async () => ({ response: { text: () => '' } }) };
    };
    jest.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI,
      TaskType: { RETRIEVAL_QUERY: 'RETRIEVAL_QUERY', RETRIEVAL_DOCUMENT: 'RETRIEVAL_DOCUMENT' },
    }));
    const ai_helper = require('../helpers/ai_helper');

    const result = await ai_helper.generateVectorDataForAddProduct({});
    expect(result).toEqual({ vector_data: [] });
    expect(embedSpy).not.toHaveBeenCalled();
  });

  test('generateVectorDataForAddProduct: embed errors return null', async () => {
    const ai_helper = loadAiHelper({
      classificationText: '',
      chatText: '',
      throwOnEmbed: new Error('embed fail'),
    });

    const result = await ai_helper.generateVectorDataForAddProduct({ name: 'X' });
    expect(result).toBeNull();
  });
});
