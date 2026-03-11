const express = require('express');
const request = require('supertest');

describe('ai_helper end-to-end journey (assistant search)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('user searches a product and receives products response', async () => {
    const generateVectorDataForSearch = jest.fn().mockResolvedValue({
      is_product_search: true,
      ask_about_us: false,
      telling_other_question: false,
      vector_data: new Array(768).fill(0.5),
      response_text: 'Searching...',
    });

    jest.doMock('../helpers/ai_helper.js', () => ({
      generateVectorDataForSearch,
      generateFinalResponse: jest.fn(),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    const aggregate = jest.fn().mockResolvedValue([{ name: 'MacBook', score: 0.9 }]);
    jest.doMock('../models', () => ({
      Product: { find: jest.fn(), aggregate },
      Faq: { aggregate: jest.fn() },
    }));

    const app = express();
    app.use('/assistant', require('../routers/assistantRouter'));

    const res = await request(app).get('/assistant?message=macbook').expect(200);
    expect(generateVectorDataForSearch).toHaveBeenCalledWith({ prompt: 'macbook' });
    expect(res.body.type).toBe('products');
    expect(res.body.data).toHaveLength(1);
  });
});

