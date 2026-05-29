import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mockups.AI API',
      version: '1.0.0',
      description: 'API interativa para geração de mockups realistas de produtos usando Inteligência Artificial (Gemini) e gestão de assinaturas.',
      contact: {
        name: 'Suporte Mockups.AI',
        email: 'suporte@mockupsia.ddigital1.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local de Desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insira o token de sessão do Supabase (JWT) no formato: Bearer <token>',
        },
      },
      schemas: {
        MockupRequest: {
          type: 'object',
          required: ['images', 'prompt'],
          properties: {
            images: {
              type: 'array',
              items: {
                type: 'string',
                description: 'Imagem da estampa em formato Base64 ou URL (achatada no fundo da cor do mockup).',
              },
            },
            prompt: {
              type: 'string',
              description: 'Estilo ou descrição da ambientação física do modelo/produto.',
            },
          },
        },
        PaymentRequest: {
          type: 'object',
          required: ['plan', 'billingCycle', 'userId'],
          properties: {
            plan: {
              type: 'string',
              enum: ['basic', 'intermediate', 'premium'],
              description: 'O plano de assinatura selecionado.',
            },
            billingCycle: {
              type: 'string',
              enum: ['monthly', 'annual'],
              description: 'Ciclo de faturamento (mensal ou anual).',
            },
            userId: {
              type: 'string',
              description: 'ID do usuário no Supabase.',
            },
          },
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          summary: 'Status do Sistema',
          description: 'Retorna se o servidor está ativo e se a API do Gemini está configurada.',
          responses: {
            200: {
              description: 'Servidor saudável.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      geminiConfigured: { type: 'boolean', example: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/generate': {
        post: {
          summary: 'Gerar Mockups de Camiseta',
          description: 'Gera uma imagem de mockup realista usando a IA do Gemini, aplicando a estampa processada na camiseta.',
          security: [
            { bearerAuth: [] },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/MockupRequest',
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Mockup gerado com sucesso.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      result: {
                        type: 'string',
                        description: 'A URL pública do CDN do Supabase onde a imagem PNG foi salva.',
                        example: 'https://wtgkpoclapgbjbapoycq.supabase.co/storage/v1/object/public/mockups/user123/1779912039-abc.png',
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: 'Não autorizado. Token JWT inválido ou ausente.',
            },
            403: {
              description: 'Limite de uso diário/mensal esgotado.',
            },
            500: {
              description: 'Erro interno no servidor ou falha na API do Gemini.',
            },
          },
        },
      },
      '/api/create-checkout-session': {
        post: {
          summary: 'Criar Sessão de Checkout (Stripe)',
          description: 'Gera a URL de redirecionamento para o checkout seguro de assinatura do Stripe.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaymentRequest',
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Sessão criada com sucesso.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      url: {
                        type: 'string',
                        example: 'https://checkout.stripe.com/c/pay/cs_test_...',
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Parâmetros ausentes ou plano inválido.',
            },
            500: {
              description: 'Erro na integração com o Stripe.',
            },
          },
        },
      },
      '/api/create-preference': {
        post: {
          summary: 'Criar Preferência de Pagamento (Mercado Pago)',
          description: 'Gera o ID e o link de inicialização do checkout do Mercado Pago.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['plan', 'billingCycle', 'userId', 'price'],
                  properties: {
                    plan: { type: 'string', example: 'premium' },
                    billingCycle: { type: 'string', example: 'annual' },
                    userId: { type: 'string', example: 'user-uuid-123' },
                    price: { type: 'number', example: 299.90 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Preferência criada com sucesso.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '123456789-abc...' },
                      init_point: { type: 'string', example: 'https://www.mercadopago.com.br/checkout/v1/redirect...' },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Parâmetros ausentes ou incorretos.',
            },
            500: {
              description: 'Erro na integração com o Mercado Pago.',
            },
          },
        },
      },
    },
  },
  apis: [], // Keep empty since we defined paths statically for 100% bundling safety
};

export const swaggerSpec = swaggerJSDoc(options);
