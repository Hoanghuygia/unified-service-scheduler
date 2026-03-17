import * as Joi from 'joi';

const envSchema = Joi.object({
    DATABASE_URL: Joi.string()
        .uri({ scheme: ['postgresql'] })
        .required(),
    PORT: Joi.number().port().default(3000),
}).unknown(true);

export function validateEnv(config: Record<string, unknown>) {
    const { error, value } = envSchema.validate(config, { abortEarly: false });

    if (error) {
        throw new Error(`Environment validation failed: ${error.message}`);
    }

    return value;
}
