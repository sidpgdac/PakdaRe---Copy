const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PakdaRe Public Health API',
      version: '1.0.0',
      description: 'Official API documentation for BMC Disease Surveillance Portal',
      contact: {
        name: 'BMC IT Department',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/*.js', './models/*.js'], // Look for docs in these files
};

const specs = swaggerJsdoc(options);

module.exports = specs;
