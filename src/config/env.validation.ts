import * as Joi from 'joi';

const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    DATABASE_URL: Joi.string()
        .uri({ scheme: ['postgresql', 'postgres'] })
        .required(),
    PORT: Joi.number().port().default(3000),
    LOG_LEVEL: Joi.when('NODE_ENV', {
        is: 'production',
        then: Joi.string().valid('error', 'warn', 'info', 'debug').required(),
        otherwise: Joi.string().valid('error', 'warn', 'info', 'debug').default('debug'),
    }),
}).unknown(true);

export function validateEnv(config: Record<string, unknown>) {
    const { error, value } = envSchema.validate(config, { abortEarly: false });

    if (error) {
        throw new Error(`Environment validation failed: ${error.message}`);
    }

    return {
        app: {
            nodeEnv: value.NODE_ENV,
            port: value.PORT,
        },
        database: {
            url: value.DATABASE_URL,
        },
        logger: {
            level: value.LOG_LEVEL,
        },
    };
}
