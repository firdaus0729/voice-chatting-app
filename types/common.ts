/** Generic API / async state */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
}

/** Pagination */
export interface PaginationParams {
  limit: number;
  startAfter?: unknown;
}

/** API result wrapper */
export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
