export default class ErrorResponse extends Error {

  constructor(message: string, public statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
  }
}
