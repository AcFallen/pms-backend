import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = exception.message;
    let errors: any[] | undefined;

    // Handle validation errors (class-validator)
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as any;

      if (responseObj.message) {
        if (Array.isArray(responseObj.message)) {
          // Validation errors from class-validator
          errors = responseObj.message;
          message = 'Validation failed';
        } else if (typeof responseObj.message === 'string') {
          message = responseObj.message;
        }
      }
    }

    const errorResponse: ApiErrorResponse = {
      code: status,
      status: 'error',
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Only add errors array if it exists
    if (errors && errors.length > 0) {
      errorResponse.errors = errors;
    }

    response.status(status).json(errorResponse);
  }
}
