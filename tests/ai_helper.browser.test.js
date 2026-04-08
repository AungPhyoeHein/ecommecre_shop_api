describe('ai_helper in browser-like (jsdom) environment', () => {
  test('module loads and can execute generateFinalResponse with mocked SDK', async () => {
    jest.resetModules();

    const GoogleGenerativeAI = function () {};
    GoogleGenerativeAI.prototype.getGenerativeModel = () => ({
      generateContent: async () => ({
        response: { text: () => ' browser answer ' },
      }),
    });

    jest.doMock('@google/generative-ai', () => ({ GoogleGenerativeAI }));
    const ai_helper = require('../helpers/ai_helper');

    const result = await ai_helper.generateFinalResponse({ userPrompt: 'Q', context: 'C' });
    expect(result).toBe('browser answer');
  });
});

