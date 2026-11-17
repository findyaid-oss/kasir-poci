import { redirect } from "next/navigation";

/** proxy.ts sudah mengarahkan "/" ke /kasir atau /masuk; ini hanya cadangan. */
export default function Home() {
  redirect("/kasir");
}
