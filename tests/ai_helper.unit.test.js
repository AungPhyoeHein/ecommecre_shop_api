const loadAiHelper = ({
  classificationText,
  chatText,
  embedValues,
  finalResponseText,
  throwOnClassification,
  throwOnChat,
  throwOnEmbed,
  throwOnFinal,
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
        const isClassification = typeof prompt === 'string' && prompt.includes('Analyze the user input');
        const isFinal = typeof prompt === 'string' && prompt.includes('FAQ Context:');
        const isChat = typeof prompt === 'string' && prompt.includes('Return ONLY a JSON object');

        if (isClassification) {
          if (throwOnClassification) throw throwOnClassification;
          return { response: { text: () => classificationText } };
        }

        if (isFinal) {
          if (throwOnFinal) throw throwOnFinal;
          return { response: { text: () => finalResponseText ?? ' final answer ' } };
        }

        if (isChat) {
          if (throwOnChat) throw throwOnChat;
          return { response: { text: () => chatText } };
        }

        return { response: { text: () => '' } };
      },
    };
  };

  jest.doMock('@google/generative-ai', () => ({ GoogleGenerativeAI }));
  return require('../helpers/ai_helper');
};

describe('ai_helper unit tests', () => {
  test('generateVectorDataForSearch: product search embeds search_query and parses chat JSON', async () => {
    const ai_helper = loadAiHelper({
      classificationText: '```json{"is_product_search":true,"ask_about_us":false,"telling_other_question":false,"search_query":"macbook pro"}```',
      chatText: '```json{"response":"Searching now"} ```',
      embedValues: new Array(768).fill(0.1),
    });

    const result = await ai_helper.generateVectorDataForSearch({ prompt: 'find macbook' });

    expect(result.is_product_search).toBe(true);
    expect(result.ask_about_us).toBe(false);
    expect(result.telling_other_question).toBe(false);
    expect(result.search_query).toBe('macbook pro');
    expect(result.vector_data).toHaveLength(768);
    expect(result.response_text).toBe('Searching now');
  });

  test('generateVectorDataForSearch: about-us embeds prompt when search_query empty', async () => {
    const embedSpy = jest.fn();

    jest.resetModules();
    const GoogleGenerativeAI = function () {};
    GoogleGenerativeAI.prototype.getGenerativeModel = ({ model }) => {
      if (model === 'gemini-embedding-001') {
        return {
          embedContent: async (payload) => {
            embedSpy(payload);
            return { embedding: { values: new Array(768).fill(0.2) } };
          },
        };
      }
      return {
        generateContent: async (prompt) => {
          const isClassification = typeof prompt === 'string' && prompt.includes('Analyze the user input');
          const isChat = typeof prompt === 'string' && prompt.includes('Return ONLY a JSON object');
          if (isClassification) {
            return {
              response: {
                text: () =>
                  '```json{"is_product_search":false,"ask_about_us":true,"telling_other_question":false,"search_query":""}```',
              },
            };
          }
          if (isChat) {
            return { response: { text: () => '{"response":"Checking store info"}' } };
          }
          return { response: { text: () => '' } };
        },
      };
    };
    jest.doMock('@google/generative-ai', () => ({ GoogleGenerativeAI }));
    const ai_helper = require('../helpers/ai_helper');

    const result = await ai_helper.generateVectorDataForSearch({ prompt: 'Where are you located?' });
    expect(result.ask_about_us).toBe(true);
    expect(result.vector_data).toHaveLength(768);
    expect(result.response_text).toBe('Checking store info');

    const embeddedText = embedSpy.mock.calls[0][0].content.parts[0].text;
    expect(embeddedText).toBe('Where are you located?');
  });

  test('generateVectorDataForSearch: other question does not embed and returns chat response', async () => {
    const ai_helper = loadAiHelper({
      classificationText: '{"is_product_search":false,"ask_about_us":false,"telling_other_question":true,"search_query":""}',
      chatText: '{"response":"Hello!"}',
    });

    const result = await ai_helper.generateVectorDataForSearch({ prompt: 'hi' });
    expect(result.telling_other_question).toBe(true);
    expect(result.vector_data).toEqual([]);
    expect(result.response_text).toBe('Hello!');
  });

  test.each([
    ['classification invalid JSON', 'not-json', '{"response":"ok"}'],
    ['chat invalid JSON', '{"is_product_search":false,"ask_about_us":false,"telling_other_question":true,"search_query":""}', 'not-json'],
  ])('generateVectorDataForSearch: handles %s', async (_label, classificationText, chatText) => {
    const ai_helper = loadAiHelper({
      classificationText,
      chatText,
    });

    const result = await ai_helper.generateVectorDataForSearch({ prompt: 'anything' });
    expect(result).toHaveProperty('vector_data');
    expect(result).toHaveProperty('response_text');
    expect(result).toHaveProperty('telling_other_question');
  });

  test('generateVectorDataForSearch: errors return structured fallback', async () => {
    const ai_helper = loadAiHelper({
      throwOnClassification: new Error('boom'),
    });

    const result = await ai_helper.generateVectorDataForSearch({ prompt: 'anything' });
    expect(result.is_product_search).toBe(false);
    expect(result.ask_about_us).toBe(false);
    expect(result.telling_other_question).toBe(true);
    expect(result.vector_data).toEqual([]);
    expect(typeof result.response_text).toBe('string');
  });

  test('generateFinalResponse: trims and returns AI response', async () => {
    const ai_helper = loadAiHelper({
      classificationText: '{"is_product_search":false,"ask_about_us":false,"telling_other_question":true,"search_query":""}',
      chatText: '{"response":"x"}',
      finalResponseText: '  Answer with spaces  ',
    });

    const result = await ai_helper.generateFinalResponse({ userPrompt: 'Q', context: 'C' });
    expect(result).toBe('Answer with spaces');
  });

  test('generateFinalResponse: handles errors with fallback message', async () => {
    const ai_helper = loadAiHelper({
      throwOnFinal: new Error('final error'),
    });

    const result = await ai_helper.generateFinalResponse({ userPrompt: 'Q', context: 'C' });
    expect(result).toContain("I'm sorry");
  });

  test('generateVectorDataForAddProduct: null input returns null', async () => {
    const ai_helper = loadAiHelper({});
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
    jest.doMock('@google/generative-ai', () => ({ GoogleGenerativeAI }));
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

  test('generateVectorDataForAddProduct: empty object returns empty vector and skips embedding', async () => {
    const embedSpy = jest.fn();

    jest.resetModules();
    const GoogleGenerativeAI = function () {};
    GoogleGenerativeAI.prototype.getGenerativeModel = ({ model }) => {
      if (model === 'gemini-embedding-001') {
        return { embedContent: async (payload) => embedSpy(payload) };
      }
      return { generateContent: async () => ({ response: { text: () => '' } }) };
    };
    jest.doMock('@google/generative-ai', () => ({ GoogleGenerativeAI }));
    const ai_helper = require('../helpers/ai_helper');

    const result = await ai_helper.generateVectorDataForAddProduct({});
    expect(result).toEqual({ vector_data: [] });
    expect(embedSpy).not.toHaveBeenCalled();
  });

  test('generateVectorDataForAddProduct: embed errors return null', async () => {
    const ai_helper = loadAiHelper({
      throwOnEmbed: new Error('embed fail'),
    });

    const result = await ai_helper.generateVectorDataForAddProduct({ name: 'X' });
    expect(result).toBeNull();
  });
});

