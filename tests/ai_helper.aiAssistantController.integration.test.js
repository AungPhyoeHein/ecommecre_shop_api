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
  });

  test('GET /assistant without message returns top products', async () => {
    const products = [{ name: 'P1' }, { name: 'P2' }];
    const limit = jest.fn().mockResolvedValue(products);
    const sort = jest.fn().mockReturnValue({ limit });
    const find = jest.fn().mockReturnValue({ sort });

    jest.doMock('../models', () => ({
      Product: { find, aggregate: jest.fn() },
      Faq: { aggregate: jest.fn() },
    }));

    jest.doMock('../helpers/ai_helper.js', () => ({
      generateVectorDataForSearch: jest.fn(),
      generateFinalResponse: jest.fn(),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant').expect(200);
    expect(res.body).toEqual({ type: 'products', data: products });
    expect(find).toHaveBeenCalledWith({});
  });

  test('GET /assistant ask_about_us returns faq answer when similar FAQ found', async () => {
    const mockAi = {
      ask_about_us: true,
      is_product_search: false,
      telling_other_question: false,
      vector_data: new Array(768).fill(0.1),
      response_text: 'Checking...',
    };

    const faqDocs = [{ question: 'Q', answer: 'A', score: 0.9 }];

    jest.doMock('../helpers/ai_helper.js', () => ({
      generateVectorDataForSearch: jest.fn().mockResolvedValue(mockAi),
      generateFinalResponse: jest.fn().mockResolvedValue('Final answer'),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    jest.doMock('../models', () => ({
      Product: { find: jest.fn(), aggregate: jest.fn() },
      Faq: { aggregate: jest.fn().mockResolvedValue(faqDocs) },
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant?message=where').expect(200);
    expect(res.body).toEqual({
      type: 'faq',
      message: 'Final answer',
      response: 'Checking...',
    });
  });

  test('GET /assistant ask_about_us returns 404 when no similar FAQ', async () => {
    const mockAi = {
      ask_about_us: true,
      is_product_search: false,
      telling_other_question: false,
      vector_data: new Array(768).fill(0.1),
      response_text: 'Checking...',
    };

    jest.doMock('../helpers/ai_helper.js', () => ({
      generateVectorDataForSearch: jest.fn().mockResolvedValue(mockAi),
      generateFinalResponse: jest.fn(),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    jest.doMock('../models', () => ({
      Product: { find: jest.fn(), aggregate: jest.fn() },
      Faq: { aggregate: jest.fn().mockResolvedValue([]) },
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant?message=where').expect(404);
    expect(res.body.type).toBe('faq');
  });

  test('GET /assistant is_product_search returns products when similar found', async () => {
    const mockAi = {
      ask_about_us: false,
      is_product_search: true,
      telling_other_question: false,
      vector_data: new Array(768).fill(0.1),
      response_text: 'Searching...',
    };

    const products = [{ name: 'Match', score: 0.8 }];

    jest.doMock('../helpers/ai_helper.js', () => ({
      generateVectorDataForSearch: jest.fn().mockResolvedValue(mockAi),
      generateFinalResponse: jest.fn(),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    jest.doMock('../models', () => ({
      Product: { find: jest.fn(), aggregate: jest.fn().mockResolvedValue(products) },
      Faq: { aggregate: jest.fn() },
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant?message=macbook').expect(200);
    expect(res.body).toEqual({
      type: 'products',
      data: products,
      response: 'Searching...',
    });
  });

  test('GET /assistant is_product_search returns 404 when no products', async () => {
    const mockAi = {
      ask_about_us: false,
      is_product_search: true,
      telling_other_question: false,
      vector_data: new Array(768).fill(0.1),
      response_text: 'Searching...',
    };

    jest.doMock('../helpers/ai_helper.js', () => ({
      generateVectorDataForSearch: jest.fn().mockResolvedValue(mockAi),
      generateFinalResponse: jest.fn(),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    jest.doMock('../models', () => ({
      Product: { find: jest.fn(), aggregate: jest.fn().mockResolvedValue([]) },
      Faq: { aggregate: jest.fn() },
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant?message=macbook').expect(404);
    expect(res.body.type).toBe('products');
  });

  test('GET /assistant tells chat for other questions', async () => {
    const mockAi = {
      ask_about_us: false,
      is_product_search: false,
      telling_other_question: true,
      vector_data: [],
      response_text: 'Hello!',
    };

    jest.doMock('../helpers/ai_helper.js', () => ({
      generateVectorDataForSearch: jest.fn().mockResolvedValue(mockAi),
      generateFinalResponse: jest.fn(),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    jest.doMock('../models', () => ({
      Product: { find: jest.fn(), aggregate: jest.fn() },
      Faq: { aggregate: jest.fn() },
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant?message=hi').expect(200);
    expect(res.body).toEqual({ type: 'chat', response: 'Hello!' });
  });

  test('GET /assistant returns 500 when ai_helper returns null', async () => {
    jest.doMock('../helpers/ai_helper.js', () => ({
      generateVectorDataForSearch: jest.fn().mockResolvedValue(null),
      generateFinalResponse: jest.fn(),
      generateVectorDataForAddProduct: jest.fn(),
    }));

    jest.doMock('../models', () => ({
      Product: { find: jest.fn(), aggregate: jest.fn() },
      Faq: { aggregate: jest.fn() },
    }));

    const app = buildApp();
    const res = await request(app).get('/assistant?message=x').expect(500);
    expect(res.body.message).toContain('AI Assistant');
  });
});

