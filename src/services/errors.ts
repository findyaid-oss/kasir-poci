/** Kesalahan yang pesannya aman dan berguna untuk ditampilkan langsung ke pengguna. */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}
