import { registerAs } from '@nestjs/config';

export default registerAs('appMeta', () => ({
    serviceName: 'unified-service-scheduler',
}));
