import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();
        const req = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: unknown = 'Internal server error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const response = exception.getResponse();
            message = typeof response === 'string' ? response : (response as any).message ?? response;
        } else if (exception instanceof Error) {
            message = exception.message || message;
        }

        res.status(status).json({
            success: false,
            statusCode: status,
            path: req.url,
            timestamp: new Date().toISOString(),
            message,
        });
    }
}
