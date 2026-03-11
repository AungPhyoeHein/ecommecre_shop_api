const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('admin productController integration with ai_helper', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  test('addProduct triggers background vectorization and stores vector_data', async () => {
    const category = { name: 'Electronics', markedForDeletion: false };

    const findByIdAndUpdate = jest.fn().mockResolvedValue({});
    const Product = function (doc) {
      this._id = 'product-id';
      this._doc = doc;
      this.toObject = () => ({ ...doc, _id: this._id });
      this.save = jest.fn().mockResolvedValue(this);
    };
    Product.findByIdAndUpdate = findByIdAndUpdate;

    const Category = { findById: jest.fn().mockResolvedValue(category) };

    jest.doMock('../models', () => ({
      Category,
      Product,
      Review: {},
    }));

    jest.doMock('express-validator', () => ({
      validationResult: () => ({
        isEmpty: () => true,
        array: () => [],
      }),
    }));

    jest.doMock('../helpers/ai_helper.js', () => ({
      generateVectorDataForAddProduct: jest.fn().mockResolvedValue({
        vector_data: [1, 2, 3],
      }),
      generateVectorDataForSearch: jest.fn(),
      generateFinalResponse: jest.fn(),
    }));

    jest.doMock('../helpers/media_helper', () => ({
      upload: {
        fields: () => (req, _res, cb) => {
          req.files = {
            image: [{ path: 'public/uploads/a.jpg' }],
            images: [],
          };
          cb(null);
        },
      },
    }));

    const { addProduct } = require('../controllers/admin/productController');

    const req = {
      body: {
        name: 'MacBook',
        description: 'Laptop',
        price: 10,
        category: 'cat-id',
        countInStock: 1,
      },
      files: {},
      protocol: 'http',
      get: () => 'localhost:8080',
    };
    const res = buildRes();
    const next = jest.fn();

    await addProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();

    await flushPromises();
    expect(findByIdAndUpdate).toHaveBeenCalledWith('product-id', {
      vector_data: [1, 2, 3],
      aiStatus: 'completed',
    });
  });

  test('addProduct sets aiStatus=error when vectorization fails', async () => {
    const category = { name: 'Electronics', markedForDeletion: false };

    const findByIdAndUpdate = jest.fn().mockResolvedValue({});
    const Product = function (doc) {
      this._id = 'product-id';
      this._doc = doc;
      this.toObject = () => ({ ...doc, _id: this._id });
      this.save = jest.fn().mockResolvedValue(this);
    };
    Product.findByIdAndUpdate = findByIdAndUpdate;

    const Category = { findById: jest.fn().mockResolvedValue(category) };

    jest.doMock('../models', () => ({
      Category,
      Product,
      Review: {},
    }));

    jest.doMock('express-validator', () => ({
      validationResult: () => ({
        isEmpty: () => true,
        array: () => [],
      }),
    }));

    jest.doMock('../helpers/ai_helper.js', () => ({
      generateVectorDataForAddProduct: jest.fn().mockResolvedValue(null),
      generateVectorDataForSearch: jest.fn(),
      generateFinalResponse: jest.fn(),
    }));

    jest.doMock('../helpers/media_helper', () => ({
      upload: {
        fields: () => (req, _res, cb) => {
          req.files = {
            image: [{ path: 'public/uploads/a.jpg' }],
            images: [],
          };
          cb(null);
        },
      },
    }));

    const { addProduct } = require('../controllers/admin/productController');

    const req = {
      body: {
        name: 'MacBook',
        description: 'Laptop',
        price: 10,
        category: 'cat-id',
        countInStock: 1,
      },
      files: {},
      protocol: 'http',
      get: () => 'localhost:8080',
    };
    const res = buildRes();
    const next = jest.fn();

    await addProduct(req, res, next);
    await flushPromises();
    expect(findByIdAndUpdate).toHaveBeenCalledWith('product-id', {
      aiStatus: 'error',
    });
  });

  test('editProduct triggers background vectorization and stores vector_data', async () => {
    const findByIdAndUpdate = jest.fn().mockResolvedValue({
      _id: 'p',
      category: 'cat-id',
      toObject: () => ({ _id: 'p', category: 'cat-id', name: 'Updated' }),
    });
    const findById = jest.fn().mockResolvedValue({ _id: 'p' });

    const Product = {
      findById,
      findByIdAndUpdate,
    };

    const Category = {
      findById: jest.fn().mockResolvedValue({ name: 'Electronics' }),
    };

    jest.doMock('../models', () => ({
      Category,
      Product,
      Review: {},
    }));

    jest.doMock('mongoose', () => ({
      default: { isValidObjectId: () => true },
    }));

    jest.doMock('../helpers/ai_helper.js', () => ({
      generateVectorDataForAddProduct: jest.fn().mockResolvedValue({
        vector_data: [9, 9],
      }),
      generateVectorDataForSearch: jest.fn(),
      generateFinalResponse: jest.fn(),
    }));

    const { editProduct } = require('../controllers/admin/productController');

    const req = {
      params: { id: 'p' },
      body: { name: 'Updated' },
      protocol: 'http',
      get: () => 'localhost:8080',
      files: {},
    };
    const res = buildRes();
    const next = jest.fn();

    await editProduct(req, res, next);
    expect(res.json).toHaveBeenCalled();

    await flushPromises();
    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith('p', {
      vector_data: [9, 9],
      aiStatus: 'completed',
    });
  });
});

