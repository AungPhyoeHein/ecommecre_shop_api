const express = require('express');
const request = require('supertest');

const buildApp = () => {
  const app = express();
  app.use('/assistant', require('../routers/assistantRouter'));
  app.use((err, _req, res, _next) => {
    res.status(500).json({ message: err.message });
  });
  return app;
};

describe('aiAssistantController integration with ai_helper', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('stripe', () => () => ({}));
  });

  test('GET /assistant without message returns top products', async () => {
    const products = [
      { _id: '1', name: 'P1', price: 10, description: 'D1', sizes: [], image: 'i1', rating: 4 },
      { _id: '2', name: 'P2', price: 20, description: 'D2', sizes: [], image: 'i2', rating: 5 },
    ];
    const limit = jest.fn().mockResolvedValue(products);
    const sort = jest.fn().mockReturnValue({ limit });
    const find = jest.fn().mockReturnValue({ sort });

    jest.doMock('../models', () => ({
      Product: { find, aggregate: jest.fn() },
      Faq: { aggregate: jest.fn() },
      UnansweredQuestion: { create: jest.fn() },
      ChatHistory: { findOne: jest.fn() },
    }));

    jest.doMock('../helpers/ai_helper.js', () => ({
      classifyIntent: jest.fn(),
      generateVectorDataForSearch: jest.fn(),
      generateFinalResponse: jest.fn(),
      generateNotFoundResponse: jest.fn(),
      generateProductFoundResponse: jest.fn(),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant').expect(200);
    expect(res.body.type).toBe('products');
    expect(res.body.data).toEqual(products);
    expect(find).toHaveBeenCalledWith({});
  });

  test('GET /assistant ask_about_us returns faq answer when similar FAQ found', async () => {
    const faqDocs = [{ question: 'Q', answer: 'A', score: 0.9 }];

    jest.doMock('../helpers/ai_helper.js', () => ({
      classifyIntent: jest.fn().mockResolvedValue({
        is_recommend_request: false,
        ask_about_us: true,
        is_product_search: false,
        telling_other_question: false,
        search_query: '',
        response_text: 'Checking...'
      }),
      generateVectorDataForSearch: jest.fn().mockResolvedValue({ vector_data: new Array(768).fill(0.1) }),
      generateFinalResponse: jest.fn().mockResolvedValue('Final answer'),
      generateNotFoundResponse: jest.fn(),
      generateProductFoundResponse: jest.fn(),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    jest.doMock('../models', () => ({
      Product: { find: jest.fn(), aggregate: jest.fn() },
      Faq: { aggregate: jest.fn().mockResolvedValue(faqDocs) },
      UnansweredQuestion: { create: jest.fn() },
      ChatHistory: { findOne: jest.fn() },
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant?message=where').expect(200);
    expect(res.body).toEqual({
      type: 'faq',
      message: 'Final answer',
    });
  });

  test('GET /assistant ask_about_us returns fallback answer when no similar FAQ', async () => {
    jest.doMock('../helpers/ai_helper.js', () => ({
      classifyIntent: jest.fn().mockResolvedValue({
        is_recommend_request: false,
        ask_about_us: true,
        is_product_search: false,
        telling_other_question: false,
        search_query: '',
        response_text: 'Checking...'
      }),
      generateVectorDataForSearch: jest.fn().mockResolvedValue({ vector_data: new Array(768).fill(0.1) }),
      generateFinalResponse: jest.fn().mockResolvedValue('Fallback answer'),
      generateNotFoundResponse: jest.fn().mockResolvedValue('Not found'),
      generateProductFoundResponse: jest.fn(),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    jest.doMock('../models', () => ({
      Product: { find: jest.fn(), aggregate: jest.fn() },
      Faq: { aggregate: jest.fn().mockResolvedValue([]), find: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }) },
      UnansweredQuestion: { create: jest.fn() },
      ChatHistory: { findOne: jest.fn() },
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant?message=where').expect(200);
    expect(res.body).toEqual({ type: 'faq', message: 'Fallback answer' });
  });

  test('GET /assistant is_product_search returns products when similar found', async () => {
    const products = [{ _id: '1', name: 'Match', score: 0.85, price: 1, description: 'd', sizes: [], image: 'i', rating: 5 }];

    jest.doMock('../helpers/ai_helper.js', () => ({
      classifyIntent: jest.fn().mockResolvedValue({
        is_recommend_request: false,
        ask_about_us: false,
        is_product_search: true,
        telling_other_question: false,
        search_query: 'macbook',
        response_text: 'Searching...'
      }),
      generateVectorDataForSearch: jest.fn().mockResolvedValue({ vector_data: new Array(768).fill(0.1) }),
      generateFinalResponse: jest.fn(),
      generateNotFoundResponse: jest.fn(),
      generateProductFoundResponse: jest.fn().mockResolvedValue('Found products'),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    jest.doMock('../models', () => ({
      Product: { find: jest.fn(), aggregate: jest.fn().mockResolvedValue(products) },
      Faq: { aggregate: jest.fn() },
      UnansweredQuestion: { create: jest.fn() },
      ChatHistory: { findOne: jest.fn() },
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant?message=macbook').expect(200);
    expect(res.body.type).toBe('products');
    expect(res.body.message).toBe('Found products');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Match');
  });

  test('GET /assistant is_product_search returns 404 when no products', async () => {
    jest.doMock('../helpers/ai_helper.js', () => ({
      classifyIntent: jest.fn().mockResolvedValue({
        is_recommend_request: false,
        ask_about_us: false,
        is_product_search: true,
        telling_other_question: false,
        search_query: 'macbook',
        response_text: 'Searching...'
      }),
      generateVectorDataForSearch: jest.fn().mockResolvedValue({ vector_data: new Array(768).fill(0.1) }),
      generateFinalResponse: jest.fn(),
      generateNotFoundResponse: jest.fn().mockResolvedValue('Not available'),
      generateProductFoundResponse: jest.fn(),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    const find = jest.fn((query) => {
      if (query && query.$text) {
        return { sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }) };
      }
      if (query && query.$or) {
        return { limit: jest.fn().mockResolvedValue([]) };
      }
      return { sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }) };
    });

    jest.doMock('../models', () => ({
      Product: { find, aggregate: jest.fn().mockResolvedValue([]) },
      Faq: { aggregate: jest.fn() },
      UnansweredQuestion: { create: jest.fn() },
      ChatHistory: { findOne: jest.fn() },
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant?message=macbook').expect(404);
    expect(res.body.type).toBe('products');
    expect(res.body.message).toBe('Not available');
  });

  test('GET /assistant tells chat for other questions', async () => {
    jest.doMock('../helpers/ai_helper.js', () => ({
      classifyIntent: jest.fn().mockResolvedValue({
        is_recommend_request: false,
        ask_about_us: false,
        is_product_search: false,
        telling_other_question: true,
        search_query: '',
        response_text: 'Hello!'
      }),
      generateVectorDataForSearch: jest.fn(),
      generateFinalResponse: jest.fn(),
      generateNotFoundResponse: jest.fn(),
      generateProductFoundResponse: jest.fn(),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    jest.doMock('../models', () => ({
      Product: { find: jest.fn(), aggregate: jest.fn() },
      Faq: { aggregate: jest.fn() },
      UnansweredQuestion: { create: jest.fn() },
      ChatHistory: { findOne: jest.fn() },
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant?message=hi').expect(200);
    expect(res.body).toEqual({ type: 'chat', response: 'Hello!' });
  });

  test('GET /assistant returns 500 when ai_helper returns null', async () => {
    jest.doMock('../helpers/ai_helper.js', () => ({
      classifyIntent: jest.fn().mockResolvedValue(null),
      generateVectorDataForSearch: jest.fn(),
      generateFinalResponse: jest.fn(),
      generateNotFoundResponse: jest.fn(),
      generateProductFoundResponse: jest.fn(),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    jest.doMock('../models', () => ({
      Product: { find: jest.fn(), aggregate: jest.fn() },
      Faq: { aggregate: jest.fn() },
      UnansweredQuestion: { create: jest.fn() },
      ChatHistory: { findOne: jest.fn() },
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant?message=x').expect(500);
    expect(res.body.message).toBeTruthy();
  });

  test('GET /assistant is_product_search falls back to regex when vector and text fail', async () => {
    const products = [{ _id: '99', name: 'မြန်မာစာ Product', price: 1, description: 'desc', sizes: [], image: 'i', rating: 5 }];

    jest.doMock('../helpers/ai_helper.js', () => ({
      classifyIntent: jest.fn().mockResolvedValue({
        is_recommend_request: false,
        ask_about_us: false,
        is_product_search: true,
        telling_other_question: false,
        search_query: 'မြန်မာစာ',
        response_text: 'Searching...'
      }),
      generateVectorDataForSearch: jest.fn().mockResolvedValue({ vector_data: new Array(768).fill(0.1) }),
      generateFinalResponse: jest.fn(),
      generateNotFoundResponse: jest.fn(),
      generateProductFoundResponse: jest.fn().mockResolvedValue('Found'),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    const find = jest.fn((query, projection) => {
      if (query && query.$text) {
        return {
          sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) })
        };
      }
      return { limit: jest.fn().mockResolvedValue(products) };
    });

    jest.doMock('../models', () => ({
      Product: { find, aggregate: jest.fn().mockResolvedValue([]) },
      Faq: { aggregate: jest.fn() },
      UnansweredQuestion: { create: jest.fn() },
      ChatHistory: { findOne: jest.fn() },
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant?message=မြန်မာစာ').expect(200);
    expect(res.body.type).toBe('products');
    expect(res.body.message).toBe('Found');
    expect(res.body.data[0].name).toBe('မြန်မာစာ Product');
  });

  test('GET /assistant follow-up "buy it" uses last user message from history', async () => {
    const chatHistoryDoc = {
      userId: 'u1',
      messages: [],
      save: jest.fn().mockResolvedValue(undefined),
    };

    const generateVectorDataForSearch = jest.fn().mockResolvedValue({ vector_data: new Array(768).fill(0.1) });
    const classifyIntent = jest.fn()
      .mockResolvedValueOnce({
        is_recommend_request: false,
        ask_about_us: false,
        is_product_search: true,
        telling_other_question: false,
        search_query: 'laptop',
        response_text: 'Searching...'
      })
      .mockResolvedValueOnce({
        is_recommend_request: false,
        ask_about_us: false,
        is_product_search: false,
        telling_other_question: true,
        search_query: '',
        response_text: 'Ok'
      });

    jest.doMock('../helpers/ai_helper.js', () => ({
      classifyIntent,
      generateVectorDataForSearch,
      generateFinalResponse: jest.fn(),
      generateNotFoundResponse: jest.fn(),
      generateProductFoundResponse: jest.fn().mockResolvedValue('Here are laptops'),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    const products = [
      { _id: 'p1', name: 'Laptop A', score: 0.9, price: 1, description: 'd', sizes: [], image: 'i', rating: 5 }
    ];

    jest.doMock('../models', () => ({
      Product: { find: jest.fn(), aggregate: jest.fn().mockResolvedValue(products) },
      Faq: { aggregate: jest.fn(), find: jest.fn() },
      UnansweredQuestion: { create: jest.fn() },
      ChatHistory: { findOne: jest.fn().mockResolvedValue(chatHistoryDoc) },
    }));

    const app = express();
    app.use((req, _res, next) => {
      req.user = { id: 'u1' };
      next();
    });
    app.use('/assistant', require('../routers/assistantRouter'));
    app.use((err, _req, res, _next) => {
      res.status(500).json({ message: err.message });
    });

    await request(app).get('/assistant?message=laptop').expect(200);

    generateVectorDataForSearch.mockClear();
    await request(app).get('/assistant?message=i%20want%20to%20buy%20it').expect(200);
    expect(generateVectorDataForSearch).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'laptop' }));
  });
});
