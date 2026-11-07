import {Injectable, inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, catchError, map, of} from 'rxjs';
import {
  BatchItem,
  PrescriptionItem,
  SaleRecord,
  PurchaseOrderRecord,
  StockTransferRecord,
  ReturnItemRecord,
  AuditItemRecord,
  CartItem,
} from '../models/pharmacy.models';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PharmacyApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getBatches(): Observable<BatchItem[]> {
    return this.http
      .get<ApiResponse<BatchItem[]>>(`${this.baseUrl}/batches`)
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          console.error('Error fetching batches:', err);
          return of([]);
        }),
      );
  }

  createBatch(batch: Partial<BatchItem>, user: string, role: string): Observable<BatchItem | null> {
    return this.http
      .post<ApiResponse<BatchItem>>(`${this.baseUrl}/batches`, {
        ...batch,
        user,
        role,
      })
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          console.error('Error creating batch:', err);
          return of(null);
        }),
      );
  }

  updateBatch(
    id: number,
    data: Partial<BatchItem>,
    user: string,
    role: string,
  ): Observable<BatchItem | null> {
    return this.http
      .put<ApiResponse<BatchItem>>(`${this.baseUrl}/batches/${id}`, {
        ...data,
        user,
        role,
      })
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          console.error('Error updating batch:', err);
          return of(null);
        }),
      );
  }

  getSales(): Observable<SaleRecord[]> {
    return this.http.get<ApiResponse<SaleRecord[]>>(`${this.baseUrl}/sales`).pipe(
      map((res) => res.data),
      catchError(() => of([])),
    );
  }

  completeSale(
    customer: string,
    payment: string,
    items: CartItem[],
    discount: number,
    user: string,
    role: string,
  ): Observable<SaleRecord | null> {
    return this.http
      .post<ApiResponse<SaleRecord>>(`${this.baseUrl}/sales`, {
        customer,
        payment,
        items,
        discount,
        user,
        role,
      })
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          console.error('Error completing sale:', err);
          return of(null);
        }),
      );
  }

  getPrescriptions(): Observable<PrescriptionItem[]> {
    return this.http
      .get<ApiResponse<PrescriptionItem[]>>(`${this.baseUrl}/prescriptions`)
      .pipe(
        map((res) => res.data),
        catchError(() => of([])),
      );
  }

  createPrescription(
    rx: Partial<PrescriptionItem>,
    user: string,
    role: string,
  ): Observable<PrescriptionItem | null> {
    return this.http
      .post<ApiResponse<PrescriptionItem>>(`${this.baseUrl}/prescriptions`, {
        ...rx,
        user,
        role,
      })
      .pipe(
        map((res) => res.data),
        catchError(() => of(null)),
      );
  }

  reviewPrescription(
    id: string,
    checks: PrescriptionItem['checks'],
    notes: string,
    outcome: string,
    user: string,
    role: string,
  ): Observable<PrescriptionItem | null> {
    return this.http
      .put<ApiResponse<PrescriptionItem>>(
        `${this.baseUrl}/prescriptions/${id}/review`,
        {
          checks,
          notes,
          outcome,
          user,
          role,
        },
      )
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          console.error('Error updating review:', err);
          return of(null);
        }),
      );
  }

  dispensePrescription(
    id: string,
    user: string,
    role: string,
  ): Observable<PrescriptionItem | null> {
    return this.http
      .put<ApiResponse<PrescriptionItem>>(
        `${this.baseUrl}/prescriptions/${id}/dispense`,
        {user, role},
      )
      .pipe(
        map((res) => res.data),
        catchError(() => of(null)),
      );
  }

  getPurchaseOrders(): Observable<PurchaseOrderRecord[]> {
    return this.http
      .get<ApiResponse<PurchaseOrderRecord[]>>(`${this.baseUrl}/purchase-orders`)
      .pipe(
        map((res) => res.data),
        catchError(() => of([])),
      );
  }

  createPurchaseOrder(
    po: Partial<PurchaseOrderRecord>,
    user: string,
    role: string,
  ): Observable<PurchaseOrderRecord | null> {
    return this.http
      .post<ApiResponse<PurchaseOrderRecord>>(
        `${this.baseUrl}/purchase-orders`,
        {
          ...po,
          user,
          role,
        },
      )
      .pipe(
        map((res) => res.data),
        catchError(() => of(null)),
      );
  }

  receivePurchaseOrder(
    id: string,
    user: string,
    role: string,
  ): Observable<PurchaseOrderRecord | null> {
    return this.http
      .put<ApiResponse<PurchaseOrderRecord>>(
        `${this.baseUrl}/purchase-orders/${id}/receive`,
        {user, role},
      )
      .pipe(
        map((res) => res.data),
        catchError(() => of(null)),
      );
  }

  getTransfers(): Observable<StockTransferRecord[]> {
    return this.http
      .get<ApiResponse<StockTransferRecord[]>>(`${this.baseUrl}/transfers`)
      .pipe(
        map((res) => res.data),
        catchError(() => of([])),
      );
  }

  createTransfer(
    transfer: {
      sku: string;
      batch: string;
      from: string;
      to: string;
      qty: number;
      notes?: string;
    },
    user: string,
    role: string,
  ): Observable<StockTransferRecord | null> {
    return this.http
      .post<ApiResponse<StockTransferRecord>>(`${this.baseUrl}/transfers`, {
        ...transfer,
        user,
        role,
      })
      .pipe(
        map((res) => res.data),
        catchError(() => of(null)),
      );
  }

  receiveTransfer(
    id: string,
    user: string,
    role: string,
  ): Observable<StockTransferRecord | null> {
    return this.http
      .put<ApiResponse<StockTransferRecord>>(
        `${this.baseUrl}/transfers/${id}/receive`,
        {user, role},
      )
      .pipe(
        map((res) => res.data),
        catchError(() => of(null)),
      );
  }

  getReturns(): Observable<ReturnItemRecord[]> {
    return this.http
      .get<ApiResponse<ReturnItemRecord[]>>(`${this.baseUrl}/returns`)
      .pipe(
        map((res) => res.data),
        catchError(() => of([])),
      );
  }

  createReturn(
    ret: Partial<ReturnItemRecord>,
    user: string,
    role: string,
  ): Observable<ReturnItemRecord | null> {
    return this.http
      .post<ApiResponse<ReturnItemRecord>>(`${this.baseUrl}/returns`, {
        ...ret,
        user,
        role,
      })
      .pipe(
        map((res) => res.data),
        catchError(() => of(null)),
      );
  }

  updateReturnStatus(
    id: string,
    status: 'Refunded' | 'Rejected',
    user: string,
    role: string,
  ): Observable<ReturnItemRecord | null> {
    return this.http
      .put<ApiResponse<ReturnItemRecord>>(
        `${this.baseUrl}/returns/${id}/status`,
        {
          status,
          user,
          role,
        },
      )
      .pipe(
        map((res) => res.data),
        catchError(() => of(null)),
      );
  }

  getAuditLog(): Observable<AuditItemRecord[]> {
    return this.http
      .get<ApiResponse<AuditItemRecord[]>>(`${this.baseUrl}/audit`)
      .pipe(
        map((res) => res.data),
        catchError(() => of([])),
      );
  }

  queryCopilot(
    message: string,
  ): Observable<{reply: string; source: string; timestamp: string}> {
    return this.http
      .post<ApiResponse<{reply: string; source: string; timestamp: string}>>(
        `${this.baseUrl}/copilot/chat`,
        {message},
      )
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          console.error('Copilot query error:', err);
          return of({
            reply:
              'Could not connect to the operational copilot service. Please try again.',
            source: 'error-handler',
            timestamp: new Date().toLocaleTimeString(),
          });
        }),
      );
  }
}
