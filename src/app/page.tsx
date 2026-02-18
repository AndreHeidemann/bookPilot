import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

const Home = async () => {
  const session = await getSession();
  if (session.userId) {
    redirect("/app");
  }
  redirect("/login");
};

export default Home;
