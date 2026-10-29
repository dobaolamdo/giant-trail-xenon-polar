declare module "pg" {
  export const types: any;
  export class Pool {
    constructor(config?: any);
    connect(): Promise<any>;
    query(queryTextOrConfig: any, values?: any): Promise<any>;
    end(): Promise<void>;
  }
  export class Client {
    constructor(config?: any);
    connect(): Promise<any>;
    query(queryTextOrConfig: any, values?: any): Promise<any>;
    end(): Promise<void>;
  }
  const pg: {
    types: any;
    Pool: typeof Pool;
    Client: typeof Client;
  };
  export default pg;
}
