const healthSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', example: 'ok' },
    runtime: { type: 'string', example: 'local' },
    database: { type: 'string', example: 'fallback' },
    message: {
      type: 'string',
      example: 'الوضع المحلي مفعل بدون Docker أو Postgres.'
    },
    time: {
      type: 'string',
      format: 'date-time',
      example: '2026-04-08T10:15:30.000Z'
    }
  }
};

const salesInputSchema = {
  type: 'object',
  required: ['customerName', 'productName', 'amount', 'status', 'salesRep', 'saleDate'],
  properties: {
    customerName: { type: 'string', example: 'شركة النور التجارية' },
    productName: { type: 'string', example: 'نظام إدارة المخزون' },
    amount: { type: 'number', example: 18500 },
    status: { type: 'string', example: 'مكتملة' },
    salesRep: { type: 'string', example: 'أحمد سالم' },
    saleDate: { type: 'string', example: '2026-04-05' },
    notes: { type: 'string', example: 'تم التسليم والدفع بالكامل.' }
  }
};

const creditSalesInputSchema = {
  type: 'object',
  required: ['customerName', 'invoiceNumber', 'amount', 'paidAmount', 'status', 'salesRep', 'dueDate'],
  properties: {
    customerName: { type: 'string', example: 'شركة المدار' },
    invoiceNumber: { type: 'string', example: 'INV-4101' },
    amount: { type: 'number', example: 22000 },
    paidAmount: { type: 'number', example: 8000 },
    status: { type: 'string', example: 'مسدد جزئيا' },
    salesRep: { type: 'string', example: 'هبة فؤاد' },
    dueDate: { type: 'string', example: '2026-04-18' },
    notes: { type: 'string', example: 'تم استلام الدفعة الأولى وتحديد موعد المتابعة.' }
  }
};

export function createSwaggerSpec(serverUrl) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'ERB API Documentation',
      version: '1.0.0',
      description:
        'Backend API documentation for Dashboard, Sales, and Credit Sales with CRUD operations.'
    },
    servers: [
      {
        url: serverUrl,
        description: 'Local Server'
      }
    ],
    tags: [
      {
        name: 'System Status',
        description: 'Check system and environment status'
      },
      {
        name: 'Dashboard',
        description: 'General summary data'
      },
      {
        name: 'Sales',
        description: 'Manage sales operations'
      },
      {
        name: 'Credit Sales',
        description: 'Manage credit sales and collections'
      }
    ],
    paths: {
      '/api/health': {
        get: {
          tags: ['System Status'],
          summary: 'Check backend status',
          responses: {
            200: {
              description: 'System status',
              content: {
                'application/json': {
                  schema: healthSchema
                }
              }
            }
          }
        }
      },
      '/api/dashboard': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get dashboard data',
          responses: {
            200: {
              description: 'General summary data'
            }
          }
        }
      },
      '/api/sales': {
        get: {
          tags: ['Sales'],
          summary: 'Get sales data',
          responses: {
            200: {
              description: 'Sales list with metrics'
            }
          }
        },
        post: {
          tags: ['Sales'],
          summary: 'Add new sales record',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: salesInputSchema
              }
            }
          },
          responses: {
            201: {
              description: 'Sales record created'
            }
          }
        }
      },
      '/api/sales/{id}': {
        put: {
          tags: ['Sales'],
          summary: 'Update sales record',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', example: 'SAL-1001' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: salesInputSchema
              }
            }
          },
          responses: {
            200: {
              description: 'Record updated'
            }
          }
        },
        delete: {
          tags: ['Sales'],
          summary: 'Delete sales record',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', example: 'SAL-1001' }
            }
          ],
          responses: {
            204: {
              description: 'Record deleted'
            }
          }
        }
      },
      '/api/credit-sales': {
        get: {
          tags: ['Credit Sales'],
          summary: 'Get credit sales data',
          responses: {
            200: {
              description: 'Credit sales list with metrics'
            }
          }
        },
        post: {
          tags: ['Credit Sales'],
          summary: 'Add new credit sales record',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: creditSalesInputSchema
              }
            }
          },
          responses: {
            201: {
              description: 'Credit sales record created'
            }
          }
        }
      },
      '/api/credit-sales/{id}': {
        put: {
          tags: ['Credit Sales'],
          summary: 'Update credit sales record',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', example: 'CRD-2001' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: creditSalesInputSchema
              }
            }
          },
          responses: {
            200: {
              description: 'Record updated'
            }
          }
        },
        delete: {
          tags: ['Credit Sales'],
          summary: 'Delete credit sales record',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', example: 'CRD-2001' }
            }
          ],
          responses: {
            204: {
              description: 'Record deleted'
            }
          }
        }
      }
    }
  };
}
