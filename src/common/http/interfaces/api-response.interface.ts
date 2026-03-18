export interface ApiResponseMeta {
    timestamp: string;
    requestId: string;
}

export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    message: string | null;
    meta: ApiResponseMeta;
}

export interface ApiErrorBody {
    code: string;
    message: string;
    details: Record<string, unknown>;
}

export interface ApiErrorResponse {
    success: false;
    error: ApiErrorBody;
    meta: ApiResponseMeta;
}
