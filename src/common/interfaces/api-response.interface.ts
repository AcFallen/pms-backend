export interface ApiResponse<T = any> {
  code: number;
  status: 'successful' | 'error';
  data?: T;
  message?: string;
  timestamp?: string;
  path?: string;
}

export interface ApiErrorResponse {
  code: number;
  status: 'error';
  message: string;
  errors?: any[];
  timestamp: string;
  path: string;
}
