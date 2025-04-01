import { BehaviorSubject, Observable, ReplaySubject, Subject, Subscription } from 'rxjs';
import { DataSource } from '@angular/cdk/collections';

export interface TVSDataSource<T> {
  dataToRender$: Subject<T[]>;
  dataOfRange$: Subject<T[]>;
}

export function isTVSDataSource<T>(dataSource: unknown): dataSource is TVSDataSource<T> {
  return dataSource instanceof CdkTableVirtualScrollDataSource || dataSource instanceof TableVirtualScrollDataSource;
}

export class CdkTableVirtualScrollDataSource<T> extends DataSource<T> implements TVSDataSource<T> {
  /** Stream that emits when a new data array is set on the data source. */
  private readonly _data: BehaviorSubject<T[]>;

  /** Stream emitting render data to the table (depends on ordered data changes). */
  private readonly _renderData = new BehaviorSubject<T[]>([]);

  /**
   * Subscription to the changes that should trigger an update to the table's rendered rows, such
   * as filtering, sorting, pagination, or base data changes.
   */
  _renderChangesSubscription: Subscription | null = null;

  /** Array of data that should be rendered by the table, where each object represents one row. */
  get data() {
    return this._data.value;
  }

  set data(data: T[]) {
    data = Array.isArray(data) ? data : [];
    this._data.next(data);
  }

  public dataToRender$: Subject<T[]>;
  public dataOfRange$: Subject<T[]>;
  private streamsReady: boolean;


  constructor(initialData: T[] = []) {
    super();
    this._data = new BehaviorSubject<T[]>(initialData);
    this._updateChangeSubscription();
  }

  _updateChangeSubscription() {
    this.initStreams();

    this._renderChangesSubscription?.unsubscribe();
    this._renderChangesSubscription = new Subscription();
    this._renderChangesSubscription.add(
      this._data.subscribe(data => this.dataToRender$.next(data))
    );
    this._renderChangesSubscription.add(
      this.dataOfRange$.subscribe(data => this._renderData.next(data))
    );
  }

  connect() {
    if (!this._renderChangesSubscription) {
      this._updateChangeSubscription();
    }

    return this._renderData;
  }


  disconnect() {
    this._renderChangesSubscription?.unsubscribe();
    this._renderChangesSubscription = null;
  }

  private initStreams() {
    if (!this.streamsReady) {
      this.dataToRender$ = new ReplaySubject<T[]>(1);
      this.dataOfRange$ = new ReplaySubject<T[]>(1);
      this.streamsReady = true;
    }
  }
}

export class TableVirtualScrollDataSource<T> extends DataSource<T> implements TVSDataSource<T> {
  private readonly _dataSubject = new BehaviorSubject<T[]>([]);
  private readonly _renderData = new BehaviorSubject<T[]>([]);
  private readonly _renderChangesSubscription = new Subscription();

  public dataToRender$ = new ReplaySubject<T[]>(1);
  public dataOfRange$ = new ReplaySubject<T[]>(1);

  get data(): T[] {
    return this._dataSubject.value;
  }

  set data(data: T[]) {
    this._dataSubject.next(data);
  }

  constructor(initialData: T[] = []) {
    super();
    this._dataSubject.next(initialData);
    this._renderChangesSubscription.add(
      this._dataSubject.subscribe(data => this.dataToRender$.next(data))
    );
    this._renderChangesSubscription.add(
      this.dataOfRange$.subscribe(data => this._renderData.next(data))
    );
  }

  connect(): Observable<T[]> {
    return this._renderData.asObservable();
  }

  disconnect(): void {
    this._dataSubject.complete();
    this.dataToRender$.complete();
    this.dataOfRange$.complete();
    this._renderChangesSubscription.unsubscribe();
  }
}
