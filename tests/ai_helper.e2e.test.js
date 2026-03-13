const express = require('express');
const request = require('supertest');

describe('ai_helper end-to-end journey (assistant search)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('stripe', () => () => ({}));
  });

  test('user searches a product and receives products response', async () => {
    const generateVectorDataForSearch = jest.fn().mockResolvedValue({
      vector_data: new Array(768).fill(0.5),
    });

    jest.doMock('../helpers/ai_helper.js', () => ({
      classifyIntent: jest.fn().mockResolvedValue({
        is_recommend_request: false,
        is_product_search: true,
        ask_about_us: false,
        telling_other_question: false,
        search_query: 'macbook',
        response_text: 'Searching...',
      }),
      generateVectorDataForSearch,
      generateFinalResponse: jest.fn(),
      generateNotFoundResponse: jest.fn(),
      generateProductFoundResponse: jest.fn().mockResolvedValue('Found products'),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    const aggregate = jest.fn().mockResolvedValue([
      { _id: '1', name: 'MacBook', score: 0.9, price: 1, description: 'd', sizes: [], image: 'i', rating: 5 },
    ]);
    jest.doMock('../models', () => ({
      Product: { find: jest.fn(() => ({
        sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) })
      })), aggregate },
      Faq: { aggregate: jest.fn() },
      UnansweredQuestion: { create: jest.fn() },
      ChatHistory: { findOne: jest.fn() },
    }));

    const app = express();
    app.use('/assistant', require('../routers/assistantRouter'));

    const res = await request(app).get('/assistant?message=macbook').expect(200);
    expect(res.body.type).toBe('products');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.message).toBe('Found products');
  });
});

